// TRAUMA-1.3, sections 10.2–10.3, approved source dated 2026-10-15:
// https://docs.google.com/document/d/10Je2F-a54NCkmZPr0uAFPyeHkRgAxYOJoBoNWcnCnew/edit
// Version-specific educational/observational roles, never clinical outcomes.
// Callers must derive module/version from the owned stored cycle, not a request.
// This helper does not create measurements, provenance, timestamps or DB writes.
export const TRAUMA_PHASE_OUTCOME_VERSION = 'opora-trauma-1.3-20261015'

const FINDER = 'hh-module-finder'
const WEEKLY = 'hh-weekly-pulse'
const metric = (testKey, scaleKey) => `${testKey}::${scaleKey}`
const makeContext = (moduleId, testKey, scaleKey, secondary = []) => Object.freeze({
  moduleId,
  routerVersion: TRAUMA_PHASE_OUTCOME_VERSION,
  primaryMetric: testKey ? metric(testKey, scaleKey) : null,
  primaryTestKey: testKey,
  primaryScaleKey: scaleKey,
  secondaryMetrics: Object.freeze(secondary.map(key => metric(testKey, key))),
  clinicalGated: moduleId === 'AS4',
})
const contexts = Object.freeze({
  AS1: makeContext('AS1', FINDER, 'F2', ['F1']),
  AS2: makeContext('AS2', WEEKLY, 'weekly.load', [
    'weekly.tension', 'weekly.recovery', 'weekly.clarity',
  ]),
  AS3: makeContext('AS3', FINDER, 'F4', ['F3']),
  AS4: makeContext('AS4', null, null),
  AS5: makeContext('AS5', FINDER, 'F7', ['F8']),
  AS6: makeContext('AS6', WEEKLY, 'weekly.functioning', [
    'weekly.connection', 'weekly.energy', 'weekly.recovery',
  ]),
})
const axes = {
  [FINDER]: new Set(['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8']),
  [WEEKLY]: new Set(['weekly.load', 'weekly.tension', 'weekly.recovery',
    'weekly.functioning', 'weekly.connection', 'weekly.mood', 'weekly.energy', 'weekly.clarity']),
}

// Null means no override: NAV1/NAV2, unversioned and future cycles keep their
// own contracts. Do not default an absent version to the newest one.
export function phaseOutcomeContext(moduleId, routerVersion) {
  if (routerVersion !== TRAUMA_PHASE_OUTCOME_VERSION ||
      typeof moduleId !== 'string' || !Object.hasOwn(contexts, moduleId)) return null
  return contexts[moduleId]
}
const canonicalContext = context => phaseOutcomeContext(context?.moduleId, context?.routerVersion)

export function phaseScaleRole(context, testKey, scaleKey) {
  const phase = canonicalContext(context)
  if (!phase || !Object.hasOwn(axes, testKey) || !axes[testKey].has(scaleKey)) return null
  const id = metric(testKey, scaleKey)
  if (id === phase.primaryMetric) return 'primary'
  if (phase.secondaryMetrics.includes(id)) return 'secondary'
  // In particular, weekly.load is supporting context for F-primary courses
  // and AS6. Unrelated GAD/resource tests retain their existing role contracts.
  return 'supplementary'
}

export function phaseOrderScales(context, testKey, rows = []) {
  const phase = canonicalContext(context)
  if (!phase) return null
  if (!Array.isArray(rows)) return []
  const orderedIds = [phase.primaryMetric, ...phase.secondaryMetrics].filter(Boolean)
  const rank = row => {
    const key = typeof row?.key === 'string' ? row.key
      : typeof row?.id === 'string' && row.id.startsWith(`${testKey}::`)
        ? row.id.slice(testKey.length + 2) : null
    const index = key === null ? -1 : orderedIds.indexOf(metric(testKey, key))
    return index < 0 ? orderedIds.length : index
  }
  // A copied array with a stable order. Row identity, raw scores, directions,
  // recall windows and missing dimensions are never changed or filled in.
  return [...rows].sort((a, b) => rank(a) - rank(b))
}

const isRecord = value => Boolean(value && typeof value === 'object' && !Array.isArray(value))
const hasAnswer = (answers, key) => isRecord(answers) && Object.hasOwn(answers, key) &&
  Number.isInteger(answers[key]) && answers[key] >= 0 && answers[key] <= 10

// This is the F-exit submission requirement only. It does not establish a
// comparable baseline, the due date, owner access or permission to write.
export function phaseRetestPrimaryState(context, answers, explicitSkip = false) {
  const phase = canonicalContext(context)
  if (!phase) return null
  const required = phase.primaryTestKey === FINDER
  const skipped = required && explicitSkip === true
  const answered = required && !skipped && hasAnswer(answers, phase.primaryScaleKey)
  return {
    primaryMetric: phase.primaryMetric,
    primaryScaleKey: phase.primaryScaleKey,
    required,
    answered,
    skipped,
    canSubmit: !phase.clinicalGated && (!required || answered || skipped),
  }
}

const measurementTime = value => {
  if (typeof value !== 'string') return null
  // Require an actual dated, timezone-qualified timestamp; Date.parse alone
  // accepts values such as "0" and silently normalizes impossible dates.
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value)
  if (!match) return null
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number)
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (month < 1 || month > 12 || day < 1 || day > days[month - 1] ||
      hour > 23 || minute > 59 || second > 59) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}
const optionalProvenance = ['translationVersion', 'contentHash', 'timeframe',
  'scoringKey', 'scoringVersion', 'resultVersion']
const compatibleFinderRecords = (before, after) => {
  if (before?.definitionKey !== FINDER || after?.definitionKey !== FINDER ||
      before.version !== 'v1' || after.version !== 'v1' ||
      before.recallDays !== 7 || after.recallDays !== 7 ||
      !['ru', 'en'].includes(before.locale) || before.locale !== after.locale ||
      !optionalProvenance.every(key => (before[key] ?? null) === (after[key] ?? null))) return false
  const start = measurementTime(before.measuredAt), end = measurementTime(after.measuredAt)
  // Preserve the existing seven-day minimum; no "right now" comparison.
  return start !== null && end !== null && end - start >= 7 * 86400000
}

// Only the sealed F-record shape is handled here. Weekly results keep the
// existing full assessment provenance comparator and its repeat-window rules.
export function phasePrimaryComparisonState(context, baseline, followUp) {
  const phase = canonicalContext(context)
  if (!phase || phase.primaryTestKey !== FINDER) return null
  const result = { primaryMetric: phase.primaryMetric, primaryScaleKey: phase.primaryScaleKey }
  const unavailable = reason => ({ ...result, comparable: false, reason })
  if (!isRecord(followUp)) return unavailable('no_follow_up')
  if (baseline?.primarySkipped === true || followUp.primarySkipped === true) return unavailable('explicit_skip')
  if (!hasAnswer(baseline?.answers, phase.primaryScaleKey) ||
      !hasAnswer(followUp.answers, phase.primaryScaleKey)) return unavailable('missing_primary')
  if (!compatibleFinderRecords(baseline, followUp)) return unavailable('incompatible_provenance')
  const before = baseline.answers[phase.primaryScaleKey], after = followUp.answers[phase.primaryScaleKey]
  return { ...result, comparable: true, reason: null, before, after, delta: after - before }
}
