import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, webkit, expect } from '@playwright/test';
import { classifyCspNavigationCancellation } from './csp-navigation-diagnostics.mjs';
import { verifyAboutPlayerHydration } from './about-player-hydration-probe.mjs';

const origin = process.env.REAUDIT_ORIGIN || 'http://127.0.0.1:3123';
const url = new URL(origin);
assert.ok(['127.0.0.1', 'localhost', 'holistichouse.vercel.app'].includes(url.hostname), 'Use only the local test build or canonical public site');
assert.ok(!url.username && !url.password && !url.search && !url.hash);
const label = process.env.REAUDIT_LABEL || 'local';
const evidence = '/tmp/release-reaudit';
mkdirSync(evidence, { recursive: true });
const results = [];
const media = new Set();
const routes = [
  ['/?lang=en', 'en'], ['/?lang=ru', 'ru'], ['/es', 'es'],
  ...['about', 'services', 'homeopathy', 'books', 'client'].flatMap(section => ['en', 'ru', 'es'].map(locale => [`/${locale}/${section}`, locale])),
  ['/books/maya-tradition', 'en'], ['/books/maya-tradition?lang=ru', 'ru'],
];
const volumes = ['maya-egregor-gods', 'maya-calendar', 'maya-exorcism', 'maya-mysteries'];
async function check(name, detail, fn) {
  try { const extra = await fn(); results.push({ name, ...detail, ok: true, ...extra }); }
  catch (error) { results.push({ name, ...detail, ok: false, error: String(error.message).slice(0, 1800) }); }
}
async function verifyCspBfcache() {
  // Playwright Page lifecycle/locators explicitly do not support BFCache.
  // Use its browser launcher only; every observation/navigation below is CDP.
  const browser = await chromium.launch({ channel: 'chromium', ignoreDefaultArgs: ['--disable-back-forward-cache'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 900 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const exceptions = [];
  const frames = [];
  const notRestored = [];
  const snapshots = [];
  let phase = 'initial';
  let originalProbe;
  cdp.on('Runtime.exceptionThrown', value => exceptions.push({ phase, ...value }));
  cdp.on('Page.frameNavigated', value => frames.push({ phase, ...value }));
  cdp.on('Page.backForwardCacheNotUsed', value => notRestored.push({ phase, ...value }));
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `
    if (window.top === window) {
      window.__rawCspProbe = crypto.randomUUID();
      const record = (type, extra = {}) => {
        const entries = JSON.parse(sessionStorage.getItem('__rawCspLifecycle') || '[]');
        const nav = performance.getEntriesByType('navigation')[0];
        entries.push({ type, time: performance.timeOrigin + performance.now(), probe: window.__rawCspProbe, url: location.href, documentClass: document.body?.dataset.cspClass, readyState: document.readyState, notRestoredReasons: nav?.notRestoredReasons?.toJSON?.() ?? null, ...extra });
        sessionStorage.setItem('__rawCspLifecycle', JSON.stringify(entries));
      };
      record('init');
      addEventListener('pageshow', event => record('pageshow', { persisted: event.persisted }), true);
      addEventListener('pagehide', event => record('pagehide', { persisted: event.persisted }), true);
      addEventListener('popstate', () => record('popstate'), true);
    }
  ` });
  const evaluate = async expression => {
    const value = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    assert.ok(!value.exceptionDetails, JSON.stringify(value.exceptionDetails));
    return value.result.value;
  };
  const snapshot = () => evaluate(`({url:location.href,documentClass:document.body?.dataset.cspClass,readyState:document.readyState,probe:window.__rawCspProbe,hydrated:history.pushState.toString().includes('__NA'),lifecycle:JSON.parse(sessionStorage.getItem('__rawCspLifecycle')||'[]')})`);
  const waitFor = async (description, predicate) => {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      const state = await snapshot().catch(error => ({ protocolError: error.message }));
      snapshots.push({ phase, time: Date.now(), state });
      if (predicate(state)) return state;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.fail(description + '; last=' + JSON.stringify(snapshots.at(-1)));
  };
  try {
    await cdp.send('Page.navigate', { url: origin + '/en/about' });
    const initial = await waitFor('Initial public document must hydrate', state => state.url === origin + '/en/about' && state.documentClass === 'public-video' && state.readyState === 'complete' && state.hydrated);
    originalProbe = initial.probe;
    phase = 'full-document-to-tantra';
    await evaluate(`location.assign('/en/academy/reiki/tantra-reiki')`);
    await waitFor('Full cross-policy navigation must load a fresh Tantra document', state => state.url === origin + '/en/academy/reiki/tantra-reiki' && state.documentClass === 'tantra-media' && state.probe !== originalProbe && state.readyState === 'complete' && state.hydrated);
    const beforeBack = await cdp.send('Page.getNavigationHistory');
    const publicEntry = beforeBack.entries[beforeBack.currentIndex - 1];
    assert.equal(publicEntry.url, origin + '/en/about');
    phase = 'back-to-cached-public';
    await cdp.send('Page.navigateToHistoryEntry', { entryId: publicEntry.id });
    const restored = await waitFor('Back must restore the correct public URL and document policy', state => state.url === origin + '/en/about' && state.documentClass === 'public-video' && state.readyState === 'complete' && state.hydrated);
    const bfcachePersistedVerified = restored.probe === originalProbe && restored.lifecycle.some(event => event.type === 'pageshow' && event.persisted === true && event.probe === originalProbe && event.url === origin + '/en/about');
    let ineligibilityReasons = [];
    if (!bfcachePersistedVerified) {
      assert.notEqual(restored.probe, originalProbe, 'A retained original document requires actual persisted evidence');
      const { frameTree } = await cdp.send('Page.getFrameTree');
      const refusedRestore = notRestored.find(event => event.phase === 'back-to-cached-public' && event.frameId === frameTree.frame.id && event.loaderId === frameTree.frame.loaderId && event.notRestoredExplanationsTree?.url === origin + '/en/about');
      assert.ok(refusedRestore, 'Missing exact-frame/loader BFCache ineligibility evidence');
      ineligibilityReasons = refusedRestore.notRestoredExplanations.map(item => item.reason);
      const knownActualPolicyReasons = ['MainResourceHasCacheControlNoStore', 'JsNetworkRequestReceivedCacheControlNoStoreResource', 'BrowsingInstanceNotSwapped', 'CacheControlNoStoreCookieModified'];
      assert.ok(ineligibilityReasons.includes('MainResourceHasCacheControlNoStore'), 'Only the unchanged no-store policy can establish this ineligible outcome');
      assert.ok(ineligibilityReasons.every(reason => knownActualPolicyReasons.includes(reason)), 'Unknown BFCache blocking reason requires investigation');
    }
    phase = 'forward-to-tantra';
    const beforeForward = await cdp.send('Page.getNavigationHistory');
    const tantraEntry = beforeForward.entries[beforeForward.currentIndex + 1];
    assert.equal(tantraEntry.url, origin + '/en/academy/reiki/tantra-reiki');
    await cdp.send('Page.navigateToHistoryEntry', { entryId: tantraEntry.id });
    await waitFor('Forward must retain the correct Tantra document policy', state => state.url === origin + '/en/academy/reiki/tantra-reiki' && state.documentClass === 'tantra-media' && state.readyState === 'complete' && state.hydrated);
    assert.deepEqual(exceptions, [], 'No runtime exceptions during real BFCache navigation');
    return { rawCDP: true, originalProbe, restoredPublicProbe: restored.probe, bfcacheStatus: bfcachePersistedVerified ? 'restored' : 'ineligible', bfcachePersistedVerified, ineligibilityReasons, interruptedBranchPersistedVerified: false, backForwardVerified: true, decodedPlaybackClaimed: false };
  } finally {
    const finalState = await snapshot().catch(error => ({ protocolError: error.message }));
    writeFileSync(`${evidence}/${label}-csp-chromium-bfcache-cdp.json`, JSON.stringify({ originalProbe, phase, finalState, exceptions, frames, notRestored, snapshots }, null, 2));
    await context.close();
    await browser.close();
  }
}

async function exercise(engine, browserType, width) {
  const browser = await browserType.launch();
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const publicDiagnostics = { pageErrors: [], requests: [], responses: [], failedRequests: [], checkpoints: [], lifecycle: [] };
  let publicPhase = 'initial';
  await context.addInitScript(() => {
    if (window.top !== window) return;
    window.__publicAuditProbe = crypto.randomUUID();
    const record = (type, extra = {}) => {
      const rows = JSON.parse(sessionStorage.getItem('__publicAuditLifecycle') || '[]');
      rows.push({ type, time: performance.timeOrigin + performance.now(), documentProbe: window.__publicAuditProbe,
        url: location.href, readyState: document.readyState, ...extra });
      sessionStorage.setItem('__publicAuditLifecycle', JSON.stringify(rows));
    };
    record('init');
    addEventListener('pageshow', event => record('pageshow', { persisted: event.persisted }), true);
    addEventListener('pagehide', event => record('pagehide', { persisted: event.persisted }), true);
    addEventListener('load', () => record('load'), true);
    document.addEventListener('DOMContentLoaded', () => record('domcontentloaded'), true);
    addEventListener('error', event => {
      if (event instanceof ErrorEvent) record('window-error', { message: event.message, filename: event.filename, line: event.lineno });
      else record('resource-error', { targetTag: event.target?.tagName, resourceUrl: event.target?.currentSrc || event.target?.src || event.target?.href });
    }, true);
    addEventListener('unhandledrejection', event => record('unhandled-rejection', { message: String(event.reason?.message || event.reason) }), true);
    window.navigation?.addEventListener('navigate', event => record('navigate', { destination: event.destination.url, sameDocument: event.destination.sameDocument, navigationType: event.navigationType }));
  });
  const page = await context.newPage();
  let errors = [];
  page.on('pageerror', error => {
    errors.push(String(error.message).slice(0, 300));
    publicDiagnostics.pageErrors.push({ phase: publicPhase, time: Date.now(), pageUrl: page.url(), message: error.message, stack: error.stack });
  });
  const requestDetails = request => {
    let frameUrl = null;
    try { frameUrl = request.frame()?.url() ?? null; } catch { /* Service-worker requests do not have a frame. */ }
    return { phase: publicPhase, time: Date.now(), url: request.url(), method: request.method(), resourceType: request.resourceType(), frameUrl };
  };
  const pendingPublicRequests = new Set();
  let lastPublicRequestActivity = Date.now();
  const finishPublicRequest = request => {
    if (pendingPublicRequests.delete(request)) lastPublicRequestActivity = Date.now();
  };
  page.on('request', request => {
    publicDiagnostics.requests.push(requestDetails(request));
    if (new URL(request.url()).origin === origin) {
      pendingPublicRequests.add(request);
      lastPublicRequestActivity = Date.now();
    }
  });
  page.on('requestfinished', request => {
    publicDiagnostics.responses.push({ ...requestDetails(request), event: 'requestfinished' });
    finishPublicRequest(request);
  });
  page.on('requestfailed', request => {
    publicDiagnostics.failedRequests.push({ ...requestDetails(request), error: request.failure()?.errorText });
    finishPublicRequest(request);
  });
  const settlePublicDocument = async stage => {
    // A previously reached Playwright networkidle state can precede hydration's
    // queued Next prefetches. Observe their actual completion after hydration,
    // including requests triggered by poster scrolling, before replacing a page.
    await expect.poll(() => page.evaluate(() => history.pushState.toString().includes('__NA')), { timeout: 15000 }).toBe(true);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect.poll(() => pendingPublicRequests.size === 0 && Date.now() - lastPublicRequestActivity >= 500, { timeout: 15000, message: 'Hydrated public document requests must finish before the next audit navigation' }).toBe(true);
    publicDiagnostics.checkpoints.push({ type: 'settled', stage, path: publicPhase, time: Date.now(), pendingRequests: pendingPublicRequests.size, lastRequestActivity: lastPublicRequestActivity });
  };
  try {
    for (const [path, locale] of routes) {
      await check('public-page', { engine, width, path }, async () => {
        publicPhase = path;
        publicDiagnostics.checkpoints.push({ type: 'goto', path, from: page.url(), time: Date.now() });
        errors = [];
        const response = await page.goto(origin + path, { waitUntil: 'networkidle', timeout: 35000 });
        assert.equal(response.status(), 200);
        await page.locator('main').first().waitFor();
        await settlePublicDocument('before-assertions');
        const state = await page.evaluate(() => ({ lang: document.querySelector('main')?.lang, htmlLang: document.documentElement.lang, overflow: document.documentElement.scrollWidth - innerWidth, title: document.querySelector('h1')?.textContent, players: document.querySelectorAll('.site-video-player').length, iframesBeforeClick: document.querySelectorAll('.site-video-player iframe').length }));
        assert.equal(state.htmlLang, locale, 'Document language must match the visible page locale');
        assert.equal(state.lang || state.htmlLang, locale, 'Effective page language (including valid inheritance)');
        assert.ok(state.title?.trim(), 'Missing main heading');
        assert.ok(state.overflow <= 2, `Horizontal overflow ${state.overflow}px`);
        assert.equal(state.iframesBeforeClick, 0, 'Video must be poster-first');
        if (path.endsWith('/about')) {
          assert.equal(await page.locator('[data-consultation-capture="personal"]').count(), 1, 'About must contain one accessible personal consultation selector');
          assert.equal(await page.locator('.public-consultation-cta').count(), 0, 'About must not repeat the generic consultation CTA');
        }
        publicDiagnostics.lifecycle = await page.evaluate(() => JSON.parse(sessionStorage.getItem('__publicAuditLifecycle') || '[]'));
        publicDiagnostics.checkpoints.push({ type: 'assert', path, time: Date.now(), state: await page.evaluate(() => ({ probe: window.__publicAuditProbe, url: location.href, readyState: document.readyState, hydrated: history.pushState.toString().includes('__NA') })) });
        assert.deepEqual(errors, [], 'Unexpected page JS error');
        assert.deepEqual(publicDiagnostics.lifecycle.filter(event => ['window-error', 'unhandled-rejection'].includes(event.type)), [], 'No uncaught errors in public documents');
        // React may swap a max-resolution YouTube poster for its HQ fallback
        // while WebKit scrolls or decodes. Re-query the current image and retry
        // only these transient source/DOM-change errors, never a genuinely broken image.
        const posters = page.locator('.site-video-poster');
        for (let i = 0; i < await posters.count(); i++) {
          for (let attempt = 0; attempt < 4; attempt++) {
            if (i >= await posters.count()) break;
            try {
              await posters.nth(i).scrollIntoViewIfNeeded({ timeout: 7000 });
              await posters.nth(i).evaluate(el => el.decode(), { timeout: 7000 });
              break;
            } catch (error) {
              const message = String(error?.message || error);
              if (!/Aborted by source change|Element is not attached to the DOM|not attached to the DOM/.test(message) || attempt === 3) throw error;
              await page.waitForTimeout(250);
            }
          }
        }
        if (['/en/about', '/es/about', '/books/maya-tradition'].includes(path)) {
          await page.evaluate(() => scrollTo(0, 0));
          await page.screenshot({ path: `${evidence}/${label}-${engine}-${width}-${path.replaceAll('/', '_')}.png`, fullPage: true });
        }
        await settlePublicDocument('before-next-navigation');
        assert.deepEqual(errors, [], 'No page errors after public poster decoding and scrolling');
        publicDiagnostics.lifecycle = await page.evaluate(() => JSON.parse(sessionStorage.getItem('__publicAuditLifecycle') || '[]'));
        assert.deepEqual(publicDiagnostics.lifecycle.filter(event => ['window-error', 'unhandled-rejection'].includes(event.type)), [], 'No uncaught errors before leaving the public document');
        return state;
      });
    }
    await page.goto(origin + '/en/about', { waitUntil: 'networkidle' });
    const menu = page.locator('.site-language-menu');
    const trigger = page.locator('.site-language-menu-trigger');
    await check('menu-escape', { engine, width }, async () => {
      await trigger.click();
      assert.equal(await menu.evaluate(el => el.open), true);
      for (const option of await menu.locator('[lang]').all()) {
        assert.ok(await option.evaluate(el => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height >= 44 && r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight && el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
        }), 'Open menu option must be visible, unclipped and clickable');
      }
      await page.screenshot({ path: `${evidence}/${label}-menu-${engine}-${width}.png` });
      await page.keyboard.press('Escape');
      assert.equal(await menu.evaluate(el => el.open), false, 'Escape must dismiss the language menu');
      assert.equal(await trigger.evaluate(el => el === document.activeElement), true, 'Focus must return to the trigger');
    });
    await check('menu-outside', { engine, width }, async () => {
      if (!await menu.evaluate(el => el.open)) await trigger.click();
      await page.locator('h1').first().click();
      assert.equal(await menu.evaluate(el => el.open), false, 'Click outside must dismiss the menu');
    });
    await check('menu-current-selection', { engine, width }, async () => {
      if (!await menu.evaluate(el => el.open)) await trigger.click();
      await menu.locator('[lang="en"]').click();
      await page.waitForTimeout(300);
      assert.equal(await menu.evaluate(el => el.open), false, 'Selection must dismiss the menu');
    });
    for (const locale of ['ru', 'es', 'en']) {
      await check('about-language-navigation', { engine, width, locale }, async () => {
        await trigger.click();
        await menu.locator(`[lang="${locale}"]`).click();
        await expect(page).toHaveURL(origin + `/${locale}/about`);
        await expect(page.locator('main').first()).toHaveAttribute('lang', locale);
        await expect(page.locator('.site-language-menu')).not.toHaveAttribute('open', '');
      });
    }
    await page.goto(origin + '/books/maya-tradition', { waitUntil: 'networkidle' });
    for (const locale of ['ru', 'en']) {
      await check('maya-language-navigation', { engine, width, locale }, async () => {
        await page.locator('.site-language-menu-trigger').click();
        await page.locator(`.site-language-menu [lang="${locale}"]`).click();
        await expect(page).toHaveURL(origin + `/books/maya-tradition?lang=${locale}`);
        await expect(page.locator('main').first()).toHaveAttribute('lang', locale);
        await expect(page.locator(`main ol a[href$="?lang=${locale}"]`)).toHaveCount(4);
      });
    }
    for (const locale of ['en', 'ru', 'es']) {
      await check('consultation-safe-handoff', { engine, width, locale }, async () => {
        await page.goto(origin + `/${locale}/about`, { waitUntil: 'networkidle' });
        const capture = page.locator('[data-consultation-capture="personal"]');
        await expect(capture).toHaveCount(1);
        await expect(capture.locator('[role="group"] button')).toHaveCount(4);
        assert.equal(await capture.locator('form, input, textarea').count(), 0, 'Personal details must not be required');
        // Personal topics start the free internal assessment. WhatsApp is reserved
        // for paid service enquiries, not this first step of the free flow.
        const action = capture.locator('[data-consultation-action]');
        const assertFreeUrl = raw => {
          const target = new URL(raw, origin);
          assert.equal(target.origin, origin);
          assert.equal(target.pathname, `/${locale}/services/free-situation-review`);
          assert.deepEqual([...target.searchParams.keys()], ['topic'], 'Only the non-sensitive topic may be in the URL');
          return target;
        };
        const originalUrl = assertFreeUrl(await action.getAttribute('href'));
        assert.equal(originalUrl.searchParams.get('topic'), 'personal');
        assert.equal(await capture.locator('[data-contact-channel="whatsapp"]').count(), 0);
        for (const [index, topic] of ['goal', 'business', 'wellbeing'].entries()) {
          const selected = capture.locator('[role="group"] button').nth(index + 1);
          await selected.click();
          await expect(selected).toHaveAttribute('aria-pressed', 'true');
          await expect(action).toHaveAttribute('data-consultation-action', topic);
          assert.equal(assertFreeUrl(await action.getAttribute('href')).searchParams.get('topic'), topic);
        }
        await capture.locator('[role="group"] button').nth(0).click();
        await expect(action).toHaveAttribute('data-consultation-action', 'personal');
        assert.equal(assertFreeUrl(await action.getAttribute('href')).href, originalUrl.href, 'Resetting topic must restore the original destination');
        assert.equal(await capture.locator('[data-contact-channel="telegram"]').count(), 1);
        return { messageSent: false, privateFieldsAbsent: true, changingTopicRebuildsUrl: true, freeAssessmentInternal: true };
      });
      await check('paid-consultation-safe-handoff', { engine, width, locale }, async () => {
        await page.goto(origin + `/${locale}/services/psychohomeopathy`, { waitUntil: 'networkidle' });
        const capture = page.locator('[data-consultation-capture="service"]');
        await expect(capture).toHaveCount(1);
        await expect(capture.locator('[role="group"] button')).toHaveCount(3);
        assert.equal(await capture.locator('form, input, textarea').count(), 0, 'No private intake fields in the enquiry selector');
        const action = capture.locator('[data-consultation-action]');
        const assertPaidUrl = async (choice, minutes, price) => {
          await expect(action).toHaveAttribute('data-consultation-action', choice);
          await expect(action).toHaveAttribute('data-contact-channel', 'whatsapp');
          await expect(action).toHaveAttribute('target', '_blank');
          await expect(action).toHaveAttribute('rel', /noopener/);
          const target = new URL(await action.getAttribute('href'));
          assert.equal(target.origin, 'https://wa.me');
          assert.equal(target.pathname, '/14376066502');
          assert.deepEqual([...target.searchParams.keys()], ['text']);
          const message = target.searchParams.get('text');
          assert.ok(message?.trim(), 'Prepared message must not be empty');
          assert.ok(message.includes(minutes) && message.includes(price), 'Prepared message must include the selected duration and price');
          assert.ok(message.includes(await capture.locator('[aria-pressed="true"]').innerText()), 'Prepared message must mention the selected offer');
          return target;
        };
        const originalUrl = await assertPaidUrl('session', '60', '€100');
        await capture.locator('[role="group"] button').nth(1).click();
        const changedUrl = await assertPaidUrl('questions', '30', '€50');
        assert.notEqual(changedUrl.searchParams.get('text'), originalUrl.searchParams.get('text'));
        await capture.locator('[role="group"] button').nth(2).click();
        await expect(action).toHaveAttribute('data-consultation-action', 'free');
        assert.equal(await action.getAttribute('data-contact-channel'), null);
        assert.equal(await action.getAttribute('target'), null);
        const freeUrl = new URL(await action.getAttribute('href'), origin);
        assert.equal(freeUrl.href, origin + `/${locale}/services/free-situation-review`);
        await capture.locator('[role="group"] button').nth(0).click();
        assert.equal((await assertPaidUrl('session', '60', '€100')).href, originalUrl.href, 'Reset must restore the exact paid request');
        assert.equal(await capture.locator('[data-contact-channel="telegram"]').count(), 1);
        return { messageSent: false, privateFieldsAbsent: true, paidPricesVerified: true, freeAssessmentInternal: true, resetVerified: true };
      });
    }
    if (width === 390) {
      for (const readiness of ['rapid-history', 'loaded-history']) {
      await check('csp-navigation-and-history', { engine, width, readiness }, async () => {
        // New context isolates document policies and service-worker caching. This
        // checks real navigation/CSP enforcement, not third-party video decoding.
        // Preserve Playwright's supported lifecycle in this functional matrix.
        // Actual persisted restoration is verified separately through raw CDP:
        // https://playwright.dev/docs/navigations#backforward-cache-bfcache
        const cspBrowser = browser;
        const cspContext = await cspBrowser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
        const pageShows = [];
        const cspErrors = [];
        const navigationCancellations = [];
        const failedRequests = [];
        const bfcacheNotUsed = [];
        let interruptedDocumentProbe;
        let lifecycleTrace = [];
        let historyPhase = 'initial';
        await cspContext.exposeBinding('__recordCspPageShow', (_source, state) => pageShows.push({ phase: historyPhase, ...state }));
        await cspContext.addInitScript(() => {
          if (window.top !== window) return;
          // Register before application scripts so its capture listener cannot
          // hide the persisted event when replacing an interrupted router.
          window.__cspInitDocumentProbe = crypto.randomUUID();
          // Synchronous same-origin storage survives an immediate document
          // replacement; the asynchronous exposed binding alone may be lost.
          const record = (type, extra = {}) => {
            const navigation = performance.getEntriesByType('navigation')[0];
            const state = { type, time: performance.timeOrigin + performance.now(), documentProbe: window.__cspInitDocumentProbe, url: location.href, readyState: document.readyState, visibilityState: document.visibilityState, documentClass: document.body?.dataset.cspClass, notRestoredReasons: navigation?.notRestoredReasons?.toJSON?.() ?? null, ...extra };
            const entries = JSON.parse(sessionStorage.getItem('__cspLifecycleTrace') || '[]');
            entries.push(state);
            sessionStorage.setItem('__cspLifecycleTrace', JSON.stringify(entries));
            return state;
          };
          record('init');
          // Observe actual uncaught errors independently of WebKit's console
          // diagnostics, which Playwright also exposes through pageerror.
          window.addEventListener('error', event => {
            if (event instanceof ErrorEvent) record('window-error', { message: event.message, filename: event.filename, line: event.lineno });
            else record('resource-error', { targetTag: event.target?.tagName, resourceUrl: event.target?.currentSrc || event.target?.src || event.target?.href });
          }, true);
          window.addEventListener('unhandledrejection', event => record('unhandled-rejection', { message: String(event.reason?.message || event.reason) }), true);
          window.addEventListener('pageshow', event => {
            const state = record('pageshow', { persisted: event.persisted });
            void window.__recordCspPageShow(state);
          }, true);
          window.addEventListener('pagehide', event => record('pagehide', { persisted: event.persisted }), true);
          window.addEventListener('popstate', () => record('popstate'), true);
          window.addEventListener('load', () => record('load'), true);
          document.addEventListener('DOMContentLoaded', () => record('domcontentloaded'), true);
          document.addEventListener('visibilitychange', () => record('visibilitychange'), true);
          window.navigation?.addEventListener('navigate', event => record('navigate', { destination: event.destination.url, sameDocument: event.destination.sameDocument, navigationType: event.navigationType }));
        });
        const cspPage = await cspContext.newPage();
        const navigationTrace = [];
        const waitForDocument = async () => {
          if (readiness !== 'loaded-history') return;
          await cspPage.waitForLoadState('load');
          // The pinned Next app router installs this wrapper in its hydration
          // effect. A parsed SSR body alone does not prove listener readiness.
          await expect.poll(() => cspPage.evaluate(() => history.pushState.toString().includes('__NA'))).toBe(true);
          await cspPage.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        };
        if (engine === 'chromium') {
          const cdp = await cspContext.newCDPSession(cspPage);
          cdp.on('Page.backForwardCacheNotUsed', state => bfcacheNotUsed.push({ phase: historyPhase, ...state }));
          await cdp.send('Page.enable');
        }
        cspPage.on('requestfailed', request => failedRequests.push({ phase: historyPhase, url: request.url(), method: request.method(), error: request.failure()?.errorText }));
        cspPage.on('framenavigated', frame => { if (frame === cspPage.mainFrame()) navigationTrace.push(frame.url()); });
        cspPage.on('pageerror', error => { cspErrors.push({ phase: historyPhase, time: Date.now(), message: error.message, stack: error.stack }); navigationTrace.push('JS: ' + error.message); });
        await cspPage.route('https://app.heygen.com/embeds/**', route => route.fulfill({ contentType: 'text/html', body: '<p data-csp-probe>Allowed embed reached</p>' }));
        try {
          await cspPage.goto(origin + '/en/about', { waitUntil: 'networkidle' });
          await expect(cspPage.locator('body')).toHaveAttribute('data-csp-class', 'public-video');
          await waitForDocument();
          await cspPage.locator('#psychic-alchemy-video button').click();
          await expect(cspPage.frameLocator('#psychic-alchemy-video iframe').locator('[data-csp-probe]')).toBeVisible();
          await cspPage.evaluate(() => { window.__cspDocumentProbe = 'same-public-document'; });
          await cspPage.locator('.mobile-bottom-navigation a[href="/en/services"]').click();
          await expect(cspPage).toHaveURL(origin + '/en/services');
          await expect(cspPage.locator('main')).toHaveClass(/services-shell/);
          assert.equal(await cspPage.evaluate(() => window.__cspDocumentProbe), 'same-public-document', 'Same-policy links must retain soft navigation');
          await cspPage.locator('.mobile-bottom-navigation a[href="/en/client"]').click();
          await expect(cspPage).toHaveURL(origin + '/en/client');
          await expect(cspPage.locator('body')).toHaveAttribute('data-csp-class', 'private');
          await waitForDocument();
          assert.equal(await cspPage.evaluate(() => window.__cspDocumentProbe), undefined, 'Entering private must load a new document');
          await cspPage.evaluate(() => {
            window.__cspViolations = [];
            document.addEventListener('securitypolicyviolation', event => window.__cspViolations.push(event.effectiveDirective));
            const frame = document.createElement('iframe');
            frame.src = 'https://app.heygen.com/embeds/csp-private-probe';
            document.body.append(frame);
          });
          await expect.poll(() => cspPage.evaluate(() => window.__cspViolations.includes('frame-src'))).toBe(true);
          await cspPage.locator('.mobile-bottom-navigation a[href="/en/about"]').click();
          await expect(cspPage).toHaveURL(origin + '/en/about');
          await expect(cspPage.locator('body')).toHaveAttribute('data-csp-class', 'public-video');
          await waitForDocument();
          await cspPage.locator('#psychic-alchemy-video button').click();
          await expect(cspPage.frameLocator('#psychic-alchemy-video iframe').locator('[data-csp-probe]')).toBeVisible();
          interruptedDocumentProbe = await cspPage.evaluate(() => window.__cspInitDocumentProbe);
          await cspPage.evaluate(() => { window.__cspDocumentProbe = 'before-tantra'; });
          // Next supports native history navigation; exercise the programmatic
          // fallback too, rather than relying only on the anchor interceptor.
          await cspPage.evaluate(() => history.pushState(null, '', '/en/academy/reiki/tantra-reiki'));
          await expect(cspPage).toHaveURL(origin + '/en/academy/reiki/tantra-reiki');
          await expect(cspPage.locator('body')).toHaveAttribute('data-csp-class', 'tantra-media');
          await waitForDocument();
          assert.equal(await cspPage.evaluate(() => window.__cspDocumentProbe), undefined, 'Tantra media policy requires a fresh document');
          historyPhase = 'back-from-tantra';
          await cspPage.goBack({ waitUntil: 'domcontentloaded' });
          await expect(cspPage).toHaveURL(origin + '/en/about');
          await expect(cspPage.locator('body')).toHaveAttribute('data-csp-class', 'public-video');
          await waitForDocument();
          await expect.poll(() => cspPage.evaluate(() => window.__cspInitDocumentProbe), { message: 'Restored interrupted router must be replaced with a fresh document' }).not.toBe(interruptedDocumentProbe);
          historyPhase = 'back-to-private';
          await cspPage.goBack({ waitUntil: 'domcontentloaded' });
          await expect(cspPage).toHaveURL(origin + '/en/client');
          await expect(cspPage.locator('body')).toHaveAttribute('data-csp-class', 'private');
          await waitForDocument();
          historyPhase = 'forward-to-public';
          await cspPage.goForward({ waitUntil: 'domcontentloaded' });
          await expect(cspPage).toHaveURL(origin + '/en/about');
          await expect(cspPage.locator('body')).toHaveAttribute('data-csp-class', 'public-video');
          await waitForDocument();
          historyPhase = 'forward-to-tantra';
          await cspPage.goForward({ waitUntil: 'domcontentloaded' });
          await expect(cspPage).toHaveURL(origin + '/en/academy/reiki/tantra-reiki');
          await expect(cspPage.locator('body')).toHaveAttribute('data-csp-class', 'tantra-media');
          await waitForDocument();
          lifecycleTrace = await cspPage.evaluate(() => JSON.parse(sessionStorage.getItem('__cspLifecycleTrace') || '[]'));
          assert.deepEqual(lifecycleTrace.filter(event => ['window-error', 'unhandled-rejection'].includes(event.type)), [], 'No uncaught browser errors during CSP navigation');
          const unexpectedErrors = cspErrors.filter(error => {
            const attribution = classifyCspNavigationCancellation(error, { engine, readiness, origin, lifecycle: lifecycleTrace });
            if (attribution) navigationCancellations.push(attribution);
            return !attribution;
          });
          if (readiness === 'loaded-history') assert.deepEqual(cspErrors, [], 'No page errors in the fully loaded navigation journey');
          assert.deepEqual(unexpectedErrors, [], 'No unexplained JavaScript diagnostics during CSP navigation');
          return { interruptedDocumentProbe, pageShows, cspErrors, navigationCancellations, bfcachePersistedVerified: false, samePolicySoftNavigation: true, privatePublicReload: true, tantraReload: true, backForwardVerified: true, privateIframeBlocked: true, aboutRendererAllowed: true, providerResponseStubbed: true, decodedPlaybackClaimed: false };
        } catch (error) {
          const state = await cspPage.evaluate(() => ({ url: location.href, documentClass: document.body.dataset.cspClass, documentReady: document.readyState })).catch(() => null);
          throw new Error(`${error.message}; document=${JSON.stringify(state)}; navigation=${JSON.stringify(navigationTrace)}; pageShows=${JSON.stringify(pageShows)}; cspErrors=${JSON.stringify(cspErrors)}`);
        } finally {
          // Keep full structured diagnostics even when check() bounds its message.
          lifecycleTrace = await cspPage.evaluate(() => JSON.parse(sessionStorage.getItem('__cspLifecycleTrace') || '[]')).catch(() => lifecycleTrace);
          writeFileSync(`${evidence}/${label}-csp-${engine}-${readiness}.json`, JSON.stringify({ readiness, interruptedDocumentProbe, pageShows, lifecycleTrace, navigationTrace, cspErrors, navigationCancellations, failedRequests, bfcacheNotUsed }, null, 2));
          await cspContext.close(); if (cspBrowser !== browser) await cspBrowser.close();
        }
      });
      }
      if (engine === 'chromium') {
        await check('csp-bfcache-raw-cdp', { engine, width }, verifyCspBfcache);
      }
    }
    if (width === 390) {
      await check('translation-failure-invalid-response-and-recovery', { engine, width }, async () => {
        // Isolate network fixtures: service-worker-owned requests can bypass page.route.
        // The ordinary public, form and image audits retain service workers enabled.
        const translationContext = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
        const page = await translationContext.newPage();
        const networkErrors = [];
        page.on('requestfailed', request => networkErrors.push({ url: request.url(), error: request.failure()?.errorText }));
        page.on('pageerror', error => networkErrors.push({ error: error.message }));
        let mode = 'failure';
        const calls = { failure: 0, invalid: 0, success: 0 };
        let releaseInvalid;
        const invalidGate = new Promise(resolve => { releaseInvalid = resolve; });
        await page.route('**/api/public-translate', async route => {
          const phase = mode;
          calls[phase]++;
          const payload = route.request().postDataJSON();
          if (phase === 'failure') return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
          if (phase === 'invalid') await invalidGate;
          const translations = phase === 'invalid' ? [] : payload.texts.map((_, i) => `English test fixture ${i}`);
          // A sibling failed batch may already have cancelled this request.
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ translations }) }).catch(() => {});
        });
        try {
          await page.goto(origin + '/books/maya-mysteries?lang=en', { waitUntil: 'networkidle' });
          await expect.poll(() => calls.failure).toBeGreaterThan(0);
          await expect(page.locator('.reader-translation-error')).toBeVisible();
          const original = page.locator('.reader-content[lang="ru"]');
          assert.ok((await original.innerText()).length > 1000, 'Original must remain readable after service failure');
          mode = 'invalid';
          await page.getByRole('button', { name: 'Retry English translation' }).click();
          // Observe this retry's in-flight state, not the previous error still on screen.
          await expect.poll(() => calls.invalid).toBeGreaterThan(0);
          await expect(page.locator('.reader-translation-progress')).toBeVisible();
          releaseInvalid();
          await expect(page.locator('.reader-translation-error')).toBeVisible();
          assert.ok((await original.innerText()).length > 1000, 'Original must survive malformed translation');
          mode = 'success';
          await page.getByRole('button', { name: 'Retry English translation' }).click();
          await expect.poll(() => calls.success).toBeGreaterThan(0);
          await expect(page.locator('.reader-content[lang="en"]')).toBeVisible({ timeout: 20000 });
          await expect(page.locator('.reader-translation-error')).toHaveCount(0);
          return { translationServiceStubbed: true, paidCalls: 0, originalPreserved: true, retryVerified: true, fixtureServiceWorkersBlocked: true, calls };
        } catch (error) {
          await page.screenshot({ path: `${evidence}/${label}-translation-${engine}-failed.png` });
          throw new Error(`${error.message}; requests=${JSON.stringify(calls)}; networkErrors=${JSON.stringify(networkErrors)}; status=${await page.locator('[role="status"]').allTextContents()}`);
        } finally { releaseInvalid(); await translationContext.close(); }
      });
    }
    if (engine === 'chromium' && width === 390) {
      for (const book of volumes) {
        for (const [readerPath, locale] of [[`/books/${book}?lang=en`, 'en'], [`/books/${book}`, 'ru']]) {
          await check('maya-reader-and-images', { path: readerPath, locale }, async () => {
            const response = await page.goto(origin + readerPath, { waitUntil: 'domcontentloaded', timeout: 35000 });
            assert.equal(response.status(), 200);
            await page.locator('.reader-article').waitFor({ state: 'visible', timeout: 20000 });
            const language = await page.evaluate(() => ({ htmlLang: document.documentElement.lang, mainLang: document.querySelector('main')?.lang }));
            assert.equal(language.htmlLang, locale, 'Reader document language');
            assert.equal(language.mainLang, locale, 'Reader main language');
            assert.ok((await page.locator('.reader-article').innerText()).length > 1000, 'Source text must render');
            for (const src of await page.locator('.reader-shell img').evaluateAll(images => images.map(img => img.getAttribute('src')))) {
              const asset = new URL(src, origin);
              if (asset.origin === origin) media.add(asset.pathname);
            }
            const img = page.locator('.reader-cover img');
            await img.scrollIntoViewIfNeeded();
            await img.evaluate(el => el.decode());
            return { sourceVisible: true, ...language };
          });
        }
      }
    }
  } finally {
    publicDiagnostics.lifecycle = await page.evaluate(() => JSON.parse(sessionStorage.getItem('__publicAuditLifecycle') || '[]')).catch(() => publicDiagnostics.lifecycle);
    writeFileSync(`${evidence}/${label}-public-${engine}-${width}-diagnostics.json`, JSON.stringify(publicDiagnostics, null, 2));
    await context.close(); await browser.close();
  }
}
if (label === 'local' && ['127.0.0.1', 'localhost'].includes(url.hostname)) {
  for (const browserType of [chromium, webkit]) {
    await check('about-player-hydration', { engine: browserType.name(), providerStubbed: true }, () => verifyAboutPlayerHydration(browserType, { origin, evidence, label }));
  }
}
await Promise.all([exercise('chromium', chromium, 390), exercise('chromium', chromium, 1365), exercise('webkit', webkit, 390), exercise('webkit', webkit, 1365)]);
const browser = await chromium.launch();
const context = await browser.newContext();
try {
  for (const locale of ['en', 'ru', 'es']) {
    for (const [path, policy] of [[`/${locale}/about`, 'public'], [`/${locale}/academy/reiki/tantra-reiki`, 'tantra'], [`/${locale}/client`, 'private']]) {
      await check('scoped-video-csp-headers', { path, policy }, async () => {
        const response = await context.request.get(origin + path);
        assert.equal(response.status(), 200);
        const csp = response.headers()['content-security-policy'];
        assert.ok(csp, 'Missing document policy');
        const directives = Object.fromEntries(csp.split(';').map(value => value.trim().split(/\s+/)).map(([name, ...values]) => [name, values]));
        assert.deepEqual(directives['frame-src'], policy === 'private' ? ["'none'"] : ['https://www.youtube-nocookie.com', 'https://app.heygen.com']);
        assert.deepEqual(directives['media-src'], policy === 'tantra' ? ["'self'", 'https://psitrends.com'] : ["'self'"]);
        for (const directive of ['object-src', 'base-uri', 'frame-ancestors']) assert.deepEqual(directives[directive], ["'none'"]);
        return { exactAllowlist: true, nativeMediaScoped: true };
      });
    }
  }
  await check('api-video-csp-restrictive', {}, async () => {
    const response = await context.request.get(origin + '/api/csp-regression-nonexistent');
    assert.equal(response.status(), 404);
    const csp = response.headers()['content-security-policy'] || '';
    assert.match(csp, /(?:^|;)\s*frame-src 'none'(?:;|$)/);
    assert.match(csp, /(?:^|;)\s*media-src 'self'(?:;|$)/);
    assert.doesNotMatch(csp, /youtube-nocookie|app\.heygen|psitrends/);
    return { privateDataRead: false, apiEmbedBlocked: true };
  });
  await check('consultation-SSR-privacy', {}, async () => {
    const response = await context.request.get(origin + '/en/about');
    const html = await response.text();
    assert.doesNotMatch(html, /<form[^>]*class="personal-consultation-form"/, 'Do not SSR an intake form');
    assert.doesNotMatch(html, /<input[^>]+name="(?:name|contact|request)"/, 'Do not request private contact details');
    return { noDefaultGET: true, noCompulsoryPersonalFields: true };
  });
  const paths = [...media];
  for (let i = 0; i < paths.length; i += 6) {
    await Promise.all(paths.slice(i, i + 6).map(path => check('reader-image-http', { path }, async () => {
      const response = await context.request.get(origin + path, { timeout: 20000 });
      assert.equal(response.status(), 200, 'Image HTTP status');
      assert.match(response.headers()['content-type'] || '', /^image\//);
      assert.ok((await response.body()).length > 100, 'Image must have content');
    })));
  }
  for (const path of ['/admin', '/admin/clients', '/admin/consultations/new']) {
    await check('admin-anonymous', { path }, async () => {
      const response = await context.request.get(origin + path);
      assert.match(response.url(), /\/admin\/login$/);
      assert.equal(response.status(), 200);
    });
  }
  const selector = 'reauditSyntheticOnly001';
  for (const path of [`/api/client/${selector}/documents/reaudit-nonexistent/pdf?locale=en`, `/api/client/${selector}/documents/reaudit-nonexistent/pdf?locale=es`, `/es/client/${selector}`]) {
    await check('private-anonymous', { path }, async () => {
      const response = await context.request.get(origin + path);
      assert.equal(response.status(), 404);
      assert.match(response.headers()['cache-control'] || '', /no-store/);
      const robots = response.headers()['x-robots-tag'] || (await response.text()).match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']+)["']/i)?.[1] || '';
      assert.match(robots, /noindex/);
      if (path.startsWith('/api/')) assert.equal((await response.body()).length, 0);
    });
  }
} finally { await context.close(); await browser.close(); }
const failed = results.filter(row => !row.ok);
writeFileSync(`${evidence}/${label}-results.json`, JSON.stringify({ origin, checkedAt: new Date().toISOString(), commit: process.env.GITHUB_SHA, total: results.length, failed: failed.length, results }, null, 2));
console.log(JSON.stringify({ label, total: results.length, failed: failed.length, failures: failed }, null, 2));
if (!process.argv.includes('--observe')) assert.equal(failed.length, 0, 'Re-audit failed; inspect evidence');

