'use client'
import { useState } from 'react'
import Link from 'next/link'
import { assessmentText } from '@/lib/clients/assessment-copy'
export function ClientAssessments({ records, locale, selector }) {
  const [filter, setFilter] = useState('all')
  const t = assessmentText(locale)
  const visible = records.filter(r => filter === 'all' || r.kind === filter)
  return <section className="assessment-section" aria-labelledby="client-assessments-title">
    <h2 id="client-assessments-title">{t.title}</h2>
    <div className="assessment-filters">{['all', 'test', 'research_result'].map(key => <button type="button" key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{t[key]}</button>)}</div>
    <div className="assessment-cards">{visible.map(r => <Link prefetch={false} className="assessment-card" key={r.id} href={`/${locale}/client/${selector}/assessments/${r.id}`}><h3>{r.title}</h3><p className="assessment-meta">{t[r.kind]} · {r.occurredOn}{r.sourceName ? ` · ${r.sourceName}` : ''}</p></Link>)}</div>
    {!visible.length && <p>{t.empty}</p>}
  </section>
}
