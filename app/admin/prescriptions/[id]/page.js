import { notFound } from 'next/navigation'

import { PrescriptionForm } from '@/components/prescription-form'
import { AdminDocumentPanels } from '@/components/admin-document-panels'
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
  if (!prescription || prescription.kind === 'payment') notFound()
  const candidate = prescription.paymentDocumentId ? await store.findById(prescription.paymentDocumentId) : undefined
  const payment = candidate?.kind === 'payment' ? candidate : undefined
  const action = updatePrescriptionAction.bind(null, prescription.id)
  return <main className="prescription-admin-shell"><h1>Consultation documents</h1><AdminDocumentPanels prescription={prescription} payment={payment} /><section id="edit-recommendation"><h2>Edit recommendation</h2><PrescriptionForm action={action} prescription={prescription} remedies={getPrescriptionRemedyOptions()} /></section></main>
}
