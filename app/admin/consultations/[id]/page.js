import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
import { ConsultationDocumentActions } from '@/components/consultation-document-actions'
import { revokeConsultationDocumentAction } from '../actions'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Documents ready', robots: { index: false, follow: false } }
export default async function ConsultationResult({ params }) {
  if (!await requireAdminRequest()) notFound()
  const { id } = await params
  const store = getPrescriptionStore()
  const recommendation = store ? await store.findById(id) : undefined
  const payment = recommendation?.paymentDocumentId ? await store.findById(recommendation.paymentDocumentId) : undefined
  if (!recommendation || recommendation.kind === 'payment' || !payment || payment.kind !== 'payment') notFound()
  const locale = recommendation.languagePreference === 'ru' ? 'ru' : 'en'
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${recommendation.dateIssued}T12:00:00Z`))
  return <main className="prescription-admin-shell consultation-result">
    <PrescriptionAdminHeader title="✓ DOCUMENTS READY" />
    <h2>{recommendation.patientName}</h2><p>{date}</p>
    {[{ record: payment, title: 'PAYMENT DOCUMENT', description: `${payment.paymentStatus === 'received' ? 'Receipt' : 'Invoice'} · ${payment.currency} ${(payment.amount / 100).toFixed(2)}` }, { record: recommendation, title: 'HOMEOPATHIC RECOMMENDATION', description: `${recommendation.items.length} remedies` }].map(({ record, title, description }) => <section className="admin-document-panel" key={`${record.id}-${record.status}`} aria-label={title}>
      <h2>{title}</h2><p>{description}</p>
      <ConsultationDocumentActions recordId={record.id} locale={locale} active={record.status === 'active'} />
      {record.status === 'active' && <details><summary>Access settings</summary><form action={revokeConsultationDocumentAction.bind(null, id, record.id)}><button type="submit">Revoke client access</button></form></details>}
    </section>)}
    <p><Link href={`/admin/consultations/${id}/edit`}>Edit consultation</Link></p>
  </main>
}
