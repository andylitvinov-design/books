import { performance } from 'node:perf_hooks'
import { sanitizePathname, classifyDiagnosticError } from './isolated-browser-diagnostics.mjs'

const PHASES = new Set(['goto-start', 'goto-complete', 'goto-failed', 'signed-in', 'success', 'failure'])

// Passive Playwright events only: no evaluate, injected script, navigation,
// retry, request body/header, raw URL, console text, or error stack is retained.
// A request redirect chain is evidence, not a JavaScript initiator stack.
export function observePortraitNavigation(page, { origin, runtime = process.env.HH_APP_TEST_RUNTIME } = {}) {
  if (runtime !== 'isolated' || !sanitizePathname('/', origin)) throw new Error('Isolated loopback diagnostics only')
  const started = performance.now(), events = [], listeners = []
  let stopped = false, dropped = 0
  const add = event => {
    if (stopped) return
    if (events.length >= 200) { dropped++; return }
    events.push({ atMs: Math.round(performance.now() - started), ...event })
  }
  const listen = (type, callback) => {
    const safe = (...args) => { try { callback(...args) } catch { add({ type: 'diagnostic-unavailable' }) } }
    page.on(type, safe); listeners.push([type, safe])
  }
  const navigationRequest = (type, request, extra = {}) => {
    if (!request.isNavigationRequest() || request.frame() !== page.mainFrame()) return
    const pathname = sanitizePathname(request.url(), origin)
    if (!pathname) return
    const previous = request.redirectedFrom()
    const redirectedFrom = previous ? sanitizePathname(previous.url(), origin) : null
    add({ type, pathname, redirectedFrom, ...extra })
  }
  listen('request', request => navigationRequest('navigation-request', request))
  listen('response', response => {
    const status = response.status()
    navigationRequest('navigation-response', response.request(), {
      status: Number.isInteger(status) && status >= 100 && status <= 599 ? status : null,
    })
  })
  listen('requestfailed', request => navigationRequest('navigation-failed', request, {
    category: classifyDiagnosticError(request.failure()?.errorText),
  }))
  listen('framenavigated', frame => {
    if (frame !== page.mainFrame()) return
    const pathname = sanitizePathname(frame.url(), origin)
    if (pathname) add({ type: 'frame-navigated', pathname })
  })
  for (const type of ['domcontentloaded', 'load', 'crash', 'close']) listen(type, () => add({ type }))
  listen('pageerror', error => add({ type: 'page-error', category: classifyDiagnosticError(error) }))
  listen('console', message => {
    const text = message.text()
    const category = /Fast Refresh had to perform a full reload/i.test(text) ? 'fast-refresh-full-reload'
      : /\[Fast Refresh\] rebuilding/.test(text) ? 'fast-refresh-rebuilding'
        : /\[Fast Refresh\] done/.test(text) ? 'fast-refresh-done' : null
    if (category) add({ type: 'development-console', category })
  })
  return {
    mark(phase, target) {
      if (!PHASES.has(phase)) return
      try { add({ type: 'phase', phase, pathname: sanitizePathname(page.url(), origin), target: sanitizePathname(target, origin) }) }
      catch { add({ type: 'diagnostic-unavailable' }) }
    },
    stop() {
      if (!stopped) {
        stopped = true
        for (const [type, callback] of listeners) page.off(type, callback)
      }
      return { schemaVersion: 1, events: events.map(event => ({ ...event })), dropped }
    },
  }
}
