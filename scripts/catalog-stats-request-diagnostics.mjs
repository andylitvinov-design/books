// Passive, bounded evidence for the one public aggregate endpoint. No bodies,
// cookies, headers, query strings, retries or changes to browser error policy.
export function installCatalogStatsDiagnostic(env = globalThis) {
  if (env.top !== env || typeof env.fetch !== 'function') return
  const nativeFetch = env.fetch
  let sequence = 0
  const record = event => {
    try {
      const key = '__catalogStatsDiagnostic'
      const rows = JSON.parse(env.sessionStorage.getItem(key) || '[]')
      if (rows.length >= 128) return
      rows.push({ ...event, time: env.performance.timeOrigin + env.performance.now(), documentProbe: env.__publicAuditProbe || env.__cspInitDocumentProbe || null })
      env.sessionStorage.setItem(key, JSON.stringify(rows))
    } catch { /* Observation must never change fetch behavior. */ }
  }
  env.fetch = function (...args) {
    try {
      if (typeof args[0] === 'string') {
        const url = new URL(args[0], env.location.origin)
        if (url.origin === env.location.origin && url.pathname === '/api/test-catalog/stats' && !url.search && !url.hash) {
          const signal = args[1]?.signal
          const observed = typeof env.AbortSignal === 'function' && signal instanceof env.AbortSignal
          const id = ++sequence
          record({ type: 'fetch-start', id, signalAttached: observed, aborted: observed ? signal.aborted : null })
          if (observed) signal.addEventListener('abort', () => record({ type: 'signal-abort', id }), { once: true })
        }
      }
    } catch { /* Preserve native errors, this, arguments and Promise identity. */ }
    return Reflect.apply(nativeFetch, this, args)
  }
}
export function catalogStatsDiagnosticSource() { return `(${installCatalogStatsDiagnostic.toString()})();` }
export function attachCatalogStatsResponseDiagnostic(page, origin, events, now = Date.now) {
  page.on('response', response => {
    try {
      const url = new URL(response.url())
      if (url.origin !== origin || url.pathname !== '/api/test-catalog/stats' || url.search || url.hash || events.length >= 128) return
      events.push({ type: 'response', time: now(), status: response.status(), fromServiceWorker: response.fromServiceWorker() })
    } catch { /* Passive diagnostic only. */ }
  })
}
