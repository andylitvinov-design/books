// Read-only production smoke test: first real decoded frames on the already
// approved homepage masters, not merely a successful iframe insertion.
// The exhaustive eight-video natural playback check remains release-only.
import assert from 'node:assert/strict';
import { chromium, webkit, expect } from '@playwright/test';

const origin = 'https://holistichouse.vercel.app';
const cases = [
  { locale: 'en', id: 'ed202847a43a96b918308aa972177b34' },
  { locale: 'ru', id: '388a04b39ebf215ae656bcd22d0d0847' },
];

for (const [engine, browserType] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await browserType.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    try {
      for (const { locale, id } of cases) {
        const response = await page.goto(`${origin}/?lang=${locale}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        assert.equal(response.status(), 200, `Homepage ${locale}`);
        const block = page.locator(`[data-video-slot="home-intro"][data-video-locale="${locale}"]`);
        await expect(block).toBeVisible({ timeout: 60000 });
        const poster = block.locator('img.site-video-poster');
        // Posters are intentionally lazy loaded below the fold on mobile.
        // Scroll into view before testing decoding, just as a visitor would.
        await poster.scrollIntoViewIfNeeded();
        await expect.poll(() => poster.evaluate(el => el.complete && el.naturalWidth >= 320), { timeout: 30000 }).toBe(true);
        const play = block.locator('button.site-video-play');
        await expect(play).toBeEnabled({ timeout: 30000 });
        await play.click();
        await expect(block.locator('iframe')).toHaveAttribute('src', `https://app.heygen.com/embeds/${id}`, { timeout: 10000 });
        const video = block.frameLocator('iframe').locator('video');
        await expect(video).toHaveCount(1, { timeout: 60000 });
        await expect.poll(() => video.evaluate(el => Boolean(el.currentSrc) && el.readyState >= 2 && el.videoWidth >= 640 && !el.error), { timeout: 60000 }).toBe(true);
        const before = await video.evaluate(el => el.currentTime);
        for (let attempts = 0; ; attempts++) {
          try {
            await video.evaluate(async el => { el.muted = true; await el.play(); });
            break;
          } catch (error) {
            if (!String(error.message).includes('AbortError') || attempts >= 2) throw error;
            await expect.poll(() => video.evaluate(el => el.readyState >= 2 && !el.error), { timeout: 15000 }).toBe(true);
          }
        }
        await expect.poll(() => video.evaluate(el => el.currentTime), { timeout: 30000 }).toBeGreaterThan(before + 2);
        assert.equal(await video.evaluate(el => el.error?.code ?? null), null);
        console.log(`PASS public home ${locale} decoded/playback on ${engine}`);
      }
      assert.deepEqual(pageErrors, [], `Unexpected homepage script errors on ${engine}`);
    } finally { await context.close(); }
  } finally { await browser.close(); }
}
