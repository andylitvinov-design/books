// WebKit reports refused teardown fetches as JavaScript-source console errors,
// which Playwright promotes to pageerror. Do not apply a broad message ignore.
// https://github.com/microsoft/playwright/issues/42823
export function classifyCspNavigationCancellation(error, { engine, readiness, origin, lifecycle }) {
  if (engine !== 'webkit' || readiness !== 'rapid-history' || !Number.isFinite(error.time)) return null;
  if (lifecycle.some(event => ['window-error', 'unhandled-rejection'].includes(event.type))) return null;
  const match = error.stack?.split('\n')[0].match(/^Fetch API cannot load (https?:\/\/[^\s]+) due to access control checks\.$/);
  if (!match) return null;
  const url = new URL(match[1]);
  if (url.origin !== new URL(origin).origin || url.username || url.password || url.hash) return null;
  const bootstrap = url.pathname === '/api/app/guest/bootstrap' && !url.search;
  const prefetch = ['/', '/en/services/free-situation-review'].includes(url.pathname)
    && [...url.searchParams.keys()].length === 1 && url.searchParams.has('_rsc') && !!url.searchParams.get('_rsc');
  const clientPrefetch = url.pathname === '/en/client'
    && [...url.searchParams.keys()].length === 1 && url.searchParams.has('_rsc') && !!url.searchParams.get('_rsc');
  if (!bootstrap && !prefetch && !clientPrefetch) return null;
  for (const navigation of lifecycle) {
    if (navigation.type !== 'navigate' || navigation.sameDocument !== false || Math.floor(navigation.time) > error.time) continue;
    const source = lifecycle.find(event => event.type === 'init' && event.documentProbe === navigation.documentProbe);
    if (!source || new URL(source.url).origin !== url.origin) continue;
    const sourcePath = new URL(source.url).pathname;
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
    if (sourcePath !== (bootstrap ? '/en/client' : '/en/about') && !clientHomePrefetch && !homeReviewPrefetch) continue;
    const nextDocument = lifecycle.find(event => event.type === 'init' && event.time > navigation.time && event.documentProbe !== navigation.documentProbe);
    // Reject errors at/after the new document's first millisecond. They are not
    // attributable to the old document, even when the wording is identical.
    if (!nextDocument || error.time >= Math.floor(nextDocument.time) || nextDocument.url !== navigation.destination) continue;
    const pageHide = lifecycle.find(event => event.type === 'pagehide' && event.documentProbe === navigation.documentProbe && event.time >= navigation.time && event.time < nextDocument.time);
    if (!pageHide || error.time > Math.floor(pageHide.time)) continue;
    return { kind: 'webkit-hard-navigation-fetch-cancellation', requestUrl: url.href, sourceDocument: source.documentProbe, destinationDocument: nextDocument.documentProbe, navigationTime: navigation.time, errorTime: error.time, pageHideTime: pageHide.time, nextDocumentTime: nextDocument.time };
  }
  return null;
}
