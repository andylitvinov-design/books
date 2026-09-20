import { notFound } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
import { ConsultationResult as ResultScreen } from '@/components/consultation-result'
import { remedyCountLabel } from '@/lib/consultations/result-actions'
import { revokeConsultationDocumentAction, reactivateConsultationDocumentAction } from '../actions'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Documents ready', robots: { index: false, follow: false } }
export default async function ConsultationResult({ params }) {
  if (!await requireAdminRequest()) notFound()
  const { id } = await params
  const store = getPrescriptionStore()
  const recommendation = store ? await store.findById(id) : undefined
  const payment = recommendation?.paymentDocumentId ? await store.findById(recommendation.paymentDocumentId) : undefined
  if (!recommendation || recommendation.kind === 'payment' || !payment || payment.kind !== 'payment') notFound()
  const documents = [
    { record: payment, title: 'PAYMENT DOCUMENT', description: `${payment.paymentStatus === 'received' ? 'Receipt' : 'Invoice'} · ${payment.currency} ${(payment.amount / 100).toFixed(2)}`, editHref: `/admin/payments/${payment.id}#edit-payment`, editLabel: 'Edit payment' },
    { record: recommendation, title: 'HOMEOPATHIC RECOMMENDATION', description: remedyCountLabel(recommendation.items.length), editHref: `/admin/prescriptions/${recommendation.id}#edit-recommendation`, editLabel: 'Edit recommendation' },
  ].map(({ record, ...display }) => ({ ...display, id: record.id, active: record.status === 'active', revoke: revokeConsultationDocumentAction.bind(null, id, record.id), reactivate: reactivateConsultationDocumentAction.bind(null, id, record.id) }))
  return <main className="prescription-admin-shell consultation-result">
    <PrescriptionAdminHeader title="Documents ready" />
    <ResultScreen patientName={recommendation.patientName} dateIssued={recommendation.dateIssued} languagePreference={recommendation.languagePreference} documents={documents} />
  </main>
}
