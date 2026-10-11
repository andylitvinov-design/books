import { buildAssessmentResultReport } from '@/lib/assessments/result-report'
import styles from './personal-result-report.module.css'

export function PersonalResultReport({ result, locale = 'en' }) {
  const report = buildAssessmentResultReport(result, locale)
  if (!report.sections.length) return null
  const ru = locale === 'ru'
  return (
    <section className={styles.report} aria-label={report.title} data-personal-result-report>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>{ru ? 'После прохождения теста' : 'After your assessment'}</p>
        <h2>{report.title}</h2>
        <p>{report.intro}</p>
        <div className={styles.purpose}><strong>{ru ? 'Что измеряет тест' : 'What this test measures'}</strong><p>{report.purpose}</p></div>
        {report.personalityType && (
          <div className={styles.typeSummary} role="note" data-personality-type-summary>
            <p className={styles.typeLabel}>{ru ? 'Гипотеза для самопознания' : 'Self-reflection hypothesis'}</p>
            <h3>{report.personalityType.headline}</h3>
            <p>{report.personalityType.description}</p>
            {report.personalityType.alternatives?.map((alternative) => <p key={alternative} className={styles.typeAlternative}>{alternative}</p>)}
            <small>{report.personalityType.warning}</small>
          </div>
        )>
      </header>
      <div className={styles.grid}>
        {report.sections.map((section, index) => (
          <article key={section.key + ':' + index} className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.number}>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3>{section.title}</h3>
                <p className={styles.construct}>{section.construct}</p>
                <p className={styles.score}>{ru ? 'Результат' : 'Your score'}: {section.value} / {section.max}</p>
              </div>
            </div>
            <p className={styles.meaning}>{section.meaning}</p>
            <h4>{ru ? 'Что попробовать за неделю' : 'Try this over the next week'}</h4>
            <ol className={styles.steps}>
              {section.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
            <p className={styles.followUp}>{section.followUp}</p>
          </article>
        ))}
      </div>
      <footer className={styles.footer}>
        {report.seekSupport && <p>{report.seekSupport}</p>}
        <small>{report.note}</small>
      </footer>
    </section>
  )
}
