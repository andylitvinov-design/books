import {
  getDefinitionById,
  validateAnswers,
  provenance,
  validateProvenance,
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
  const next = { ...run.answers, ...answers }
  for (const key of Object.keys(next)) if (next[key] === null) delete next[key]
  const valid = validateAnswers(definition, next, { requireComplete: false })
  if (!Number.isInteger(progress) || progress < 0 || progress > definition.questions.length)
    fail('INVALID_PROGRESS')
  return {
    ...run,
    answers: valid,
    progress,
    status: 'in_progress',
    revision: run.revision + 1,
    updatedAt: now,
  }
}
export function submitRun(run, { expectedRevision, now = new Date().toISOString() } = {}) {
  mutable(run, expectedRevision)
  requireDate(now)
  const answers = validateAnswers(getDefinitionById(run.definitionId), run.answers)
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
