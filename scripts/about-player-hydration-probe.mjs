import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';

// A loopback-only production-build fixture. Hold application scripts to expose
// the real SSR control, then release them and verify the same document's player.
// Provider content is synthetic; this does not claim decoded HeyGen playback.
export async function verifyAboutPlayerHydration(browserType, { origin, evidence, label }) {
  assert.ok(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname));
  const browser = await browserType.launch();
  const result = { engine: browserType.name(), providerStubbed: true, decodedPlaybackClaimed: false, journeys: [] };
  try {
    for (const delayed of [true, false]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 900 }, serviceWorkers: 'block' });
      const row = { delayed, heldScripts: [], pageErrors: [], requests: [] };
      result.journeys.push(row);
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      await context.route('**/*', async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin === 'https://app.heygen.com' && url.pathname === '/embeds/fd5fcead9b067f9a0649862675a38771') {
          row.requests.push({ url: url.href, time: Date.now() });
          return route.fulfill({ contentType: 'text/html', body: '<p data-hydration-player>Allowed About embed</p>' });
        }
        if (delayed && url.origin === new URL(origin).origin && request.resourceType() === 'script') {
          row.heldScripts.push(url.pathname);
          await gate;
        }
        return route.continue();
      });
      await context.addInitScript(() => {
        if (window.top !== window) return;
        window.__aboutClickProbe = [];
        addEventListener('click', event => {
          const button = event.target.closest?.('#psychic-alchemy-video button');
          if (button) window.__aboutClickProbe.push({ time: performance.now(), readyState: document.readyState, hydrated: history.pushState.toString().includes('__NA'), trusted: event.isTrusted, disabled: button.disabled });
        }, true);
      });
      const page = await context.newPage();
      page.on('pageerror', error => row.pageErrors.push({ message: error.message, stack: error.stack }));
      const button = page.locator('#psychic-alchemy-video button');
      const frame = page.frameLocator('#psychic-alchemy-video iframe').locator('[data-hydration-player]');
      try {
        const response = await page.goto(origin + '/en/about', { waitUntil: delayed ? 'commit' : 'load' });
        assert.equal(response.status(), 200);
        assert.match(response.headers()['content-security-policy'], /frame-src https:\/\/www\.youtube-nocookie\.com https:\/\/app\.heygen\.com;/);
        await button.waitFor({ state: 'visible' });
        if (!delayed) {
          await page.waitForFunction(() => history.pushState.toString().includes('__NA'));
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        }
        await button.scrollIntoViewIfNeeded();
        row.before = await button.evaluate(element => ({ disabled: element.disabled, ariaBusy: element.getAttribute('aria-busy'), readyState: document.readyState, hydrated: history.pushState.toString().includes('__NA') }));
        if (delayed) {
          assert.ok(row.heldScripts.length > 0, 'The delayed fixture must actually withhold application scripts');
          assert.equal(row.before.hydrated, false, 'Capture the actual pre-hydration SSR button');
        }
        // A physical click also tests the browser's suppression of disabled
        // buttons; Playwright's enabled-control auto-wait would hide this phase.
        const box = await button.boundingBox();
        assert.ok(box);
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        row.afterClick = await page.evaluate(() => ({ iframes: document.querySelectorAll('#psychic-alchemy-video iframe').length, clicks: window.__aboutClickProbe }));
        release();
        await page.waitForLoadState('load');
        await page.waitForFunction(() => history.pushState.toString().includes('__NA'));
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        row.firstClickPreserved = await frame.waitFor({ state: 'visible', timeout: 2000 }).then(() => true, () => false);
        row.afterHydration = await page.evaluate(() => ({ posterPresent: !!document.querySelector('#psychic-alchemy-video button'), iframes: document.querySelectorAll('#psychic-alchemy-video iframe').length, hydrated: history.pushState.toString().includes('__NA'), clicks: window.__aboutClickProbe }));
        if (!row.firstClickPreserved) {
          await button.click();
          await frame.waitFor({ state: 'visible' });
          row.oneHydratedClickWorks = true;
        }
        assert.deepEqual(row.pageErrors, []);
      } finally {
        release();
        await context.close();
      }
    }
    const [delayed, control] = result.journeys;
    assert.equal(control.firstClickPreserved, true, 'The hydrated control must activate with one physical click');
    assert.ok(delayed.before.disabled || delayed.firstClickPreserved, 'An enabled SSR About control lost its trusted click before hydration');
    return result;
  } finally {
    writeFileSync(`${evidence}/${label}-about-hydration-${browserType.name()}.json`, JSON.stringify(result, null, 2));
    await browser.close();
  }
}
