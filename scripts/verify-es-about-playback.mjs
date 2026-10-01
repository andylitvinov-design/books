// Read-only production playback probe. No provider credentials or form submissions.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, webkit, expect } from '@playwright/test';
const evidence = '/tmp/site-video-evidence';
mkdirSync(evidence, { recursive: true });
const results = [];
for (const [engine, browserType] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await browserType.launch({ headless: true });
  let page;
  try {
    page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await page.goto('https://holistichouse.vercel.app/es/about', { waitUntil: 'domcontentloaded', timeout: 60000 });
    const intro = page.locator('[data-video-slot="about-intro"][data-video-locale="es"]');
    await expect(intro.locator('iframe')).toHaveCount(0);
    await intro.getByRole('button', { name: /^Ver vídeo:/ }).click();
    await expect(intro.locator('iframe')).toHaveAttribute('src', 'https://app.heygen.com/embeds/2c251709aba74fd96ae8be43257a080b');
    const video = intro.frameLocator('iframe').locator('video');
    await expect(video).toHaveCount(1, { timeout: 60000 });
    // A mounted video is not ready: HeyGen asynchronously assigns its source.
    // Calling play before that source is loaded causes an AbortError in both engines.
    await expect.poll(() => video.evaluate(el => Boolean(el.currentSrc) && el.readyState >= 2 && Number.isFinite(el.duration)), { timeout: 60000 }).toBe(true);
    const before = await video.evaluate(el => ({ time: el.currentTime, duration: el.duration, readyState: el.readyState }));
    assert.ok(before.duration > 30 && before.duration < 32);
    assert.ok(before.time < 1, 'The probe must start at the beginning');
    const playbackStartedAt = Date.now();
    let loadRetries = 0;
    for (;;) {
      try {
        await video.evaluate(async el => { el.muted = true; await el.play(); });
        break;
      } catch (error) {
        // Only retry a bounded provider source-load race. Codec, permission and
        // other failures still fail immediately; progress and natural end remain mandatory.
        if (!String(error.message).includes('AbortError') || loadRetries >= 2) throw error;
        loadRetries += 1;
        await expect.poll(() => video.evaluate(el => el.readyState >= 2 && !el.error), { timeout: 15000 }).toBe(true);
      }
    }
    await expect.poll(() => video.evaluate(el => el.currentTime), { timeout: 45000 }).toBeGreaterThan(3);
    const first = await video.evaluate(el => ({ duration: el.duration, width: el.videoWidth, height: el.videoHeight, time: el.currentTime, error: el.error?.code ?? null }));
    assert.ok(first.width >= 640 && first.height > 0);
    assert.equal(first.error, null);
    await intro.screenshot({ path: `${evidence}/live-es-playing-${engine}.png` });
    // Play all 31 seconds without seeking or changing the playback rate.
    await expect.poll(() => video.evaluate(el => el.ended), { timeout: 60000 }).toBe(true);
    const end = await video.evaluate(el => ({ time: el.currentTime, rate: el.playbackRate, error: el.error?.code ?? null }));
    assert.ok(end.time >= 30);
    assert.equal(end.rate, 1);
    assert.equal(end.error, null);
    const elapsedSeconds = (Date.now() - playbackStartedAt) / 1000;
    assert.ok(elapsedSeconds >= 29, 'Natural full-length playback, not a seek to the end');
    results.push({ engine, ...first, before, end, elapsedSeconds, loadRetries, endReached: true, fullPlaybackWithoutSeeking: true, mutedAutomatedPlayback: true });
    console.log(`PASS full Spanish streaming: ${engine}`);
  } catch (error) {
    results.push({ engine, error: String(error.message).slice(0, 2000) });
    if (page) await page.screenshot({ path: `${evidence}/live-es-playback-failed-${engine}.png` }).catch(() => {});
  } finally { await browser.close(); }
}
writeFileSync(`${evidence}/live-es-streaming-results.json`, JSON.stringify(results, null, 2));
assert.ok(results.every(result => result.endReached), 'Some third-party playback probes did not finish');
