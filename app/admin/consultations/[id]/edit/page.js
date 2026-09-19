import { notFound } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionRemedyOptions } from '@/lib/prescriptions/service'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { ConsultationForm } from '@/components/consultation-form'
import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
import { updateConsultationAction } from '../../actions'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Edit consultation', robots: { index: false, follow: false } }
export default async function EditConsultation({ params }) {
  if (!await requireAdminRequest()) notFound()
  const { id } = await params
  const store = getPrescriptionStore()
  const consultation = store ? await store.findById(id) : undefined
  const payment = consultation?.paymentDocumentId ? await store.findById(consultation.paymentDocumentId) : undefined
  if (!consultation || consultation.kind === 'payment' || !payment) notFound()
  return <main className="prescription-admin-shell"><PrescriptionAdminHeader title="Edit consultation" /><ConsultationForm action={updateConsultationAction.bind(null, id)} remedies={getPrescriptionRemedyOptions()} consultation={consultation} payment={payment} /></main>
}
