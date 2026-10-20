// Passive evidence only. No event here is used to allow an error or delay navigation.
const publicPaths = new Set(['/', '/ru', ...['en', 'ru', 'es'].map(locale => `/${locale}/academy/free-ai-courses`), ...['es', 'en'].flatMap(locale => ['', '/library', '/services', '/masters', '/academy', '/books', '/about', '/courses', '/homeopathy', '/homeopathy/remedies', '/homeopathy/remedies/aconitum'].map(path => `/${locale}${path}`))]);
export function publicRoute(input, origin) {
  try {
    if (typeof input !== 'string' || !input) return null;
    const base = new URL(origin);
    const url = new URL(input, base);
    if (!['http:', 'https:'].includes(base.protocol) || url.origin !== base.origin || url.username || url.password || !publicPaths.has(url.pathname)) return null;
    return { path: url.pathname, rsc: url.searchParams.has('_rsc') };
  } catch { return null; }
}
export function createPublicDiagnostics(origin, limit = 1024) {
  const events = [];
  const dropped = {};
  const counts = {};
  const kinds = new Set(['request-start', 'request-finished', 'request-failed', 'response', 'pageerror', 'frame-navigation', 'proxy-start', 'proxy-finish', 'proxy-close', 'proxy-response', 'proxy-error', 'document-init', 'DOMContentLoaded', 'load', 'pageshow', 'pagehide', 'popstate', 'error', 'unhandledrejection']);
  let next = 0;
  const ids = new WeakMap();
  const id = object => { if (!ids.has(object)) ids.set(object, ++next); return ids.get(object); };
  function record(kind, url, fields = {}) {
    try {
      let route = publicRoute(url, origin);
      if (!kinds.has(kind)) return;
      if (!route) {
        const terminalOrLifecycle = ['pageerror', 'frame-navigation', 'document-init', 'DOMContentLoaded', 'load', 'pageshow', 'pagehide', 'popstate', 'error', 'unhandledrejection'].includes(kind);
        const candidate = typeof url === 'string' && url ? new URL(url, origin) : null;
        if (!terminalOrLifecycle || !candidate || !['http:', 'https:'].includes(candidate.protocol) || candidate.origin !== new URL(origin).origin || candidate.username || candidate.password) return;
        route = {path:null};
      }
      const group = /^(chromium|webkit) (390|1365)(?: |$)/.exec(fields.stage ?? '');
      const bucket = group ? `${group[1]}-${group[2]}` : 'proxy-or-setup';
      const stream = kind.startsWith('proxy-') ? 'proxy' : ['pageerror', 'error', 'unhandledrejection'].includes(kind) ? 'errors' : ['request-start', 'request-finished', 'request-failed', 'response'].includes(kind) ? 'requests' : 'lifecycle';
      const budget = `${bucket}:${stream}`;
      if ((counts[budget] ?? 0) >= limit) { dropped[budget] = (dropped[budget] ?? 0) + 1; return; }
      counts[budget] = (counts[budget] ?? 0) + 1;
      const event = { kind, ...route, time: Date.now(), group:bucket, stream };
      if (group) { event.engine = group[1]; event.width = Number(group[2]); }
      const source = publicRoute(fields.source, origin);
      if (source) event.observedFramePath = source.path;
      for (const key of ['request', 'document', 'status', 'sourceTime']) if (Number.isFinite(fields[key])) event[key] = fields[key];
      if (['error', 'unhandledrejection', 'access-control', 'other'].includes(fields.error)) event.error = fields.error;
      if (typeof fields.stage === 'string') {
        const value = fields.stage.replace(/^(chromium|webkit) (390|1365) /, '');
        event.stage = publicRoute(value, origin)?.path ?? (['search', 'remembered language', 'client-entry language selection', 'Spanish account navigation'].includes(value) ? value : 'unlisted');
      }
      events.push(event);
    } catch { /* Observation must not interfere with the browser or proxy. */ }
  }
  function observePage(page, stage) {
    const listen = (name, callback) => page.on(name, (...args) => { try { callback(...args); } catch { /* passive */ } });
    const source = request => { try { return request.frame().url(); } catch { return null; } };
    for (const [name, kind] of [['request','request-start'], ['requestfinished','request-finished'], ['requestfailed','request-failed']]) {
      listen(name, request => record(kind, request.url(), { request:id(request), source:source(request), stage:stage() }));
    }
    listen('response', response => record('response', response.url(), {request:id(response.request()), source:source(response.request()), status:response.status(), stage:stage()}));
    listen('pageerror', error => record('pageerror', page.url(), {error:/access control checks/i.test(error.message) ? 'access-control' : 'other', stage:stage()}));
    listen('framenavigated', frame => { if (frame === page.mainFrame()) record('frame-navigation', frame.url(), {stage:stage()}); });
  }
  function observeProxy(incoming, outgoing, upstream, stage) {
    const request = id(incoming);
    record('proxy-start', incoming.url, {request,stage});
    outgoing.on('finish', () => record('proxy-finish', incoming.url, {request,stage,status:outgoing.statusCode}));
    outgoing.on('close', () => record('proxy-close', incoming.url, {request,stage,status:outgoing.statusCode}));
    upstream.on('response', response => record('proxy-response', incoming.url, {request,stage,status:response.statusCode}));
    upstream.on('error', () => record('proxy-error', incoming.url, {request,stage}));
  }
  return {events, dropped, record, observePage, observeProxy};
}
// Installed before any page navigation; no fetch/history methods are wrapped.
export function installPublicLifecycle() {
  const document = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  const emit = kind => {
    try { window.__esPublicEvidence({kind, url:location.origin + location.pathname, document, sourceTime:Date.now()}).catch(() => {}); } catch { /* passive */ }
  };
  emit('document-init');
  for (const name of ['DOMContentLoaded', 'load', 'pageshow', 'pagehide', 'popstate', 'error', 'unhandledrejection']) window.addEventListener(name, () => emit(name));
}
