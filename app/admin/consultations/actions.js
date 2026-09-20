'use server'

import { redirect } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { consultationSavingAvailable } from '@/lib/consultations/availability'
import { changeConsultationDocumentStatus as changeDocumentStatus } from '@/lib/consultations/lifecycle'
import { createConsultation, updateConsultation } from '@/lib/consultations/service'

function input(formData) {
  const fields = ['patientName', 'languagePreference', 'amount', 'currency', 'service', 'paymentStatus', 'paymentMethod', 'documentNumber', 'recommendationNumber', 'generalInstructions', 'followUp']
  const data = Object.fromEntries(fields.map((key) => [key, formData.get(key) ?? undefined]))
  data.consultationDate = formData.get('dateIssued')
  data.items = JSON.parse(String(formData.get('itemsJson') ?? '[]'))
  return data
}

export async function createConsultationAction(previous, formData) {
  if (!await requireAdminRequest()) return { error: 'Please sign in before creating documents.' }
  if (!consultationSavingAvailable()) return { error: 'Document saving is unavailable in this review environment.' }
  const store = getPrescriptionStore()
  if (!store) return { error: 'Documents are temporarily unavailable. Please try again.' }
  let pair
  try { pair = await createConsultation(input(formData), { store, requestId: String(formData.get('requestId') ?? '') }) }
  catch { return { error: 'Documents could not be saved. Check the client, date, remedies and payment settings, then try again.' } }
  redirect(`/admin/consultations/${pair.recommendation.id}`)
}

export async function updateConsultationAction(id, previous, formData) {
  if (!await requireAdminRequest()) return { error: 'Please sign in before saving.' }
  if (!consultationSavingAvailable()) return { error: 'Document saving is unavailable in this review environment.' }
  const store = getPrescriptionStore()
  const recommendation = store ? await store.findById(id) : undefined
  const payment = recommendation?.paymentDocumentId ? await store.findById(recommendation.paymentDocumentId) : undefined
  if (!recommendation || !payment) return { error: 'Consultation unavailable.' }
  if (formData.get('recommendationRevision') !== recommendation.updatedAt || formData.get('paymentRevision') !== payment.updatedAt) return { error: 'This consultation changed in another window. Reload before saving.' }
  try { await updateConsultation(recommendation, payment, input(formData), { store }) }
  catch { return { error: 'Changes could not be saved. Check the fields, or reload if this consultation changed in another window.' } }
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
