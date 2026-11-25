// Synthetic loopback CI diagnostics only. Never changes error classification.
export function billingStatusRequestDiagnostic(origin, request, now = Date.now()) {
  const url = new URL(request.url())
  if (url.origin !== origin || url.pathname !== '/api/app/billing/status') return null
  const raw = request.failure()?.errorText || ''
  const errorText = /^(?:net::ERR_[A-Z_]+|cancelled|canceled|Load failed|The operation was aborted\.?|Failed to fetch)$/i.test(raw)
    ? raw : '[unclassified error text redacted]'
  return { kind: 'requestfailed', at: now, path: url.pathname, errorText }
}

export function installBillingStatusLifecycleDiagnostics() {
  const path = '/api/app/billing/status'
  const emit = kind => {
    // Only route pathname and lifecycle flags cross the diagnostic boundary.
    try {
      void window.__hhBillingStatusDiagnostic({ kind, at: Date.now(), path,
        pagePath: window.location.pathname, visibility: document.visibilityState }).catch(() => {})
    } catch { /* A closing page may already have lost its diagnostic binding. */ }
  }
  window.addEventListener('pagehide', () => emit('pagehide'))
  window.addEventListener('beforeunload', () => emit('beforeunload'))
  document.addEventListener('visibilitychange', () => emit('visibilitychange'))
  const originalFetch = window.fetch.bind(window)
  window.fetch = (...args) => {
    // Preserve native argument validation and exact promise identity first.
    const result = originalFetch(...args)
    try {
      const input = args[0]
      const address = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url
      const url = new URL(address, window.location.href)
      if (url.origin === window.location.origin && url.pathname === path) {
        const suppliedSignal = args[1]?.signal
        const signal = suppliedSignal !== undefined ? suppliedSignal : input?.signal
        const aborted = () => emit('signal-abort')
        emit('request-start')
        if (signal?.aborted) aborted()
        else signal?.addEventListener('abort', aborted, { once: true })
        // Never attach promise handlers: a rejection observer could hide an
        // otherwise-unhandled fetch failure. Network events are recorded in Node.
      }
    } catch { /* Diagnostics must not change fetch argument/error behavior. */ }
    return result
  }
}
