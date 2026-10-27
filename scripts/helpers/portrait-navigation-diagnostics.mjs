import { performance } from 'node:perf_hooks'
import { sanitizePathname, classifyDiagnosticError } from './isolated-browser-diagnostics.mjs'

const HMR_ACTIONS = new Set(['building', 'built', 'sync', 'serverComponentChanges', 'reloadPage', 'addedPage', 'removedPage'])
const HMR_EVENTS = new Set(['client-full-reload', 'client-reload-page', 'server-component-reload-page'])
const ERROR_NAMES = new Set(['Error', 'TypeError', 'SyntaxError', 'ReferenceError', 'RangeError', 'EvalError', 'URIError', 'AggregateError', 'DOMException', 'ChunkLoadError', 'AbortError', 'SecurityError', 'NetworkError', 'InvalidStateError'])
const PHASES = new Set(['goto-start', 'goto-complete', 'goto-failed', 'signed-in', 'success', 'failure'])
const PORTRAIT_READS = new Map([
  ['/api/app/journey', 'journey'],
  ['/api/app/express-reports', 'express-reports'],
  ['/api/app/development-goals', 'development-goals'],
  ['/api/free-express/claim', 'free-express-claim'],
])

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
  if (/\bdue to access control checks\.(?:\n|$)/.test(text)) return 'access_control_error'
  if (/Frame load interrupted|navigation [^\n]*interrupted by another navigation|NS_BINDING_ABORTED/i.test(text)) return 'navigation_interrupted'
  if (/^(?:TypeError: )?Load failed(?:\n|$)/.test(text)) return 'network_load_error'
  if (error?.name === 'ChunkLoadError' || /^ChunkLoadError:/.test(text)) return 'chunk_load_error'
  return classifyDiagnosticError(typeof error === 'string' ? text : { name: error?.name, message: text })
}

// WebKit logs native fetch refusals as JS-source console errors. Playwright
// 1.63 splits at the first colon and skips two characters, including the first
// slash of http://. Reconstruct only that pinned native shape, never an
// arbitrary stack URL. A target alias identifies text, not a failure cause.
function portraitErrorTarget(error, origin) {
  const value = typeof error === 'string' ? error : error?.message
  if (typeof value !== 'string' || value.length > 4096) return {}
  let line = value.split('\n', 1)[0]
  if (typeof error !== 'string' && /^(?:Fetch API|XMLHttpRequest) cannot load https?$/.test(error?.name)
      && /^\/[^/]/.test(line)) line = error.name + ':/' + line
  const match = line.match(/^(?:Error: )?(?:Fetch API|XMLHttpRequest) cannot load (https?:\/\/[^\s]+) due to access control checks\.$/)
  if (!match || /…|\.\.\.|%e2%80%a6|\\/i.test(match[1])
      || !/^https?:\/\/[^/\\?#\s]+\//.test(match[1])) return {}
  let url, base
  try { url = new URL(match[1]); base = new URL(origin) } catch { return {} }
  if (url.origin !== base.origin || url.username || url.password) return {}
  const endpoint = PORTRAIT_READS.get(url.pathname)
  if (endpoint) return { errorTarget: endpoint }
  const asset = url.pathname.match(/^\/_next\/static\/webpack\/.+\.hot-update\.(json|js)$/)
  return asset ? { errorTarget: asset[1] === 'json' ? 'hot-update-manifest' : 'hot-update-chunk' } : {}
}

function reloadErrorDetails(message, origin) {
  if (!Object.hasOwn(message, 'stackTrace')) return { errorDetails: 'absent' }
  if (message.stackTrace === null) return { errorDetails: 'null' }
  if (typeof message.stackTrace !== 'string') return { errorDetails: 'non_text' }
  if (!message.stackTrace) return { errorDetails: 'empty' }
  return { errorDetails: 'text', errorCategory: classifyPortraitError(message.stackTrace), ...portraitErrorTarget(message.stackTrace, origin) }
}

// Passive Playwright events only: no evaluate, injected script, navigation,
// retry, request body/header, raw URL, console text, or error stack is retained.
// A request redirect chain is evidence, not a JavaScript initiator stack.
export function observePortraitNavigation(page, { origin, runtime = process.env.HH_APP_TEST_RUNTIME } = {}) {
  if (runtime !== 'isolated' || !sanitizePathname('/', origin)) throw new Error('Isolated loopback diagnostics only')
  const started = performance.now(), events = [], listeners = []
  let stopped = false, dropped = 0, observedSockets = 0, cleanupErrors = 0
  const reads = new WeakMap()
  let readSequence = 0, readLimitReported = false
  const add = event => {
    if (stopped) return
    if (events.length >= 200) { dropped++; return }
    events.push({ atMs: Math.round(performance.now() - started), ...event })
  }
  const listen = (type, callback, target = page) => {
    const safe = (...args) => { if (stopped) return; try { callback(...args) } catch { add({ type: 'diagnostic-unavailable' }) } }
    listeners.push([target, type, safe])
    try { target.on(type, safe) }
    catch (error) {
      stopped = true; cleanupErrors++
      for (const [owner, event, listener] of listeners) {
        try { owner.off(event, listener) } catch { cleanupErrors++ }
      }
      throw error
    }
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
  // Only the four read effects mounted by Profile. Request identity is local
  // and monotonic, not a browser, account or server ID. Missing request events
  // remain missing evidence; an access-control label is not an abort verdict.
  const startRead = request => {
    if (request.isNavigationRequest() || request.frame() !== page.mainFrame() || reads.has(request)) return
    const raw = request.url()
    if (typeof raw !== 'string' || raw.length > 16384) return
    const url = new URL(raw), base = new URL(origin)
    if (url.origin !== base.origin || url.username || url.password) return
    const endpoint = PORTRAIT_READS.get(url.pathname)
    if (!endpoint || request.method() !== 'GET') return
    if (readSequence >= 64) {
      if (!readLimitReported) { readLimitReported = true; add({ type: 'portrait-read-limit' }) }
      return
    }
    const type = request.resourceType()
    const read = { requestId: ++readSequence, endpoint, resourceType: type === 'fetch' || type === 'xhr' ? type : 'other', responded: false, terminal: false }
    reads.set(request, read)
    add({ type: 'portrait-read-request', requestId: read.requestId, endpoint, method: 'GET', resourceType: read.resourceType })
  }
  const updateRead = (type, request, extra = {}) => {
    const read = reads.get(request)
    if (!read || read.terminal) return
    if (type === 'portrait-read-response') {
      if (read.responded) return
      read.responded = true
    } else read.terminal = true
    add({ type, requestId: read.requestId, endpoint: read.endpoint, ...extra })
  }
  listen('request', request => {
    navigationRequest('navigation-request', request)
    hotUpdateRequest('hmr-asset-request', request)
    startRead(request)
  })
  listen('response', response => {
    const status = response.status()
    const extra = {
      status: Number.isInteger(status) && status >= 100 && status <= 599 ? status : null,
    }
    navigationRequest('navigation-response', response.request(), extra)
    hotUpdateRequest('hmr-asset-response', response.request(), extra)
    updateRead('portrait-read-response', response.request(), extra)
  })
  listen('requestfinished', request => updateRead('portrait-read-finished', request))
  listen('requestfailed', request => {
    const extra = { category: classifyPortraitError(request.failure()?.errorText) }
    navigationRequest('navigation-failed', request, extra)
    hotUpdateRequest('hmr-asset-failed', request, extra)
    updateRead('portrait-read-failed', request, extra)
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
    ...portraitErrorTarget(error, origin),
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
          ...(message.event === 'client-full-reload' ? reloadErrorDetails(message, origin) : {}),
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
        for (const [target, type, callback] of listeners) {
          try { target.off(type, callback) } catch { cleanupErrors++ }
        }
      }
      return { schemaVersion: 1, events: events.map(event => ({ ...event })), dropped, ...(cleanupErrors ? { cleanupErrors } : {}) }
    },
  }
}
