import { notFound, redirect } from 'next/navigation'

import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionStore } from '@/lib/prescriptions/store'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Edit client report' }

// Legacy document edit links must open the same constructor as New consultation.
// Keep the original document ID, status, client association and history.
export default async function EditPrescriptionPage({ params }) {
  if (!await requireAdminRequest()) redirect('/admin/login')
  const { id } = await params
  const store = getPrescriptionStore()
  const prescription = store ? await store.findById(id) : undefined
  if (!prescription || prescription.kind === 'payment') notFound()
  redirect(`/admin/consultations/${encodeURIComponent(prescription.id)}/edit#edit-recommendation`)
}
