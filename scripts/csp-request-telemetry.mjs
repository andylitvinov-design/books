// Diagnostic-only: do not use incomplete observations to allow a browser error.
export function sanitizeCspRequest(input, origin) {
  try {
    const base = new URL(origin);
    if (!['http:', 'https:'].includes(base.protocol) || !['127.0.0.1', 'localhost'].includes(base.hostname)) return null;
    const address = typeof input === 'string' ? input : input instanceof URL ? Object.getOwnPropertyDescriptor(URL.prototype, 'href').get.call(input)
      : typeof Request !== 'undefined' && input instanceof Request ? Object.getOwnPropertyDescriptor(Request.prototype, 'url').get.call(input) : null;
    if (address === null) return null;
    const url = new URL(address, base);
    if (url.origin !== base.origin || url.username || url.password) return null;
    if (!['/', '/en/about', '/en/services', '/en/services/free-situation-review', '/en/academy/reiki/tantra-reiki', '/api/test-catalog/stats'].includes(url.pathname)) return null;
    // Native fetch omits fragments from its network URL. Normalize only this
    // observation clone; never change the caller's URL or emit fragment values.
    url.hash = '';
    const keys = [...url.searchParams.keys()];
    if (url.pathname === '/api/test-catalog/stats' && keys.length) return null;
    if (keys.length && !(keys.length === 1 && keys[0] === '_rsc' && url.searchParams.get('_rsc'))) return null;
    return { path: url.pathname, rsc: keys.length === 1 };
  } catch { return null; }
}

export function installCspFetchTelemetry(sanitize, environment = globalThis) {
  const env = environment;
  if (env.top !== env || typeof env.fetch !== 'function') return;
  const nativeFetch = env.fetch;
  let sequence = 0;
  const record = value => {
    try {
      const key = '__cspRequestTelemetry';
      const entries = JSON.parse(env.sessionStorage.getItem(key) || '[]');
      // Bound diagnostic overhead; missing observations remain missing evidence.
      if (entries.length >= 512) return;
      entries.push(value);
      env.sessionStorage.setItem(key, JSON.stringify(entries));
    } catch { /* Observability must not change application fetch behavior. */ }
  };
  env.fetch = function (...args) {
    try {
      const safe = sanitize(args[0], env.location.origin);
      if (safe) record({ type: 'fetch-start', ...safe, id: `fetch-${++sequence}`,
        documentProbe: env.__cspInitDocumentProbe,
        time: env.performance.timeOrigin + env.performance.now() });
    } catch { /* Preserve native throws, this, arguments, abort and Promise identity. */ }
    return Reflect.apply(nativeFetch, this, args);
  };
}

export function cspFetchTelemetrySource() {
  return `(${installCspFetchTelemetry.toString()})(${sanitizeCspRequest.toString()});`;
}

export function attachCspRequestTelemetry(page, origin, events, now = Date.now) {
  const ids = new WeakMap();
  let sequence = 0;
  const record = (type, request) => {
    try {
      const safe = sanitizeCspRequest(request.url(), origin);
      if (!safe || events.length >= 512) return;
      if (!ids.has(request)) ids.set(request, `request-${++sequence}`);
      events.push({ type, ...safe, id: ids.get(request), time: now() });
    } catch { /* Passive diagnostics cannot affect navigation. */ }
  };
  page.on('request', request => record('request-start', request));
  page.on('requestfailed', request => record('request-failed', request));
  page.on('requestfinished', request => record('request-finished', request));
  page.on('response', response => record('request-response', response.request()));
}
