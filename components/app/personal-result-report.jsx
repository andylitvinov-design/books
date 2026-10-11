import { buildAssessmentResultReport } from '@/lib/assessments/result-report'
import styles from './personal-result-report.module.css'

export function PersonalResultReport({ result, locale = 'en' }) {
  const report = buildAssessmentResultReport(result, locale)
  if (!report.sections.length) return null
  const ru = locale === 'ru'
  const bach = result?.definitionKey === 'hh-bach-flower-profile'
  const featured = bach ? report.sections.slice(0, report.highlightedCount) : report.sections
  const extra = bach ? report.sections.slice(report.highlightedCount) : []
  const renderCard = (section, index) => (
    <article key={section.key + ':' + index} className={styles.card}>
      <div className={styles.cardHead}>
        <span className={styles.number}>{String(index + 1).padStart(2, '0')}</span>
        <div>
          {bach && section.group !== 'not-marked' && (
            <p className={styles.groupLabel}>
              {section.group === 'main'
                ? (ru ? 'Основное совпадение' : 'Primary match')
                : section.group === 'support'
                  ? (ru ? 'Дополнительная тема' : 'Supporting theme')
                  : (ru ? 'Тема для проверки' : 'Further reflection')}
            </p>
          )}
          <h3>{section.title}</h3>
          <p className={styles.construct}>{section.construct}</p>
          <p className={styles.score}>{bach
            ? (ru ? 'Вес совпадений' : 'Weighted match') + ': ' + section.value
            : (ru ? 'Результат' : 'Your score') + ': ' + section.value + ' / ' + section.max}</p>
        </div>
      </div>
      <p className={styles.meaning}>{section.meaning}</p>
      <h4>{ru ? 'Что попробовать за неделю' : 'Try this over the next week'}</h4>
      <ol className={styles.steps}>
        {section.steps.map((step) => <li key={step}>{step}</li>)}
      </ol>
      <p className={styles.followUp}>{section.followUp}</p>
    </article>
  )
  return (
    <section className={styles.report} aria-label={report.title} data-personal-result-report data-bach-profile={bach ? 'true' : undefined}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>{ru ? 'После прохождения теста' : 'After your assessment'}</p>
        <h2>{report.title}</h2>
        <p>{report.intro}</p>
        <div className={styles.purpose}>
          <strong>{ru ? 'Что измеряет тест' : 'What this test measures'}</strong>
          <p>{report.purpose}</p>
        </div>
        {report.personalityType && (
          <div className={styles.typeSummary} role="note" data-personality-type-summary>
            <p className={styles.typeLabel}>{ru ? 'Гипотеза для самопознания' : 'Self-reflection hypothesis'}</p>
            <h3>{report.personalityType.headline}</h3>
            <p>{report.personalityType.description}</p>
            {report.personalityType.alternatives?.map((alternative) => (
              <p key={alternative} className={styles.typeAlternative}>{alternative}</p>
            ))}
            <small>{report.personalityType.warning}</small>
          </div>
        )}
      </header>
      {bach && featured.length > 0 && (
        <p className={styles.profileLead}>
          {ru
            ? 'Сначала три основных совпадения, затем до четырёх дополнительных. Все 38 тем доступны ниже для просмотра.'
            : 'Your three leading matches come first, followed by up to four supporting themes. All 38 themes remain available below.'}
        </p>
      )}
      {featured.length > 0 && <div className={styles.grid}>{featured.map(renderCard)}</div>}
      {bach && extra.length > 0 && (
        <details className={styles.more}>
          <summary>
            {ru ? 'Посмотреть остальные эмоциональные темы' : 'Explore the remaining emotional themes'}
            <span>({extra.length})</span>
          </summary>
          <p className={styles.moreDescription}>
            {ru
              ? 'Остальные сопоставления и нулевые значения не являются диагнозом и не требуют подбора эссенций.'
              : 'Other matches and unmarked themes are not diagnoses and do not call for an essence prescription.'}
          </p>
          <div className={styles.grid}>
            {extra.map((section, index) => renderCard(section, index + featured.length))}
          </div>
        </details>
      )}
      <footer className={styles.footer}>
        {report.seekSupport && <p>{report.seekSupport}</p>}
        <small>{report.note}</small>
      </footer>
    </section>
  )
}
