import { performance } from 'node:perf_hooks'
import { writeFile } from 'node:fs/promises'
import { observePortraitNavigation } from './portrait-navigation-diagnostics.mjs'
import { sanitizePathname } from './isolated-browser-diagnostics.mjs'

export const PDF_NAVIGATION_LIMITS = Object.freeze({ requests: 1024, pending: 128, responseGroups: 64, traceEvents: 200, deadlineMs: 120000, writeMs: 2000 })
const ENDPOINTS = new Map([
  ['/api/app/bootstrap', 'bootstrap'], ['/api/app/billing/status', 'billing-status'],
  ['/api/app/journey', 'journey'], ['/api/app/express-reports', 'express-reports'],
  ['/api/app/development-goals', 'development-goals'], ['/api/free-express/claim', 'free-express-claim'],
  ['/en/app', 'account-root'], ['/ru/app', 'account-root'],
  ['/en/app/portrait', 'portrait'], ['/ru/app/portrait', 'portrait'],
  ['/en/app/tests', 'my-tests'], ['/ru/app/tests', 'my-tests'],
])
const OBSERVERS = new WeakMap()
const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
const RESOURCES = new Set(['document', 'stylesheet', 'image', 'media', 'font', 'script', 'texttrack', 'xhr', 'fetch', 'eventsource', 'websocket', 'manifest', 'other'])
const PHASES = new Set(['entry-start', 'entry-complete', 'entry-failed', 'capture-deadline'])
const TRACE_TYPES = new Set(['navigation-request', 'navigation-response', 'navigation-failed', 'hmr-asset-request', 'hmr-asset-response', 'hmr-asset-failed', 'portrait-read-request', 'portrait-read-response', 'portrait-read-finished', 'portrait-read-failed', 'portrait-read-limit', 'frame-navigated', 'domcontentloaded', 'load', 'crash', 'close', 'page-error', 'development-console', 'hmr-connected', 'hmr-socket-limit', 'hmr-frame-dropped', 'hmr-frame-invalid', 'hmr-received', 'hmr-sent', 'hmr-closed', 'diagnostic-unavailable'])
const TRACE_VALUES = {
  endpoint: new Set(['journey', 'express-reports', 'development-goals', 'free-express-claim']),
  method: METHODS, resourceType: RESOURCES, asset: new Set(['manifest', 'chunk']),
  action: new Set(['building', 'built', 'sync', 'serverComponentChanges', 'reloadPage', 'addedPage', 'removedPage']),
  event: new Set(['client-full-reload', 'client-reload-page', 'server-component-reload-page']),
  errorDetails: new Set(['absent', 'null', 'non_text', 'empty', 'text']),
  errorTarget: new Set(['journey', 'express-reports', 'development-goals', 'free-express-claim', 'hot-update-manifest', 'hot-update-chunk']),
  category: new Set(['opaque_event', 'hmr_chunk_load_error', 'hmr_manifest_fetch_error', 'development_overlay_request_error', 'content_security_policy_error', 'access_control_error', 'navigation_interrupted', 'network_load_error', 'chunk_load_error', 'socket_hang_up', 'connection_reset', 'connection_refused', 'request_aborted', 'out_of_memory', 'timeout', 'network_fetch_error', 'javascript_syntax_error', 'javascript_type_error', 'unclassified_error', 'fast-refresh-full-reload', 'fast-refresh-rebuilding', 'fast-refresh-done']),
}
TRACE_VALUES.errorCategory = TRACE_VALUES.category
const own = (object, key) => {
  try { const field = Object.getOwnPropertyDescriptor(object, key); return field && Object.hasOwn(field, 'value') ? field.value : undefined } catch { return undefined }
}
const count = value => Number.isSafeInteger(value) && value >= 0 ? Math.min(value, 65535) : 0
const milliseconds = value => Number.isSafeInteger(value) && value >= 0 ? Math.min(value, PDF_NAVIGATION_LIMITS.deadlineMs) : 0
const statusNumber = value => Number.isInteger(value) && value >= 100 && value <= 599 ? value : null
const notice = (...values) => { try { console.log(...values) } catch { /* Diagnostic output cannot replace the original failure. */ } }

function targetAlias(raw, base) {
  if (typeof raw !== 'string' || raw.length > 16384) return 'unclassified-resource'
  try {
    const url = new URL(raw, base)
    if (url.username || url.password) return 'unclassified-resource'
    if (url.origin !== base) return 'external-resource'
    return ENDPOINTS.get(url.pathname) || 'other-local-resource'
  } catch { return 'unclassified-resource' }
}

// Re-encode only our known own data. Even an accidentally poisoned diagnostic
// result must never send URL/query/ID/text/header/body values to an artifact.
function safeTrace(raw, base) {
  const events = [], input = own(raw, 'events')
  if (Array.isArray(input)) for (let i = 0; i < Math.min(count(own(input, 'length')), PDF_NAVIGATION_LIMITS.traceEvents); i++) {
    const source = own(input, String(i)), type = own(source, 'type')
    if (!TRACE_TYPES.has(type)) continue
    const event = { type, atMs: milliseconds(own(source, 'atMs')) }
    for (const [key, allowed] of Object.entries(TRACE_VALUES)) {
      const value = own(source, key)
      if (allowed.has(value)) event[key] = value
    }
    const status = statusNumber(own(source, 'status'))
    if (status !== null) event.status = status
    for (const key of ['pathname', 'redirectedFrom']) {
      const value = own(source, key)
      if (typeof value === 'string') event[key === 'pathname' ? 'target' : 'redirectedFrom'] = targetAlias(value, base)
    }
    if (typeof own(source, 'hadRuntimeError') === 'boolean') event.hadRuntimeError = own(source, 'hadRuntimeError')
    events.push(event)
  }
  return { events, dropped: count(own(raw, 'dropped')), cleanupErrors: count(own(raw, 'cleanupErrors')) }
}

// Passive listeners only, scoped to one PDF entry leg. Pending counts cover
// all observed page resources and child frames, not just the known read aliases.
// This is not an API-health assertion or a replacement for networkidle.
export function observePersonalityPdfNavigation(page, { origin, locale, runtime = process.env.HH_APP_TEST_RUNTIME } = {}) {
  if (runtime !== 'isolated' || !sanitizePathname('/', origin) || !['en', 'ru'].includes(locale)) throw new Error('Isolated bilingual PDF diagnostics only')
  const base = new URL(origin).origin, started = performance.now(), listeners = [], records = new WeakMap(), unmatched = new WeakSet(), pending = new Map(), responseGroups = new Map()
  const portrait = observePortraitNavigation(page, { origin, runtime })
  const totals = { requests: 0, responses: 0, finished: 0, failed: 0, status429: 0, status4xx: 0, status5xx: 0, droppedRequests: 0, droppedResponseGroups: 0, unmatchedResponses: 0, droppedUnmatchedIdentities: 0, diagnosticErrors: 0 }
  let stopped = false, result, timer, unmatchedIdentities = 0
  const add = key => { totals[key] = Math.min(65535, totals[key] + 1) }
  const age = () => Math.min(PDF_NAVIGATION_LIMITS.deadlineMs, Math.max(0, Math.round(performance.now() - started)))
  const listen = (type, callback) => {
    const safe = (...args) => { if (stopped) return; try { callback(...args) } catch { add('diagnosticErrors') } }
    listeners.push([type, safe])
    try { page.on(type, safe) }
    catch (error) {
      stopped = true
      for (const [event, listener] of listeners) { try { page.off(event, listener) } catch { /* Continue own cleanup. */ } }
      try { portrait.stop() } catch { /* Keep the original initialization failure. */ }
      throw error
    }
  }
  listen('request', request => {
    if (!request || records.has(request)) return
    if (totals.requests >= PDF_NAVIGATION_LIMITS.requests || pending.size >= PDF_NAVIGATION_LIMITS.pending) { add('droppedRequests'); return }
    const endpoint = targetAlias(request.url(), base), method = request.method(), resourceType = request.resourceType()
    let frame = 'unavailable'
    try { frame = request.frame() === page.mainFrame() ? 'main' : 'child' } catch { /* Service-worker requests can have no frame. */ }
    const record = { endpoint, method: METHODS.has(method) ? method : 'OTHER', resourceType: RESOURCES.has(resourceType) ? resourceType : 'other', frame, atMs: age(), status: null, terminal: false, responded: false }
    records.set(request, record); pending.set(request, record); add('requests')
  })
  listen('response', response => {
    const request = response.request(), record = records.get(request)
    if (record?.responded || record?.terminal || (!record && unmatched.has(request))) return
    const responseStatus = statusNumber(response.status())
    // A dropped/missed start must not conceal an observed 429 or server error.
    if (responseStatus === 429) add('status429')
    if (responseStatus >= 400 && responseStatus < 500) add('status4xx')
    if (responseStatus >= 500) add('status5xx')
    if (!record) {
      if (unmatchedIdentities < PDF_NAVIGATION_LIMITS.requests) { unmatched.add(request); unmatchedIdentities++ }
      else add('droppedUnmatchedIdentities')
      add('unmatchedResponses'); return
    }
    record.responded = true; record.status = responseStatus; add('responses')
    const { endpoint, method, resourceType, frame, status } = record
    const key = JSON.stringify([endpoint, method, resourceType, frame, status])
    if (responseGroups.has(key)) responseGroups.get(key).count++
    else if (responseGroups.size < PDF_NAVIGATION_LIMITS.responseGroups) responseGroups.set(key, { endpoint, method, resourceType, frame, status, count: 1 })
    else add('droppedResponseGroups')
  })
  const finish = (request, kind) => {
    const record = records.get(request)
    if (!record || record.terminal) return
    record.terminal = true; pending.delete(request); add(kind)
  }
  listen('requestfinished', request => finish(request, 'finished'))
  listen('requestfailed', request => finish(request, 'failed'))
  const stop = phase => {
    if (stopped) return structuredClone(result)
    stopped = true; clearTimeout(timer)
    for (const [type, callback] of listeners) { try { page.off(type, callback) } catch { add('diagnosticErrors') } }
    let trace
    try { trace = safeTrace(portrait.stop(), base) } catch { add('diagnosticErrors'); trace = { events: [], dropped: 0, cleanupErrors: 1 } }
    const elapsedMs = age(), groups = new Map()
    for (const record of pending.values()) {
      const { endpoint, method, resourceType, frame, status } = record
      const key = JSON.stringify([endpoint, method, resourceType, frame, status]), group = groups.get(key)
      if (group) { group.count++; group.oldestAgeMs = Math.max(group.oldestAgeMs, elapsedMs - record.atMs) }
      else groups.set(key, { endpoint, method, resourceType, frame, status, count: 1, oldestAgeMs: elapsedMs - record.atMs })
    }
    result = { schemaVersion: 1, scope: 'personality-pdf-entry', coverage: 'requests-starting-after-observer-attachment', preexistingRequests: 'unknown', locale, phase: PHASES.has(phase) ? phase : 'entry-failed', elapsedMs,
      limits: { ...PDF_NAVIGATION_LIMITS }, totals: { ...totals }, responseCountsUnique: totals.droppedUnmatchedIdentities === 0, pendingCount: pending.size,
      incomplete: phase === 'capture-deadline' || totals.droppedRequests > 0 || totals.droppedResponseGroups > 0 || totals.unmatchedResponses > 0 || totals.diagnosticErrors > 0 || trace.dropped > 0 || trace.cleanupErrors > 0,
      pending: [...groups.values()], responses: [...responseGroups.values()], trace }
    pending.clear(); responseGroups.clear()
    return structuredClone(result)
  }
  timer = setTimeout(() => stop('capture-deadline'), PDF_NAVIGATION_LIMITS.deadlineMs)
  timer.unref?.()
  const observer = { stop }
  OBSERVERS.set(observer, stop)
  return observer
}

// The writer is bounded and its fixed failure notice never replaces the
// original navigation/assertion error. No observer remains active during I/O.
export async function preservePersonalityPdfNavigation(observer, { directory, completed = false } = {}) {
  let evidence
  try {
    const stop = OBSERVERS.get(observer)
    if (!stop) throw new Error('Unknown observer')
    evidence = stop(completed ? 'entry-complete' : 'entry-failed')
  }
  catch { notice('TYPOLOGY_PDF_NAVIGATION_DIAGNOSTIC_UNAVAILABLE'); return }
  const controller = new AbortController()
  let timer
  try {
    const deadline = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('Diagnostic write deadline')) }, PDF_NAVIGATION_LIMITS.writeMs) })
    // There is no output in a late writer callback, and its rejection is joined
    // by race even after the deadline. Abort is also passed to real filesystem I/O.
    await Promise.race([writeFile(directory + '/pdf-navigation-' + evidence.locale + '.json', JSON.stringify(evidence, null, 2) + '\n', { signal: controller.signal }), deadline])
    notice('TYPOLOGY_PDF_NAVIGATION', JSON.stringify({ locale: evidence.locale, phase: evidence.phase, pendingCount: evidence.pendingCount, status429: evidence.totals.status429, incomplete: evidence.incomplete }))
  } catch { notice('TYPOLOGY_PDF_NAVIGATION_DIAGNOSTIC_UNAVAILABLE') }
  finally { clearTimeout(timer) }
}
