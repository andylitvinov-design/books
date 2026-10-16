import { buildAssessmentResultReport } from '@/lib/assessments/result-report'
import { ScoreGauge } from './assessment-gauge'
import styles from './guest-scale-interpretation.module.css'

/**
 * A privacy-safe guest result: scored scales and a short explanation only.
 * Recommendations, personal synthesis, progress and the full report live in
 * the signed-in Cabinet after a confirmed, item-scoped Google save intent.
 * Never calculate new cutoffs or reinterpret screening scores here.
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
      band: null, bandBasis: 'unavailable', meaning: '',
    }))

  return <section className={styles.wrapper} data-guest-scale-interpretation aria-label={ru ? 'Шкалы теста и расшифровка' : 'Test scores and scale explanations'}>
    <header className={styles.header}>
      <p className={styles.eyebrow}>{ru ? 'Результат без регистрации' : 'No sign-in required'}</p>
      <h4>{ru ? 'Ваши шкалы и расшифровка' : 'Your scores and scale explanations'}</h4>
      <p>{ru
        ? 'Ниже показаны ваши баллы, диапазоны шкал и пояснения к ним. Полный персональный анализ и рекомендации можно получить бесплатно в личном кабинете.'
        : 'See your scores, scale ranges and explanations below. Get your complete personal analysis and recommendations free in your private Cabinet.'}</p>
    </header>
    <div className={styles.cards}>
      {cards.map((section, index) => {
        const dimension = dimensionByKey.get(section.key)
        const isScreening = section.bandBasis === 'screening'
        const isUnavailable = section.bandBasis === 'unavailable'
        return <article className={styles.card} key={section.key + ':' + index} data-guest-scale={section.key}>
          <div className={styles.cardHead}>
            <span className={styles.index}>{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h5>{section.construct || section.title || section.key}</h5>
              {section.band && <p className={styles.band}>{section.band}</p>}
            </div>
          </div>
          <div className={styles.gaugeRow}>
            <ScoreGauge dimension={isUnavailable ? null : dimension} locale={locale} compact />
            <p className={styles.numeric}>{ru ? 'Баллы' : 'Score'}: <strong>{section.value}</strong> · {ru ? 'Диапазон' : 'Range'} {section.min}–{section.max}</p>
          </div>
          {section.meaning && <p className={styles.meaning}>{section.meaning}</p>}
          <p className={styles.caution}>{isScreening
            ? (ru ? 'Опубликованный скрининговый диапазон. Это не диагноз.' : 'Published screening band. This is not a diagnosis.')
            : (ru ? 'Описательный балл — не клинический диагноз и не процент здоровья.' : 'This descriptive score is not a clinical diagnosis or health percentage.')}</p>
          {section.recommendedReview && <p className={styles.support}>{ru
            ? 'При выраженных или сохраняющихся трудностях стоит обратиться к квалифицированному специалисту. При непосредственной опасности нужна экстренная помощь.'
            : 'For significant or persistent difficulties, consult a qualified professional. Seek emergency help for immediate danger.'}</p>}
        </article>
      })}
    </div>
    {report?.methodology && <details className={styles.methodology}>
      <summary>{ru ? 'О методике и её ограничениях' : 'About this questionnaire and its limitations'}</summary>
      <p>{report.methodology}</p>
      {report.note && <p>{report.note}</p>}
    </details>}
    <p className={styles.footer}>{ru
      ? 'Результаты временно хранятся в защищённой гостевой сессии. Вход в кабинет и сохранение конкретного результата — только по вашему выбору.'
      : 'Results are kept temporarily in a private guest session. Opening your Cabinet and saving this one result are always your choice.'}</p>
  </section>
}
