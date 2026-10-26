import assert from 'node:assert/strict';

// Shared transport/teardown mechanism. Every caller must supply its own exact
// public document/asset profile; this layer cannot grant API or provider reads.
export async function createReadOnlyPublicViewportIsolation(browser, { origin, viewport, mobile = false, deviceScaleFactor = 1, permittedRead, anonymousTalismans = false, observeTransport }) {
  assert.match(origin, /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/);
  assert.equal(typeof permittedRead, 'function', 'An exact caller-owned public read profile is required');
  assert.equal(typeof anonymousTalismans, 'boolean');
  assert.equal(typeof mobile, 'boolean');
  assert.ok([1, 2].includes(deviceScaleFactor), 'Only fixed mobile QA scales are permitted');
  const context = await browser.newContext({ ...(mobile ? {deviceScaleFactor, isMobile: true, hasTouch: true, reducedMotion: 'reduce'} : {}), viewport, serviceWorkers: 'block' });
  const active = new Set(), popupClosures = new Set(), reasons = [];
  let failures = 0, blockedReads = 0, popupAttempts = 0, anonymousTalismansReads = 0, primaryPage, draining = false, closed = false;
  const record = reason => { failures++; if (reasons.length < 8) reasons.push(reason); };
  const drain = async () => { while (active.size || popupClosures.size) await Promise.allSettled([...active, ...popupClosures]); };
  // Optional synchronous/void diagnostics cannot authorize transport. Only
  // fixed public paths/categories and booleans leave this projection boundary.
  const diagnosticPaths = new Set(['/', ...['en', 'ru', 'es'].flatMap(locale =>
    ['', '/holistic-support', '/services/remote-energy-support', '/services/free-consultation', '/pro']
      .map(path => '/' + locale + path))]);
  const diagnosticIds = new WeakMap();
  let nextDiagnosticId = 0;
  const observe = (request, verdict, failed = false) => {
    if (typeof observeTransport !== 'function') return;
    try {
      const type = request?.resourceType();
      if (!failed && !['document', 'fetch'].includes(type)) return;
      if (!diagnosticIds.has(request)) {
        nextDiagnosticId = Math.min(nextDiagnosticId + 1, 1000000);
        diagnosticIds.set(request, nextDiagnosticId);
      }
      let target = 'unavailable', rsc = false, prefetch = false, failure = 'none';
      try {
        const url = new URL(request.url());
        target = url.origin === origin && !url.username && !url.password
          ? diagnosticPaths.has(url.pathname) ? url.pathname
            : /^\/api(?:\/|$)/i.test(url.pathname) ? 'local-api' : 'local-other'
          : 'foreign-or-credentials';
        const headers = request.headers();
        rsc = headers.rsc === '1';
        prefetch = headers['next-router-prefetch'] === '1';
      } catch { /* unavailable metadata never changes transport */ }
      if (failed && verdict === 'request-failed') {
        try {
          const text = request.failure()?.errorText;
          failure = typeof text !== 'string' ? 'unavailable'
            : /blockedbyclient|blocked_by_client/i.test(text) ? 'blocked'
            : /cancelled|canceled|abort/i.test(text) ? 'cancelled-or-aborted'
            : /access control/i.test(text) ? 'access-control' : 'other';
        } catch { failure = 'unavailable'; }
      }
      const result = observeTransport({requestId: diagnosticIds.get(request), target, rsc, prefetch, verdict, failure});
      // Best-effort defense for an accidental ordinary native-Promise return,
      // not an async callback API. No await or own `then` access: the intrinsic
      // brand-checks and attaches rejection handling despite an own `then` fault.
      // Hostile constructor/species behavior is not a supported callback return.
      // Non-Promise callback returns (including thenables) are unused; the
      // intrinsic's brand error is contained by this observation boundary.
      if (result && (typeof result === 'object' || typeof result === 'function'))
        Promise.prototype.then.call(result, undefined, () => {});
    } catch { /* diagnostics are observer-only */ }
  };
  const handler = route => {
    let observedRequest;
    const pending = (async () => {
      const request = route.request();
      observedRequest = request;
      // Narrow source-confirmed anonymous fixture only. Canonical session blob
      // ea991a5c throws SIGN_IN_REQUIRED/401; this endpoint wraps {error:code}.
      // No auth, storage or database module is imported or invoked here.
      if (anonymousTalismans && !draining && request.method() === 'GET'
        && request.url() === origin + '/api/holistic-support/talismans' && request.resourceType() === 'fetch') {
        observe(request, 'anonymous-401');
        await route.fulfill({ status: 401, contentType: 'application/json',
          headers: { 'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
            'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Referrer-Policy': 'no-referrer',
            'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', Vary: 'Cookie' },
          body: '{"error":"SIGN_IN_REQUIRED"}' });
        anonymousTalismansReads++;
        return;
      }
      let localRead = false, api = true;
      try {
        const url = new URL(request.url());
        // Next production chunks encode literal route brackets. No other path
        // encoding may hide an API route or path separator from this boundary.
        const safePathEncoding = !/%|\\/.test(url.pathname.replace(/%5[bBdD]/g, ''));
        api = /^\/api(?:\/|$)/i.test(decodeURIComponent(url.pathname));
        localRead = ['GET', 'HEAD'].includes(request.method()) && url.origin === origin && !url.username && !url.password && !url.hash && safePathEncoding;
      } catch { /* fail closed */ }
      // A caller cannot authorize API transport or foreign/provider transport.
      // The explicit anonymous fixture above is the only local API response.
      if (!localRead || api || permittedRead(request) !== true) {
        if (!['GET', 'HEAD'].includes(request.method()) || api) record('UNEXPECTED_API_OR_WRITE');
        else blockedReads++;
        observe(request, 'abort-policy');
        return route.abort('blockedbyclient');
      }
      // Even late teardown requests above retain write/API violations. Only an
      // otherwise approved harmless read may be silently aborted during close.
      if (draining) { observe(request, 'abort-draining'); return route.abort('blockedbyclient'); }
      // continue() can follow a local redirect off-origin without routing again.
      // Fetch exactly one verified local response and dispose it deterministically.
      observe(request, 'fetch');
      const response = await route.fetch({ maxRedirects: 0 });
      let primary;
      try {
        assert.equal(response.url(), request.url());
        assert.ok(response.status() >= 200 && response.status() < 300);
        observe(request, 'fulfill');
        await route.fulfill({ response });
      } catch (error) { primary = error; throw error; }
      finally { try { await response.dispose(); } catch (error) { if (!primary) throw error; } }
    })().catch(async () => {
      record('ROUTE_HANDLER_FAILED');
      observe(observedRequest, 'handler-failed', true);
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
      const attempted = await primaryPage.evaluate(() => window.__hhPublicViewportPopupAttempts);
      assert.equal(attempted, 0, 'No popup attempt is authorized by read-only geometry QA');
    }
    assert.equal(failures, 0, 'Public viewport boundary: ' + reasons.join(', '));
  };
  try {
    // Every boundary precedes creation/navigation, including popup first requests.
    await context.route('**/*', handler);
    await context.routeWebSocket('**/*', socket => {
      record('UNEXPECTED_WEBSOCKET');
      const operation = Promise.resolve().then(() => socket.close()).catch(() => record('WEBSOCKET_CLOSE_FAILED'));
      active.add(operation); operation.finally(() => active.delete(operation));
      return operation;
    });
    await context.exposeBinding('__hhRecordPublicViewportPopup', () => { popupAttempts++; record('UNEXPECTED_POPUP_ATTEMPT'); });
    await context.addInitScript(() => {
      window.__hhPublicViewportPopupAttempts = 0;
      const recordAttempt = window.__hhRecordPublicViewportPopup;
      window.open = () => {
        window.__hhPublicViewportPopupAttempts++;
        // Host-side count survives navigation and cannot be erased by a new
        // document replacing this per-window diagnostic counter.
        void recordAttempt().catch(() => {});
        return null;
      };
    });
    context.on('page', onPage);
    const page = await context.newPage();
    assert.equal(page, primaryPage, 'Only one fixture primary page is authorized');
    if (typeof observeTransport === 'function') {
      try { page.on('requestfailed', request => observe(request, 'request-failed', true)); }
      catch { /* diagnostics cannot fail context setup */ }
    }
    return {
      page, context, assertClean,
      summary: () => ({ failureCount: failures, blockedReads, popupAttempts, anonymousTalismansReads, reasons: [...reasons] }),
      async close() {
        if (closed) return;
        const errors = [];
        for (const cleanup of [assertClean, () => { draining = true; }, drain,
          () => context.close(), drain]) {
          try { await cleanup(); } catch (error) { errors.push(error); }
        }
        // Context closure owns init-script globals and websocket interception.
        closed = true;
        if (failures) errors.push(Error('Public viewport boundary: ' + reasons.join(', ')));
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
