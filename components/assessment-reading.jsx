import { assessmentText } from '@/lib/clients/assessment-copy'
export function AssessmentReading({ record, locale }) {
  const t = assessmentText(locale)
  return <div className="assessment-reading-content">
    <h1>{record.title}</h1>
    <p className="assessment-meta">{t[record.kind]} · {record.occurredOn} · {record.language.toUpperCase()}</p>
    {record.sourceName && <p>{t.source}: {record.sourceName}{record.sourceVersion ? ` · ${record.sourceVersion}` : ''}</p>}
    {!record.sourceName && record.sourceVersion && <p>{t.version}: {record.sourceVersion}</p>}
    {['description', 'originalResult', 'practitionerComment'].map(field => record[field] ? <section key={field}><h2>{t[{ description: 'description', originalResult: 'original', practitionerComment: 'comment' }[field]]}</h2><p className="assessment-text" lang={record.language === 'other' ? undefined : record.language}>{record[field]}</p></section> : null)}
  </div>
}
