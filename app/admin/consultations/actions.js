'use server'

import { redirect } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { consultationSavingAvailable } from '@/lib/consultations/availability'
import { changeConsultationDocumentStatus as changeDocumentStatus } from '@/lib/consultations/lifecycle'
import { createConsultation, updateConsultation } from '@/lib/consultations/service'

function input(formData) {
  const fields = ['patientName', 'languagePreference', 'amount', 'currency', 'service', 'paymentStatus', 'paymentMethod', 'documentNumber', 'recommendationNumber', 'generalInstructions', 'analysis', 'additionalNotes', 'followUp', 'followUpDate', 'patientDob', 'internalNotes']
  const data = Object.fromEntries(fields.map((key) => [key, formData.get(key) ?? undefined]))
  if (!['ru', 'en'].includes(data.languagePreference)) throw new Error('Choose report language')
  data.includeRecommendation = formData.get('includeRecommendation') === 'on'
  data.includeInvoice = formData.get('includeInvoice') === 'on'
  data.includeDistanceHomeopathy = formData.get('includeDistanceHomeopathy') === 'on'
  data.consultationDate = formData.get('dateIssued')
  data.items = JSON.parse(String(formData.get('itemsJson') ?? '[]'))
  const testsJson = String(formData.get('recommendedTestsJson') ?? '[]')
  if (testsJson.length > 4000) throw new Error('Invalid recommended tests')
  data.recommendedTestKeys = JSON.parse(testsJson)
  return data
}

function safeConsultationError(error) {
  const message = error instanceof Error ? error.message : ''
  if (/Select at least one document/i.test(message)) return 'Select a prescription, an invoice, or both.'
  if (/amount/i.test(message)) return 'Enter an invoice amount greater than zero (up to two decimal places).'
  if (/service/i.test(message)) return 'Enter the service name for the invoice.'
  if (/date/i.test(message)) return 'Choose a valid consultation date.'
  if (/language/i.test(message)) return 'Choose the report language: English or Russian.'
  if (/client|patient name/i.test(message)) return 'Choose an existing client or complete the new client details.'
  if (/remedy|item|granules|times per day|potency/i.test(message)) return 'Choose a valid remedy and check the prescription fields.'
  return 'Documents could not be saved. Please try again. If the error persists, contact the site administrator.'
}

export async function createConsultationAction(previous, formData) {
  if (!await requireAdminRequest()) return { error: 'Please sign in before creating documents.' }
  if (!consultationSavingAvailable()) return { error: 'Document saving is unavailable in this review environment.' }
  const store = getPrescriptionStore()
  if (!store) return { error: 'Documents are temporarily unavailable. Please try again.' }
  let pair
  try {
    const data = input(formData)
    if (formData.get('clientMode') === 'new') data.newClient = { fullName: data.patientName, preferredLocale: data.languagePreference, email: formData.get('clientEmail') ?? '', phone: formData.get('clientPhone') ?? '' }
    else { data.clientId = String(formData.get('clientId') ?? ''); if (!data.clientId) throw new Error('Choose a client') }
    pair = await createConsultation(data, { store, requestId: String(formData.get('requestId') ?? '') }) }
  catch (error) { return { error: safeConsultationError(error) } }
  if (pair.recommendation) redirect(`/admin/consultations/${pair.recommendation.id}`)
  redirect(`/admin/payments/${pair.payment.id}`)
}

export async function updateConsultationAction(id, previous, formData) {
  if (!await requireAdminRequest()) return { error: 'Please sign in before saving.' }
  if (!consultationSavingAvailable()) return { error: 'Document saving is unavailable in this review environment.' }
  const store = getPrescriptionStore()
  const recommendation = store ? await store.findById(id) : undefined
  const payment = recommendation?.paymentDocumentId ? await store.findById(recommendation.paymentDocumentId) : undefined
  if (!recommendation || recommendation.kind === 'payment') return { error: 'Consultation unavailable.' }
  if (formData.get('recommendationRevision') !== recommendation.updatedAt ||
    (payment && formData.get('includeInvoice') === 'on' && formData.get('paymentRevision') !== payment.updatedAt)) {
    return { error: 'This consultation changed in another window. Reload before saving.' }
  }
  let values
  try {
    values=input(formData)
    // A routine re-save must never silently replace the language stored on the document.
    if (['ru', 'en'].includes(recommendation.languagePreference) &&
      values.languagePreference !== recommendation.languagePreference &&
      formData.get('languageChangeConfirmed') !== 'yes') {
      return { error: 'Report language changed unexpectedly. Reopen the editor and select the language explicitly.' }
    }
    await updateConsultation(recommendation,payment,values,{store})
  }
  catch (error) { return { error:safeConsultationError(error) } }
  redirect(`/admin/consultations/${id}`)
}

async function changeConsultationDocumentStatus(consultationId, documentId, status) {
  if (!await requireAdminRequest()) throw new Error('Unauthorized')
  const store = getPrescriptionStore()
  await changeDocumentStatus(store, consultationId, documentId, status)
  redirect(`/admin/consultations/${consultationId}`)
}

export async function revokeConsultationDocumentAction(consultationId, documentId) {
  return changeConsultationDocumentStatus(consultationId, documentId, 'revoked')
}

export async function reactivateConsultationDocumentAction(consultationId, documentId) {
  return changeConsultationDocumentStatus(consultationId, documentId, 'active')
}
