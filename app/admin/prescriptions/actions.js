'use server'

import { redirect } from 'next/navigation'

import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { createPrescription, updatePrescription } from '@/lib/prescriptions/service'
import { getPrescriptionStore } from '@/lib/prescriptions/store'

const ownerDefaults = {
  languagePreference: 'bilingual',
  practitionerName: 'Andrii Litvinov',
  practitionerRole: 'Homeopathy / Integrative Practice',
  practitionerBackground: 'Professional background: Ukraine',
}

function formInput(formData, existing) {
  let items
  try { items = JSON.parse(String(formData.get('itemsJson') ?? '[]')) } catch { throw new Error('Invalid remedy item data') }
  return {
    patientName: formData.get('patientName'), dateIssued: formData.get('dateIssued'),
    languagePreference: existing?.languagePreference ?? ownerDefaults.languagePreference,
    practitionerName: existing?.practitionerName ?? ownerDefaults.practitionerName,
    practitionerRole: existing?.practitionerRole ?? ownerDefaults.practitionerRole,
    practitionerBackground: existing?.practitionerBackground ?? ownerDefaults.practitionerBackground,
    practitionerContact: existing?.practitionerContact,
    generalInstructions: formData.get('generalInstructions'), internalNotes: existing?.internalNotes,
    status: existing?.status ?? 'active', items,
  }
}

async function save(existing, formData) {
  if (!await requireAdminRequest()) throw new Error('Unauthorized')
  const store = getPrescriptionStore()
  if (!store) throw new Error('Prescription storage is not configured')
  const input = formInput(formData, existing)
  const record = existing ? updatePrescription(existing, input) : createPrescription(input)
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

export async function revokePrescriptionAction(id) {
  if (!await requireAdminRequest()) throw new Error('Unauthorized')
  const store = getPrescriptionStore()
  const existing = store ? await store.findById(id) : undefined
  if (!existing) throw new Error('Prescription not found')
  await store.save(updatePrescription(existing, { ...existing, status: 'revoked' }))
  redirect(`/admin/prescriptions/${id}`)
}
