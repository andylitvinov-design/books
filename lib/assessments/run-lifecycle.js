import { mergeAssessmentAnswers, assessmentSaveProgress } from './pc-ptsd5-runtime.js'
import {
  getDefinitionById,
  validateAnswers,
  provenance,
  validateProvenance,
  validateContext,
} from './definitions.js'
import {
  requireUUID,
  requireDate,
  requireTimezone,
  revision,
  onlyKeys,
  fail,
  deepFreeze,
} from './contracts.js'
import { assertTraumaSave } from './trauma-administration.js'
export function createAssessmentRun({ id, accountId, definition, now, timezone = 'UTC' }) {
  requireUUID(id)
  requireUUID(accountId)
  requireDate(now)
  requireTimezone(timezone)
  const def = getDefinitionById(definition.id)
  return {
    id,
    accountId,
    ...provenance(def),
    status: 'draft',
    revision: 0,
    answers: {},
    progress: 0,
    timezone,
    startedAt: now,
    updatedAt: now,
  }
}
function mutable(run, expectedRevision) {
  requireUUID(run.id)
  requireUUID(run.accountId)
  validateProvenance(run)
  revision(expectedRevision)
  if (!['draft', 'in_progress'].includes(run.status)) fail('IMMUTABLE_RUN', 409)
  if (run.revision !== expectedRevision) fail('STALE_REVISION', 409)
}
export function saveRunAnswers(
  run,
  answers,
  { expectedRevision, now = new Date().toISOString(), progress = run.progress } = {},
) {
  mutable(run, expectedRevision)
  requireDate(now)
  const definition = getDefinitionById(run.definitionId)
  onlyKeys(
    answers,
    definition.questions.map((q) => q.id),
  )
  assertTraumaSave(definition, run.answers, run.context || {}, run.context || {}, answers)
  const next = mergeAssessmentAnswers(definition, run.answers, answers)
  const valid = validateAnswers(definition, next, { requireComplete: false })
  const savedProgress = assessmentSaveProgress(definition, valid, progress)
  return {
    ...run,
    answers: valid,
    progress: savedProgress,
    status: 'in_progress',
    revision: run.revision + 1,
    updatedAt: now,
  }
}
export function submitRun(run, { expectedRevision, now = new Date().toISOString() } = {}) {
  mutable(run, expectedRevision)
  requireDate(now)
  const definition = getDefinitionById(run.definitionId)
  validateContext(definition, run.context || {}, { requireComplete: true })
  const answers = validateAnswers(definition, run.answers)
  return deepFreeze({
    ...run,
    answers,
    status: 'submitted',
    submittedRevision: run.revision,
    revision: run.revision + 1,
    submittedAt: now,
    measurementAt: now,
    updatedAt: now,
  })
}
