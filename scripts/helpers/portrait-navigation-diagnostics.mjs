import { performance } from 'node:perf_hooks'
import { sanitizePathname, classifyDiagnosticError } from './isolated-browser-diagnostics.mjs'

const HMR_ACTIONS = new Set(['building', 'built', 'sync', 'serverComponentChanges', 'reloadPage', 'addedPage', 'removedPage'])
const HMR_EVENTS = new Set(['client-full-reload', 'client-reload-page', 'server-component-reload-page'])
const ERROR_NAMES = new Set(['Error', 'TypeError', 'SyntaxError', 'ReferenceError', 'RangeError', 'EvalError', 'URIError', 'AggregateError', 'DOMException', 'ChunkLoadError', 'AbortError', 'SecurityError', 'NetworkError', 'InvalidStateError'])
const PHASES = new Set(['goto-start', 'goto-complete', 'goto-failed', 'signed-in', 'success', 'failure'])

// Fixed classes only. A tooling-looking error remains an error: this observer
// never exempts it from the verifier's original pageerror gate.
function classifyPortraitError(error) {
  const value = typeof error === 'string' ? error : error?.message
  const text = typeof value === 'string' ? value.slice(0, 4096) : ''
  if (text === '[object Event]') return 'opaque_event'
  if (/Loading hot update chunk [^\n]* failed\./.test(text)) return 'hmr_chunk_load_error'
  if (/Failed to fetch update manifest\b/.test(text)) return 'hmr_manifest_fetch_error'
  if (/__nextjs_original-stack-frames\b/.test(text)) return 'development_overlay_request_error'
  if (/Content Security Policy|violates? [^\n]*content security policy/i.test(text)) return 'content_security_policy_error'
  if (/Frame load interrupted|navigation [^\n]*interrupted by another navigation|NS_BINDING_ABORTED/i.test(text)) return 'navigation_interrupted'
  if (/^(?:TypeError: )?Load failed(?:\n|$)/.test(text)) return 'network_load_error'
  if (error?.name === 'ChunkLoadError' || /^ChunkLoadError:/.test(text)) return 'chunk_load_error'
  return classifyDiagnosticError(typeof error === 'string' ? text : { name: error?.name, message: text })
}

function reloadErrorDetails(message) {
  if (!Object.hasOwn(message, 'stackTrace')) return { errorDetails: 'absent' }
  if (message.stackTrace === null) return { errorDetails: 'null' }
  if (typeof message.stackTrace !== 'string') return { errorDetails: 'non_text' }
  if (!message.stackTrace) return { errorDetails: 'empty' }
  return { errorDetails: 'text', errorCategory: classifyPortraitError(message.stackTrace) }
}

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
  // Webpack 5's absent update manifest (HTTP 404) resolves hot.check() to null;
  // Next 15.5.21 then reloads without hadRuntimeError or an error argument.
  // Observe existing main-frame asset traffic to distinguish that case from
  // failed/blocked hot-update fetches. No URL, hash, body or header is retained.
  const hotUpdateRequest = (type, request, extra = {}) => {
    if (request.frame() !== page.mainFrame()) return
    const raw = request.url()
    if (typeof raw !== 'string' || raw.length > 16384) return
    const url = new URL(raw), base = new URL(origin)
    if (url.origin !== base.origin || url.username || url.password) return
    const match = url.pathname.match(/^\/_next\/static\/webpack\/.+\.hot-update\.(json|js)$/)
    if (!match) return
    add({ type, asset: match[1] === 'json' ? 'manifest' : 'chunk', ...extra })
  }
  listen('request', request => {
    navigationRequest('navigation-request', request)
    hotUpdateRequest('hmr-asset-request', request)
  })
  listen('response', response => {
    const status = response.status()
    const extra = {
      status: Number.isInteger(status) && status >= 100 && status <= 599 ? status : null,
    }
    navigationRequest('navigation-response', response.request(), extra)
    hotUpdateRequest('hmr-asset-response', response.request(), extra)
  })
  listen('requestfailed', request => {
    const extra = { category: classifyPortraitError(request.failure()?.errorText) }
    navigationRequest('navigation-failed', request, extra)
    hotUpdateRequest('hmr-asset-failed', request, extra)
  })
  listen('framenavigated', frame => {
    if (frame !== page.mainFrame()) return
    const pathname = sanitizePathname(frame.url(), origin)
    if (pathname) add({ type: 'frame-navigated', pathname })
  })
  for (const type of ['domcontentloaded', 'load', 'crash', 'close']) listen(type, () => add({ type }))
  listen('pageerror', error => add({
    type: 'page-error', category: classifyPortraitError(error),
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
          ...(message.event === 'client-full-reload' ? reloadErrorDetails(message) : {}),
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
