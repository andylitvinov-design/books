import { performance } from 'node:perf_hooks'
import { sanitizePathname, classifyDiagnosticError } from './isolated-browser-diagnostics.mjs'

const HMR_ACTIONS = new Set(['building', 'built', 'sync', 'serverComponentChanges', 'reloadPage', 'addedPage', 'removedPage'])
const HMR_EVENTS = new Set(['client-full-reload', 'client-reload-page', 'server-component-reload-page'])
const ERROR_NAMES = new Set(['Error', 'TypeError', 'SyntaxError', 'ReferenceError', 'RangeError', 'EvalError', 'URIError', 'AggregateError', 'DOMException'])
const PHASES = new Set(['goto-start', 'goto-complete', 'goto-failed', 'signed-in', 'success', 'failure'])

// Passive Playwright events only: no evaluate, injected script, navigation,
// retry, request body/header, raw URL, console text, or error stack is retained.
// A request redirect chain is evidence, not a JavaScript initiator stack.
export function observePortraitNavigation(page, { origin, runtime = process.env.HH_APP_TEST_RUNTIME } = {}) {
  if (runtime !== 'isolated' || !sanitizePathname('/', origin)) throw new Error('Isolated loopback diagnostics only')
  const started = performance.now(), events = [], listeners = []
  let stopped = false, dropped = 0, observedSockets = 0
  const add = event => {
    if (stopped) return
    if (events.length >= 200) { dropped++; return }
    events.push({ atMs: Math.round(performance.now() - started), ...event })
  }
  const listen = (type, callback, target = page) => {
    const safe = (...args) => { try { callback(...args) } catch { add({ type: 'diagnostic-unavailable' }) } }
    target.on(type, safe); listeners.push([target, type, safe])
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
  listen('pageerror', error => add({
    type: 'page-error', category: classifyDiagnosticError(error),
    errorName: ERROR_NAMES.has(error?.name) ? error.name : 'Other',
  }))
  listen('console', message => {
    const text = message.text()
    const category = /Fast Refresh had to perform a full reload/i.test(text) ? 'fast-refresh-full-reload'
      : /\[Fast Refresh\] rebuilding/.test(text) ? 'fast-refresh-rebuilding'
        : /\[Fast Refresh\] done/.test(text) ? 'fast-refresh-done' : null
    if (category) add({ type: 'development-console', category })
  })
  // Observe only the existing loopback Next HMR socket, never open/intercept it.
  // Exact Next 15.5.21 action/event enums discriminate reload instructions from
  // a console rebuild correlation. No frame, stack, hash, ID or URL is retained.
  listen('websocket', socket => {
    const url = new URL(socket.url()), base = new URL(origin)
    if (url.protocol !== 'ws:' || url.host !== base.host || url.pathname !== '/_next/webpack-hmr'
      || url.username || url.password) return
    if (observedSockets >= 8) { add({ type: 'hmr-socket-limit' }); return }
    observedSockets++
    add({ type: 'hmr-connected' })
    const frame = (direction, data) => {
      const payload = data?.payload
      if (typeof payload !== 'string' || payload.length > 16384 || Buffer.byteLength(payload, 'utf8') > 16384) {
        add({ type: 'hmr-frame-dropped' }); return
      }
      let message
      try { message = JSON.parse(payload) } catch { add({ type: 'hmr-frame-invalid' }); return }
      if (!message || typeof message !== 'object' || Array.isArray(message)) return
      if (direction === 'received' && HMR_ACTIONS.has(message.action)) {
        add({ type: 'hmr-received', action: message.action })
      } else if (direction === 'sent' && HMR_EVENTS.has(message.event)) {
        add({ type: 'hmr-sent', event: message.event,
          ...(typeof message.hadRuntimeError === 'boolean' ? { hadRuntimeError: message.hadRuntimeError } : {}),
        })
      }
    }
    listen('framereceived', data => frame('received', data), socket)
    listen('framesent', data => frame('sent', data), socket)
    listen('close', () => add({ type: 'hmr-closed' }), socket)
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
        for (const [target, type, callback] of listeners) target.off(type, callback)
      }
      return { schemaVersion: 1, events: events.map(event => ({ ...event })), dropped }
    },
  }
}
