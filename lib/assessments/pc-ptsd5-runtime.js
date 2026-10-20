import { PC_PTSD5_DISABLED_V1 as pinned } from '../../data/assessments/pc-ptsd5-disabled-v1.js'
import { assertObject, canonicalJSON, deepFreeze, fail, onlyKeys } from './contracts.js'

// Runtime support is not publication. No catalog, registry, starter or repeat opt-in.
export const PC_PTSD5_RELEASED = false
const identity = canonicalJSON(pinned)
const symptomIds = pinned.branching.affirmativeAnswerKeys.slice(1)
const answerIds = pinned.branching.affirmativeAnswerKeys
const provenanceFields = {
  definitionId: 'id', definitionKey: 'key', definitionVersion: 'version',
  instrumentLocale: 'instrumentLocale', translationVersion: 'translationVersion',
  contentHash: 'contentHash', scoringKey: 'scoringKey', scoringVersion: 'scoringVersion',
  resultVersion: 'resultVersion', timeframe: 'timeframe',
}

export const isPcPtsd5Definition = definition => Boolean(definition && (
  definition.id === pinned.id || definition.key === pinned.key || definition.scoringKey === pinned.scoringKey
))
export function assertExactPcPtsd5Definition(definition) {
  if (canonicalJSON(definition) !== identity) fail('INVALID_PROVENANCE')
  return pinned
}

// Separate, version-scoped product safeguards, not a modification of the official form.
// Acknowledgements do not establish that professional follow-up is actually available.
export const PC_PTSD5_ADMINISTRATION_POLICY = deepFreeze({
  kind: 'trauma-front-matter-v1',
  policyVersion: 'pc-ptsd5-administration-v1',
  definitionId: pinned.id,
  contentHash: pinned.contentHash,
  releaseEnabled: false,
  releaseBlockers: ['qualified-professional-follow-up-not-verified', 'end-to-end-activation-review-required'],
  intro: [
    'This is the original English adult PC-PTSD-5 form. It begins with a lifetime exposure question, followed only when applicable by five past-month questions.',
    'You do not need to describe an event. You may stop at any time.',
  ],
  fields: [],
  acknowledgements: [
    { id: 'adult_confirmed', kind: 'select', required: true, options: ['Yes'], label: 'I confirm that I am 18 or older.' },
    { id: 'non_diagnostic_acknowledged', kind: 'select', required: true, options: ['Yes'], label: 'I understand that this questionnaire is not a diagnosis and that concerning symptoms should be discussed with a qualified health professional regardless of the score.' },
    { id: 'not_monitored_acknowledged', kind: 'select', required: true, options: ['Yes'], label: 'I understand that responses are not monitored in real time and this is not an emergency service.' },
  ],
})
export function pcPtsd5AdministrationPolicy(definition) {
  if (!isPcPtsd5Definition(definition)) return null
  assertExactPcPtsd5Definition(definition)
  return PC_PTSD5_ADMINISTRATION_POLICY
}

export function validatePcPtsd5Answers(definition, answers, { requireComplete = true } = {}) {
  assertExactPcPtsd5Definition(definition)
  onlyKeys(answers, answerIds)
  const valid = {}
  for (const id of answerIds) {
    const value = answers[id]
    if (value == null) continue
    if (value !== 0 && value !== 1) fail('INVALID_ANSWER')
    valid[id] = value
  }
  // Even null symptom keys are not a valid submitted structural skip. The save
  // reducer removes explicit null deletions before reaching this validator.
  if (valid.exposure !== 1 && symptomIds.some(id => Object.hasOwn(answers, id)))
    fail('INAPPLICABLE_RESPONSES')
  if (requireComplete) {
    if (!Object.hasOwn(valid, 'exposure')) fail('REQUIRED_ANSWER')
    if (valid.exposure === 1 && symptomIds.some(id => !Object.hasOwn(valid, id)))
      fail('REQUIRED_ANSWER')
  }
  return valid
}

/** The sole applicable-question selector for account/guest and quick/guided runners. */
export function applicableAssessmentQuestions(definition, answers = {}) {
  if (!definition) return []
  if (!isPcPtsd5Definition(definition)) return definition.questions
  assertExactPcPtsd5Definition(definition)
  return answers.exposure === 1 ? definition.questions : definition.questions.slice(0, 1)
}

/** Atomic transition: an explicit gate reset/NO removes all five answers together. */
export function mergeAssessmentAnswers(definition, previous = {}, patch = {}) {
  assertObject(previous)
  onlyKeys(patch, definition.questions.map(question => question.id))
  const merged = { ...previous, ...patch }
  for (const key of Object.keys(merged)) if (merged[key] === null) delete merged[key]
  if (!isPcPtsd5Definition(definition)) return merged
  assertExactPcPtsd5Definition(definition)
  if (Object.hasOwn(patch, 'exposure') && (patch.exposure === 0 || patch.exposure === null)) {
    // Do not silently accept a contradictory write or an invalid supplied value.
    if (symptomIds.some(id => Object.hasOwn(patch, id) && patch[id] !== null))
      fail('INAPPLICABLE_RESPONSES')
    for (const id of symptomIds) delete merged[id]
  }
  validatePcPtsd5Answers(definition, merged, { requireComplete: false })
  return merged
}

export function assessmentAnswerProgress(definition, answers = {}) {
  const questions = applicableAssessmentQuestions(definition, answers)
  const answered = question => Object.hasOwn(answers, question.id) && answers[question.id] != null
  const answeredCount = questions.filter(answered).length
  const firstMissing = questions.findIndex(question => !answered(question))
  return { questions, answeredCount, total: questions.length,
    allAnswered: questions.length > 0 && firstMissing === -1,
    nextIndex: firstMissing < 0 ? questions.length : firstMissing }
}

// Preserve existing instruments' progress semantics; only this pinned branch is clamped.
export function assessmentSaveProgress(definition, answers, requested) {
  if (!Number.isInteger(requested) || requested < 0 || requested > definition.questions.length)
    fail('INVALID_PROGRESS')
  if (!isPcPtsd5Definition(definition)) return requested
  return Math.min(requested, applicableAssessmentQuestions(definition, answers).length)
}

export function pcPtsd5DimensionShape(definition) {
  assertExactPcPtsd5Definition(definition)
  const spec = pinned.scoring.dimensions[0]
  return { key: spec.key, min: 0, max: 5, unit: 'points', timeframe: pinned.timeframe,
    direction: 'non-normative', dimensionClass: 'symptoms', sourceConstruct: spec.sourceConstruct }
}
export function scorePcPtsd5Dimensions(definition, answers) {
  const valid = validatePcPtsd5Answers(definition, answers)
  const skipped = valid.exposure === 0
  return [{ ...pcPtsd5DimensionShape(definition),
    value: skipped ? 0 : symptomIds.reduce((sum, id) => sum + valid[id], 0),
    // Retained with the persisted dimension; zero does not invent five NO answers.
    responseState: skipped ? 'structurally-skipped' : 'answered' }]
}
export function exactPcPtsd5ResultDefinition(result) {
  if (!Object.entries(provenanceFields).every(([field, key]) => result?.[field] === pinned[key]))
    return null
  if (!Array.isArray(result.dimensions) || result.dimensions.length !== 1) return null
  const dimension = result.dimensions[0]
  const shape = pcPtsd5DimensionShape(pinned)
  if (!dimension || Object.entries(shape).some(([key, value]) => dimension[key] !== value) ||
      !Number.isInteger(dimension.value) || dimension.value < 0 || dimension.value > 5 ||
      !['answered', 'structurally-skipped'].includes(dimension.responseState) ||
      (dimension.responseState === 'structurally-skipped' && dimension.value !== 0)) return null
  return pinned
}
