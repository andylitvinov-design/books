import { notFound, redirect } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { logout } from '@/app/admin/logout/actions'
import { ConsultationResult as ResultScreen } from '@/components/consultation-result'
import { revokeConsultationDocumentAction, reactivateConsultationDocumentAction } from '../actions'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Documents ready', robots: { index: false, follow: false } }
export default async function ConsultationResult({ params }) {
  if (!await requireAdminRequest()) redirect('/admin/login')
  const { id } = await params
  const store = getPrescriptionStore()
  const recommendation = store ? await store.findById(id) : undefined
  const payment = recommendation?.paymentDocumentId ? await store.findById(recommendation.paymentDocumentId) : undefined
  if (!recommendation || recommendation.kind === 'payment' || !payment || payment.kind !== 'payment') notFound()
  const documents = [
    { record: payment, kind: 'payment', paymentStatus: payment.paymentStatus, currency: payment.currency, amount: payment.amount, editHref: `/admin/payments/${payment.id}#edit-payment` },
    { record: recommendation, kind: 'recommendation', recommendationType: recommendation.recommendationType, count: recommendation.items.length, editHref: `/admin/prescriptions/${recommendation.id}#edit-recommendation` },
  ].map(({ record, ...display }) => ({ ...display, id: record.id, active: record.status === 'active', revoke: revokeConsultationDocumentAction.bind(null, id, record.id), reactivate: reactivateConsultationDocumentAction.bind(null, id, record.id) }))
  return <main className="prescription-admin-shell consultation-result">
    <ResultScreen clientId={recommendation.clientId} logout={logout} patientName={recommendation.patientName} dateIssued={recommendation.dateIssued} languagePreference={recommendation.languagePreference} documents={documents} />
  </main>
}
