import { createClient, isClientId } from '../clients/service.js'
import { createPrescription, updatePrescription } from '../prescriptions/service.js'
import { createPaymentDocument, updatePaymentDocument } from '../documents/payment.js'
import { LETTERHEAD } from '../documents/letterhead.js'

function documentInputs(input) {
  // Prescription validation resolves canonical, source-only and custom identities on the server.
  const common = { patientName: input.patientName, dateIssued: input.consultationDate, languagePreference: input.languagePreference ?? 'en' }
  return {
    recommendation: {
      ...common, patientDob: input.patientDob, items: input.items,
      practitionerName: LETTERHEAD.name, practitionerRole: LETTERHEAD.role,
      practitionerBackground: LETTERHEAD.background, practitionerContact: LETTERHEAD.phone,
      generalInstructions: input.generalInstructions, followUp: input.followUp,
      internalNotes: input.internalNotes, recommendationNumber: input.recommendationNumber,
    },
    payment: {
      ...common, dateOfService: input.consultationDate, amount: input.amount ?? '230.00',
      currency: input.currency ?? 'CAD', service: input.service ?? 'Individual consultation',
      paymentStatus: input.paymentStatus ?? 'received', paymentMethod: input.paymentMethod,
      documentNumber: input.documentNumber, consultations: 1,
    },
  }
}

export async function createConsultation(input, { store, requestId, now = new Date().toISOString() } = {}) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId ?? '')) throw new Error('A UUID request ID is required')
  if (input.clientId && input.newClient) throw new Error('Choose an existing or new client')
  if (input.clientId && !isClientId(input.clientId)) throw new Error('Invalid client identity')
  const newClient = input.newClient ? createClient(input.newClient, now) : undefined
  const existingClient = input.clientId ? await store.findClientById(input.clientId) : undefined
  if (input.clientId && (!existingClient || existingClient.status !== 'active')) throw new Error('Client unavailable')
  const client = newClient ?? existingClient
  const values = documentInputs(client ? { ...input, patientName: client.fullName, languagePreference: input.languagePreference ?? client.preferredLocale } : input)
  const recommendation = createPrescription({ ...values.recommendation, status: 'active' }, now)
  const payment = createPaymentDocument({ ...values.payment, status: 'active' }, now)
  recommendation.paymentDocumentId = payment.id
  payment.consultationId = recommendation.id
  if (client) { recommendation.clientId = client.id; payment.clientId = client.id }
  return store.saveConsultationPair({ recommendation, payment }, { requestId, newClient, existingClient })
}

export async function updateConsultation(existingRecommendation, existingPayment, input, { store, now = new Date().toISOString() } = {}) {
  if (!existingRecommendation || existingRecommendation.kind === 'payment' || existingRecommendation.paymentDocumentId !== existingPayment?.id || existingPayment?.consultationId !== existingRecommendation.id) throw new Error('Linked consultation documents required')
  if (input.clientId && input.clientId !== existingRecommendation.clientId) throw new Error('Client identity is immutable')
  const values = documentInputs(input)
  const recommendation = updatePrescription(existingRecommendation, { ...values.recommendation, status: existingRecommendation.status }, now)
  const payment = updatePaymentDocument(existingPayment, { ...values.payment, status: existingPayment.status }, now)
  payment.consultationId = recommendation.id
  if (existingRecommendation.clientId) { recommendation.clientId = existingRecommendation.clientId; payment.clientId = existingRecommendation.clientId }
  return store.saveConsultationPair({ recommendation, payment }, { previousRecommendation: existingRecommendation, previousPayment: existingPayment })
}

// An owner can add the first payment to a standalone recommendation without
// temporarily publishing half a pair or losing an existing client association.
export async function attachPaymentToRecommendation(store, existing, payment) {
  if (!existing || existing.kind === 'payment' || payment?.kind !== 'payment') throw new Error('Recommendation and payment required')
  const findLinked = async () => {
    const current = await store.findById(existing.id)
    if (!current?.paymentDocumentId) return undefined
    const linked = await store.findById(current.paymentDocumentId)
    if (!linked || linked.consultationId !== current.id || linked.clientId !== current.clientId) throw new Error('Linked payment unavailable')
    return { recommendation: current, payment: linked }
  }
  const linked = await findLinked()
  if (linked) return linked
  const recommendation = { ...existing, paymentDocumentId: payment.id, updatedAt: new Date().toISOString() }
  const nextPayment = { ...payment, consultationId: existing.id }
  if (existing.clientId) nextPayment.clientId = existing.clientId
  else delete nextPayment.clientId
  try { return await store.attachPaymentToRecommendation(existing, { recommendation, payment: nextPayment }) }
  catch (error) { const winner = await findLinked(); if (winner) return winner; throw error }
}
