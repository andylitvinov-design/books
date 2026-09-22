'use server'
import { redirect } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { updateClient, assignLegacyConsultation } from '@/lib/clients/service'
import { rotateCabinetAccess, revokeCabinetAccess } from '@/lib/clients/access'
async function ownerStore() { if (!await requireAdminRequest()) throw new Error('Unavailable'); const store = getPrescriptionStore(); if (!store) throw new Error('Unavailable'); return store }
export async function editClientAction(id, data) {
  const store = await ownerStore(), current = await store.findClientById(id)
  const next = updateClient(current, Object.fromEntries(['fullName', 'preferredLocale', 'email', 'phone', 'notes', 'status'].map(k => [k, data.get(k)])))
  if (!await store.saveClientIfUnchanged(current, next)) throw new Error('Client changed. Reload before saving.')
  redirect(`/admin/clients/${id}`)
}
export async function rotateClientAction(id) { await rotateCabinetAccess(await ownerStore(), id); redirect(`/admin/clients/${id}`) }
export async function revokeClientAction(id) { await revokeCabinetAccess(await ownerStore(), id); redirect(`/admin/clients/${id}`) }
export async function assignLegacyAction(id, data) {
  const store = await ownerStore()
  const clientId = data.get('clientId')
  if (clientId) await assignLegacyConsultation(store, id, clientId === 'new' ? { newClient: { fullName: data.get('fullName'), preferredLocale: data.get('preferredLocale') } } : clientId, { requestId: data.get('requestId') })
  redirect('/admin/clients/legacy')
}
