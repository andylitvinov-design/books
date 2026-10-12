import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit, expect } from '@playwright/test';

// Read-only public Tantra checks. No form submission, account data or live-site default.
const origin = process.env.TANTRA_ORIGIN || 'http://127.0.0.1:3123';
const target = new URL(origin);
assert.ok(['127.0.0.1', 'localhost', 'holistichouse.vercel.app'].includes(target.hostname));
assert.ok(!target.username && !target.password && !target.search && !target.hash && target.pathname === '/');
const manifest = JSON.parse(await readFile(new URL('../data/academy/tantra-native-assets.json', import.meta.url), 'utf8'));
const sources = manifest.nativeVideos.map(asset => asset.url);
const posters = manifest.assets.filter(asset => asset.contentType === 'image/png').map(asset => new URL(asset.path, origin).href);
const result = { origin, assets: [], journeys: [] };
try {
  // Verify complete first-party poster bytes. Original MP4 provider probes are separate.
  for (const asset of manifest.assets) {
    const url = new URL(asset.path, origin).href;
    const response = await fetch(url, { redirect: 'error' });
    assert.equal(response.status, 200, asset.path);
    assert.equal(response.url, url);
    assert.equal(response.headers.get('content-type')?.split(';')[0], asset.contentType);
    const digest = createHash('sha256');
    let bytes = 0;
    for await (const chunk of response.body) { digest.update(chunk); bytes += chunk.length; }
    assert.equal(bytes, asset.bytes, asset.path);
    assert.equal(digest.digest('hex'), asset.sha256, asset.path);
    result.assets.push({ path: asset.path, bytes, sha256: asset.sha256, verified: true });
  }
  for (const asset of manifest.nativeVideos) {
    const head = await fetch(asset.url, { method: 'HEAD', redirect: 'error', signal: AbortSignal.timeout(30000) });
    assert.equal(head.status, 200);
    assert.equal(head.headers.get('content-type')?.split(';')[0], 'video/mp4');
    assert.equal(Number(head.headers.get('content-length')), asset.sourceBytes);
    const partial = await fetch(asset.url, { redirect: 'error', headers: { Range: 'bytes=0-1023' }, signal: AbortSignal.timeout(30000) });
    assert.equal(partial.status, 206, 'Canonical native video must support byte ranges');
    assert.equal(partial.headers.get('content-range'), `bytes 0-1023/${asset.sourceBytes}`);
    assert.equal((await partial.arrayBuffer()).byteLength, 1024);
    result.assets.push({ url: asset.url, headStatus: 200, rangeStatus: 206, firstParty: false });
  }
  for (const [engine, browserType] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await browserType.launch();
    try {
      for (const width of [390, 1365]) {
        for (const locale of ['en', 'ru', 'es']) {
          const context = await browser.newContext({ viewport: { width, height: 900 } });
          const pageErrors = [];
          try {
            // Deterministic renderer/CSP test only; do not claim YouTube decoded playback.
            await context.route('https://www.youtube-nocookie.com/embed/qM_nFUkYJ1k?autoplay=1', route => route.fulfill({
              contentType: 'text/html', body: '<!doctype html><title>Alena renderer fixture</title><p id="player-fixture">Allowed YouTube renderer</p>',
            }));
            const page = await context.newPage();
            page.on('pageerror', error => pageErrors.push(error.message));
            const response = await page.goto(origin + `/${locale}/academy/reiki/tantra-reiki`, { waitUntil: 'load' });
            assert.equal(response.status(), 200);
            const csp = response.headers()['content-security-policy'];
            assert.match(csp, /(?:^|;)\s*media-src 'self' https:\/\/psitrends\.com(?:;|$)/);
            const english = page.locator('#tantra-original-english-testimonials');
            const russian = page.locator('#tantra-russian-video-testimonials');
            assert.equal(await english.evaluate(el => el.open), locale === 'en');
            assert.equal(await russian.evaluate(el => el.open), locale !== 'en');
            assert.deepEqual(await russian.locator('video source').evaluateAll(items => items.map(el => el.src)), sources);
            assert.deepEqual(await russian.locator('video').evaluateAll(items => items.map(el => el.poster)), posters);
            if (locale === 'en') {
              await expect(english).toContainText('Litten');
              await expect(english).toContainText('Margaret');
              await expect(russian.locator('summary')).toContainText('Russian audio');
              await expect(russian.locator('video').first()).not.toBeVisible();
              await russian.locator('summary').click();
              await expect(russian.locator('video').first()).toBeVisible();
              await expect(russian.locator('figcaption')).toHaveText([
                'Participant video 1 · Russian audio', 'Participant video 2 · Russian audio',
                'Alena · Tantra Reiki testimonial · Russian audio',
              ]);
            }
            const playback = [];
            for (let index = 0; index < 2; index++) {
              const video = russian.locator('video').nth(index);
              await video.scrollIntoViewIfNeeded();
              await video.evaluate(async el => { el.muted = true; await el.play(); });
              await expect.poll(() => video.evaluate(el => ({ time: el.currentTime, width: el.videoWidth, height: el.videoHeight, ready: el.readyState })), { timeout: 20000 }).toMatchObject({ width: index === 0 ? 464 : 720, height: index === 0 ? 848 : 1280 });
              await expect.poll(() => video.evaluate(el => el.currentTime), { timeout: 20000 }).toBeGreaterThan(0.25);
              const sample = await video.evaluate(el => ({ time: el.currentTime, width: el.videoWidth, height: el.videoHeight, ready: el.readyState, duration: el.duration, frames: el.getVideoPlaybackQuality().totalVideoFrames, error: el.error?.code ?? null, currentSrc: el.currentSrc }));
              assert.equal(sample.error, null);
              assert.equal(sample.currentSrc, sources[index]);
              assert.ok(sample.ready >= 2 && sample.frames > 0, 'A decoded video frame is required');
              assert.ok(Math.abs(sample.duration - (index === 0 ? 321.2 : 236)) < 0.5);
              await video.evaluate(el => el.pause());
              playback.push(sample);
            }
            await russian.locator('button.academy-video-poster').click();
            const alena = russian.locator('iframe');
            await expect(alena).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/qM_nFUkYJ1k?autoplay=1');
            await expect(alena).toHaveAttribute('title', /Alena|Алёна/);
            await expect(page.frameLocator('#tantra-russian-video-testimonials iframe').locator('#player-fixture')).toHaveText('Allowed YouTube renderer');
            if (locale === 'en') {
              await russian.locator('summary').click();
              await expect(russian.locator('video').first()).not.toBeVisible();
              await russian.locator('summary').focus();
              await page.keyboard.press('Enter');
              await expect(russian.locator('video').first()).toBeVisible();
            }
            assert.deepEqual(pageErrors, []);
            const journey = { engine, width, locale, ok: true, nativeDecodedPlayback: playback, alenaRendererSynthetic: true, alenaDecodedPlaybackClaimed: false, pageErrors };
            result.journeys.push(journey);
            console.log(JSON.stringify(journey));
          } finally { await context.close(); }
        }
      }
    } finally { await browser.close(); }
  }
} finally {
  await mkdir('output/tantra-testimonials', { recursive: true });
  await writeFile('output/tantra-testimonials/verification.json', JSON.stringify(result, null, 2));
}
