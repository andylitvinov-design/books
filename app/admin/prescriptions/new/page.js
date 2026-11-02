import { redirect } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'New client report' }

// All new client recommendations share the consultation report builder.
export default async function NewPrescriptionPage() {
  if (!await requireAdminRequest()) redirect('/admin/login')
  redirect('/admin/consultations/new')
}
