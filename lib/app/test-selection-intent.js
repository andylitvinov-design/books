import { MONITORING_CATALOG } from '../../data/assessments/catalog.js'

export const PENDING_TEST_SELECTION_KEY = 'hh-test-selection-intent-v1'
const MAX_AGE = 20 * 60 * 1000

export function validTestKeys(keys) {
  if (!Array.isArray(keys) || keys.length < 1 || keys.length > 12) return null
  const cleared = new Set(MONITORING_CATALOG.filter((test) => test.startable && test.rightsStatus === 'cleared').map((test) => test.key))
  if (keys.some((key) => typeof key !== 'string' || !cleared.has(key))) return null
  return new Set(keys).size === keys.length ? [...keys] : null
}

export function makeTestSelectionIntent(keys, now = Date.now()) {
  const valid = validTestKeys(keys)
  if (!valid) throw new Error('INVALID_TEST_SELECTION')
  return JSON.stringify({ keys: valid, createdAt: now })
}

export function readTestSelectionIntent(raw, now = Date.now()) {
  if (typeof raw !== 'string') return null
  try {
    const parsed = JSON.parse(raw)
    if (!Number.isSafeInteger(parsed.createdAt) || parsed.createdAt > now + 60000 ||
        now - parsed.createdAt > MAX_AGE) return null
    const keys = validTestKeys(parsed.keys)
    return keys ? { keys, createdAt: parsed.createdAt } : null
  } catch {
    return null
  }
}
