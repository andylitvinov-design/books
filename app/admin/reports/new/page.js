import { redirect } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { validUuid } from '@/lib/clients/delivery-model'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'New client report', robots: { index: false, follow: false } }

// The consultation constructor already provides client selection and all blocks.
export default async function NewClientReport({ searchParams }) {
  if (!await requireAdminRequest()) redirect('/admin/login')
  const query = await searchParams
  const clientId = typeof query?.clientId === 'string' ? query.clientId : ''
  redirect(validUuid(clientId)
    ? `/admin/consultations/new?clientId=${encodeURIComponent(clientId)}`
    : '/admin/consultations/new')
}
