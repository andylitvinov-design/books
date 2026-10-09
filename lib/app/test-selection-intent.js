import { MONITORING_CATALOG } from '../../data/assessments/catalog.js'
import { TEST_RECOMMENDATION_FOCUS, TEST_STYLE_FILTERS, TEST_LENGTH_FILTERS } from '../assessments/test-recommendations.js'
import { TEST_EXPLORER_AXES, TEST_EXPLORER_DETAIL_TOPICS } from '../assessments/test-explorer.js'
import { MONITOR_AREAS } from '../../data/assessments/mind-body-monitor-registry.js'

export const PENDING_TEST_SELECTION_KEY = 'hh-test-selection-intent-v1'
const MAX_AGE = 20 * 60 * 1000
const KEYS = ['focus', 'details', 'axes', 'areas', 'styles', 'lengths', 'depth', 'maxMinutes', 'language', 'tracking', 'freeOnly']
const FACETS = Object.freeze({
  focus: TEST_RECOMMENDATION_FOCUS.map((x) => x.key),
  details: TEST_EXPLORER_DETAIL_TOPICS.map((x) => x.key),
  axes: TEST_EXPLORER_AXES,
  areas: MONITOR_AREAS.map((x) => x.key),
  styles: TEST_STYLE_FILTERS.map((x) => x.key),
  lengths: TEST_LENGTH_FILTERS.map((x) => x.key),
})

// Whitelisted categorical interests only. No free-text complaint, diagnostic text,
// responses, personal identifiers, session keys, or arbitrary user-supplied fields.
export function normalizeTestPreferences(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  if (Object.keys(input).some((key) => !KEYS.includes(key))) return null
  const result = {}
  for (const [key, values] of Object.entries(FACETS)) {
    if (!(key in input)) continue
    const chosen = input[key]
    if (!Array.isArray(chosen) || chosen.length > values.length ||
        chosen.some((value) => typeof value !== 'string' || !values.includes(value)) ||
        new Set(chosen).size !== chosen.length) return null
    result[key] = [...chosen]
  }
  const enums = {
    depth: ['quick', 'balanced', 'deep'],
    maxMinutes: [0, 2, 5, 10],
    language: ['any', 'bilingual', 'english'],
    tracking: ['any', 'repeat', 'baseline'],
    freeOnly: [true, false],
  }
  for (const [key, options] of Object.entries(enums)) {
    if (!(key in input)) continue
    if (!options.includes(input[key])) return null
    result[key] = input[key]
  }
  return result
}

export function validTestKeys(keys) {
  if (!Array.isArray(keys) || keys.length < 1 || keys.length > 12) return null
  const cleared = new Set(MONITORING_CATALOG.filter((test) => test.startable && test.rightsStatus === 'cleared').map((test) => test.key))
  if (keys.some((key) => typeof key !== 'string' || !cleared.has(key))) return null
  return new Set(keys).size === keys.length ? [...keys] : null
}

export function makeTestSelectionIntent(keys, now = Date.now(), preferences = {}) {
  const valid = validTestKeys(keys)
  const filtered = normalizeTestPreferences(preferences)
  if (!valid || !filtered || !Number.isSafeInteger(now)) throw new Error('INVALID_TEST_SELECTION')
  return JSON.stringify({ keys: valid, preferences: filtered, createdAt: now })
}

export function readTestSelectionIntent(raw, now = Date.now()) {
  if (typeof raw !== 'string' || raw.length > 3072) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || !Number.isSafeInteger(parsed.createdAt) || parsed.createdAt > now + 60000 ||
        now - parsed.createdAt > MAX_AGE) return null
    const keys = validTestKeys(parsed.keys)
    const preferences = normalizeTestPreferences(parsed.preferences ?? {})
    return keys && preferences ? { keys, preferences, createdAt: parsed.createdAt } : null
  } catch {
    return null
  }
}
