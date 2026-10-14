// Synthetic public-page evidence only. This observer never classifies or ignores errors.
export function publicDiagnosticUrl(value, origin) {
  try {
    const url = new URL(value)
    if (url.origin !== origin || url.username || url.password || url.hash) return null
    if (!/^\/(?:es|(?:en|ru|es)\/(?:services(?:\/[a-z0-9-]+)?|library))?\/?$/.test(url.pathname)) return null
    return { path: url.pathname, rsc: url.searchParams.has('_rsc') }
  } catch { return null }
}

function safeFailure(value) {
  const text = String(value || '')
  return ['Load request cancelled', 'Cancelled', 'cancelled', 'Failed to fetch'].includes(text) || /^net::ERR_[A-Z_]+$/.test(text) ? text : 'other failure'
}

export async function observePublicNavigation(page, { engine, origin, record }) {
  let active = true, phase = 'initial', count = 0
  const emit = (kind, detail = {}) => {
    if (!active) return
    if (count++ < 5000) record({ time: Date.now(), engine, phase, kind, ...detail })
    else if (count === 5001) record({ time: Date.now(), engine, phase, kind: 'diagnostic-limit-reached' })
  }
  const request = value => {
    const url = publicDiagnosticUrl(value.url(), origin)
    if (url && (url.rsc || value.isNavigationRequest())) emit('request', { ...url, navigation: value.isNavigationRequest() })
  }
  const failed = value => {
    const url = publicDiagnosticUrl(value.url(), origin)
    if (url && (url.rsc || value.isNavigationRequest())) emit('requestfailed', { ...url, errorText: safeFailure(value.failure()?.errorText) })
  }
  const response = value => {
    const url = publicDiagnosticUrl(value.url(), origin)
    if (url && (url.rsc || value.request().isNavigationRequest())) emit('response', { ...url, status: value.status() })
  }
  const pageerror = error => emit('pageerror', { document: publicDiagnosticUrl(page.url(), origin)?.path || null, accessControlMessage: String(error.message).includes('due to access control checks'), name: ['Error', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError', 'AggregateError'].includes(error.name) ? error.name : 'OtherError' })
  // Only fixed fields from allowlisted public documents survive this binding.
  await page.exposeBinding('__iaPublicNavigationDiagnostic', (_source, event) => {
    const document = publicDiagnosticUrl(event?.url, origin)
    if (!document || !['pagehide', 'pageshow', 'securitypolicyviolation'].includes(event?.type)) return
    emit(event.type, { document: document.path, ...(event.type === 'securitypolicyviolation' ? { directive: /^[a-z-]{1,40}$/.test(event.directive) ? event.directive : 'unknown', blocked: publicDiagnosticUrl(event.blocked, origin)?.path || 'non-public-or-external' } : {}) })
  })
  await page.addInitScript(() => {
    for (const type of ['pagehide', 'pageshow', 'securitypolicyviolation']) addEventListener(type, event => {
      void window.__iaPublicNavigationDiagnostic({ type, url: location.href, directive: event.effectiveDirective, blocked: event.blockedURI }).catch(() => {})
    })
  })
  page.on('request', request); page.on('requestfailed', failed); page.on('response', response); page.on('pageerror', pageerror)
  return {
    phase(value) { phase = value; emit('case-start') },
    stop() { active = false; page.off('request', request); page.off('requestfailed', failed); page.off('response', response); page.off('pageerror', pageerror) },
  }
}
