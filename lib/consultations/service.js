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
  const values = documentInputs(input)
  const recommendation = createPrescription({ ...values.recommendation, status: 'active' }, now)
  const payment = createPaymentDocument({ ...values.payment, status: 'active' }, now)
  recommendation.paymentDocumentId = payment.id
  payment.consultationId = recommendation.id
  return store.saveConsultationPair({ recommendation, payment }, { requestId })
}

export async function updateConsultation(existingRecommendation, existingPayment, input, { store, now = new Date().toISOString() } = {}) {
  if (!existingRecommendation || existingRecommendation.kind === 'payment' || existingRecommendation.paymentDocumentId !== existingPayment?.id || existingPayment?.consultationId !== existingRecommendation.id) throw new Error('Linked consultation documents required')
  const values = documentInputs(input)
  const recommendation = updatePrescription(existingRecommendation, { ...values.recommendation, status: existingRecommendation.status }, now)
  const payment = updatePaymentDocument(existingPayment, { ...values.payment, status: existingPayment.status }, now)
  payment.consultationId = recommendation.id
  return store.saveConsultationPair({ recommendation, payment }, { previousRecommendation: existingRecommendation, previousPayment: existingPayment })
}
