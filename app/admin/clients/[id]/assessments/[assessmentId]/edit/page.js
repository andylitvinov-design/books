import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { isClientId } from '@/lib/clients/service'
import { assessmentText } from '@/lib/clients/assessment-copy'
import { AssessmentEditor, AssessmentStateActions } from '@/components/assessment-editor'
import { AssessmentReading } from '@/components/assessment-reading'
import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
import {
  changeAssessmentStateAction,
  changeReportLinkStateAction,
  issueReportLinkAction,
  rotateReportLinkAction,
  saveAssessmentAction,
} from '../../actions'
import { appEnabled, getAppConfig } from '@/lib/app/config'
import { listReportGrants } from '@/lib/app/report-flow'
import {
  ReportDeliveryCreate,
  ReportDeliveryGrant,
} from '@/components/report-delivery-controls'
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
  let grants = [], deliveryAvailable = false
  if (record.status === 'shared' && appEnabled()) {
    try {
      grants = await listReportGrants(getAppConfig(), assessmentId)
      deliveryAvailable = true
    } catch {
      deliveryAvailable = false
    }
  }
  return <main className="prescription-admin-shell"><PrescriptionAdminHeader title={t.title} description={client.fullName} /><Link prefetch={false} className="library-back-link" href={`/admin/clients/${id}`}>← {t.back}</Link><p>{t.status}: {t[record.status]}</p>{store.assessmentStorage === 'memory' && <p className="assessment-notice">{t.memory}</p>}
    <AssessmentStateActions key={`${record.revision}-actions`} action={changeAssessmentStateAction.bind(null, id, assessmentId)} status={record.status} revision={record.revision} locale={locale} />
    {record.status === 'shared' && deliveryAvailable && <>
      <ReportDeliveryCreate action={issueReportLinkAction.bind(null, id, assessmentId)} locale={locale} />
      {grants.map((grant) => <ReportDeliveryGrant
        key={grant.id}
        grant={grant}
        locale={locale}
        rotateAction={rotateReportLinkAction.bind(null, id, assessmentId, grant.id)}
        stateAction={changeReportLinkStateAction.bind(null, id, assessmentId, grant.id)}
      />)}
    </>}
    {record.status === 'shared' && !deliveryAvailable && <p className="assessment-notice">{locale === 'ru' ? 'Новые report-only ссылки пока недоступны в этом окружении.' : 'New report-only links are not available in this environment yet.'}</p>}
    {record.status === 'draft' ? <AssessmentEditor key={record.revision} action={saveAssessmentAction.bind(null, id, assessmentId)} record={record} documents={docs} locale={locale} /> : <AssessmentReading record={record} locale={locale} />}
  </main>
}
