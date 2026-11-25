export async function appFetch(path, body, method, { accountId, signal } = {}) {
  const verb = method || (body ? 'POST' : 'GET')
  const response = await fetch(`/api/app/${path}`, {
    method: verb,
    cache: 'no-store',
    credentials: 'same-origin', signal,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(accountId ? { 'X-HH-Account-ID': accountId } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  let value
  try {
    value = await response.json()
  } catch (cause) {
    // A response body can be interrupted after successful HTTP headers (e.g.
    // WebKit navigation). Never turn that read failure into successful data.
    throw responseError(response, 'SERVICE_UNAVAILABLE', cause)
  }
  if (!response.ok || value?.error) {
    throw responseError(response, value?.error || 'SERVICE_UNAVAILABLE')
  }
  if (path.split('?')[0] === 'bootstrap' && !isBootstrap(value)) {
    throw responseError(response, 'SERVICE_UNAVAILABLE')
  }
  // Only successful writes invalidate private snapshots, never failed requests.
  if (verb !== 'GET') clearCabinetBootstrapCache()
  return value
}
function responseError(response, code, cause) {
  const error = new Error(code, { cause })
  error.code = code
  error.status = response.status
  return error
}

function isBootstrap(value) {
  return value?.account && !Array.isArray(value.account) &&
    typeof value.account.id === 'string' &&
    typeof value.account.onboardingState === 'string' &&
    ['results', 'runs', 'requests', 'consents', 'services'].every(key => Array.isArray(value[key]))
}


// Only memory in the current browser page: no local/session storage and no
// Next or HTTP private-data cache. The secure API retains 'no-store', verified
// sessions, rate limits and account-scoped database queries.
let ownerId = null
let portrait = null
let full = null
let revision = 0
const pending = new Map()

export function clearCabinetBootstrapCache() {
  revision++
  ownerId = null
  portrait = null
  full = null
  pending.clear()
}

export function peekCabinetBootstrap(view = 'full') {
  if (!ownerId) return null
  if (view === 'portrait') return full || portrait
  return view === 'full' ? full : null
}

export function getCabinetBootstrap(view = 'full', { refresh = false } = {}) {
  if (view !== 'portrait' && view !== 'full')
    return Promise.reject(new Error('UNSUPPORTED_BOOTSTRAP_VIEW'))
  if (refresh) clearCabinetBootstrapCache()
  const cached = peekCabinetBootstrap(view)
  if (cached) return Promise.resolve(cached)
  const running = pending.get(view)
  if (running) return running
  const initialRevision = revision
  const task = appFetch(view === 'portrait' ? 'bootstrap?view=portrait' : 'bootstrap')
    .then(value => {
      if (initialRevision !== revision) return value
      if (ownerId && ownerId !== value.account.id) clearCabinetBootstrapCache()
      ownerId = value.account.id
      if (view === 'portrait') portrait = value
      else { full = value; portrait = null }
      return value
    })
  pending.set(view, task)
  void task.then(
    () => { if (pending.get(view) === task) pending.delete(view) },
    () => { if (pending.get(view) === task) pending.delete(view) },
  )
  return task
}
