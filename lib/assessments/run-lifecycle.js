import {getAssessmentDefinition, validateAnswers} from './definitions.js'

const immutableStatuses = new Set(['submitted', 'completed', 'failed', 'discarded'])

export function createAssessmentRun({id, accountId, definition, now}) {
  if (!id || !accountId || !definition || !now) throw new Error('Run identity, account, definition and time are required')
  return {id, accountId, definitionKey: definition.key, definitionVersion: definition.version, instrumentLocale: definition.instrumentLocale, status: 'draft', revision: 0, answers: {}, startedAt: now, updatedAt: now}
}

export function saveRunAnswers(run, answers, {expectedRevision, now = new Date().toISOString()} = {}) {
  if (immutableStatuses.has(run.status)) throw new Error('Submitted or immutable run cannot be edited')
  if (expectedRevision !== run.revision) throw new Error('Stale run revision')
  if (!answers || typeof answers !== 'object') throw new Error('Answers must be an object')
  const definition = getAssessmentDefinition(run.definitionKey, run.definitionVersion)
  const nextAnswers = {...run.answers, ...answers}
  validateAnswers(definition, nextAnswers, {requireComplete: false})
  return {...run, answers: nextAnswers, status: 'in_progress', revision: run.revision + 1, updatedAt: now}
}

export function submitRun(run, {expectedRevision, now = new Date().toISOString()} = {}) {
  if (expectedRevision !== run.revision) throw new Error('Stale run revision')
  if (immutableStatuses.has(run.status)) throw new Error('Run is already immutable')
  validateAnswers(getAssessmentDefinition(run.definitionKey, run.definitionVersion), run.answers)
  return {...run, status: 'submitted', submittedRevision: run.revision, submittedAt: now, updatedAt: now}
}
