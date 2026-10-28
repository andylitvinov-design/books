import { types } from 'node:util'

// Only source-fixed scalar labels/counts cross this optional evidence boundary.
export const CORE_STAGES = Object.freeze([
 'not-started','gestures','opora','opora-viewport-reset','services','picker-en',
 'picker-depth','picker-catalog','picker-ru','picker-es','picker-close',
 'cabinet-entry','cabinet-signin','cabinet-consents','cabinet-create',
 'cabinet-portrait','cabinet-my-tests','cabinet-dashboard','cabinet-screenshot',
 'cabinet-compact-picker','cabinet-picker-toggle','cabinet-picker-disclosure',
 'cabinet-insights-open','cabinet-insights-heading','cabinet-insights-expand',
 'cabinet-insights-state','cabinet-insights-link','cabinet-profile-click',
 'cabinet-profile-assert','after-cabinet-navigation',
])
const categories = ['socket_hang_up','connection_reset','connection_refused','request_aborted','out_of_memory','timeout','network_fetch_error','javascript_syntax_error','javascript_type_error','unclassified_error','none']
const outcomes = ['completed','rejected','timed_out','unknown']
const oporaStages = ['owned-page','invitation-entry','programme-link','programme-content','enrollment-backlink','unknown']
const cleanupStages = ['not-started','close-owned','drain','fence-removal','post-removal','final-clean-check','detach','failed','complete']
const blockedEndpoints = ['none','public_page_stat','development_stack_frames','unclassified','unavailable']
const blockedMethods = ['none','GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS','other','unavailable']
const blockedOrigins = ['none','same-origin','cross-origin','unavailable']
const blockedAliases = value => Object.freeze({ firstBlockedEndpoint: value, firstBlockedMethod: value, firstBlockedOrigin: value })
const noBlocked = blockedAliases('none'), unavailableBlocked = blockedAliases('unavailable')

// Read only existing first-record scalars. Never classify a URL, inspect a
// thrown value, coerce a method, or enumerate later blocked request records.
export function summarizeFirstOporaBlocked(blocked) {
 try {
  if (!blocked || types.isProxy(blocked) || !Array.isArray(blocked) || Object.getPrototypeOf(blocked) !== Array.prototype) return unavailableBlocked
  const length = Object.getOwnPropertyDescriptor(blocked,'length')
  if (!length || !Object.hasOwn(length,'value') || !Number.isInteger(length.value) || length.value < 0) return unavailableBlocked
  if (length.value === 0) return noBlocked
  const first = Object.getOwnPropertyDescriptor(blocked,'0')
  if (!first || !Object.hasOwn(first,'value')) return unavailableBlocked
  const record = first.value
  if (!record || typeof record !== 'object' || types.isProxy(record)) return unavailableBlocked
  const proto = Object.getPrototypeOf(record)
  if (proto !== Object.prototype && proto !== null) return unavailableBlocked
  const descriptors = Object.getOwnPropertyDescriptors(record), keys = Reflect.ownKeys(descriptors)
  if (keys.length !== 3 || keys.some(key => typeof key !== 'string' || !['sameOrigin','method','endpoint'].includes(key))) return unavailableBlocked
  for (const key of keys) if (!Object.hasOwn(descriptors[key],'value')) return unavailableBlocked
  const sameOrigin = descriptors.sameOrigin.value, method = descriptors.method.value, endpoint = descriptors.endpoint.value
  if (typeof sameOrigin !== 'boolean' || typeof method !== 'string' || !['public_page_stat','development_stack_frames','unclassified'].includes(endpoint)) return unavailableBlocked
  return Object.freeze({ firstBlockedEndpoint: endpoint,
   firstBlockedMethod: ['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'].includes(method) ? method : 'other',
   firstBlockedOrigin: sameOrigin ? 'same-origin' : 'cross-origin' })
 } catch { return unavailableBlocked }
}

const schemas = {
 opora: {
  phase: ['primary','cleanup','complete'], stage: oporaStages, locale: ['en','ru','unknown'],
  firstBlockedEndpoint: blockedEndpoints, firstBlockedMethod: blockedMethods, firstBlockedOrigin: blockedOrigins,
  category: categories, cleanupStage: cleanupStages,
  blockedCount: 'count', pageErrorCount: 'count', cleanupErrorCount: 'count', ownedCount: 'count',
  routeInstalled: 'boolean', primaryFailed: 'boolean',
 },
 picker: {
  action: ['depth-shorter','collection-sexuality','unknown'], locale: ['en','ru','es','unknown'],
  result: ['passed','failed','unknown'], setup: outcomes, capture: outcomes, cleanup: outcomes, installed: 'boolean',
 },
}
function scalarRecord(raw, schema) {
 if (!raw || typeof raw !== 'object' || types.isProxy(raw)) return null
 const proto = Object.getPrototypeOf(raw)
 if (proto !== Object.prototype && proto !== null) return null
 const descriptors = Object.getOwnPropertyDescriptors(raw), keys = Reflect.ownKeys(descriptors)
 if (keys.length !== Object.keys(schema).length || keys.some(key => typeof key !== 'string' || !Object.hasOwn(schema,key))) return null
 const out = {}
 for (const [key, rule] of Object.entries(schema)) {
  const d = descriptors[key]
  if (!d || !Object.hasOwn(d,'value')) return null
  const value = d.value
  if (rule === 'count') { if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return null; out[key] = Math.min(value,1000000) }
  else if (rule === 'boolean') { if (typeof value !== 'boolean') return null; out[key] = value }
  else { if (!rule.includes(value)) return null; out[key] = value }
 }
 return Object.freeze(out)
}
export function sanitizeCoreSummary(kind, raw) {
 try { return typeof kind === 'string' && Object.hasOwn(schemas,kind) ? scalarRecord(raw,schemas[kind]) : null } catch { return null }
}
export function emitCoreSummary(sink, kind, raw) {
 // Internal collectors are synchronous. Async sinks/return protocols are unsupported.
 if (typeof sink !== 'function' || types.isProxy(sink) || types.isAsyncFunction(sink)) return
 try {
  const record = sanitizeCoreSummary(kind,raw)
  if (!record) return
  // Never inspect a return value: even native Promise.then may invoke a
  // hostile constructor/species getter. Unsupported returned async work is
  // not adopted or rejection-handled; callers must use a synchronous collector.
  sink(record)
 } catch { /* Optional evidence cannot change the original result. */ }
}
export function createCoreStageEvidence({ now = () => performance.now() } = {}) {
 let stage = 'not-started', started = now()
 const opora = [], picker = []
 return {
  mark(next) { if (CORE_STAGES.includes(next)) { stage = next; started = now() } },
  opora(record) { const safe = sanitizeCoreSummary('opora',record); if (safe && opora.length < 3) opora.push(safe) },
  picker(record) { const safe = sanitizeCoreSummary('picker',record); if (safe && picker.length < 4) picker.push(safe) },
  snapshot() {
   const elapsed = now() - started
   return { schema: 2, stage, elapsedMs: Number.isFinite(elapsed) && elapsed >= 0 ? Math.min(86400000,Math.round(elapsed)) : null,
    opora: opora.slice(), picker: picker.slice() }
  },
 }
}
