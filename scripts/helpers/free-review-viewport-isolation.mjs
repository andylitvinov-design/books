import assert from 'node:assert/strict';

// Production-only local document/typed assets. API, private routes, speculative
// pages, provider media and arbitrary optimizer sources are never transported.
export function permittedFreeReviewViewportRead(request, origin, locale) {
  let url;
  try { url = new URL(request.url()); } catch { return false; }
  if (!['GET', 'HEAD'].includes(request.method()) || url.origin !== origin || url.username || url.password || url.hash) return false;
  if (url.pathname.includes('..') || /%2e|%2f|%5c|\\/i.test(url.pathname)) return false;
  const type = request.resourceType();
  const root = '/' + locale + '/services/';
  if ([root + 'free-situation-review', root + 'free-consultation'].includes(url.pathname)) return type === 'document' && !url.search && !request.url().endsWith('?');
  const safeImage = path => path === '/academy/reiki-yggdrasil/source/eastern-tradition.png' || (/^\/images\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(?:webp|avif|png|jpe?g|svg)$/.test(path) && !path.includes('..'));
  if (url.pathname === '/_next/image') {
    const keys = [...url.searchParams.keys()].sort();
    return type === 'image' && keys.join(',') === 'q,url,w'
      && safeImage(url.searchParams.get('url'))
      && /^(?:16|32|48|64|96|128|256|384|640|750|828|1080|1200|1920|2048|3840)$/.test(url.searchParams.get('w'))
      && /^(?:[1-9]|[1-9][0-9]|100)$/.test(url.searchParams.get('q'));
  }
  if (url.search || request.url().endsWith('?')) return false;
  if (type === 'image' && safeImage(url.pathname)) return true;
  const extension = {script:'js',stylesheet:'css',font:'woff2?'}[type];
  // Literal locale route brackets are expected in production chunk paths.
  return Boolean(extension && new RegExp('^/_next/static/(?:[a-zA-Z0-9_\\[\\]()-]+/)*[a-zA-Z0-9_.-]+\\.(?:' + extension + ')$').test(url.pathname.replace(/%5B/gi, '[').replace(/%5D/gi, ']')));
}

// Expected denial is not permission to contact a provider. Only this public
// opt-in iframe may appear as a blocked document while its DOM intent is checked.
export function expectedFreeReviewProviderRead(request, locale) {
  try {
    const url=new URL(request.url());
    if(request.method()!=='GET'||url.username||url.password||url.port||url.hash)return false;
    if(request.resourceType()==='image')return url.origin==='https://i.ytimg.com' && !url.search && /^\/vi\/(?:sfVFOQNr2qk|m9RfDgK76PU|5oj0BIbLT4w|Dk0LBmOivQo|aUJde6A-9p0|fE6sD1zr1Js|itjo2_z2NGk|4NrryHcEF1A|hYwRNMxIMjc|MIVLm1GUTtM|ttQxUHopaUM|VABgpmn4ZYA|muOnIHllI7E)\/(?:maxresdefault|hqdefault)\.jpg$/.test(url.pathname);
    if(request.resourceType()!=='document'||url.origin!=='https://www.youtube-nocookie.com'||url.pathname!=='/embed/sfVFOQNr2qk')return false;
    if([...url.searchParams.keys()].sort().join(',')!=='autoplay,cc_lang_pref,hl,playsinline,rel')return false;
    return url.searchParams.get('autoplay')==='1'&&url.searchParams.get('playsinline')==='1'&&url.searchParams.get('rel')==='0'&&url.searchParams.get('hl')===locale&&url.searchParams.get('cc_lang_pref')==='en';
  } catch { return false; }
}

export async function createFreeReviewViewportIsolation(browser, { origin, locale, viewport, mobile = true }) {
  assert.ok(origin === 'https://holistichouse.vercel.app' || /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin), 'Only exact canonical public site or isolated loopback origin');
  assert.equal(new URL(origin).origin, origin);
  assert.ok(['en', 'ru', 'es'].includes(locale));
  assert.equal(typeof mobile, 'boolean');
  const context = await browser.newContext({ viewport, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, serviceWorkers: 'block', reducedMotion: 'reduce' });
  const active = new Set(), popupClosures = new Set(), socketClosures = new Set(), reasons = [];
  const expectedConsoleAborts = new Map();
  let failures = 0, blockedReads = 0, popupAttempts = 0, matchedConsoleBlocks = 0, primaryPage, draining = false, closed = false;
  const record = reason => { failures++; if (reasons.length < 8) reasons.push(reason); };
  const drain = async () => { while (active.size || popupClosures.size || socketClosures.size) await Promise.allSettled([...active, ...popupClosures, ...socketClosures]); };
  const handler = route => {
    const pending = (async () => {
      const request = route.request();
      let api = true;
      try { api = /^\/api(?:\/|$)/i.test(decodeURIComponent(new URL(request.url()).pathname)); } catch { /* fail closed */ }
      const mutationOrApi = !['GET', 'HEAD'].includes(request.method()) || api;
      if (draining) {
        if (mutationOrApi) record('LATE_API_OR_WRITE');
        return route.abort('blockedbyclient');
      }
      if (!permittedFreeReviewViewportRead(request, origin, locale)) {
        if (mutationOrApi) record('UNEXPECTED_API_OR_WRITE');
        else if (request.resourceType() === 'document' && !expectedFreeReviewProviderRead(request, locale)) record('UNEXPECTED_NAVIGATION');
        else blockedReads++;
        if (expectedFreeReviewProviderRead(request, locale)) {
          const url = request.url();
          expectedConsoleAborts.set(url, (expectedConsoleAborts.get(url) || 0) + 1);
        }
        return route.abort('blockedbyclient');
      }
      // continue() can follow a local redirect off-origin without routing again.
      // Fetch exactly one verified local response and dispose it deterministically.
      const response = await route.fetch({ maxRedirects: 0 });
      let primary;
      try {
        assert.equal(response.url(), request.url());
        assert.ok(response.status() >= 200 && response.status() < 300);
        await route.fulfill({ response });
      } catch (error) { primary = error; throw error; }
      finally { try { await response.dispose(); } catch (error) { if (!primary) throw error; } }
    })().catch(async () => {
      record('ROUTE_HANDLER_FAILED');
      try { await route.abort('blockedbyclient'); } catch { record('ROUTE_ABORT_FAILED'); }
    });
    active.add(pending); pending.finally(() => active.delete(pending));
    return pending;
  };
  const onPage = page => {
    if (!primaryPage) { primaryPage = page; return; }
    record('UNEXPECTED_POPUP');
    const operation = Promise.resolve().then(() => page.close()).catch(() => record('POPUP_CLOSE_FAILED'));
    popupClosures.add(operation); operation.finally(() => popupClosures.delete(operation));
  };
  const assertClean = async () => {
    await drain();
    if (primaryPage && !primaryPage.isClosed()) {
      const attempted = await primaryPage.evaluate(() => window.__hhFreeReviewViewportPopupAttempts);
      assert.equal(attempted, 0, 'No popup attempt is authorized by read-only geometry QA');
    }
    assert.equal(popupAttempts, 0, 'No popup attempt may be forgotten across public navigation');
    assert.equal(failures, 0, 'Free-review viewport boundary: ' + reasons.join(', '));
  };
  try {
    // Every boundary precedes creation/navigation, including popup first requests.
    await context.route('**/*', handler);
    await context.routeWebSocket('**/*', socket => {
      record('UNEXPECTED_WEBSOCKET');
      const pending = Promise.resolve().then(() => socket.close()).catch(() => record('WEBSOCKET_CLOSE_FAILED'));
      socketClosures.add(pending); pending.finally(() => socketClosures.delete(pending));
      return pending;
    });
    await context.exposeBinding('__hhFreeReviewViewportRecordPopup', () => { popupAttempts++; });
    await context.addInitScript(() => {
      window.__hhFreeReviewViewportPopupAttempts = 0;
      window.open = () => {
        window.__hhFreeReviewViewportPopupAttempts++;
        // Context-owned count survives document changes; no URL or payload is recorded.
        void window.__hhFreeReviewViewportRecordPopup().catch(() => {});
        return null;
      };
    });
    context.on('page', onPage);
    const page = await context.newPage();
    assert.equal(page, primaryPage, 'Only one fixture primary page is authorized');
    return {
      page, context, assertClean,
      // A console exception is allowed only for a previously observed exact
      // expected provider denial. No URL is returned or persisted in evidence.
      consumeExpectedConsoleBlock({location, type, text}) {
        if (draining || closed || !location || location.lineNumber !== 0 || location.columnNumber !== 0) return false;
        const url = location.url;
        const count = expectedConsoleAborts.get(url) || 0;
        if (type !== 'error' || text !== 'Failed to load resource: net::ERR_BLOCKED_BY_CLIENT' || count < 1) return false;
        expectedConsoleAborts.set(url, count - 1); matchedConsoleBlocks++;
        return true;
      },
      summary: () => ({ failureCount: failures, blockedReads, popupAttempts, matchedConsoleBlocks, reasons: [...reasons] }),
      async close() {
        if (closed) return;
        const errors = [];
        for (const cleanup of [assertClean, () => { draining = true; }, drain,
          () => context.close(), drain]) {
          try { await cleanup(); } catch (error) { errors.push(error); }
        }
        // Context closure owns init-script globals and websocket interception.
        closed = true;
        if (failures) errors.push(Error('Free-review viewport boundary: ' + reasons.join(', ')));
        if (errors.length) throw errors[0];
      },
    };
  } catch (primary) {
    draining = true;
    try { await context.close(); } catch { /* preserve setup failure */ }
    await drain();
    throw primary;
  }
}
