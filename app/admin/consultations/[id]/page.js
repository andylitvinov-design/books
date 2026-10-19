import { notFound, redirect } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { logout } from '@/app/admin/logout/actions'
import { ConsultationResult as ResultScreen } from '@/components/consultation-result'
import { SessionPhotoUploader } from '@/components/session-photo-uploader'
import { deliveryEnabled } from '@/lib/clients/delivery-model'
import { inspectSavedClientReportPublication } from '@/lib/clients/report-auto-publish'
import { revokeConsultationDocumentAction, reactivateConsultationDocumentAction } from '../actions'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Documents ready', robots: { index: false, follow: false } }
export default async function ConsultationResult({ params, searchParams }) {
  if (!await requireAdminRequest()) redirect('/admin/login')
  const { id } = await params
  const query = await searchParams
  const materialNotice = ['staged', 'review'].includes(query?.materials) ? query.materials : null
  const store = getPrescriptionStore()
  const recommendation = store ? await store.findById(id) : undefined
  const payment = recommendation?.paymentDocumentId ? await store.findById(recommendation.paymentDocumentId) : undefined
  if (!recommendation || recommendation.kind === 'payment' || (recommendation.paymentDocumentId && payment?.kind !== 'payment')) notFound()
  const publication=await inspectSavedClientReportPublication(recommendation,store)
  const documents = [
    ...(payment ? [{ record: payment, kind: 'payment', paymentStatus: payment.paymentStatus, currency: payment.currency, amount: payment.amount, editHref: `/admin/payments/${payment.id}#edit-payment` }] : []),
    { record: recommendation, kind: 'recommendation', recommendationType: recommendation.recommendationType, count: recommendation.items.length, editHref: `/admin/consultations/${recommendation.id}/edit#edit-recommendation` },
  ].map(({ record, ...display }) => ({ ...display, id: record.id, active: record.status === 'active', revoke: revokeConsultationDocumentAction.bind(null, id, record.id), reactivate: reactivateConsultationDocumentAction.bind(null, id, record.id) }))
  return <main className="prescription-admin-shell consultation-result">
    {materialNotice && <section className="report-save-publication-state" role="status">
      <strong>{materialNotice === 'staged'
        ? 'Материалы сохранены в черновике / Materials saved to draft'
        : 'Проверьте прикрепление материалов / Review report materials'}</strong>
      <p>{materialNotice === 'staged'
        ? 'Выбор сохранён. Клиент увидит материалы только после проверки и публикации сессии.'
        : 'Отчёт создан, но прикрепление материалов не подтверждено. Откройте редактор и повторите выбор. Второй отчёт создавать не нужно.'}</p>
      {recommendation.clientId && <a href={`/admin/consultations/${id}/edit#report-video-materials-editor`}>
        {materialNotice === 'staged' ? 'Проверить материалы →' : 'Повторить выбор →'}</a>}
    </section>}
    <ResultScreen clientId={recommendation.clientId} logout={logout}
      patientName={recommendation.patientName} dateIssued={recommendation.dateIssued}
      languagePreference={recommendation.languagePreference} documents={documents}
      publication={publication}/>
    {deliveryEnabled() && recommendation.clientId && recommendation.status==='active' &&
      <div style={{maxWidth:850,margin:'22px auto'}}>
        <SessionPhotoUploader clientId={recommendation.clientId} documentId={recommendation.id}
          locale={recommendation.languagePreference==='ru'?'ru':'en'}/>
      </div>}
  </main>
}
