import { buildAssessmentResultReport } from '@/lib/assessments/result-report'
import { ScoreGauge } from './assessment-gauge'
import styles from './guest-scale-interpretation.module.css'

/**
 * Anonymous results deliberately show only the source-scored scale name, dial
 * and score. The full explanations and advice are shown only after the
 * explicitly confirmed, result-scoped save into the Google Cabinet.
 * Do not calculate new cutoffs, diagnoses or health percentages here.
 */
export function GuestScaleInterpretation({ result, locale = 'en' }) {
  const ru = locale === 'ru'
  const report = buildAssessmentResultReport(result, locale)
  const sections = Array.isArray(report?.sections) ? report.sections : []
  const measures = Array.isArray(result?.dimensions) ? result.dimensions : []
  const dimensionByKey = new Map(measures.map(dimension => [dimension.key, dimension]))
  const cards = sections.length
    ? sections
    : measures.map(dimension => ({
      key: dimension.key, construct: dimension.sourceConstruct || dimension.key,
      value: dimension.value, min: dimension.min, max: dimension.max,
    }))

  return <section className={styles.wrapper} data-guest-scale-interpretation data-score-only data-scale-count={cards.length}
    aria-label={ru ? 'Шкалы и баллы теста' : 'Test scales and scores'}>
    <header className={styles.header}>
      <p className={styles.eyebrow}>{ru ? 'ШКАЛЫ И БАЛЛЫ' : 'SCALES & SCORES'}</p>
      <h4>{ru ? 'Ваши результаты' : 'Your results'}</h4>
    </header>
    <div className={styles.cards}>
      {cards.map((section, index) => {
        const dimension = dimensionByKey.get(section.key)
        return <article className={styles.card} key={section.key + ':' + index} data-guest-scale={section.key}>
          <h5>{section.construct || section.title || section.key}</h5>
          <div className={styles.gaugeSlot}>
            {dimension
              ? <ScoreGauge dimension={dimension} locale={locale} compact result={result} showAnswerAnchors={false} />
              : <strong className={styles.fallbackScore}>{section.value} <span>/ {section.max}</span></strong>}
          </div>
          {section.band && section.bandBasis === 'screening' && <p className={styles.band}>{section.band}</p>}
        </article>
      })}
    </div>
  </section>
}
