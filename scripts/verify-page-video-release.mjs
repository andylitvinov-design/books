// Public read-only release checks. Uses synthetic local app or the public site.
// No login, private records, form submissions, media mutation, or seeking.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, createWriteStream } from 'node:fs';
import { chromium, webkit, expect } from '@playwright/test';

const live = process.argv.includes('--live');
const origin = live ? 'https://holistichouse.vercel.app' : 'http://127.0.0.1:3116';
const label = live ? 'live' : 'local';
const evidence = '/tmp/site-video-evidence';
mkdirSync(evidence, { recursive: true });
const cases = [
  ['/?lang=en', 'home-intro', 'en', 'ed202847a43a96b918308aa972177b34', 'home-en-v2', 29.44],
  ['/en/services', 'services-intro', 'en', '48105a2f2228e7cb3a67391e97acaf8b', 'services-en-v2', 29.1],
  ['/en/services', 'method-hypnotherapy', 'en', '8c1634ce904434a91931429b6a7eefe1', 'hypnotherapy-en-v1', 46.73],
  ['/en/services', 'method-constellations', 'en', '7c6b243f048b9c0581ae29619a4a89fc', 'constellations-en-v1', 47.67],
  ['/en/homeopathy', 'homeopathy-intro', 'en', '34df311e461509433b45929908a9097a', 'homeopathy-en-v2', 30.72],
  ['/?lang=ru', 'home-intro', 'ru', '388a04b39ebf215ae656bcd22d0d0847', 'home-ru-v1', 31.43],
  ['/ru/services', 'services-intro', 'ru', '79c2845577865979cd95ac40a08fc01a', 'services-ru-v1', 33.44],
  ['/ru/homeopathy', 'homeopathy-intro', 'ru', '0f984780d06948b1e78166e6e553e4e9', 'homeopathy-ru-v1', 31.92],
];
const results = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let app;
if (!live) {
  const log = createWriteStream(`${evidence}/page-video-local-app.log`);
  app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3116', '-H', '127.0.0.1'], {
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', PRESCRIPTIONS_KV_REST_API_URL: '', PRESCRIPTIONS_KV_REST_API_TOKEN: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  app.stdout.pipe(log); app.stderr.pipe(log);
  for (let n = 0; ; n++) {
    try { if ((await fetch(origin)).ok) break; } catch { /* startup */ }
    if (n > 60 || app.exitCode !== null) throw new Error('Local app did not start');
    await sleep(500);
  }
}

async function exercise(engine, browserType) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    // Hold actual application scripts to reproduce a slow phone's hydration window.
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    const scriptPattern = '**/_next/static/**/*.js*';
    await page.route(scriptPattern, async route => { await gate; await route.continue(); });
    try {
      await page.goto(`${origin}/?lang=en`, { waitUntil: 'commit', timeout: 60000 });
      const cold = page.locator('[data-video-slot="home-intro"][data-video-locale="en"]');
      const play = cold.locator('button.site-video-play');
      await expect(play).toBeVisible({ timeout: 20000 });
      await expect(play).toBeDisabled();
      assert.equal(await cold.locator('iframe').count(), 0);
      release();
      await expect(play).toBeEnabled({ timeout: 30000 });
      await play.click();
      await expect(cold.locator('iframe')).toHaveAttribute('src', `https://app.heygen.com/embeds/${cases[0][3]}`);
      results.push({ engine, test: 'cold first click after hydration', passed: true });
    } finally { release(); await page.unroute(scriptPattern); }

    for (const width of [1365, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [path, slot, locale, id, poster, seconds] of cases) {
        const response = await page.goto(origin + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
        assert.equal(response.status(), 200);
        await page.evaluate(() => document.fonts.ready);
        const block = page.locator(`[data-video-slot="${slot}"][data-video-locale="${locale}"]`);
        await expect(block).toHaveCount(1);
        await expect(block.locator('.site-video-player')).toHaveClass(/site-video-player--minimal/);
        const play = block.locator('button.site-video-play');
        await expect(play).toBeEnabled({ timeout: 30000 });
        assert.equal(await block.locator('iframe').count(), 0);
        const img = block.locator('.site-video-poster');
        await img.scrollIntoViewIfNeeded();
        await expect.poll(() => img.evaluate(el => el.complete && el.naturalWidth >= 320), { timeout: 30000 }).toBe(true);
        assert.ok(decodeURIComponent(await img.getAttribute('src')).includes(`/video-posters/${poster}.webp`));
        const frame = await block.locator('.site-video-frame').boundingBox();
        assert.ok(Math.abs(frame.width / frame.height - 16 / 9) < 0.03, 'Responsive 16:9');
        const transcript = block.locator('details.site-video-transcript');
        assert.equal(await transcript.evaluate(el => el.open), false);
        assert.equal(await block.locator('.site-video-copy').count(), 0);
        assert.equal(await block.locator('.site-video-duration').count(), 1);
        await transcript.locator('summary').click();
        await expect(transcript.locator('p')).toBeVisible();
        await expect(transcript.locator('p')).toHaveAttribute('lang', locale);
        await transcript.locator('summary').click();
        await expect.poll(() => transcript.evaluate(el => el.open)).toBe(false);
        // WebKit can report the preceding open disclosure's scroll geometry for
        // one layout cycle. Require settled geometry, without relaxing the bound.
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth), { timeout: 5000 }).toBeLessThanOrEqual(2);
        await block.screenshot({ path: `${evidence}/${label}-${poster}-${engine}-${width}.png` });
        await play.click();
        await expect(block.locator('iframe')).toHaveAttribute('src', `https://app.heygen.com/embeds/${id}`);
        results.push({ engine, path, width, posterDecoded: true, exactVideoId: id, firstClick: true, compact: true, transcriptLanguage: locale });

        if (live && width === 390) {
          const video = block.frameLocator('iframe').locator('video');
          await expect(video).toHaveCount(1, { timeout: 60000 });
          await expect.poll(() => video.evaluate(el => Boolean(el.currentSrc) && el.readyState >= 2 && Number.isFinite(el.duration)), { timeout: 60000 }).toBe(true);
          const before = await video.evaluate(el => ({ time: el.currentTime, duration: el.duration }));
          assert.ok(Math.abs(before.duration - seconds) < 1.2, 'Exact final duration');
          assert.ok(before.time < 1, 'Start at beginning without autoplay');
          const started = Date.now();
          let sourceRetries = 0;
          for (;;) {
            try { await video.evaluate(async el => { el.muted = true; await el.play(); }); break; }
            catch (error) {
              if (!String(error.message).includes('AbortError') || sourceRetries >= 2) throw error;
              sourceRetries++;
              await expect.poll(() => video.evaluate(el => el.readyState >= 2 && !el.error), { timeout: 15000 }).toBe(true);
            }
          }
          await expect.poll(() => video.evaluate(el => el.currentTime), { timeout: 30000 }).toBeGreaterThan(3);
          await block.screenshot({ path: `${evidence}/${label}-${poster}-${engine}-playing.png` });
          await expect.poll(() => video.evaluate(el => el.ended), { timeout: 90000 }).toBe(true);
          const end = await video.evaluate(el => ({ time: el.currentTime, duration: el.duration, width: el.videoWidth, height: el.videoHeight, rate: el.playbackRate, error: el.error?.code ?? null }));
          assert.equal(end.error, null);
          assert.equal(end.rate, 1);
          assert.ok(end.width >= 640 && end.height > 0);
          assert.ok(end.time >= seconds - 1);
          const elapsed = (Date.now() - started) / 1000;
          assert.ok(elapsed >= seconds - 1.5, 'Natural full playback, no seek');
          results.push({ engine, path, id, fullPlayback: true, noSeeking: true, automatedMuted: true, sourceRetries, elapsed, before, end });
          console.log(`PASS full ${locale} ${slot}: ${engine}`);
        }
      }
    }
    await page.goto(origin + '/?lang=en', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-video-slot="home-intro"] .site-video-play').click();
    await expect(page.locator('[data-video-slot="home-intro"] iframe')).toHaveCount(1);
    await page.locator('.site-language-menu-trigger').click();
    await page.locator('.site-language-switch button[lang="ru"]').click();
    const russian = page.locator('[data-video-slot="home-intro"][data-video-locale="ru"]');
    await expect(russian).toHaveCount(1);
    await expect(russian.locator('iframe')).toHaveCount(0);
    await russian.locator('.site-video-play').click();
    await expect(russian.locator('iframe')).toHaveAttribute('src', `https://app.heygen.com/embeds/${cases[5][3]}`);
    assert.deepEqual(pageErrors, [], 'Unexpected page JavaScript errors');
    results.push({ engine, languageSwitchResetsPlayer: true, pageJavaScriptErrors: pageErrors });
  } catch (error) {
    const geometry = await page.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, offenders: [...document.querySelectorAll('body *')].map(el => ({ tag: el.tagName, className: String(el.className).slice(0,120), rect: el.getBoundingClientRect().toJSON() })).filter(item => item.rect.width > 1 && (item.rect.right > innerWidth + 2 || item.rect.left < -2)).slice(0,25) })).catch(() => null);
    await page.screenshot({ path: `${evidence}/${label}-six-videos-failed-${engine}.png`, fullPage: true }).catch(() => {});
    results.push({ engine, failure: String(error.message).slice(0, 2500), pageErrors, geometry });
  } finally { await context.close(); await browser.close(); }
}

try {
  await Promise.all([exercise('chromium', chromium), exercise('webkit', webkit)]);
  writeFileSync(`${evidence}/${label}-six-page-videos.json`, JSON.stringify({ origin, checkedAt: new Date().toISOString(), results }, null, 2));
  assert.ok(!results.some(item => item.failure), 'Page-video checks failed; inspect JSON');
  assert.equal(results.filter(item => item.compact).length, 32);
  if (live) assert.equal(results.filter(item => item.fullPlayback).length, 16);
} finally { if (app) app.kill('SIGTERM'); }
