import { HH_CORE_CHECKIN_DEFINITIONS } from '../../data/assessments/hh-core-checkins-v3.js'
import { getDefinitionById, provenance, validateAnswers, validateProvenance } from './definitions.js'
import { canonicalJSON, deepFreeze, fail, onlyKeys, requireDate, requireUUID } from './contracts.js'

const candidateIds = new Set(HH_CORE_CHECKIN_DEFINITIONS.map(definition => definition.id))
const subjectDependent = new Set(['state.problem_intensity', 'state.current_interference'])

function coreDefinition(definition) {
  if (!definition || !candidateIds.has(definition.id)) fail('UNSUPPORTED_CHECKIN')
  const registered = getDefinitionById(definition.id)
  if (canonicalJSON(definition) !== canonicalJSON(registered)) fail('INVALID_PROVENANCE')
  return registered
}

/** Draft analysis only. Missing answers are unavailable, never zero or imputed.
 * Completed persisted results still use scoreAssessment and its strict required policy.
 */
export function analyzeCheckin(definition, answers) {
  const registered = coreDefinition(definition)
  const valid = validateAnswers(registered, answers, { requireComplete: false })
  const facets = registered.questions.map(question => {
    const answered = Object.hasOwn(valid, question.id)
    return {
      key: question.id,
      label: question.label,
      value: answered ? valid[question.id] : null,
      status: answered ? 'answered' : 'missing',
      min: question.min,
      max: question.max,
      anchors: [...question.anchors],
      responseAnchors: registered.responseAnchors ? [...registered.responseAnchors] : null,
      unit: 'ordinal-response-points',
    }
  })
  const answered = facets.filter(facet => facet.status === 'answered').length
  return deepFreeze({
    ...provenance(registered),
    analysisVersion: 'checkin-facets-v1',
    evidenceStatus: 'authored-not-validated',
    completeness: { answered, expected: facets.length, missing: facets.length - answered, complete: answered === facets.length },
    facets,
    limitations: registered.instrumentLocale === 'ru'
      ? 'Это отдельные самооценки, а не диагноз или общий показатель психического здоровья. Пропуски не оцениваются. Формы и переводы не прошли эмпирическую валидацию.'
      : 'These are separate self-reported observations, not a diagnosis or an overall mental health score. Missing responses are not scored. Forms and translations have not been empirically validated.',
  })
}

function observation(value) {
  onlyKeys(value, ['provenance', 'answers', 'accountId', 'measurementAt'])
  requireUUID(value.accountId)
  requireDate(value.measurementAt)
  // Reject impossible dates and ambiguous/time-zone-free values, not just parseable text.
  if (new Date(value.measurementAt).toISOString() !== value.measurementAt) fail('INVALID_DATE')
  const definition = validateProvenance(value.provenance)
  onlyKeys(value.provenance, Object.keys(provenance(definition)))
  return { definition, profile: analyzeCheckin(definition, value.answers), accountId: value.accountId, measurementAt: value.measurementAt }
}

/** Compare two supplied answer observations, never trust a supplied total or profile.
 * Account identity must come from an authenticated caller. This pure helper is not
 * an authorization boundary and is not yet wired to any route or UI.
 */
export function compareCheckinObservations(previous, current) {
  const before = observation(previous)
  const after = observation(current)
  let reason = null
  if (before.accountId !== after.accountId) reason = 'different-account'
  else if (canonicalJSON(provenance(before.definition)) !== canonicalJSON(provenance(after.definition))) reason = 'incompatible-provenance'
  else if (Date.parse(before.measurementAt) >= Date.parse(after.measurementAt)) reason = 'non-increasing-time'
  // Do not reveal either account's facets when the observation pair is incompatible.
  if (reason) return deepFreeze({ comparable: false, reason, facets: [] })
  const facets = after.profile.facets.map((facet, index) => {
    const prior = before.profile.facets[index]
    if (subjectDependent.has(facet.key)) return { key: facet.key, comparable: false, reason: 'subject-not-established', delta: null }
    if (prior.status !== 'answered' || facet.status !== 'answered') return { key: facet.key, comparable: false, reason: 'missing-response', delta: null }
    const delta = facet.value - prior.value
    return { key: facet.key, comparable: true, previous: prior.value, current: facet.value, delta, change: delta === 0 ? 'same-response' : delta > 0 ? 'higher-response' : 'lower-response', unit: 'ordinal-response-points' }
  })
  return deepFreeze({
    comparable: facets.some(facet => facet.comparable),
    reason: facets.some(facet => facet.comparable) ? null : 'no-comparable-facets',
    previousAt: before.measurementAt,
    currentAt: after.measurementAt,
    observationCount: 2,
    facets,
    limitations: after.definition.instrumentLocale === 'ru'
      ? 'Разница двух ответов не доказывает устойчивый тренд, клинически значимое изменение или эффект практики. ' + (after.definition.key === 'hh-current-state' ? 'Для трудности и её помехи предмет сравнения не установлен.' : '')
      : 'A difference between two responses does not establish a stable trend, clinically meaningful change or an effect of a practice. ' + (after.definition.key === 'hh-current-state' ? 'The subject of difficulty and interference has not been established.' : ''),
  })
}
