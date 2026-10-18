import { deliveryEnabled } from '@/lib/clients/delivery-model'
import { inspectSavedClientReportPublication } from '@/lib/clients/report-auto-publish'
import { ReportVideoMaterialsEditor } from '@/components/report-video-materials-editor'
import { notFound, redirect } from 'next/navigation'

import { PrescriptionForm } from '@/components/prescription-form'
import { getReportTestOptions } from '@/lib/assessments/report-recommended-tests'
import { AdminDocumentPanels } from '@/components/admin-document-panels'
import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getConsultationRemedyOptions } from '@/lib/remedies/registry'
import { getPrescriptionStore } from '@/lib/prescriptions/store'

import { updatePrescriptionAction } from '../actions'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Edit recommendation' }

export default async function EditPrescriptionPage({ params }) {
  if (!await requireAdminRequest()) redirect('/admin/login')
  const { id } = await params
  const store = getPrescriptionStore()
  const prescription = store ? await store.findById(id) : undefined
  if (!prescription || prescription.kind === 'payment') notFound()
  const candidate = prescription.paymentDocumentId ? await store.findById(prescription.paymentDocumentId) : undefined
  const payment = candidate?.kind === 'payment' ? candidate : undefined
  const action = updatePrescriptionAction.bind(null,prescription.id)
  const publication=await inspectSavedClientReportPublication(prescription,store)
  const ru=prescription.languagePreference==='ru'
  return <main className="prescription-admin-shell"><PrescriptionAdminHeader title="Consultation documents" description="Create and share the payment document and recommendation separately." />
  {publication!=='skipped'&&<section className={'report-save-publication-state '+(publication==='published'?'report-save-publication-state--success':'')}
    role="status">
    <strong>{publication==='published'?(ru?'Сохранённый отчёт опубликован для клиента':'Saved report published privately'):
      publication==='unlinked'?(ru?'Отчёт не привязан к клиенту':'Report is not linked to a client'):
      (ru?'Отчёт сохранён. Публикация пока не подтверждена':'Report saved. Private publication not yet confirmed')}</strong>
    <p>{publication==='published'?(ru?'Версия отчёта опубликована. Материалы черновика требуют отдельной проверки и публикации.':'The report version is published. Draft materials require separate review and Publish.'):
      publication==='unlinked'?(ru?'Для приватной страницы создайте консультацию с выбранным клиентом.':'Use a consultation linked to a client for private sharing.'):
      (ru?'Проверьте клиентскую сессию ниже, затем нажмите «Опубликовать».':'Review the client session below, then explicitly Publish.')}</p>

  </section>}{deliveryEnabled() && prescription.clientId && prescription.kind !== 'report' && prescription.status === 'active' && <ReportVideoMaterialsEditor key={prescription.id} clientId={prescription.clientId}
  documentId={prescription.id} sourceConsultationId={prescription.consultationId||prescription.id}
  locale={prescription.languagePreference==='ru'?'ru':'en'} />}<AdminDocumentPanels prescription={prescription} payment={payment} /><section id="edit-recommendation"><h2>Edit recommendation</h2><PrescriptionForm action={action} prescription={prescription} remedies={getConsultationRemedyOptions()} testOptions={getReportTestOptions()} /></section></main>
}
