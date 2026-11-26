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
  const result = { repeated: [], hashes: [], errors: [], stage: 'initial-home', aboutClick: null };
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
    // This probe exercises the full Next.js Home while the normal entry is
    // served as a separate, cacheable CDN document. Never conflate their
    // navigation ownership or assume the CDN shell has a Next router.
    await expect(page).toHaveURL(origin + path, { timeout: 20000 });
    if (path === "/") await expect(page.locator('main[data-home-design="dialogue-first-v1"] [data-home-dialogue-entry]')).toBeVisible();
    else await expect(page.locator("#psychic-alchemy-video")).toBeVisible();
    await expect.poll(() => page.evaluate(() => history.pushState.toString().includes('__NA'))).toBe(true);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  };
  try {
    // The owner's approved React Home is now canonical at the ordinary URL.
    // Verify both first-paint identity and the real hydrated Native Navigation path;
    // an old static shell must not satisfy this security/history provenance proof.
    await page.goto(origin + '/', { waitUntil: 'networkidle' });
    await expect(page.locator('body[data-fast-home]')).toHaveCount(0);
    await expect(page.locator('main[data-home-design="dialogue-first-v1"] [data-home-dialogue-entry]')).toBeVisible();
    await expect(page.locator('[data-home-intent-option]')).toHaveCount(4);
    for (const intent of ['clarity', 'goal', 'business', 'reiki']) {
      await expect(page.locator(`[data-home-intent-option="${intent}"]`)).toBeVisible();
    }
    await expect(page.locator('[data-home-stage-option], [data-home-mode-button], [data-home-how-it-works]')).toHaveCount(0);
    await expect(page.locator('[data-home-intent-form]')).toBeVisible();
    await expect(page.locator('[data-home-methods]')).toBeVisible();
    await ready('/'); result.home = await snapshot();
    // The lazy catalogue above About can expand when Playwright first scrolls
    // down to the link. A single real click must land on the intended anchor.
    // Settle that actual user-visible content before the click, just as in the
    // cross-policy history matrix. Do not navigate programmatically or retry taps.
    result.stage = 'prepare-about';
    const deferredHome = page.locator('[data-home-deferred-sections]');
    await expect(deferredHome).toHaveCount(1);
    await deferredHome.scrollIntoViewIfNeeded();
    await expect(deferredHome.locator('[data-home-deferred-content]')).toBeVisible({ timeout: 20000 });
    const aboutLink = page.locator('.service-home-about a[href="/en/about"]');
    await expect(aboutLink).toHaveCount(1);
    await expect(aboutLink).toBeVisible();
    await aboutLink.evaluate(node => node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
    await expect.poll(() => aboutLink.evaluate(node => {
      const rect = node.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return Boolean(hit && node.contains(hit));
    }), { message: 'About link center must be hit-testable after lazy Home layout' }).toBe(true);
    await page.evaluate(() => {
      window.__historyProofAboutClick = null;
      document.addEventListener('click', event => {
        const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
        window.__historyProofAboutClick = { href: link?.getAttribute('href') || null, trusted: event.isTrusted };
      }, { capture: true, once: true });
    });
    result.stage = 'click-about';
    await aboutLink.click();
    await ready('/en/about');
    result.aboutClick = await page.evaluate(() => window.__historyProofAboutClick);
    assert.deepEqual(result.aboutClick, { href: '/en/about', trusted: true }, 'The same-policy navigation must come from a real click on About');
    result.about = await snapshot();
    result.stage = 'owned-back-forward';
    for (let i = 0; i < 2; i++) {
      await page.goBack({ waitUntil: 'domcontentloaded' }); await ready('/'); result.repeated.push(await snapshot());
      await page.goForward({ waitUntil: 'domcontentloaded' }); await ready('/en/about'); result.repeated.push(await snapshot());
    }
    result.stage = 'hash-back-forward';
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
    result.stage = 'reload-home';
    await page.reload({ waitUntil: 'networkidle' }); await ready('/'); result.reloadedHome = await snapshot();
    result.stage = 'restore-foreign-about';
    await page.goForward({ waitUntil: 'domcontentloaded' }); await ready('/en/about');
    await expect.poll(async () => (await snapshot()).document).not.toBe(result.reloadedHome.document);
    await page.waitForLoadState('networkidle'); await ready('/en/about');
    result.foreignAbout = await snapshot();
    result.events = await page.evaluate(() => JSON.parse(sessionStorage.getItem('__historyProofEvents') || '[]'));
    // Authoritative persisted restoration is covered separately by raw CDP.
    result.stage = 'assert-provenance';
    return assertHistoryProvenanceEvidence(result);
  } catch (error) {
    result.aboutClick ??= await page.evaluate(() => window.__historyProofAboutClick ?? null).catch(() => null);
    const state = await snapshot().catch(() => null);
    throw new Error(`${error.message}; stage=${result.stage}; aboutClick=${JSON.stringify(result.aboutClick)}; state=${JSON.stringify(state)}`, { cause: error });
  } finally {
    result.events = await page.evaluate(() => JSON.parse(sessionStorage.getItem('__historyProofEvents') || '[]')).catch(() => []);
    writeFileSync(evidencePath, JSON.stringify(result, null, 2));
    await context.close();
  }
}
