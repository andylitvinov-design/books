// Read-only production playback probe. No provider credentials or form submissions.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, webkit, expect } from '@playwright/test';
const evidence = '/tmp/site-video-evidence';
mkdirSync(evidence, { recursive: true });
const results = [];
for (const [engine, browserType] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await browserType.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await page.goto('https://holistichouse.vercel.app/es/about', { waitUntil: 'domcontentloaded', timeout: 60000 });
    const intro = page.locator('[data-video-slot="about-intro"][data-video-locale="es"]');
    await expect(intro.locator('iframe')).toHaveCount(0);
    await intro.getByRole('button', { name: /^Ver vídeo:/ }).click();
    await expect(intro.locator('iframe')).toHaveAttribute('src', 'https://app.heygen.com/embeds/2c251709aba74fd96ae8be43257a080b');
    const video = intro.frameLocator('iframe').locator('video');
    await expect(video).toHaveCount(1, { timeout: 60000 });
    await video.evaluate(async el => { el.muted = true; await el.play(); });
    await expect.poll(() => video.evaluate(el => el.currentTime), { timeout: 45000 }).toBeGreaterThan(3);
    const first = await video.evaluate(el => ({ duration: el.duration, width: el.videoWidth, height: el.videoHeight, time: el.currentTime, error: el.error?.code ?? null }));
    assert.ok(first.duration > 30 && first.duration < 32);
    assert.ok(first.width >= 640 && first.height > 0);
    assert.equal(first.error, null);
    await intro.screenshot({ path: `${evidence}/live-es-playing-${engine}.png` });
    await video.evaluate(el => { el.currentTime = Math.max(0, el.duration - 2); });
    await expect.poll(() => video.evaluate(el => el.ended), { timeout: 20000 }).toBe(true);
    results.push({ engine, ...first, endReached: true, mutedAutomatedPlayback: true });
    console.log(`PASS Spanish streaming: ${engine}`);
  } catch (error) {
    results.push({ engine, error: String(error.message).slice(0, 2000) });
  } finally { await browser.close(); }
}
writeFileSync(`${evidence}/live-es-streaming-results.json`, JSON.stringify(results, null, 2));
assert.ok(results.every(result => result.endReached), 'Some third-party playback probes did not finish');
