'use strict';
// Fail-closed proof: real WebKit is running inside the version-matched official
// Playwright Linux image and is reachable only on the isolated runner loopback.
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const endpoint = process.env.HH_SITE_VIDEO_WEBKIT_WS_ENDPOINT || '';
  let url;
  try { url = new URL(endpoint); } catch { throw Error('Missing real loopback WebKit server endpoint'); }
  if (url.protocol !== 'ws:' || url.hostname !== '127.0.0.1' || url.port !== '39120' ||
      url.pathname !== '/' || url.username || url.password || url.search || url.hash) {
    throw Error('WebKit server endpoint must be the pinned isolated runner loopback');
  }

  const imported = await import('@playwright/test');
  const webkit = (imported.default || imported).webkit;
  if (!webkit || typeof webkit.connect !== 'function') throw Error('Missing real Playwright WebKit client');

  let browser, lastError;
  for (let attempt = 0; attempt < 24; attempt++) {
    try {
      browser = await webkit.connect(endpoint, { timeout: 3500 });
      break;
    } catch (error) {
      lastError = error;
      await sleep(500);
    }
  }
  if (!browser) throw Error('Real WebKit server did not become ready: ' + (lastError?.message || 'unknown'));

  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await page.goto('data:text/html,<title>HH remote WebKit readiness</title>', { waitUntil: 'load', timeout: 15000 });
    if (await page.title() !== 'HH remote WebKit readiness') throw Error('Real WebKit data-page assertion failed');
    await page.close();
    console.log('HH_BROWSER_REAL_REMOTE_WEBKIT_OK');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
