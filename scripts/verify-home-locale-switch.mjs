import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium, webkit, expect } from '@playwright/test';

const live = process.argv.includes('--live');
const origin = live ? 'https://holistichouse.vercel.app' : 'http://127.0.0.1:3129';
const evidence = 'tmp/home-locale-switch';
await mkdir(evidence, { recursive: true });
const results = [];
let app;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function exercise(engine, browserType, width) {
  const browser = await browserType.launch();
  const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let delayedLocale = null;
  let heldRequests = 0;
  // Hold the real RSC response. This makes the old double-switch race deterministic.
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === origin && url.pathname === '/' && request.headers().rsc === '1' && url.searchParams.get('lang') === delayedLocale) {
      heldRequests++;
      const response = await route.fetch();
      await pause(2000);
      await route.fulfill({ response });
    } else await route.continue();
  });
  try {
    await page.goto(origin + '/?lang=en', { waitUntil: 'domcontentloaded' });
    for (const [from, to] of [['en', 'ru'], ['ru', 'en']]) {
      const current = page.locator(`[data-video-slot="home-intro"][data-video-locale="${from}"]`);
      if (await current.locator('iframe').count() === 0) await current.locator('.site-video-play').click();
      await expect(current.locator('iframe')).toHaveCount(1);
      const countBefore = heldRequests;
      delayedLocale = to;
      await page.locator('.site-language-menu-trigger').click();
      await page.locator(`.site-language-switch button[lang="${to}"]`).click();
      await expect.poll(() => heldRequests, { timeout: 15000 }).toBeGreaterThan(countBefore);
      // Before the navigation commits, the new language must not become a clickable
      // optimistic player that will be discarded when the RSC response arrives.
      await expect(page.locator('main.house-home')).toHaveAttribute('lang', from);
      const next = page.locator(`[data-video-slot="home-intro"][data-video-locale="${to}"]`);
      await expect(next).toHaveCount(1, { timeout: 20000 });
      await expect(next.locator('iframe')).toHaveCount(0);
      await next.locator('.site-video-play').click();
      const expectedId = to === 'en' ? 'ed202847a43a96b918308aa972177b34' : '388a04b39ebf215ae656bcd22d0d0847';
      await expect(next.locator('iframe')).toHaveAttribute('src', `https://app.heygen.com/embeds/${expectedId}`);
      const frame = await next.locator('iframe').elementHandle();
      await pause(2200);
      assert.ok(await frame.evaluate(element => element.isConnected), 'First-click iframe was discarded after navigation');
      await expect(page).toHaveURL(new RegExp(`\\?lang=${to}$`));
      delayedLocale = null;
      results.push({ engine, width, from, to, heldRsc: true, firstClickRetained: true });
    }
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `${evidence}/${live ? 'live' : 'local'}-${engine}-${width}.png`, fullPage: true });
  } catch (error) {
    results.push({ engine, width, failure: error.message, pageErrors: errors });
    await page.screenshot({ path: `${evidence}/failed-${engine}-${width}.png`, fullPage: true }).catch(() => {});
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

try {
  if (!live) {
    app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3129'], { stdio: 'ignore', env: { ...process.env, NODE_ENV: 'production' } });
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(origin, { signal: AbortSignal.timeout(2000) })).ok) { ready = true; break; } } catch {}
      await pause(1000);
    }
    assert.ok(ready, 'Local production server did not start');
  }
  const outcomes = await Promise.allSettled([['chromium', chromium], ['webkit', webkit]].flatMap(([name, type]) => [390, 1365].map(width => exercise(name, type, width))));
  assert.ok(outcomes.every(result => result.status === 'fulfilled'), 'Locale-switch regression failed; inspect artifact');
  assert.equal(results.filter(result => result.firstClickRetained).length, 8);
  console.log('PASS: eight delayed-RSC EN/RU switches, Chromium/WebKit, mobile/desktop; no lost first click');
} finally {
  await writeFile(`${evidence}/${live ? 'live' : 'local'}-results.json`, JSON.stringify({ origin, results, fullPlayback: 'Not claimed by this interaction-only test' }, null, 2));
  app?.kill('SIGTERM');
}
