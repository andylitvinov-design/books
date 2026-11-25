// Prepare a private, unsaved client document for practitioner review.
// No store.save, access token, client link, or publication takes place here.
import { isClientId } from '../clients/service.js'
import { createPrescription, getClientPrescription } from '../prescriptions/service.js'
import { createPaymentDocument, getClientPaymentDocument } from '../documents/payment.js'
import { consultationDocumentInputs } from './service.js'

export async function createConsultationDraftPreview(input, { store, kind = 'recommendation', locale = 'en' } = {}) {
  if (!['recommendation', 'payment'].includes(kind)) throw new Error('Unknown preview document')
  if (!['ru', 'en'].includes(locale)) throw new Error('Invalid preview language')
  if (kind === 'recommendation' && input.includeRecommendation !== true) throw new Error('Select a prescription to preview')
  if (kind === 'payment' && input.includeInvoice !== true) throw new Error('Select an invoice to preview')

  let patientName
  if (input.consultationId) {
    const current = store ? await store.findById(input.consultationId) : undefined
    if (!current || current.kind === 'payment') throw new Error('Consultation unavailable')
    patientName = current.patientName
  } else if (input.clientMode === 'existing') {
    if (!isClientId(input.clientId)) throw new Error('Choose an existing client')
    const client = store ? await store.findClientById(input.clientId) : undefined
    if (!client || client.status !== 'active') throw new Error('Client unavailable')
    patientName = client.fullName
  } else if (input.clientMode === 'new') {
    patientName = String(input.patientName ?? '').trim()
    if (!patientName || patientName.length > 200) throw new Error('Enter the client name')
  } else {
    throw new Error('Select or create a client')
  }

  const common = consultationDocumentInputs({ ...input, patientName, languagePreference: locale })
  const record = kind === 'payment'
    ? createPaymentDocument({ ...common.payment, status: 'active' })
    : createPrescription({ ...common.recommendation, status: 'active' })
  const document = kind === 'payment'
    ? getClientPaymentDocument(record, locale)
    : getClientPrescription(record, locale)
  if (!document) throw new Error('Could not preview the selected document')
  return document
}
