import { randomUUID } from 'node:crypto'
export const isClientId = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
function fields(input) {
  const text = (name, max) => { const value = input[name] ?? ''; if (typeof value !== 'string' || value.length > max) throw new Error(`Invalid ${name}`); return value.trim() }
  const fullName = text('fullName', 200)
  if (!fullName) throw new Error('Client name required')
  const preferredLocale = input.preferredLocale ?? 'en'
  if (!['en', 'ru'].includes(preferredLocale)) throw new Error('Invalid preferred language')
  const status = input.status ?? 'active'
  if (!['active', 'archived'].includes(status)) throw new Error('Invalid client status')
  const email = text('email', 254)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email')
  return { fullName, preferredLocale, email, phone: text('phone', 80), notes: text('notes', 10000), status }
}
export function createClient(input, now = new Date().toISOString()) { return { id: randomUUID(), ...fields(input), createdAt: now, updatedAt: now } }
export function updateClient(existing, input, now = new Date().toISOString()) {
  if (!existing || (input.id && input.id !== existing.id)) throw new Error('Client identity is immutable')
  return { ...existing, ...fields({ ...existing, ...input }), updatedAt: now }
}
// Call only after owner authentication. A name match is never sufficient authorization.
export async function assignLegacyConsultation(store, documentId, target, { requestId } = {}) {
  const newInput = typeof target === 'object' ? target?.newClient : undefined
  const targetId = typeof target === 'string' ? target : target?.clientId
  if (newInput && targetId) throw new Error('Choose an existing or new client')
  if ((requestId || newInput) && !isClientId(requestId)) throw new Error('A UUID request ID is required')
  if (requestId) {
    const prior = await store.findLegacyAssignment(requestId, documentId)
    if (prior) return prior
  }
  const selected = await store.findById(documentId)
  if (!selected || selected.clientId) {
    if (requestId) { const prior = await store.findLegacyAssignment(requestId, documentId); if (prior) return prior }
    throw new Error('Unassigned document required')
  }
  let records = [selected]
  if (selected.paymentDocumentId || selected.consultationId) {
    const linked = await store.findById(selected.paymentDocumentId ?? selected.consultationId)
    const recommendation = selected.kind === 'payment' ? linked : selected
    const payment = selected.kind === 'payment' ? selected : linked
    if (!recommendation || recommendation.kind === 'payment' || payment?.kind !== 'payment' || recommendation.paymentDocumentId !== payment.id || (payment.consultationId && payment.consultationId !== recommendation.id) || linked.clientId) throw new Error('Unassigned linked documents required')
    records = [recommendation, payment]
  }
  const newClient = newInput ? createClient(newInput) : undefined
  const client = newClient ?? (isClientId(targetId) && await store.findClientById(targetId))
  if (!client || client.status !== 'active') throw new Error('Active client required')
  return store.assignLegacyDocuments(records, { client, newClient: Boolean(newClient), requestId, documentId })
}
export const assignLegacyDocuments = assignLegacyConsultation
export async function listUnassignedConsultations(store, options = {}) { return store.listUnassignedConsultations(options) }
