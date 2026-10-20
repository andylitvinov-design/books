import { performance } from 'node:perf_hooks'
import { sanitizePathname, classifyDiagnosticError } from './isolated-browser-diagnostics.mjs'

// Passive, bounded evidence for synthetic loopback reloads only. Never retain
// request objects, bodies, headers, query strings, messages or stack traces.
export function observeReload(page, { origin, runtime = process.env.HH_APP_TEST_RUNTIME, onEvent = () => {} } = {}) {
  if (runtime !== 'isolated' || !sanitizePathname('/', origin)) throw new Error('Isolated loopback diagnostics only')
  const started = performance.now(), events = [], listeners = []
  let dropped = 0, stopped = false
  const add = event => {
    if (stopped) return
    if (events.length >= 200) { dropped++; return }
    const evidence = { atMs: Math.round(performance.now() - started), ...event }
    events.push(evidence)
    try { onEvent({ ...evidence }) } catch { /* Passive evidence must not affect browser operations. */ }
  }
  const listen = (name, callback) => {
    // Diagnostics must never turn a successful browser operation into a failure.
    const safe = (...args) => { try { callback(...args) } catch { add({ type: 'diagnostic_unavailable' }) } }
    page.on(name, safe); listeners.push([name, safe])
  }
  const requestEvent = (type, request, extra = {}) => {
    const pathname = sanitizePathname(request.url(), origin)
    if (!pathname) return
    const rawMethod = request.method()
    const method = ['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'].includes(rawMethod) ? rawMethod : 'OTHER'
    add({ type, pathname, method, ...extra })
  }
  listen('request', request => requestEvent('request', request))
  listen('requestfinished', request => requestEvent('request_finished', request))
  listen('requestfailed', request => requestEvent('request_failed', request, { category: classifyDiagnosticError(request.failure()?.errorText) }))
  listen('response', response => {
    const status = response.status()
    requestEvent('response', response.request(), { status: Number.isInteger(status) && status >= 100 && status <= 599 ? status : null })
  })
  listen('pageerror', error => add({ type: 'page_error', category: classifyDiagnosticError(error) }))
  listen('framenavigated', frame => {
    if (frame !== page.mainFrame()) return
    const pathname = sanitizePathname(frame.url(), origin)
    if (pathname) add({ type: 'navigation', pathname })
  })
  for (const type of ['domcontentloaded','load','crash']) listen(type, () => add({ type }))
  add({ type: 'reload_observation_started' })
  return {
    stop() {
      if (!stopped) {
        add({ type: 'reload_observation_stopped' })
        stopped = true
        for (const [name, callback] of listeners) page.off(name, callback)
      }
      return { schemaVersion: 1, events: events.map(event => ({ ...event })), dropped }
    },
  }
}
