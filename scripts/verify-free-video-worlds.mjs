/** Browser acceptance for the existing eight on-device procedural worlds.
 * Run against an isolated local build. Uses no client data or paid provider.
 */
import assert from 'node:assert/strict';
import { chromium, webkit } from '@playwright/test';

const origin = process.env.HH_TEST_PUBLIC_ORIGIN || 'http://127.0.0.1:3100';
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error('Loopback origin required');
const families = ['mandala','light','lotus','temple','tree','cosmic','light_tunnel','flowering_garden'];
for (const [engine, browserType] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await browserType.launch({headless:true});
  try {
    const page = await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    const errors = [], externalPosts = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (request.method() === 'POST' && (new URL(request.url()).origin !== origin ||
        /\/api\/.*(?:generate|render)/i.test(new URL(request.url()).pathname))) externalPosts.push(request.url());
    });
    const response = await page.goto(`${origin}/ru/holistic-support/mandala`, {waitUntil:'domcontentloaded'});
    assert.equal(response?.status(), 200);
    await page.locator('[data-free-video-source="generated"]').click();
    const studio = page.locator('[data-free-video-generator]');
    const canvas = studio.locator('[data-free-video-canvas]');
    await canvas.waitFor({state:'visible'});
    const hash = () => canvas.evaluate(el => {
      const pixels = el.getContext('2d').getImageData(0,0,el.width,el.height).data;
      let h = 2166136261;
      for (let i=0;i<pixels.length;i+=43) h = Math.imul(h ^ pixels[i],16777619);
      return h >>> 0;
    });
    const frames = new Map();
    for (const family of families) {
      const button = studio.locator(`[data-free-video-family="${family}"]`);
      await button.click();
      await page.waitForFunction(id => document.querySelector(`[data-free-video-family="${id}"]`)?.getAttribute('aria-pressed') === 'true', family);
      // React's effect paints the paused frame at t=0 after the selection commits.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const initial = await hash();
      frames.set(family, initial);
      await studio.locator('[data-free-video-play]').click();
      await page.waitForFunction(previous => {
        const canvas = document.querySelector('[data-free-video-canvas]');
        const pixels = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        let h=2166136261; for(let i=0;i<pixels.length;i+=43) h=Math.imul(h^pixels[i],16777619);
        return (h>>>0)!==previous;
      }, initial, {timeout:10000});
      const moving = await hash();
      await page.waitForFunction(previous => {
        const canvas = document.querySelector('[data-free-video-canvas]');
        const pixels = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        let h=2166136261; for(let i=0;i<pixels.length;i+=43) h=Math.imul(h^pixels[i],16777619);
        return (h>>>0)!==previous;
      }, moving, {timeout:10000});
      await studio.locator('[data-free-video-play]').click();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(await hash(), initial, `${engine}/${family}: same seed and time must reproduce the frame`);
      await studio.locator('[data-free-video-variant]').click();
      await page.waitForFunction(previous => {
        const canvas = document.querySelector('[data-free-video-canvas]');
        const pixels = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        let h=2166136261; for(let i=0;i<pixels.length;i+=43) h=Math.imul(h^pixels[i],16777619);
        return (h>>>0)!==previous;
      }, initial, {timeout:10000});
      await button.click(); // Selecting the same family resets the variation to zero.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(await hash(), initial, `${engine}/${family}: resetting the seed must reproduce the frame`);
    }
    assert.equal(new Set(frames.values()).size, families.length, `${engine}: eight families must have distinct pixels`);
    assert.deepEqual(externalPosts, [], `${engine}: no external provider POST`);
    assert.deepEqual(errors, [], `${engine}: no page exceptions`);
    console.log(`PASS ${engine}: eight distinct, moving and reproducible procedural worlds`);
    await page.close();
  } finally { await browser.close(); }
}
