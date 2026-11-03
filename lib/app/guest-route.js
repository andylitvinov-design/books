// Safe, temporary guest navigation only. URLs carry opaque server-issued IDs,
// never answers, scores, names, OAuth tokens, health concerns or browser secrets.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isGuestReference(value) {
  return typeof value === 'string' && UUID.test(value)
}

export function guestRoutePath(currentUrl, { planId = null, runId = null, resultId = null } = {}) {
  const url = new URL(currentUrl, 'https://holistichouse.invalid')
  if (!/^\/(?:en|ru)\/client\/?$/.test(url.pathname)) throw new Error('INVALID_GUEST_ROUTE')
  for (const id of [planId, runId, resultId]) {
    if (id !== null && id !== undefined && !isGuestReference(id)) throw new Error('INVALID_GUEST_REFERENCE')
  }
  if (runId && resultId) throw new Error('INVALID_GUEST_REFERENCE')
  const query = new URLSearchParams()
  if (planId) query.set('plan', planId)
  if (runId) query.set('run', runId)
  if (resultId) query.set('result', resultId)
  return url.pathname + (query.size ? '?' + query.toString() : '')
}

export function replaceGuestRoute(selection = {}) {
  if (typeof window === 'undefined') return null
  const path = guestRoutePath(window.location.href, selection)
  window.history.replaceState(window.history.state, '', path)
  return path
}
