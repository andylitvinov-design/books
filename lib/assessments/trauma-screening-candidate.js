// Offline candidate only. Deliberately not imported by the application or registered.
// These helpers test arithmetic; they do not verify clinical workflow or diagnose.
const unavailable = reason => ({ status: 'unavailable', reason })
const complete = values => !values.some(value => value === null || value === undefined)
function validate(values, count, max) {
  if (!Array.isArray(values) || values.length !== count) throw new Error('INVALID_RESPONSES')
  for (let i = 0; i < count; i++) {
    const value = values[i]
    if (value != null && (!Number.isInteger(value) || value < 0 || value > max)) throw new Error('INVALID_RESPONSE')
  }
  // Array.from also makes sparse array slots explicitly missing.
  return complete(Array.from(values))
}
const sum = values => values.reduce((total, value) => total + value, 0)
const endorsed = values => values.some(value => value >= 2)
const result = fields => ({ status: 'complete', interpretation: 'Mechanical self-report calculation for professional review; not a diagnosis.', ...fields })

export function scorePcl5Candidate(responses, { traumaAssessmentRecorded = false } = {}) {
  if (!validate(responses, 20, 4)) return unavailable('incomplete-responses')
  // An assertion for fixtures, not a substitute for a verified recorded assessment.
  if (traumaAssessmentRecorded !== true) return unavailable('recorded-trauma-assessment-required')
  const groups = [responses.slice(0, 5), responses.slice(5, 7), responses.slice(7, 14), responses.slice(14, 20)]
  const clusters = Object.fromEntries(groups.map((items, index) => [['B', 'C', 'D', 'E'][index], sum(items)]))
  const symptomPattern = groups.every((items, index) => items.filter(value => value >= 2).length >= [1, 1, 2, 2][index])
  return result({ total: sum(responses), clusters, symptomPattern })
}

export function scorePcPtsd5Candidate(exposure, responses = null) {
  if (exposure == null) return unavailable('exposure-unanswered')
  if (exposure !== 0 && exposure !== 1) throw new Error('INVALID_EXPOSURE')
  if (exposure === 0) {
    // Reject stale symptom answers; a future runner must clear them on gate changes.
    if (responses !== null) throw new Error('INAPPLICABLE_RESPONSES')
    return result({ total: 0, symptomsState: 'structurally-skipped' })
  }
  if (responses == null) return unavailable('incomplete-responses')
  if (!validate(responses, 5, 1)) return unavailable('incomplete-responses')
  return result({ total: sum(responses), symptomsState: 'answered' })
}

export function scoreItqCandidate(responses, { eventAnchored = false } = {}) {
  const ids = ['P', 'C'].flatMap(prefix => Array.from({ length: 9 }, (_, index) => `${prefix}${index + 1}`))
  if (!responses || typeof responses !== 'object' || Array.isArray(responses) || Object.keys(responses).some(key => !ids.includes(key))) throw new Error('INVALID_RESPONSES')
  if (!validate(ids.map(id => Object.hasOwn(responses, id) ? responses[id] : null), 18, 4)) return unavailable('incomplete-responses')
  if (eventAnchored !== true) return unavailable('event-anchor-required')
  const values = prefix => Array.from({ length: 9 }, (_, index) => responses[`${prefix}${index + 1}`])
  const p = values('P'), c = values('C')
  const requirements = items => [items.slice(0, 2), items.slice(2, 4), items.slice(4, 6), items.slice(6, 9)].every(endorsed)
  const ptsdRequirements = requirements(p), dsoRequirements = requirements(c)
  const clusterNames = ['reExperiencing', 'avoidance', 'currentThreat', 'affectiveDysregulation', 'negativeSelfConcept', 'disturbedRelationships']
  const pairs = [p.slice(0, 2), p.slice(2, 4), p.slice(4, 6), c.slice(0, 2), c.slice(2, 4), c.slice(4, 6)]
  return result({ ptsdTotal: sum(p.slice(0, 6)), dsoTotal: sum(c.slice(0, 6)),
    clusters: Object.fromEntries(pairs.map((items, index) => [clusterNames[index], sum(items)])),
    ptsdRequirements, dsoRequirements,
    pattern: ptsdRequirements ? (dsoRequirements ? 'CPTSD pattern' : 'PTSD-only pattern') : 'neither' })
}
