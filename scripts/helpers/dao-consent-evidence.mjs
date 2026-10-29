import { writeFileSync } from 'node:fs'
import { types } from 'node:util'

export const DAO_CONSENT_EVIDENCE_PATH = 'artifacts/app-r1/dao-consent-evidence-v1.json'
export const DAO_CONSENT_EVIDENCE_MAX_BYTES = 32768

const own = (value, key) => Object.getOwnPropertyDescriptor(value, key)?.value
const invalid = () => { throw new Error('Invalid bounded DAO evidence') }
const record = (value, keys) => {
  if (!value || typeof value !== 'object' || types.isProxy(value)) return invalid()
  const proto = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null) return invalid()
  const actual = Reflect.ownKeys(value)
  if (actual.length !== keys.length || actual.some(key => typeof key !== 'string' || !keys.includes(key))) return invalid()
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) return invalid()
  }
  return value
}
const boolean = value => typeof value === 'boolean' ? value : invalid()
const count = value => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 1000000 ? value : invalid()
const geometry = value => value === null ? null : typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 10000000 ? value : invalid()
const fields = (value, rules) => {
  record(value, Object.keys(rules))
  return Object.fromEntries(Object.entries(rules).map(([key, rule]) => [key, rule(own(value, key))]))
}
const nullable = rule => value => value === null ? null : rule(value)
const booleans = keys => Object.fromEntries(keys.map(key => [key, boolean]))
const rect = nullable(value => fields(value, {
  left: geometry, top: geometry, right: geometry, bottom: geometry,
  width: geometry, height: geometry,
}))
const point = nullable(value => fields(value, { x: geometry, y: geometry }))
const snapshot = value => fields(value, booleans([
  'contactPropsPresent', 'buttonPropsPresent', 'contactOnChangeBound',
  'buttonOnClickBound', 'contactPropMatches',
]))
const state = nullable(value => fields(value, {
  ...booleans(['formConnected', 'documentComplete', 'contactMatches', 'contactDisabled',
    'consentChecked', 'consentRequired', 'consentMissing', 'buttonPresent',
    'buttonTypeIsButton', 'buttonDisabled', 'expectedConsentAlert']),
  alertCount: count,
}))
const event = value => fields(value, {
  kind: value => Number.isInteger(value) && value >= 1 && value <= 7 ? value : invalid(),
  ...booleans(['trusted', 'defaultPrevented', 'navVisible', 'navPointerEventsNone',
    'activeContact', 'activeButton', 'targetContact', 'targetButton', 'targetForm',
    'targetNavigation', 'hitButton', 'hitNavigation']),
  button: rect, navigation: rect, point,
  bodyPaddingBottom: geometry, scrollY: geometry, viewportHeight: geometry, documentHeight: geometry,
})
const events = value => {
  if (!value || types.isProxy(value) || !Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return invalid()
  const length = own(value, 'length')
  if (!Number.isInteger(length) || length < 0 || length > 24) return invalid()
  const keys = Reflect.ownKeys(value)
  const expected = ['length', ...Array.from({ length }, (_, i) => String(i))]
  if (keys.length !== expected.length || keys.some(key => typeof key !== 'string' || !expected.includes(key))) return invalid()
  for (const key of expected) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) return invalid()
  }
  return Array.from({ length }, (_, i) => event(own(value, String(i))))
}
const interaction = nullable(value => fields(value, {
  initial: snapshot, clickCapture: nullable(snapshot), clickBubble: nullable(snapshot), current: snapshot,
  counts: value => fields(value, {
    inputCapture: count, inputBubble: count, clickCapture: count, clickBubble: count, trustedClicks: count,
  }),
  ...booleans(['defaultPrevented', 'originalFormConnected', 'sameForm', 'sameContact', 'sameButton']),
  pointer: value => fields(value, { events, dropped: count, errors: count }),
}))

// Reconstruct only fixed scalar fields; never coerce, invoke accessors or retain
// unknown keys. Locale is converted to a numeric code: no string values survive.
export function canonicalDaoConsentEvidence(raw) {
  try {
    record(raw, ['locale', 'state', 'interaction', 'syntheticSubmissions', 'blockedRequests'])
    const locale = own(raw, 'locale')
    if (locale !== 'en' && locale !== 'ru') return null
    return { schemaVersion: 1, localeCode: locale === 'en' ? 1 : 2,
      state: state(own(raw, 'state')), interaction: interaction(own(raw, 'interaction')),
      syntheticSubmissions: count(own(raw, 'syntheticSubmissions')), blockedRequests: count(own(raw, 'blockedRequests')) }
  } catch { return null }
}

export function serializeDaoConsentEvidence(raw) {
  const safe = canonicalDaoConsentEvidence(raw)
  if (!safe) return null
  const text = JSON.stringify(safe)
  return Buffer.byteLength(text, 'utf8') <= DAO_CONSENT_EVIDENCE_MAX_BYTES ? text : null
}

export function isIsolatedDaoEvidenceRuntime(env) {
  try {
    if (!env || typeof env !== 'object' || types.isProxy(env)) return false
    const values = {}
    for (const key of ['CI', 'HH_APP_TEST_RUNTIME', 'VERCEL', 'HH_TEST_ADMIN_DATABASE_URL']) {
      const descriptor = Object.getOwnPropertyDescriptor(env, key)
      if (descriptor && !Object.hasOwn(descriptor, 'value')) return false
      values[key] = descriptor?.value
    }
    if (values.CI !== 'true' || values.HH_APP_TEST_RUNTIME !== 'isolated' || (values.VERCEL !== undefined && values.VERCEL !== '')) return false
    if (typeof values.HH_TEST_ADMIN_DATABASE_URL !== 'string' || values.HH_TEST_ADMIN_DATABASE_URL.length > 2048) return false
    const db = new URL(values.HH_TEST_ADMIN_DATABASE_URL)
    return ['postgres:', 'postgresql:'].includes(db.protocol) && ['127.0.0.1', 'localhost'].includes(db.hostname)
      && db.pathname === '/hh_app_test' && !db.search && !db.hash
  } catch { return false }
}

// One fixed, exclusive local file only. Failed/colliding I/O cannot change the
// primary consent assertion. No new browser action, requests or raw logging.
export function persistDaoConsentEvidence(raw) {
  try {
    if (!isIsolatedDaoEvidenceRuntime(process.env)) return false
    const serialized = serializeDaoConsentEvidence(raw)
    if (serialized === null) return false
    writeFileSync(DAO_CONSENT_EVIDENCE_PATH, serialized, { encoding: 'utf8', flag: 'wx', mode: 0o600 })
    return true
  } catch { return false }
}
