import { notFound, redirect } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getConsultationRemedyOptions } from '@/lib/remedies/registry'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { ConsultationForm } from '@/components/consultation-form'
import { ReportVideoMaterialsEditor } from '@/components/report-video-materials-editor'
import { deliveryEnabled } from '@/lib/clients/delivery-model'
import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
import { updateConsultationAction } from '../../actions'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Edit consultation', robots: { index: false, follow: false } }
export default async function EditConsultation({ params }) {
  if (!await requireAdminRequest()) redirect('/admin/login')
  const { id } = await params
  const store = getPrescriptionStore()
  const consultation = store ? await store.findById(id) : undefined
  const payment = consultation?.paymentDocumentId ? await store.findById(consultation.paymentDocumentId) : undefined
  if (!consultation || consultation.kind === 'payment' || (consultation.paymentDocumentId && payment?.kind !== 'payment')) notFound()
  return <main className="prescription-admin-shell consultation-edit-shell consultation-studio-shell"><PrescriptionAdminHeader title="Edit consultation" />{deliveryEnabled() && consultation.clientId && consultation.status === 'active' &&
  <div style={{maxWidth:920,margin:'24px auto'}}>
    <ReportVideoMaterialsEditor clientId={consultation.clientId} documentId={consultation.id}
      sourceConsultationId={consultation.consultationId||consultation.id}
      locale={consultation.languagePreference==='ru'?'ru':'en'}/>
  </div>}<ConsultationForm action={updateConsultationAction.bind(null, id)} remedies={getConsultationRemedyOptions()} consultation={consultation} payment={payment} /></main>
}
