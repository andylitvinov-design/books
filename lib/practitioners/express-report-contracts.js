import { AppError, onlyKeys, requireUUID } from '../assessments/contracts.js'

export const EXPRESS_REPORT_FIELDS = Object.freeze([
  'title', 'situation', 'findings', 'resources', 'steps', 'followUp',
  'progressBefore', 'progressAfter',
])
const LENGTHS = Object.freeze({
  title: 120, situation: 2000, findings: 4000, resources: 3000,
  steps: 3000, followUp: 1800,
})

export function expressReportDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new AppError('INVALID_REPORT_DATE', 400)
  const parsed = new Date(value + 'T00:00:00.000Z')
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value)
    throw new AppError('INVALID_REPORT_DATE', 400)
  return value
}

export function expressReportScore(value) {
  if (value === null || value === '' || value === undefined) return null
  if (typeof value !== 'string' && typeof value !== 'number')
    throw new AppError('INVALID_REPORT_SCORE', 400)
  const string = String(value)
  if (!/^(?:10(?:\.0)?|[0-9](?:\.[0-9])?)$/.test(string))
    throw new AppError('INVALID_REPORT_SCORE', 400)
  return Number(string)
}

export function normalizeExpressReportContent(input) {
  onlyKeys(input, EXPRESS_REPORT_FIELDS)
  const result = {}
  for (const [field, limit] of Object.entries(LENGTHS)) {
    const value = input[field] ?? ''
    if (typeof value !== 'string' || value.length > limit || value.includes('\u0000'))
      throw new AppError('INVALID_REPORT_TEXT', 400)
    result[field] = value.trim()
  }
  result.progressBefore = expressReportScore(input.progressBefore)
  result.progressAfter = expressReportScore(input.progressAfter)
  if (!result.title) throw new AppError('REPORT_TITLE_REQUIRED', 400)
  return result
}

export function validateExpressReportCreate(input) {
  onlyKeys(input, ['operationId', 'requestId', 'language', 'issuedOn', 'content'])
  requireUUID(input.operationId)
  requireUUID(input.requestId)
  if (!['en', 'ru', 'es'].includes(input.language))
    throw new AppError('INVALID_REPORT_LANGUAGE', 400)
  return {
    operationId: input.operationId,
    requestId: input.requestId,
    language: input.language,
    issuedOn: expressReportDate(input.issuedOn),
    content: normalizeExpressReportContent(input.content),
  }
}

export function validateExpressReportEdit(input) {
  onlyKeys(input, ['expectedRevision', 'language', 'issuedOn', 'content'])
  if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 1)
    throw new AppError('INVALID_REVISION', 400)
  if (!['en', 'ru', 'es'].includes(input.language))
    throw new AppError('INVALID_REPORT_LANGUAGE', 400)
  return {
    expectedRevision: input.expectedRevision,
    language: input.language,
    issuedOn: expressReportDate(input.issuedOn),
    content: normalizeExpressReportContent(input.content),
  }
}

export function requireExpressReportReady(content) {
  if (!content?.situation || !content?.findings || !content?.steps)
    throw new AppError('REPORT_INCOMPLETE', 409)
  return content
}

export function validateExpressReportTransition(input) {
  onlyKeys(input, ['action', 'expectedRevision'])
  if (!['publish', 'send', 'revoke'].includes(input.action) ||
      !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 1)
    throw new AppError('INVALID_REPORT_ACTION', 400)
  return input
}
