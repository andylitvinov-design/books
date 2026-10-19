'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { createClient, normalizeSharedMaterial, updateClient, assignLegacyConsultation, isClientId } from '@/lib/clients/service'
import { rotateCabinetAccess, revokeCabinetAccess } from '@/lib/clients/access'
import { appEnabled, getAppConfig } from '@/lib/app/config'
import { transaction } from '@/lib/app/database'
async function ownerStore() { if (!await requireAdminRequest()) throw new Error('Unavailable'); const store = getPrescriptionStore(); if (!store) throw new Error('Unavailable'); return store }
export async function createClientAction(data) {
  const store = await ownerStore()
  const client = createClient({
    fullName: data.get('fullName'),
    preferredLocale: data.get('preferredLocale'),
    email: data.get('email'),
    phone: data.get('phone'),
  })
  await store.saveClient(client)
  redirect(`/admin/consultations/new?clientId=${encodeURIComponent(client.id)}&created=1`)
}

export async function editClientAction(id, data) {
  const store = await ownerStore(), current = await store.findClientById(id)
  const next = updateClient(current, Object.fromEntries(['fullName', 'preferredLocale', 'email', 'phone', 'notes', 'status'].map(k => [k, data.get(k)])))
  if (!await store.saveClientIfUnchanged(current, next)) throw new Error('Client changed. Reload before saving.')
  redirect(`/admin/clients/${id}`)
}
export async function addClientMaterialAction(id, data) {
  const store = await ownerStore()
  const material = normalizeSharedMaterial({
    title: data.get('title'), url: data.get('url'),
  })
  for (let attempt = 0; attempt < 4; attempt++) {
    const current = await store.findClientById(id)
    if (!current || current.status !== 'active') throw new Error('Active client required')
    const next = updateClient(current, { sharedMaterials: [...(current.sharedMaterials ?? []), material] })
    if (await store.saveClientIfUnchanged(current, next)) redirect('/admin/clients/' + id)
  }
  throw new Error('Client changed. Reload and try again.')
}

export async function removeClientMaterialAction(id, materialId) {
  const store = await ownerStore()
  for (let attempt = 0; attempt < 4; attempt++) {
    const current = await store.findClientById(id)
    if (!current || current.status !== 'active') throw new Error('Active client required')
    const materials = current.sharedMaterials ?? []
    if (!materials.some(material => material.id === materialId)) throw new Error('Material not found')
    const next = updateClient(current, { sharedMaterials: materials.filter(material => material.id !== materialId) })
    if (await store.saveClientIfUnchanged(current, next)) redirect('/admin/clients/' + id)
  }
  throw new Error('Client changed. Reload and try again.')
}

export async function rotateClientAction(id) { await rotateCabinetAccess(await ownerStore(), id); redirect(`/admin/clients/${id}`) }
export async function revokeClientAction(id) { await revokeCabinetAccess(await ownerStore(), id); redirect(`/admin/clients/${id}`) }
export async function assignLegacyAction(id, data) {
  const store = await ownerStore()
  const clientId = data.get('clientId')
  if (clientId) await assignLegacyConsultation(store, id, clientId === 'new' ? { newClient: { fullName: data.get('fullName'), preferredLocale: data.get('preferredLocale') } } : clientId, { requestId: data.get('requestId') })
  redirect('/admin/clients/legacy')
}

/** Permanent deletion of an unlinked client. Active Google accounts, delivered
 * sessions and received invoices are deliberately protected from this action. */
export async function deleteClientAction(id, revision, expectedDocumentCount, expectedAssessmentCount, formData) {
  const store = await ownerStore()
  if (!isClientId(id)) redirect('/admin/clients')
  const client = await store.findClientById(id)
  if (!client || client.updatedAt !== revision ||
    typeof formData.get('confirmation') !== 'string' ||
    formData.get('confirmation') !== client.fullName) {
    redirect('/admin/clients/' + id + '?delete=changed')
  }
  const docs = await store.listClientDocuments(id)
  if (docs.some(doc => doc.kind === 'payment' && doc.paymentStatus === 'received')) {
    redirect('/admin/clients/' + id + '?delete=billing')
  }
  if (appEnabled()) {
    let linked
    try {
      linked = await transaction(getAppConfig(), null, async db => (
        await db.query(`
          select
            exists(select 1 from app_private.client_account_bindings where legacy_client_id=$1) as account,
            exists(select 1 from app_private.client_delivery_sessions where legacy_client_id=$1) as deliveries
        `, [id])
      ).rows[0], { server: true })
    } catch {
      redirect('/admin/clients/' + id + '?delete=unavailable')
    }
    if (linked.account || linked.deliveries) redirect('/admin/clients/' + id + '?delete=linked')
  }
  const removed = await store.deleteClientIfUnchanged(client, { expectedDocumentCount, expectedAssessmentCount })
  if (!removed) redirect('/admin/clients/' + id + '?delete=changed')
  revalidatePath('/admin/clients')
  revalidatePath('/admin/reports')
  redirect('/admin/clients?removed=1')
}
