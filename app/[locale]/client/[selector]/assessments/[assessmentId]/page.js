import Link from 'next/link'
import { notFound } from 'next/navigation'
import { authorizeCabinetRequest } from '@/lib/clients/session'
import { clientAssessmentDetail } from '@/lib/clients/assessments'
import { assessmentText } from '@/lib/clients/assessment-copy'
import { AssessmentReading } from '@/components/assessment-reading'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Private result — Holistic House', robots: { index: false, follow: false } }
export default async function ClientAssessmentPage({ params }) {
  const { locale, selector, assessmentId } = await params
  if (!['en', 'ru'].includes(locale)) notFound()
  const access = await authorizeCabinetRequest(selector)
  if (!access) notFound()
  const record = await clientAssessmentDetail(access.store, access.client.id, assessmentId)
  if (!record) notFound()
  const t = assessmentText(locale)
  return <main className="assessment-reading" lang={locale}><p>HOLISTIC HOUSE</p><Link prefetch={false} className="library-back-link" href={`/${locale}/client/${selector}`}>← {t.cabinet}</Link><AssessmentReading record={record} locale={locale} />{record.relatedDocuments.length > 0 && <section><h2>{t.related}</h2>{record.relatedDocuments.map(doc => <p key={doc.id}><Link prefetch={false} href={`/${locale}/client/${selector}/documents/${doc.id}`}>{t.relatedItem}</Link></p>)}</section>}</main>
}
