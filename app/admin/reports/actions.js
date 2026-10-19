'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { isClientId } from '@/lib/clients/service'

export async function deleteSavedReportAction(reportId, revision, location = {}) {
  if (!await requireAdminRequest()) redirect('/admin/login')
  const params = new URLSearchParams({
    ...(typeof location.q === 'string' && location.q ? { q: location.q.slice(0, 120) } : {}),
    sort: location.sort === 'client' ? 'client' : 'date',
    ...(Number.isInteger(location.page) && location.page > 1 ? { page: String(location.page) } : {}),
  })
  const destination = notice => '/admin/reports?' + new URLSearchParams({ ...Object.fromEntries(params), notice }).toString()
  if (!isClientId(reportId) || typeof revision !== 'string') redirect(destination('changed'))
  const store = getPrescriptionStore()
  if (!store) redirect(destination('unavailable'))
  const record = await store.findById(reportId)
  if (!record || record.kind === 'payment' || !isClientId(record.clientId) || record.updatedAt !== revision) {
    redirect(destination('changed'))
  }
  const deleted = await store.deleteClientReportIfUnchanged(record)
  if (!deleted) redirect(destination('changed'))
  revalidatePath('/admin/reports')
  revalidatePath('/admin/clients/' + encodeURIComponent(record.clientId))
  redirect(destination('deleted'))
}
