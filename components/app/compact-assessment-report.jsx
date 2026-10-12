import Link from 'next/link'
import { ScoreGauge, ScoreTrend } from './assessment-gauge'
import { getTestScaleGuide } from '@/lib/assessments/scale-guides'
import { gaugeModel } from '@/lib/assessments/dashboard-gauges'
import styles from './compact-assessment-report.module.css'

export function CompactAssessmentReport({ result, previous = null, report, locale = 'en' }) {
  const ru = locale === 'ru'
  const scaleGuide = getTestScaleGuide(result.definitionKey, locale)
  const byScale = new Map((scaleGuide?.scales || []).map(scale => [scale.key, scale]))
  const hasSkills = Boolean(scaleGuide?.skillAxes?.length)
  return <section className={styles.report} data-personal-result-report data-compact-assessment-report
    aria-label={ru ? 'Мои результаты и рекомендации' : 'Results and recommendations'}>
    <header className={styles.header}>
      <h2>{ru ? 'Ваш результат' : 'Your results'}</h2>
      <span>{report.sections.length} {ru ? 'показателей' : 'measures'}</span>
    </header>
    {report.methodology && <p className={styles.methodology} data-assessment-methodology><strong>{ru ? 'Происхождение и профессиональный статус' : 'Origin & evidence'}:</strong> {report.methodology}</p>}
    {report.personalityType && <aside className={styles.typeSummary} role="note" data-personality-type-summary>
      <p>{ru ? 'Гипотеза для самопознания' : 'Self-reflection hypothesis'}</p>
      <h3>{report.personalityType.headline}</h3>
      <p>{report.personalityType.description}</p>
      {report.personalityType.alternatives?.map(alternative => <p key={alternative}>{alternative}</p>)}
      <small>{report.personalityType.warning}</small>
    </aside>}
    <div className={styles.cards}>
      {report.sections.map((section, index) => {
        const dimension = result.dimensions?.find(item => item.key === section.key)
        const guide = byScale.get(section.key)
        const model = gaugeModel(dimension)
        const rawNote = model?.orientation === 'difficulty'
          ? ru ? 'Больше баллов = больше описанных трудностей.' : 'A higher score means more reported difficulties.'
          : model?.orientation === 'resource'
            ? ru ? 'Больше баллов = больше описанных ресурсов.' : 'A higher score means more reported resources.'
            : ru ? 'Описательная шкала: больше не означает лучше или хуже.' : 'Descriptive scale: higher is not automatically better or worse.'
        return <article key={section.key + ':' + index} className={styles.card}>
          <div className={styles.measure}>
            <ScoreGauge dimension={dimension} locale={locale}/>
            <div className={styles.summary}>
              <h3>{section.construct || section.title}</h3>
              <p className={styles.band}>{section.band || (ru ? 'Результат теста' : 'Questionnaire score')}</p>
              <p className={styles.scale}>{ru ? 'Баллы' : 'Score'}: {section.value} · {ru ? 'шкала' : 'range'} {section.min}–{section.max}</p>
              <p className={styles.direction}>{rawNote}</p>
              <ScoreTrend current={result} previous={previous} dimensionKey={section.key} locale={locale}/>
            </div>
          </div>
          <div className={styles.recommendations}>
            <h4>{ru ? 'Что поможет на этой неделе' : 'Two steps for this week'}</h4>
            <ol>{section.steps.slice(0, 2).map((step, i) => <li key={i}>{step}</li>)}</ol>
          </div>
          {section.recommendedReview && <p className={styles.care}>{section.followUp}</p>}
          <details className={styles.details}>
            <summary>{ru ? 'Подробное пояснение и источники' : 'More about this score & sources'}</summary>
            <p>{section.meaning}</p>
            {guide?.watch && <p><strong>{ru ? 'Что наблюдать:' : 'What to monitor:'}</strong> {guide.watch}</p>}
            {guide?.skill && <p><strong>{ru ? 'Навык:' : 'Optional skill:'}</strong> {guide.skill}</p>}
            {!section.recommendedReview && <p>{section.followUp}</p>}
            {section.steps.length > 2 && <ol>{section.steps.slice(2).map((step, i) => <li key={i}>{step}</li>)}</ol>}
            {section.source && <a href={section.source} target="_blank" rel="noopener noreferrer">{ru ? 'Исходный источник' : 'Original reference'} ↗</a>}
            <small>{section.bandBasis === 'screening'
              ? ru ? 'Скрининг не устанавливает диагноз.' : 'Screening results are not a diagnosis.'
              : ru ? 'Положение внутри шкалы не является клиническим порогом.' : 'Scale position is not a clinical cutoff.'}</small>
          </details>
        </article>
      })}
    </div>
    <div className={styles.footer}>
      <p>{ru
        ? 'Индикаторы показывают ответы на отдельных шкалах, а не процент здоровья. Изменение балла не доказывает изменение состояния.'
        : 'Each dial shows a questionnaire scale, not a health percentage. A score change alone does not prove a health change.'}</p>
      {hasSkills && <Link href={'/' + (ru ? 'ru' : 'en') + '/app/course'} prefetch={false}>
        {ru ? 'Выбрать навык для личного курса →' : 'Explore a personal practice →'}</Link>}
      <details><summary>{ru ? 'О методике, ограничениях и версии интерпретации' : 'Method, limitations & interpretation version'}</summary>
        <p>{report.purpose}</p>
        <p>{report.note}</p>
        {report.seekSupport && <p>{report.seekSupport}</p>}
        <small>{ru ? 'Версия интерпретации' : 'Interpretation version'}: {report.rulesVersion}</small>
      </details>
    </div>
  </section>
}
