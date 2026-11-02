import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';

export function assertHistoryProvenanceEvidence(result) {
  const { home, about, repeated, hashes, reloadedHome, foreignAbout, events, errors } = result;
  for (const snapshot of [home, about, ...repeated, ...hashes, reloadedHome, foreignAbout]) {
    assert.equal(typeof snapshot.key, 'string', 'Native Navigation entry keys must be supported');
    assert.ok(snapshot.key, 'Native entry key must be nonempty');
    assert.equal(snapshot.owned, true, 'Settled destination must belong to its document');
  }
  assert.equal(about.document, home.document, 'Ordinary same-policy link stays soft');
  assert.notEqual(about.key, home.key, 'Soft link creates a distinct native entry');
  assert.equal(repeated.length, 4, 'Two complete native Back/Forward cycles');
  repeated.forEach((snapshot, i) => {
    assert.equal(snapshot.document, home.document, 'Owned history traversal keeps the document');
    assert.equal(snapshot.key, i % 2 ? about.key : home.key, 'Native Back/Forward returns the exact owned entry');
  });
  assert.equal(hashes.length, 3, 'Hash click, Back and Forward are all observed');
  hashes.forEach(snapshot => assert.equal(snapshot.document, home.document, 'Owned hash navigation keeps the document'));
  assert.equal(hashes[0].hash, '#hh-provenance-hash');
  assert.equal(hashes[1].hash, '');
  assert.equal(hashes[2].hash, '#hh-provenance-hash');
  assert.equal(hashes[0].key, hashes[2].key);
  assert.equal(hashes[1].key, about.key);
  assert.notEqual(reloadedHome.document, home.document, 'Reload creates a fresh document');
  assert.notEqual(foreignAbout.document, reloadedHome.document, 'Foreign history entry must load a fresh document');
  assert.equal(foreignAbout.pathname, '/en/about');
  const foreignRestore = events?.find(event =>
    (event.type === 'popstate' || (event.type === 'pageshow' && event.persisted === true))
    && event.document === reloadedHome.document && event.owned === false
    && event.key === about.key && new URL(event.url).pathname === '/en/about');
  assert.ok(foreignRestore, 'Guard proof requires an unowned About restore observed inside the reloaded Home document');
  assert.deepEqual(errors, [], 'No browser JavaScript errors in provenance journey');
  return { foreignHistoryReloadVerified: true, ownedHistoryVerified: true, hashHistoryVerified: true };
}

export async function verifyHistoryProvenance({ browser, origin, evidencePath }) {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Candidate-only probe must run locally');
  const { expect } = await import('@playwright/test');
  const context = await browser.newContext({ viewport: { width: 390, height: 900 }, serviceWorkers: 'block' });
  const result = { repeated: [], hashes: [], errors: [] };
  await context.addInitScript(() => {
    if (window.top !== window) return;
    window.__historyProofDocument = crypto.randomUUID();
    const record = (type, extra = {}) => {
      const events = JSON.parse(sessionStorage.getItem('__historyProofEvents') || '[]');
      events.push({ type, document: window.__historyProofDocument, url: location.href,
        key: window.navigation?.currentEntry?.key ?? null, owned: window.__hhOwnsHistoryEntry?.() ?? null, ...extra });
      sessionStorage.setItem('__historyProofEvents', JSON.stringify(events));
    };
    window.addEventListener('pageshow', event => record('pageshow', { persisted: event.persisted }), true);
    window.addEventListener('popstate', () => record('popstate'), true);
    window.navigation?.addEventListener('currententrychange', event => record('currententrychange', { navigationType: event.navigationType }));
  });
  const page = await context.newPage();
  page.on('pageerror', error => result.errors.push(error.message));
  const snapshot = () => page.evaluate(() => ({ document: window.__historyProofDocument,
    key: window.navigation?.currentEntry?.key ?? null, owned: window.__hhOwnsHistoryEntry?.() ?? null,
    pathname: location.pathname, hash: location.hash }));
  const ready = async path => {
    await expect(page).toHaveURL(origin + path);
    if (path === "/") await expect(page.locator('main[data-home-design="approved-v2"]')).toBeVisible();
    else await expect(page.locator("#psychic-alchemy-video")).toBeVisible();
    await expect.poll(() => page.evaluate(() => history.pushState.toString().includes('__NA'))).toBe(true);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  };
  try {
    await page.goto(origin + '/', { waitUntil: 'networkidle' });
    await ready('/'); result.home = await snapshot();
    await page.locator('.service-home-about a[href="/en/about"]').click();
    await ready('/en/about'); result.about = await snapshot();
    for (let i = 0; i < 2; i++) {
      await page.goBack({ waitUntil: 'domcontentloaded' }); await ready('/'); result.repeated.push(await snapshot());
      await page.goForward({ waitUntil: 'domcontentloaded' }); await ready('/en/about'); result.repeated.push(await snapshot());
    }
    // Use a real browser anchor click, not pushState, to exercise hash navigation.
    await page.evaluate(() => {
      const anchor = document.createElement('a'); anchor.id = 'hh-provenance-link';
      anchor.href = '#hh-provenance-hash'; anchor.textContent = 'History hash probe';
      anchor.style.cssText = 'position:fixed;top:120px;left:10px;z-index:2147483647;background:white;color:black;padding:8px';
      const target = document.createElement('div'); target.id = 'hh-provenance-hash';
      document.body.append(anchor, target);
    });
    await page.locator('#hh-provenance-link').click(); await ready('/en/about#hh-provenance-hash'); result.hashes.push(await snapshot());
    await page.goBack({ waitUntil: 'domcontentloaded' }); await ready('/en/about'); result.hashes.push(await snapshot());
    await page.goForward({ waitUntil: 'domcontentloaded' }); await ready('/en/about#hh-provenance-hash'); result.hashes.push(await snapshot());
    await page.goBack({ waitUntil: 'domcontentloaded' }); await ready('/en/about');
    await page.goBack({ waitUntil: 'domcontentloaded' }); await ready('/');
    await page.reload({ waitUntil: 'networkidle' }); await ready('/'); result.reloadedHome = await snapshot();
    await page.goForward({ waitUntil: 'domcontentloaded' }); await ready('/en/about');
    await expect.poll(async () => (await snapshot()).document).not.toBe(result.reloadedHome.document);
    await page.waitForLoadState('networkidle'); await ready('/en/about');
    result.foreignAbout = await snapshot();
    result.events = await page.evaluate(() => JSON.parse(sessionStorage.getItem('__historyProofEvents') || '[]'));
    // Authoritative persisted restoration is covered separately by raw CDP.
    return assertHistoryProvenanceEvidence(result);
  } finally {
    result.events = await page.evaluate(() => JSON.parse(sessionStorage.getItem('__historyProofEvents') || '[]')).catch(() => []);
    writeFileSync(evidencePath, JSON.stringify(result, null, 2));
    await context.close();
  }
}
