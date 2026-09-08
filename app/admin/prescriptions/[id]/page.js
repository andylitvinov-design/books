import { notFound } from 'next/navigation'

import { PrescriptionForm } from '@/components/prescription-form'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionRemedyOptions } from '@/lib/prescriptions/service'
import { getPrescriptionStore } from '@/lib/prescriptions/store'

import { updatePrescriptionAction } from '../actions'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Edit recommendation' }

export default async function EditPrescriptionPage({ params }) {
  if (!await requireAdminRequest()) notFound()
  const { id } = await params
  const store = getPrescriptionStore()
  const prescription = store ? await store.findById(id) : undefined
  if (!prescription) notFound()
  const action = updatePrescriptionAction.bind(null, prescription.id)
  return <main className="prescription-admin-shell"><h1>Edit recommendation</h1><PrescriptionForm action={action} prescription={prescription} remedies={getPrescriptionRemedyOptions()} /></main>
}
