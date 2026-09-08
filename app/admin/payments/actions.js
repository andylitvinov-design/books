'use server'

import { redirect } from 'next/navigation'

import { createPaymentDocument, updatePaymentDocument } from '@/lib/documents/payment'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionStore } from '@/lib/prescriptions/store'

function paymentInput(formData) {
  return Object.fromEntries(['patientName', 'dateOfService', 'dateIssued', 'amount', 'currency', 'service', 'consultations', 'documentNumber', 'paymentStatus'].map((key) => [key, formData.get(key)]))
}

export async function createPaymentAction(consultationId, previousState, formData) {
  if (!await requireAdminRequest()) return { error: 'Please sign in before saving.' }
  const store = getPrescriptionStore()
  if (!store) return { error: 'Document storage is unavailable.' }
  const consultation = consultationId ? await store.findById(consultationId) : undefined
  if (consultationId && (!consultation || consultation.kind === 'payment')) return { error: 'Recommendation not found.' }
  if (consultation?.paymentDocumentId) redirect(`/admin/payments/${consultation.paymentDocumentId}`)
  let record
  try { record = createPaymentDocument({ ...paymentInput(formData), status: 'active' }) } catch (error) { return { error: error.message } }
  await store.save(record)
  if (consultationId) {
    const latest = await store.findById(consultationId)
    if (latest && latest.kind !== 'payment' && !latest.paymentDocumentId) {
      await store.save({ ...latest, paymentDocumentId: record.id, updatedAt: new Date().toISOString() }, latest)
    }
  }
  redirect(`/admin/payments/${record.id}`)
}

export async function updatePaymentAction(id, previousState, formData) {
  if (!await requireAdminRequest()) return { error: 'Please sign in before saving.' }
  const store = getPrescriptionStore()
  const existing = store ? await store.findById(id) : undefined
  if (!existing || existing.kind !== 'payment') return { error: 'Payment document not found.' }
  let record
  try { record = updatePaymentDocument(existing, { ...paymentInput(formData), status: existing.status, languagePreference: existing.languagePreference }) } catch (error) { return { error: error.message } }
  await store.save(record, existing)
  redirect(`/admin/payments/${record.id}`)
}

export async function markPaymentReceivedAction(id) {
  if (!await requireAdminRequest()) throw new Error('Unauthorized')
  const store = getPrescriptionStore()
  const existing = store ? await store.findById(id) : undefined
  if (!existing || existing.kind !== 'payment' || existing.status !== 'active') throw new Error('Payment document unavailable')
  const record = updatePaymentDocument(existing, { ...existing, amount: (existing.amount / 100).toFixed(2), paymentStatus: 'received' })
  await store.save(record, existing)
  redirect(`/admin/payments/${record.id}`)
}

async function changePaymentStatus(id, status) {
  if (!await requireAdminRequest()) throw new Error('Unauthorized')
  const store = getPrescriptionStore()
  const existing = store ? await store.findById(id) : undefined
  if (!existing || existing.kind !== 'payment') throw new Error('Payment document unavailable')
  const record = updatePaymentDocument(existing, { ...existing, amount: (existing.amount / 100).toFixed(2), status })
  // Both lifecycle transitions require a newly issued link; never revive old sessions.
  delete record.access
  await store.save(record, existing)
  redirect(`/admin/payments/${record.id}`)
}

export async function revokePaymentAccessAction(id) { return changePaymentStatus(id, 'revoked') }
export async function reactivatePaymentAction(id) { return changePaymentStatus(id, 'active') }
