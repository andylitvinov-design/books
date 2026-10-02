// Practitioner-supplied records only. This service does not score or interpret tests.
import { createHash, randomUUID } from 'node:crypto'
import { isClientId } from './service.js'
export class AssessmentError extends Error {
  constructor(code) { super(code); this.code = code }
}
const fail = code => { throw new AssessmentError(code) }
const editable = ['kind', 'title', 'occurredOn', 'language', 'sourceName', 'sourceVersion', 'description', 'originalResult', 'practitionerComment', 'relatedDocumentIds']
export function validateAssessmentInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('VALIDATION')
  if (Object.keys(input).some(key => !editable.includes(key))) fail('VALIDATION')
  let encoded
  try { encoded = JSON.stringify(input) } catch { fail('VALIDATION') }
  if (Buffer.byteLength(encoded) > 65536) fail('VALIDATION')
  function text(key, maximum, required = false) {
    const value = input[key] ?? ''
    if (typeof value !== 'string' || value.length > maximum || value.includes('\u0000')) fail('VALIDATION')
    const clean = value.trim()
    if (required && !clean) fail('VALIDATION')
    return clean
  }
  const kind = input.kind
  const language = input.language
  if (!['test', 'research_result'].includes(kind) || !['en', 'ru', 'es', 'other'].includes(language)) fail('VALIDATION')
  const occurredOn = text('occurredOn', 10, true)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) fail('VALIDATION')
  const date = new Date(`${occurredOn}T12:00:00.000Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== occurredOn) fail('VALIDATION')
  const ids = input.relatedDocumentIds ?? []
  if (!Array.isArray(ids) || ids.length > 10 || ids.some(id => !isClientId(id)) || new Set(ids).size !== ids.length) fail('VALIDATION')
  return { kind, title: text('title', 200, true), occurredOn, language,
    sourceName: text('sourceName', 200), sourceVersion: text('sourceVersion', 200),
    description: text('description', 10000), originalResult: text('originalResult', 10000), practitionerComment: text('practitionerComment', 10000),
    relatedDocumentIds: [...ids].sort(),
  }
}
export function assessmentFingerprint(input) { return createHash('sha256').update(JSON.stringify(validateAssessmentInput(input))).digest('hex') }
export async function requireAssessmentClient(store, clientId) {
  if (!isClientId(clientId) || !store?.findClientAssessment) fail('UNAVAILABLE')
  const client = await store.findClientById(clientId)
  if (!client || client.status !== 'active') fail('UNAVAILABLE')
  return client
}
export async function validateAssessmentRelations(store, clientId, ids) {
  for (const id of ids) {
    const doc = await store.findById(id)
    if (!doc || doc.clientId !== clientId || doc.status !== 'active') fail('VALIDATION')
  }
}
export async function createAssessment(store, clientId, input, requestId, now = new Date().toISOString()) {
  await requireAssessmentClient(store, clientId)
  if (!isClientId(requestId)) fail('VALIDATION')
  const fields = validateAssessmentInput(input)
  await validateAssessmentRelations(store, clientId, fields.relatedDocumentIds)
  const record = { id: randomUUID(), clientId, schemaVersion: 1, ...fields, status: 'draft', revision: 1, createdAt: now, updatedAt: now }
  return store.createClientAssessment(record, { requestId, fingerprint: assessmentFingerprint(fields) })
}
export async function updateAssessment(store, clientId, id, expectedRevision, input, now = new Date().toISOString()) {
  await requireAssessmentClient(store, clientId)
  if (!isClientId(id) || !Number.isSafeInteger(expectedRevision) || expectedRevision < 1) fail('VALIDATION')
  const current = await store.findClientAssessment(id)
  if (!current || current.clientId !== clientId) fail('UNAVAILABLE')
  if (current.revision !== expectedRevision) fail('CONFLICT')
  if (current.status !== 'draft') fail('UNSHARE_FIRST')
  const fields = validateAssessmentInput(input)
  await validateAssessmentRelations(store, clientId, fields.relatedDocumentIds)
  const next = { ...current, ...fields, revision: current.revision + 1, updatedAt: now }
  if (!await store.updateClientAssessmentIfUnchanged(current, next)) fail('CONFLICT')
  return next
}
export async function transitionAssessment(store, clientId, id, expectedRevision, operation, now = new Date().toISOString()) {
  await requireAssessmentClient(store, clientId)
  if (!isClientId(id) || !Number.isSafeInteger(expectedRevision) || expectedRevision < 1 || !['share', 'unshare', 'archive'].includes(operation)) fail('VALIDATION')
  const current = await store.findClientAssessment(id)
  if (!current || current.clientId !== clientId) fail('UNAVAILABLE')
  if (current.revision !== expectedRevision) fail('CONFLICT')
  const valid = operation === 'share' ? current.status === 'draft' : operation === 'unshare' ? current.status === 'shared' : ['draft', 'shared'].includes(current.status)
  if (!valid) fail('CONFLICT')
  if (operation === 'share') await validateAssessmentRelations(store, clientId, current.relatedDocumentIds)
  const next = { ...current, status: { share: 'shared', unshare: 'draft', archive: 'archived' }[operation], revision: current.revision + 1, updatedAt: now }
  if (operation === 'share') next.sharedAt = now
  if (operation === 'archive') next.archivedAt = now
  if (!await store.updateClientAssessmentIfUnchanged(current, next)) fail('CONFLICT')
  return next
}
export function clientAssessmentSummary(record, clientId) {
  if (!record || record.schemaVersion !== 1 || record.clientId !== clientId || record.status !== 'shared') return undefined
  return { id: record.id, kind: record.kind, title: record.title, occurredOn: record.occurredOn, language: record.language, sourceName: record.sourceName, sourceVersion: record.sourceVersion }
}
export async function clientAssessmentDetail(store, clientId, id) {
  if (!isClientId(id)) return undefined
  const record = await store.findClientAssessment(id)
  const summary = clientAssessmentSummary(record, clientId)
  if (!summary) return undefined
  const relatedDocuments = []
  for (const documentId of record.relatedDocumentIds) {
    const doc = await store.findById(documentId)
    if (doc?.clientId === clientId && doc.status === 'active') relatedDocuments.push({ id: doc.id })
  }
  return { ...summary, description: record.description, originalResult: record.originalResult, practitionerComment: record.practitionerComment, relatedDocuments }
}
