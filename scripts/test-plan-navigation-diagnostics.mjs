// Observational diagnostics for the isolated browser journey. These listeners
// never replace fetch/history, read request bodies, or handle application errors.
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'
const apiRecord = new RegExp('^/api/app/(test-plans|runs)/' + UUID + '(/(?:save|advance|remove))?$', 'i')
const runPage = new RegExp('^/(en|ru)/app/runs/' + UUID + '$', 'i')
const phases = new Set([
  'enter-test-begin', 'before-selection-click', 'after-selection-click',
  'saved-list-visible', 'before-start-click', 'after-start-click',
  'run-url-observed', 'enter-test-failed', 'enter-test-end',
])
const binding = '__hhTestPlanNavigationDiagnostic'

export function testPlanDiagnosticPath(address, origin) {
  try {
    const url = new URL(address, origin)
    if (url.origin !== origin || url.username || url.password) return null
    const path = url.pathname
    if (/^\/api\/app\/(bootstrap|test-plans|runs|course)$/.test(path)) return path
    if (/^\/(en|ru)\/app(?:\/tests)?$/.test(path)) return path
    if (apiRecord.test(path)) return path.replace(new RegExp(UUID, 'i'), ':id')
    if (runPage.test(path)) return path.replace(new RegExp(UUID, 'i'), ':id')
  } catch { /* Unparseable and unrelated addresses are not diagnostic data. */ }
  return null
}

// Self-contained so Playwright can install this function in each new document.
export function installTestPlanDOMDiagnostics() {
  if (window.__hhTestPlanNavigationDiagnosticInstalled) return
  window.__hhTestPlanNavigationDiagnosticInstalled = true
  function pagePath() {
    const path = window.location.pathname
    if (/^\/(en|ru)\/app(?:\/tests)?$/.test(path)) return path
    if (/^\/(en|ru)\/app\/runs\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(path))
      return path.replace(/[^/]+$/, ':id')
    return null
  }
  function report(kind, fields = {}) {
    try {
      const path = pagePath()
      if (!path || typeof window.__hhTestPlanNavigationDiagnostic !== 'function') return
      // Only the diagnostic binding's own promise is observed. Never attach a
      // handler to fetch or to an application's promise/rejection.
      void window.__hhTestPlanNavigationDiagnostic({
        kind, at: Date.now(), path,
        visibility: document.visibilityState,
        hasPlan: new URLSearchParams(window.location.search).has('plan'),
        ...fields,
      }).catch(() => {})
    } catch { /* A closing document may have lost its diagnostic binding. */ }
  }
  function pointer(event) {
    try {
      const button = event.target?.closest?.('button')
      const row = button?.closest('[data-saved-test]')
      const inList = Boolean(row?.closest('#my-tests-list'))
      const intendedStart = inList && Boolean(button?.classList?.contains('hh-primary'))
      report(event.type, {
        targetClass: intendedStart ? 'saved-test-action' : inList ? 'saved-test-other' : button ? 'button' : 'other',
        intendedStart,
        disabled: Boolean(button?.disabled),
        connected: Boolean((button || event.target)?.isConnected),
      })
    } catch { /* Event observation cannot affect dispatch or application code. */ }
  }
  for (const kind of ['pointerdown', 'click'])
    document.addEventListener(kind, pointer, { capture: true, passive: true })
  for (const kind of ['pagehide', 'beforeunload'])
    window.addEventListener(kind, () => report(kind), { capture: true, passive: true })
  document.addEventListener('visibilitychange', () => report('visibilitychange'), { capture: true, passive: true })
}

export async function installTestPlanNavigationDiagnostics(page, origin, emit) {
  if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))
    throw new Error('Test-plan diagnostics require an isolated loopback origin')
  let active = false, disposed = false, scope = 0, nextRequest = 0
  const requests = new WeakMap()
  const listeners = []
  const send = event => {
    if (!active || disposed) return
    try { emit({ scope, ...event }) } catch { /* Diagnostic sink only. */ }
  }
  const pageLocation = () => {
    const address = page.url()
    return { path: testPlanDiagnosticPath(address, origin), hasPlan: new URL(address).searchParams.has('plan') }
  }
  const observe = (kind, callback) => {
    const listener = value => {
      if (!active || disposed) return
      try { callback(value) } catch { /* Closed Playwright objects are not application errors. */ }
    }
    page.on(kind, listener)
    listeners.push([kind, listener])
  }
  observe('request', request => {
    const path = testPlanDiagnosticPath(request.url(), origin)
    if (!path) return
    const rawMethod = request.method()
    const record = { scope, requestId: ++nextRequest, path,
      method: ['GET', 'POST'].includes(rawMethod) ? rawMethod : 'OTHER' }
    requests.set(request, record)
    send({ kind: 'request', at: Date.now(), ...record })
  })
  observe('response', response => {
    const record = requests.get(response.request())
    if (record?.scope !== scope) return
    send({ kind: 'response', at: Date.now(), ...record, status: response.status() })
  })
  observe('requestfailed', request => {
    const record = requests.get(request)
    if (record?.scope !== scope) return
    const raw = request.failure()?.errorText || ''
    const failure = /^(?:net::ERR_ABORTED|cancelled|canceled|The operation was aborted\.?)$/i.test(raw)
      ? 'aborted' : /^(?:net::ERR_[A-Z_]+|Load failed|Failed to fetch)$/i.test(raw) ? 'network' : 'other'
    send({ kind: 'requestfailed', at: Date.now(), ...record, failure })
  })
  observe('framenavigated', frame => {
    if (frame !== page.mainFrame()) return
    const path = testPlanDiagnosticPath(frame.url(), origin)
    if (!path) return
    send({ kind: 'route-commit', at: Date.now(), path, hasPlan: new URL(frame.url()).searchParams.has('plan') })
  })
  await page.exposeBinding(binding, (source, event) => {
    if (!active || disposed || source.frame !== page.mainFrame() || !event ||
        !Number.isFinite(event.at) ||
        !/^\/(en|ru)\/app(?:\/tests|\/runs\/:id)?$/.test(event.path || '') ||
        !['visible', 'hidden'].includes(event.visibility) || typeof event.hasPlan !== 'boolean') return
    const record = { kind: event.kind, at: event.at, path: event.path,
      visibility: event.visibility, hasPlan: event.hasPlan }
    if (['pointerdown', 'click'].includes(event.kind)) {
      if (!['saved-test-action', 'saved-test-other', 'button', 'other'].includes(event.targetClass) ||
          !['intendedStart', 'disabled', 'connected'].every(key => typeof event[key] === 'boolean')) return
      Object.assign(record, { targetClass: event.targetClass, intendedStart: event.intendedStart,
        disabled: event.disabled, connected: event.connected })
    } else if (!['pagehide', 'beforeunload', 'visibilitychange'].includes(event.kind)) return
    send(record)
  })
  await page.addInitScript(installTestPlanDOMDiagnostics)
  await page.evaluate(installTestPlanDOMDiagnostics)
  return {
    marker(phase) {
      if (!phases.has(phase)) throw new Error('Unknown test-plan diagnostic phase')
      if (disposed) return
      if (phase === 'enter-test-begin') { scope++; active = true }
      if (!active) return
      try { send({ kind: 'marker', phase, at: Date.now(), ...pageLocation() }) }
      catch { /* A closing page must not replace the journey's original error. */ }
      finally { if (phase === 'enter-test-end') active = false }
    },
    dispose() {
      disposed = true
      active = false
      for (const [kind, listener] of listeners) page.off(kind, listener)
    },
  }
}
