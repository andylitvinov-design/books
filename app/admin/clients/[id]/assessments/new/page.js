import { randomUUID } from 'node:crypto'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { isClientId } from '@/lib/clients/service'
import { assessmentText } from '@/lib/clients/assessment-copy'
import { AssessmentEditor } from '@/components/assessment-editor'
import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
import { saveAssessmentAction } from '../actions'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Tests & Results — private', robots: { index: false, follow: false } }
export default async function NewAssessment({ params, searchParams }) {
  if (!await requireAdminRequest()) redirect('/admin/login')
  const { id } = await params
  if (!isClientId(id)) notFound()
  const store = getPrescriptionStore(), client = await store?.findClientById(id)
  if (!client || client.status !== 'active' || !store.findClientAssessment) notFound()
  const locale = client.preferredLocale, t = assessmentText(locale)
  const kind = (await searchParams).kind === 'research_result' ? 'research_result' : 'test'
  const docs = (await store.listClientDocuments(id)).filter(r => r.clientId === id && r.status === 'active').map(r => ({ id: r.id, label: `${r.dateIssued} · ${r.kind === 'payment' ? (locale === 'ru' ? 'Квитанция' : 'Receipt') : r.kind === 'report' ? (locale === 'ru' ? 'Отчёт' : 'Report') : (locale === 'ru' ? 'Рекомендация' : 'Recommendation')}` }))
  return <main className="prescription-admin-shell"><PrescriptionAdminHeader title={kind === 'test' ? t.addTest : t.addResult} description={client.fullName} /><Link prefetch={false} className="library-back-link" href={`/admin/clients/${id}`}>← {t.back}</Link>{store.assessmentStorage === 'memory' && <p className="assessment-notice">{t.memory}</p>}<AssessmentEditor action={saveAssessmentAction.bind(null, id, null)} requestId={randomUUID()} documents={docs} locale={locale} kind={kind} /></main>
}
