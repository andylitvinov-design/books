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
  if (!bootstrap && !prefetch) return null;
  for (const navigation of lifecycle) {
    if (navigation.type !== 'navigate' || navigation.sameDocument !== false || Math.floor(navigation.time) > error.time) continue;
    const source = lifecycle.find(event => event.type === 'init' && event.documentProbe === navigation.documentProbe);
    if (!source || new URL(source.url).origin !== url.origin) continue;
    if (new URL(source.url).pathname !== (bootstrap ? '/en/client' : '/en/about')) continue;
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
