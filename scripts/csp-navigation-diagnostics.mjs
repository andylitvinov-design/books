// WebKit reports refused teardown fetches as JavaScript-source console errors,
// which Playwright promotes to pageerror. Do not apply a broad message ignore.
// https://github.com/microsoft/playwright/issues/42823
export function classifyCspNavigationCancellation(error, { engine, readiness, origin, lifecycle, fetchTelemetry = [] }) {
  if (engine !== 'webkit' || readiness !== 'rapid-history' || !Number.isFinite(error.time)) return null;
  if (lifecycle.some(event => ['window-error', 'unhandled-rejection'].includes(event.type))) return null;
  const match = error.stack?.split('\n')[0].match(/^Fetch API cannot load (https?:\/\/[^\s]+) due to access control checks\.$/);
  if (!match) return null;
  const url = new URL(match[1]);
  if (url.origin !== new URL(origin).origin || url.username || url.password || url.hash) return null;
  const bootstrap = url.pathname === '/api/app/guest/bootstrap' && !url.search;
  const prefetch = ['/', '/en/services/free-situation-review'].includes(url.pathname)
    && [...url.searchParams.keys()].length === 1 && url.searchParams.has('_rsc') && !!url.searchParams.get('_rsc');
  const clientPrefetch = ['/en/client', '/en/contact'].includes(url.pathname)
    && [...url.searchParams.keys()].length === 1 && url.searchParams.has('_rsc') && !!url.searchParams.get('_rsc');
  // Only the exact anonymous GET may be traced during verified old-document teardown.
  const telegramTeardown = url.pathname === '/api/public/telegram-diagnostic' && !url.search;
  // The EN homepage starts this anonymous metadata GET. WebKit can surface
  // cancellation when that exact old document is replaced by public About.
  const englishIntroTeardown = url.pathname === '/api/public/english-intro-video' && !url.search;
  const tantraPrefetch = (['/', '/en/academy', '/en/academy/principles-of-energywork/learn'].includes(url.pathname)
      && [...url.searchParams.keys()].length === 1 && !!url.searchParams.get('_rsc'))
    || (url.pathname === '/en/client/tests' && [...url.searchParams.keys()].length === 2
      && url.searchParams.get('focus') === 'tantra' && !!url.searchParams.get('_rsc'));
  if (!bootstrap && !prefetch && !clientPrefetch && !tantraPrefetch && !telegramTeardown && !englishIntroTeardown) return null;
  for (const navigation of lifecycle) {
    if (navigation.type !== 'navigate' || navigation.sameDocument !== false || Math.floor(navigation.time) > error.time) continue;
    const source = lifecycle.find(event => event.type === 'init' && event.documentProbe === navigation.documentProbe);
    if (!source || new URL(source.url).origin !== url.origin) continue;
    const sourcePath = new URL(source.url).pathname;
    const tantraBack = (tantraPrefetch || telegramTeardown) && error.phase === 'back-from-tantra'
      && source.url === new URL('/en/academy/reiki/tantra-reiki', origin).href
      && navigation.documentClass === 'tantra-media' && navigation.navigationType === 'replace'
      && navigation.destination === new URL('/en/about', origin).href
      && lifecycle.some(event => event.type === 'navigate' && event.documentProbe === navigation.documentProbe
        && event.time <= navigation.time && event.sameDocument === true && event.navigationType === 'traverse'
        && event.url === source.url && event.documentClass === 'tantra-media'
        && event.destination === navigation.destination);
    // An interrupted WebKit rapid history Forward may abort the old About
    // document's RSC home prefetch without emitting pagehide. Classify only
    // with old-document fetch provenance and verified new Tantra document.
    const aboutForward = prefetch && url.pathname === '/' && error.phase === 'forward-to-tantra'
      && source.url === new URL('/en/about', origin).href
      && navigation.documentClass === 'public-video' && navigation.navigationType === 'replace'
      && navigation.destination === new URL('/en/academy/reiki/tantra-reiki', origin).href
      && lifecycle.some(event => event.type === 'navigate' && event.documentProbe === navigation.documentProbe
        && event.time <= navigation.time && event.sameDocument === true && event.navigationType === 'traverse'
        && event.url === new URL('/en/about', origin).href && event.destination === navigation.destination);
    if ((tantraPrefetch || telegramTeardown) && !prefetch && !clientPrefetch && !tantraBack) continue;
    // The same shared-header home prefetch was observed during private Back/
    // Forward teardown. Accept only that traced client -> About traversal.
    const clientHomePrefetch = prefetch && url.pathname === '/'
      && source.url === new URL('/en/client', origin).href
      && navigation.documentClass === 'private' && navigation.navigationType === 'traverse'
      && navigation.destination === new URL('/en/about', origin).href;
    // The exact free-review prefetch was also observed during the public
    // home's hard Forward to About and Back to private, before that home hid.
    const homeReviewPrefetch = prefetch && url.pathname === '/en/services/free-situation-review'
      && source.url === new URL('/', origin).href
      && navigation.documentClass === 'public-video' && navigation.navigationType === 'traverse'
      && ((error.phase === 'forward-to-public' && navigation.destination === new URL('/en/about', origin).href)
        || (error.phase === 'back-to-private' && navigation.destination === new URL('/en/client', origin).href));
    // WebKit rapid history: old private Tests initiated this exact home RSC
    // fetch while forwarding to the public home, then cancelled before pagehide.
    // Never classify arbitrary CSP errors or new-document requests as teardown.
    // Only an old public home document's first-party metadata request may
    // be classified across the two proven history boundaries; all real CSP
    // violations, new-document errors and loaded journeys remain fatal.
    const englishIntroDestination = error.phase === 'forward-to-public'
      ? '/en/about' : error.phase === 'back-to-private' ? '/en/client/tests' : null;
    const englishIntroCancel = englishIntroTeardown && englishIntroDestination !== null
      && source.url === new URL('/', origin).href
      && navigation.documentClass === 'public-video'
      && navigation.navigationType === 'traverse'
      && navigation.destination === new URL(englishIntroDestination, origin).href
      && lifecycle.some(event => event.type === 'pageshow'
        && event.documentProbe === source.documentProbe
        && event.documentClass === 'public-video'
        && event.time >= source.time && event.time <= navigation.time)
      && fetchTelemetry.some(item => item.type === 'fetch-start'
        && item.path === '/api/public/english-intro-video' && item.rsc === false
        && item.documentProbe === source.documentProbe
        && item.time >= source.time && item.time <= error.time);
    const testsHomePrefetch = prefetch && url.pathname === '/' && error.phase === 'forward-to-public-home'
      && source.url === new URL('/en/client/tests', origin).href
      && navigation.documentClass === 'private' && navigation.navigationType === 'traverse'
      && navigation.destination === new URL('/', origin).href
      && fetchTelemetry.some(item => item.type === 'fetch-start'
        && item.path === '/' && item.rsc === true && item.documentProbe === source.documentProbe
        && item.time >= navigation.time && item.time <= error.time);
    // Observed after Back from About to the public home: its interrupted
    // router is replaced while an About-page client-link prefetch is pending.
    // Require that exact same-document traversal followed by hard replacement;
    // the usual pagehide/new-document timing guards below still apply.
    if (clientPrefetch && !(error.phase === 'back-to-public-home' && source.url === new URL('/en/about', origin).href
      && navigation.documentClass === 'public-video' && navigation.navigationType === 'replace'
      && navigation.destination === new URL('/', origin).href
      && lifecycle.some(event => event.type === 'navigate' && event.documentProbe === navigation.documentProbe
        && event.time <= navigation.time && event.sameDocument === true && event.navigationType === 'traverse'
        && event.url === new URL('/en/about', origin).href && event.documentClass === 'public-video'
        && event.destination === navigation.destination))) continue;
    if (sourcePath !== (bootstrap ? '/en/client' : '/en/about') && !clientHomePrefetch && !homeReviewPrefetch && !tantraBack && !testsHomePrefetch && !englishIntroCancel) continue;
    const nextDocument = lifecycle.find(event => event.type === 'init' && event.time > navigation.time && event.documentProbe !== navigation.documentProbe);
    // Reject errors at/after the new document's first millisecond. They are not
    // attributable to the old document, even when the wording is identical.
    if (!nextDocument || error.time >= Math.floor(nextDocument.time) || nextDocument.url !== navigation.destination) continue;
    const pageHide = lifecycle.find(event => event.type === 'pagehide' && event.documentProbe === navigation.documentProbe && event.time >= navigation.time && event.time < nextDocument.time);
    // Reject true policy violations and errors at/after old-document pagehide.
    if (testsHomePrefetch && (!pageHide || error.time >= Math.floor(pageHide.time)
      || lifecycle.some(event => event.type === 'policy-violation'
        && event.documentProbe === source.documentProbe
        && event.time >= navigation.time && event.time <= nextDocument.time))) continue;
    if (englishIntroTeardown) {
      // Real run 43742140905 WebKit/390: old home fetch, Forward to About,
      // diagnostic 3ms before old pagehide, and new document 12ms later.
      // Without exact first-party provenance or in case of any policy violation,
      // this is a fatal error rather than a generic console ignore.
      const pageHideTime = Math.floor(pageHide?.time ?? NaN);
      const nextInitTime = Math.floor(nextDocument.time);
      if (!englishIntroCancel || !pageHide || error.time < Math.floor(navigation.time)
        || error.time - Math.floor(navigation.time) > 1000
        || error.time > pageHideTime || pageHideTime - error.time > 50
        || nextInitTime < error.time || nextInitTime - error.time > 200
        || !lifecycle.some(event => event.type === 'domcontentloaded'
          && event.documentProbe === nextDocument.documentProbe
          && event.documentClass === (error.phase === 'back-to-private' ? 'private' : 'public-video')
          && event.time >= nextDocument.time)
        || lifecycle.some(event => event.type === 'policy-violation'
          && event.documentProbe === source.documentProbe
          && event.time >= source.time && event.time <= nextDocument.time)) continue;
      return { kind: 'webkit-traced-english-intro-teardown',
        requestUrl: url.href, sourceDocument: source.documentProbe,
        destinationDocument: nextDocument.documentProbe,
        navigationTime: navigation.time, errorTime: error.time,
        pageHideTime: pageHide.time, nextDocumentTime: nextDocument.time };
    }
    let postHideTelegram = false;
    if (telegramTeardown) {
      // Source-backed WebKit-only cancellation, never an allowed CSP violation:
      // require a matching old-document anonymous fetch and a real pagehide
      // AFTER the console diagnostic and BEFORE the new About document.
      const oldFetch = fetchTelemetry.find(item => item.type === 'fetch-start'
        && item.path === '/api/public/telegram-diagnostic' && item.rsc === false
        && item.documentProbe === source.documentProbe
        && item.time >= navigation.time - 1000 && item.time <= error.time);
      // A second verified old-document WebKit abort in #43669083441
      // surfaced 1ms AFTER pagehide, before the new document was initialized.
      // Require the old document's exact anonymous fetch (after hard-navigation
      // start, before pagehide), a <=10ms lag, and zero actual CSP violations.
      const pageHideTime = Math.floor(pageHide?.time ?? NaN);
      postHideTelegram = Boolean(oldFetch && pageHide
        && oldFetch.time >= navigation.time && oldFetch.time <= pageHideTime
        && error.time > pageHideTime && error.time - pageHideTime <= 10);
      if (!oldFetch || !pageHide || (error.time >= pageHideTime && !postHideTelegram)
        || lifecycle.some(item => item.type === 'policy-violation'
          && item.documentProbe === source.documentProbe
          && item.time >= navigation.time - 1000 && item.time <= nextDocument.time)) continue;
    }
    if (!pageHide || (error.time > Math.floor(pageHide.time) && !postHideTelegram)) {
      // No broad console-error ignore: prove the request, exact timeline,
      // required cross-policy document and lack of real CSP violations.
      if (!aboutForward || pageHide || error.time - Math.floor(navigation.time) > 1500
        || Math.floor(nextDocument.time) - error.time > 1500) continue;
      const oldRequest = fetchTelemetry.find(item => item.type === 'fetch-start'
        && item.path === '/' && item.rsc === true && item.documentProbe === source.documentProbe
        && item.time >= navigation.time && item.time <= error.time);
      if (!oldRequest || !lifecycle.some(event => event.documentProbe === nextDocument.documentProbe
        && event.documentClass === 'tantra-media' && event.type === 'domcontentloaded')) continue;
      if (lifecycle.some(event => event.type === 'policy-violation' && event.documentProbe === source.documentProbe
        && event.time >= navigation.time && event.time <= nextDocument.time)) continue;
      return { kind: 'webkit-traced-forward-rsc-teardown', requestUrl: url.href,
        sourceDocument: source.documentProbe, destinationDocument: nextDocument.documentProbe,
        fetchStartTime: oldRequest.time, navigationTime: navigation.time, errorTime: error.time,
        nextDocumentTime: nextDocument.time };
    }
    return { kind: postHideTelegram ? 'webkit-traced-telegram-post-pagehide' : 'webkit-hard-navigation-fetch-cancellation', requestUrl: url.href, sourceDocument: source.documentProbe, destinationDocument: nextDocument.documentProbe, navigationTime: navigation.time, errorTime: error.time, pageHideTime: pageHide.time, nextDocumentTime: nextDocument.time };
  }
  return null;
}

// Playwright's native history waiter may be cancelled by the application's
// required hard replacement of a foreign history document. Never issue a
// second traversal or suppress real JS/CSP errors. The caller must independently
// prove that the one native action reached the exact destination and real DOM.
export async function traverseCspHistory({page,direction,engine,readiness,verifyArrival,onCancellation}) {
  if (!['back','forward'].includes(direction)) throw new Error('Invalid native history direction');
  const method = direction === 'back' ? 'goBack' : 'goForward';
  try {
    await page[method]({ waitUntil: 'domcontentloaded' });
  } catch (error) {
    const firstLine = String(error?.message || '').split('\n')[0];
    const expected = engine === 'webkit' ? 'Load request cancelled' : engine === 'chromium' ? 'net::ERR_ABORTED' : null;
    if (readiness !== 'rapid-history' || !expected || page.isClosed() ||
        firstLine !== 'page.' + method + ': ' + expected + '; maybe frame was detached?') throw error;
    await verifyArrival(); // Fatal on wrong URL, CSP, landmark or missing navigation evidence.
    onCancellation({ kind: 'native-history-waiter-cancelled-after-proven-arrival', method, message: firstLine });
  }
}
