// Read-only visual acceptance. Local mode uses the production build without any
// production KV or owner credentials. It never publishes, saves or renders media.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, createWriteStream } from 'node:fs';
import { chromium, webkit, expect } from '@playwright/test';

const live = process.argv.includes('--live');
const origin = live ? 'https://holistichouse.vercel.app' : 'http://127.0.0.1:3200';
const evidence = '/tmp/site-video-evidence';
const videoId = 'd4e55c984e54b40fbeb8a21f81d27694';
const results = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
mkdirSync(evidence, { recursive: true });
let app;
try {
  if (!live) {
    assert.equal(process.env.CI, 'true');
    const log = createWriteStream(`${evidence}/minimal-local-app.log`);
    app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3200', '-H', '127.0.0.1'], {
      env: { ...process.env, PRESCRIPTIONS_KV_REST_API_URL: '', PRESCRIPTIONS_KV_REST_API_TOKEN: '', PRESCRIPTIONS_ADMIN_TOKEN: '', PRESCRIPTIONS_ADMIN_PIN: '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    app.stdout.pipe(log); app.stderr.pipe(log);
    for (let i = 0; ; i++) {
      try { if ((await fetch(`${origin}/ru/about`)).ok) break; } catch { /* starting */ }
      assert.ok(i < 90 && app.exitCode === null, 'Local application did not start');
      await pause(1000);
    }
  }

  for (const [engine, browserType] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await browserType.launch({ headless: true });
    try {
      for (const width of [390, 1365]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        for (let i = 0; ; i++) {
          const response = await page.goto(`${origin}/ru/about`, { waitUntil: 'domcontentloaded', timeout: 60000 });
          assert.equal(response.status(), 200);
          if (await page.locator('[data-video-slot="about-intro"] .site-video-player--minimal').count()) break;
          assert.ok(live && i < 35, 'Minimal RU video presentation is not present');
          await pause(5000);
        }
        const intro = page.locator('[data-video-slot="about-intro"][data-video-locale="ru"]');
        const poster = intro.locator('img.site-video-poster');
        await expect(poster).toBeVisible();
        await expect.poll(() => poster.evaluate(el => el.complete && el.naturalWidth >= 320 && el.naturalHeight > 100)).toBe(true);
        await expect(poster).toHaveAttribute('src', /psychic-alchemy-ru-v1/);
        assert.equal(await intro.locator('.site-video-generic-poster').count(), 0);
        assert.equal(await page.locator('iframe').count(), 0);
        assert.equal(await intro.locator('.site-video-title, .site-video-description, .site-video-duration-text, .site-video-play-label').count(), 0);
        await expect(intro.locator('.site-video-duration')).toHaveCount(1);
        await expect(intro.locator('.site-video-ai-badge')).toHaveText('ИИ-аватар');
        await expect(intro.locator('.site-video-watch-link')).not.toBeVisible();
        const frameBox = await intro.locator('.site-video-frame').boundingBox();
        const figureBox = await intro.locator('figure').boundingBox();
        assert.ok(figureBox.height < frameBox.height + 64, 'Excessive caption height');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'Horizontal overflow');
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: `${evidence}/${live ? 'live' : 'local'}-ru-minimal-${engine}-${width}.png` });
        await intro.screenshot({ path: `${evidence}/${live ? 'live' : 'local'}-ru-player-${engine}-${width}.png` });

        const summary = intro.locator('details summary');
        await summary.focus();
        await summary.press('Enter');
        await expect(intro.locator('details')).toHaveAttribute('open', '');
        await expect(intro.locator('.site-video-more')).toContainText('Буду рад вместе исследовать вашу ситуацию');
        await expect(intro.locator('.site-video-watch-link')).toBeVisible();
        await expect(intro.locator('.site-video-watch-link')).toHaveAttribute('href', `https://app.heygen.com/share/${videoId}`);
        await summary.press('Enter');
        await expect(intro.locator('.site-video-more')).not.toBeVisible();
        await intro.getByRole('button', { name: /^Смотреть видео:/ }).click();
        await expect(intro.locator('iframe')).toHaveAttribute('src', `https://app.heygen.com/embeds/${videoId}`);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
        assert.deepEqual(errors, []);
        results.push({ engine, width, poster: 'real frame, loaded', caption: 'compact, no duplicate duration', transcript: 'keyboard accessible', playbackGate: 'exact unchanged HeyGen iframe after click', pageErrors: 0 });
        console.log(`PASS: ${live ? 'live' : 'local'} RU minimal, ${engine}, ${width}px`);
        await context.close();
      }
      const page = await browser.newPage();
      const response = await page.goto(`${origin}/en/about`, { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200);
      await expect(page.locator('#psychic-alchemy-video')).toBeVisible();
      assert.equal(await page.locator('.site-video-player--minimal').count(), 0);
      assert.equal(await page.locator('.about-video-grid .site-video-player').count(), 3);
      await page.close();
    } finally { await browser.close(); }
  }
  writeFileSync(`${evidence}/${live ? 'live' : 'local'}-ru-minimal-results.json`, JSON.stringify({ scope: live ? 'read-only live page, no media regeneration' : 'production build, no production credentials', results, englishIntro: 'unchanged', fullAudioOrLipSyncReview: 'not part of this presentation-only check' }, null, 2));
} finally {
  if (app) app.kill('SIGTERM');
}
