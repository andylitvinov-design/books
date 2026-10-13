import { buildAssessmentResultReport } from '@/lib/assessments/result-report'
import styles from './personal-result-report.module.css'
import { CompactAssessmentReport } from './compact-assessment-report'

export function PersonalResultReport({ result, locale = 'en', previous = null }) {
  const report = buildAssessmentResultReport(result, locale)
  if (report.status === 'unavailable') return <section className={styles.report} data-report-unavailable role="status"><h2>{report.title}</h2><p>{report.note}</p></section>
  if (!report.sections.length) return null
  // Bach retains its ranked leading matches and expandable remaining themes.
  // Every instrument uses the same five prepared, database-backed report blocks.
  return <CompactAssessmentReport result={result} previous={previous} report={report} locale={locale} />
}
