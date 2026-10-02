import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { isClientId } from '@/lib/clients/service'
import { assessmentText } from '@/lib/clients/assessment-copy'
import { AssessmentEditor, AssessmentStateActions } from '@/components/assessment-editor'
import { AssessmentReading } from '@/components/assessment-reading'
import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
import { saveAssessmentAction, changeAssessmentStateAction } from '../../actions'
import { assessmentShareUrl } from '@/lib/clients/assessment-share'
import { metadataBaseFor } from '@/data/site-metadata'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Tests & Results — private', robots: { index: false, follow: false } }
export default async function EditAssessment({ params }) {
  if (!await requireAdminRequest()) redirect('/admin/login')
  const { id, assessmentId } = await params
  if (!isClientId(id) || !isClientId(assessmentId)) notFound()
  const store = getPrescriptionStore(), client = await store?.findClientById(id), record = await store?.findClientAssessment(assessmentId)
  if (!client || !record || record.clientId !== id) notFound()
  const locale = client.preferredLocale, t = assessmentText(locale)
  const docs = (await store.listClientDocuments(id)).filter(r => r.clientId === id && r.status === 'active').map(r => ({ id: r.id, label: `${r.dateIssued} · ${r.kind === 'payment' ? (locale === 'ru' ? 'Квитанция' : 'Receipt') : r.kind === 'report' ? (locale === 'ru' ? 'Отчёт' : 'Report') : (locale === 'ru' ? 'Рекомендация' : 'Recommendation')}` }))
  const shareUrl = record.status === 'shared'
    ? assessmentShareUrl(record, locale, metadataBaseFor().origin)
    : undefined
  return <main className="prescription-admin-shell"><PrescriptionAdminHeader title={t.title} description={client.fullName} /><Link prefetch={false} className="library-back-link" href={`/admin/clients/${id}`}>← {t.back}</Link><p>{t.status}: {t[record.status]}</p>{store.assessmentStorage === 'memory' && <p className="assessment-notice">{t.memory}</p>}
    <AssessmentStateActions key={`${record.revision}-actions`} action={changeAssessmentStateAction.bind(null, id, assessmentId)} status={record.status} revision={record.revision} locale={locale} />
    {shareUrl && <section className="assessment-notice"><strong>{locale === 'ru' ? 'Прямая приватная ссылка на отчёт' : 'Direct private report link'}</strong><p>{locale === 'ru' ? 'По этой ссылке человек сразу увидит только этот отчёт, без имени и без входа.' : 'This link opens only this report immediately, without a name or sign-in.'}</p><a href={shareUrl} target="_blank" rel="noreferrer">{shareUrl}</a></section>}
    {record.status === 'draft' ? <AssessmentEditor key={record.revision} action={saveAssessmentAction.bind(null, id, assessmentId)} record={record} documents={docs} locale={locale} /> : <AssessmentReading record={record} locale={locale} />}
  </main>
}
