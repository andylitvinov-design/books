import { createClient, isClientId } from '../clients/service.js'
import { createPrescription, updatePrescription } from '../prescriptions/service.js'
import { createPaymentDocument, updatePaymentDocument } from '../documents/payment.js'
import { LETTERHEAD } from '../documents/letterhead.js'

export function consultationDocumentInputs(input) {
  // Prescription validation resolves canonical, source-only and custom identities on the server.
  const common = { patientName: input.patientName, dateIssued: input.consultationDate, languagePreference: input.languagePreference ?? 'en' }
  return {
    recommendation: {
      ...common, patientDob: input.patientDob, items: input.items,
      practitionerName: LETTERHEAD.name, practitionerRole: LETTERHEAD.role,
      practitionerBackground: LETTERHEAD.background, practitionerContact: LETTERHEAD.phone,
      generalInstructions: input.generalInstructions, analysis: input.analysis,
      additionalNotes: input.additionalNotes, recommendedTestKeys: input.recommendedTestKeys,
      followUp: input.followUp,
      followUpDate: input.followUpDate,
      internalNotes: input.internalNotes, recommendationNumber: input.recommendationNumber,
      recommendationType: input.recommendationType,
      includeDistanceHomeopathy: input.includeDistanceHomeopathy === true,
    },
    payment: {
      ...common, dateOfService: input.consultationDate,
      // Explicit invoice opt-in must never invent a charge or a paid receipt.
      // Keep legacy call defaults only for the pre-existing pair API.
      amount: input.includeInvoice === true ? input.amount : input.amount ?? '230.00',
      currency: input.currency ?? 'CAD',
      service: input.includeInvoice === true ? input.service : input.service ?? 'Individual consultation',
      paymentStatus: input.includeInvoice === true ? input.paymentStatus ?? 'unpaid' : input.paymentStatus ?? 'received',
      paymentMethod: input.paymentMethod,
      documentNumber: input.documentNumber, consultations: 1,
    },
  }
}

function selectedDocuments(input) {
  const recommendation = input.includeRecommendation !== false
  const payment = input.includeInvoice !== false
  if (!recommendation && !payment) throw new Error('Select at least one document')
  return { recommendation, payment }
}

export async function createConsultation(input, { store, requestId, now = new Date().toISOString() } = {}) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId ?? '')) throw new Error('A UUID request ID is required')
  const chosen = selectedDocuments(input)
  if (input.clientId && input.newClient) throw new Error('Choose an existing or new client')
  if (input.clientId && !isClientId(input.clientId)) throw new Error('Invalid client identity')
  const newClient = input.newClient ? createClient(input.newClient, now) : undefined
  const existingClient = input.clientId ? await store.findClientById(input.clientId) : undefined
  if (input.clientId && (!existingClient || existingClient.status !== 'active')) throw new Error('Client unavailable')
  const client = newClient ?? existingClient
  const values = consultationDocumentInputs(client ? { ...input, patientName: client.fullName, languagePreference: input.languagePreference ?? client.preferredLocale } : input)
  const recommendation = chosen.recommendation ? createPrescription({ ...values.recommendation, status: 'active' }, now) : undefined
  const payment = chosen.payment ? createPaymentDocument({ ...values.payment, status: 'active' }, now) : undefined
  if (recommendation && payment) {
    recommendation.paymentDocumentId = payment.id
    payment.consultationId = recommendation.id
  }
  if (client) {
    if (recommendation) recommendation.clientId = client.id
    if (payment) payment.clientId = client.id
  }
  if (recommendation && payment) return store.saveConsultationPair({ recommendation, payment }, { requestId, newClient, existingClient })
  // Standalone documents (including new client creation) have a dedicated
  // atomic, idempotent write. Never create a phantom zero-value invoice.
  const saved = await store.saveConsultationSingle(recommendation ?? payment, { requestId, newClient, existingClient })
  return { recommendation: recommendation ? saved : undefined, payment: payment ? saved : undefined }
}

export async function updateConsultation(existingRecommendation, existingPayment, input, { store, now = new Date().toISOString() } = {}) {
  if (!existingRecommendation || existingRecommendation.kind === 'payment' ||
    (existingPayment && (existingRecommendation.paymentDocumentId !== existingPayment.id || existingPayment.consultationId !== existingRecommendation.id))) {
    throw new Error('Linked consultation documents required')
  }
  if (input.clientId && input.clientId !== existingRecommendation.clientId) throw new Error('Client identity is immutable')
  const chosen = selectedDocuments(input)
  const values = consultationDocumentInputs(input)
  const recommendation = chosen.recommendation
    ? updatePrescription(existingRecommendation, {
      ...values.recommendation,
      // Legacy recommendation records may have custom letterheads and fields
      // that did not exist in the newer consultation UI. Editing must not erase them.
      patientDob: input.patientDob ?? existingRecommendation.patientDob,
      internalNotes: input.internalNotes ?? existingRecommendation.internalNotes,
      practitionerName: existingRecommendation.practitionerName ?? values.recommendation.practitionerName,
      practitionerRole: existingRecommendation.practitionerRole ?? values.recommendation.practitionerRole,
      practitionerBackground: existingRecommendation.practitionerBackground ?? values.recommendation.practitionerBackground,
      practitionerContact: existingRecommendation.practitionerContact ?? values.recommendation.practitionerContact,
      status: existingRecommendation.status,
    }, now)
    : existingRecommendation
  const payment = chosen.payment
    ? existingPayment
      ? updatePaymentDocument(existingPayment, { ...values.payment, status: existingPayment.status }, now)
      : createPaymentDocument({ ...values.payment, status: 'active' }, now)
    : existingPayment

  if (!existingPayment && chosen.payment) {
    // Add payment to an existing recommendation without risking a partial write.
    const linked = { ...recommendation, paymentDocumentId: payment.id, updatedAt: now }
    payment.consultationId = linked.id
    if (existingRecommendation.clientId) payment.clientId = existingRecommendation.clientId
    return store.attachPaymentToRecommendation(existingRecommendation, { recommendation: linked, payment })
  }
  if (existingPayment && chosen.recommendation && chosen.payment) {
    return store.saveConsultationPair({ recommendation, payment }, {
      previousRecommendation: existingRecommendation, previousPayment: existingPayment,
    })
  }
  // An unchecked document means "don't update", not "silently revoke/delete".
  if (chosen.recommendation) await store.save(recommendation, existingRecommendation)
  if (chosen.payment && existingPayment) await store.save(payment, existingPayment)
  return { recommendation, payment }
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
