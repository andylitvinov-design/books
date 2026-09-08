import { notFound } from 'next/navigation'

import { PrescriptionForm } from '@/components/prescription-form'
import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
import { PrescriptionOwnerActions } from '@/components/prescription-owner-actions'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionRemedyOptions } from '@/lib/prescriptions/service'
import { getPrescriptionStore } from '@/lib/prescriptions/store'

import { revokePrescriptionAction, updatePrescriptionAction } from '../actions'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Edit recommendation' }

export default async function EditPrescriptionPage({ params }) {
  if (!await requireAdminRequest()) notFound()
  const { id } = await params
  const store = getPrescriptionStore()
  const prescription = store ? await store.findById(id) : undefined
  if (!prescription) notFound()
  const action = updatePrescriptionAction.bind(null, prescription.id)
  const revokeAction = revokePrescriptionAction.bind(null, prescription.id)
  const clientPath = prescription.status === 'active' ? `/en/prescriptions/${prescription.publicId}` : undefined
  return (
    <main className="prescription-admin-shell">
      <PrescriptionAdminHeader title="Prescription" description="The client receives only the finished document and its secure link." />
      {clientPath
        ? <PrescriptionOwnerActions clientPath={clientPath} pdfPath={`/api/prescriptions/${prescription.publicId}/pdf?locale=en`} editPath={`/admin/prescriptions/${prescription.id}`} revokeAction={revokeAction} />
        : <section className="prescription-owner-unavailable"><h2>Client link revoked</h2><p>This link no longer provides client access. Create a new prescription to share an updated document.</p></section>}
      <PrescriptionForm action={action} prescription={prescription} remedies={getPrescriptionRemedyOptions()} submitLabel="Save changes" />
    </main>
  )
}
