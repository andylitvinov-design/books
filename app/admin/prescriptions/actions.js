'use server'

import { redirect } from 'next/navigation'

import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { createPrescription, updatePrescription } from '@/lib/prescriptions/service'
import { getPrescriptionStore } from '@/lib/prescriptions/store'

function formInput(formData) {
  let items
  try { items = JSON.parse(String(formData.get('itemsJson') ?? '[]')) } catch { throw new Error('Invalid remedy item data') }
  return {
    patientName: formData.get('patientName'), patientDob: formData.get('patientDob'), dateIssued: formData.get('dateIssued'),
    languagePreference: formData.get('languagePreference'), practitionerName: formData.get('practitionerName'), practitionerRole: formData.get('practitionerRole'),
    practitionerBackground: formData.get('practitionerBackground'), practitionerContact: formData.get('practitionerContact'), generalInstructions: formData.get('generalInstructions'),
    internalNotes: formData.get('internalNotes'), status: formData.get('status'), items,
  }
}

async function save(existing, formData) {
  if (!await requireAdminRequest()) throw new Error('Unauthorized')
  const store = getPrescriptionStore()
  if (!store) throw new Error('Prescription storage is not configured')
  const record = existing ? updatePrescription(existing, formInput(formData)) : createPrescription(formInput(formData))
  await store.save(record)
  redirect(`/admin/prescriptions/${record.id}`)
}

export async function createPrescriptionAction(formData) { return save(undefined, formData) }
export async function updatePrescriptionAction(id, formData) {
  if (!await requireAdminRequest()) throw new Error('Unauthorized')
  const store = getPrescriptionStore()
  const existing = store ? await store.findById(id) : undefined
  if (!existing) throw new Error('Prescription not found')
  return save(existing, formData)
}
