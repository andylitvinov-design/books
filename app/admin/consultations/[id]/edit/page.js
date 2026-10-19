import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getConsultationRemedyOptions } from '@/lib/remedies/registry'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { ConsultationForm } from '@/components/consultation-form'
import { getRecommendedTestOptions } from '@/lib/consultations/recommended-tests'
import { ReportVideoMaterialsEditor } from '@/components/report-video-materials-editor'
import { SessionPhotoUploader } from '@/components/session-photo-uploader'
import { AdminDocumentPanels } from '@/components/admin-document-panels'
import { deliveryEnabled } from '@/lib/clients/delivery-model'
import { inspectSavedClientReportPublication } from '@/lib/clients/report-auto-publish'
import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
import { updateConsultationAction } from '../../actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Edit client report', robots: { index: false, follow: false } }

export default async function EditConsultation({ params }) {
  if (!await requireAdminRequest()) redirect('/admin/login')
  const { id } = await params
  const store = getPrescriptionStore()
  const consultation = store ? await store.findById(id) : undefined
  const payment = consultation?.paymentDocumentId ? await store.findById(consultation.paymentDocumentId) : undefined
  if (!consultation || consultation.kind === 'payment' ||
      (consultation.paymentDocumentId && payment?.kind !== 'payment')) notFound()
  const publication = await inspectSavedClientReportPublication(consultation, store)
  const ru = consultation.languagePreference === 'ru'
  const mediaEditorProps = deliveryEnabled() && consultation.clientId && consultation.status === 'active'
    ? { clientId: consultation.clientId, documentId: consultation.id,
        sourceConsultationId: consultation.consultationId || consultation.id,
        locale: ru ? 'ru' : 'en' } : null

  return <main className="prescription-admin-shell consultation-edit-shell consultation-studio-shell">
    <PrescriptionAdminHeader
      title={{ ru: 'Редактировать отчёт клиента', en: 'Edit client report' }}
      description={{
        ru: 'Тот же конструктор, что и при создании отчёта. Изменения сохраняются в исходном документе.',
        en: 'The same report builder used for a new report. Changes update the existing document.',
      }}
    />
    {publication !== 'skipped' &&
      <section className={'report-save-publication-state ' +
        (publication === 'published' ? 'report-save-publication-state--success' : '')} role="status">
        <strong>{publication === 'published'
          ? (ru ? 'Отчёт опубликован для клиента' : 'Report published privately')
          : publication === 'unlinked'
            ? (ru ? 'Отчёт ещё не привязан к клиенту' : 'Report is not linked to a client')
            : (ru ? 'Публикация отчёта пока не подтверждена' : 'Report publication not yet confirmed')}</strong>
        <p>{ru
          ? 'Изменения редактора требуют сохранения и отдельной проверки публикации для клиента.'
          : 'Edits must be saved and their private client publication verified separately.'}</p>
      </section>}
    <div className="consultation-edit-return">
      <Link href={`/admin/consultations/${id}`} prefetch={false}>← Назад к документам / Back to documents</Link>
    </div>
    {mediaEditorProps && <section className="consultation-edit-voice" aria-label={ru?'Голосовое сообщение':'Voice message'}>
      <ReportVideoMaterialsEditor {...mediaEditorProps} placement="audio" />
    </section>}
    <section id="edit-recommendation">
      <ConsultationForm
        action={updateConsultationAction.bind(null, id)}
        remedies={getConsultationRemedyOptions()}
        consultation={consultation}
        payment={payment}
        recommendedTestOptions={{ en: getRecommendedTestOptions('en'), ru: getRecommendedTestOptions('ru') }}
      />
    </section>
    {mediaEditorProps && <section className="consultation-edit-materials" aria-label="Client report materials">
      <ReportVideoMaterialsEditor {...mediaEditorProps} placement="materials" />
      <SessionPhotoUploader clientId={consultation.clientId} documentId={consultation.id}
        locale={ru ? 'ru' : 'en'} />
    </section>}
    <details className="consultation-edit-document-links">
      <summary>Документы и доступ клиента / Documents and client access</summary>
      <AdminDocumentPanels prescription={consultation} payment={payment} />
    </details>
  </main>
}
