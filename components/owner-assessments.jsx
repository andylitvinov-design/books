import Link from 'next/link'
import { assessmentText } from '@/lib/clients/assessment-copy'
export function OwnerAssessments({ records, clientId, locale, temporary = false }) {
  const t = assessmentText(locale)
  const root = `/admin/clients/${clientId}/assessments`
  return <section className="assessment-section"><h2>{t.title}</h2>
    {temporary && <p className="assessment-notice">{t.memory}</p>}
    <div className="assessment-actions"><Link prefetch={false} href={`${root}/new?kind=test`}>{t.addTest}</Link><Link prefetch={false} href={`${root}/new?kind=research_result`}>{t.addResult}</Link></div>
    <div className="assessment-cards">{records.map(r => <article key={r.id} className="assessment-card"><h3>{r.title}</h3><p className="assessment-meta">{t[r.kind]} · {r.occurredOn} · {t[r.status]}</p><Link prefetch={false} href={`${root}/${r.id}/edit`}>{t.edit} →</Link></article>)}</div>
    {!records.length && <p>{t.ownerEmpty}</p>}
  </section>
}
