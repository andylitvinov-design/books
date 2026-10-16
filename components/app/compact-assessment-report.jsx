import { FreeCourseBanner } from './free-course-banner'
import { ScoreGauge, ScoreTrend } from './assessment-gauge'
import { getTestScaleGuide } from '@/lib/assessments/scale-guides'
import { gaugeModel } from '@/lib/assessments/dashboard-gauges'
import { assessmentResultOverview } from '@/lib/assessments/result-overview'
import styles from './compact-assessment-report.module.css'

export function CompactAssessmentReport({ result, previous = null, report, locale = 'en' }) {
  const ru = locale === 'ru'
  const scaleGuide = getTestScaleGuide(result.definitionKey, locale)
  const byScale = new Map((scaleGuide?.scales || []).map(scale => [scale.key, scale]))
  const overview = assessmentResultOverview(report, result, locale)
  const compactManyScales = report.sections.length > 5
  return <section className={styles.report} data-personal-result-report data-compact-assessment-report
    aria-label={ru ? 'Мои результаты и рекомендации' : 'Results and recommendations'}>
    <header className={styles.header}>
      <h2>{ru ? 'Ваш результат' : 'Your results'}</h2>
      <span>{report.sections.length} {ru ? 'показателей' : 'measures'}</span>
    </header>
    <section className={styles.overview} data-assessment-overview aria-labelledby="hh-assessment-overview-title">
      <div className={styles.overviewHead}>
        <div>
          <p className={styles.overviewEyebrow}>{ru ? 'Коротко и по делу' : 'A simple starting point'}</p>
          <h3 id="hh-assessment-overview-title">{ru ? 'Что показали ваши ответы' : 'What your answers show'}</h3>
        </div>
        {overview.measurementDateIso && <time dateTime={overview.measurementDateIso} className={styles.overviewDate}>{overview.measurementDateLabel}</time>}
      </div>
      {overview.purpose && <p className={styles.overviewPurpose}>{overview.purpose}</p>}
      <ul className={styles.overviewGrid} aria-label={ru ? 'Краткий обзор показателей' : 'Quick measure overview'}>
        {overview.preview.map(item => <li key={item.key} className={styles.overviewChip}>
          <strong>{item.label}</strong>
          {item.band && <span>{item.band}</span>}
          {item.score && <small>{ru ? 'Баллы по шкале' : 'Instrument points'}: {item.score}</small>}
        </li>)}
      </ul>
      {overview.additionalCount > 0 && <p className={styles.moreCount}>
        {ru ? 'Остальные показатели и их интерпретации приведены ниже.' : 'The remaining measures and their explanations appear below.'}
      </p>}
      {overview.reviewNote && <p className={styles.reviewNotice} role="note">{overview.reviewNote}</p>}
      <p className={styles.overviewLimit}>{ru
        ? 'Это результаты отдельных шкал, не общий процент здоровья и не диагноз.'
        : 'These are individual questionnaire measures, not a health percentage or diagnosis.'}</p>
      <nav className={styles.overviewActions} aria-label={ru ? 'Продолжить изучение результата' : 'Explore your result'}>
        <a className={styles.overviewLink} href="#hh-assessment-scales">{ru ? 'Подробная расшифровка ↓' : 'See every measure ↓'}</a>
        <a className={styles.overviewNext} href="#hh-assessment-next-step">{ru ? 'Возможный следующий шаг ↓' : 'An optional next step ↓'}</a>
      </nav>
    </section>
    {report.methodology && <details className={styles.methodDisclosure} data-assessment-methodology>
      <summary>{ru ? 'Происхождение и профессиональный статус' : 'Origin & evidence'}</summary>
      <p>{report.methodology}</p>
    </details>}
    {report.personalityType && <aside className={styles.typeSummary} role="note" data-personality-type-summary>
      <p>{ru ? 'Гипотеза для самопознания' : 'Self-reflection hypothesis'}</p>
      <h3>{report.personalityType.headline}</h3>
      <p>{report.personalityType.description}</p>
      {report.personalityType.alternatives?.map(alternative => <p key={alternative}>{alternative}</p>)}
      <small>{report.personalityType.warning}</small>
    </aside>}
    {report.contextNote && <p className={styles.contextNote} data-assessment-context>{report.contextNote}</p>}
    <div className={styles.cards} id="hh-assessment-scales" data-assessment-scales>
      {report.sections.map((section, index) => {
        const dimension = section.bandBasis === 'unavailable' ? null : result.dimensions?.find(item => item.key === section.key)
        const guide = byScale.get(section.key)
        const showSteps = !compactManyScales || index < 2
        const model = gaugeModel(dimension, result, locale)
        const rawNote = model?.displayKind === 'screening-count'
          ? ru ? 'Количество ответов в заштрихованных клетках. Это не шкала тяжести.' : 'Number of responses in shaded cells. This is not a severity scale.'
          : model?.orientation === 'difficulty'
          ? ru ? 'Больше баллов = больше описанных трудностей.' : 'A higher score means more reported difficulties.'
          : model?.orientation === 'resource'
            ? ru ? 'Больше баллов = больше описанных ресурсов.' : 'A higher score means more reported resources.'
            : ru ? 'Описательная шкала: больше не означает лучше или хуже.' : 'Descriptive scale: higher is not automatically better or worse.'
        return <article key={section.key + ':' + index} className={styles.card}>
          <div className={styles.measure}>
            <ScoreGauge dimension={dimension} locale={locale} result={result}/>
            <div className={styles.summary}>
              <h3>{section.construct || section.title}</h3>
              <p className={styles.band}>{section.band || (ru ? 'Результат теста' : 'Questionnaire score')}</p>
              <p className={styles.scale}>{ru ? 'Баллы' : 'Score'}: {section.value} · {ru ? 'шкала' : 'range'} {section.min}–{section.max}</p>
              <p className={styles.direction}>{rawNote}</p>
              <ScoreTrend current={result} previous={previous} dimensionKey={section.key} locale={locale}/>
            </div>
          </div>
          <p className={styles.explanation}>{section.meaning}</p>
          {showSteps && section.steps.length > 0 && <div className={styles.recommendations}>
            <h4>{result.definitionKey === 'asrs-6' ? (ru ? 'Пояснение Holistic House' : 'Holistic House explanation') : (ru ? 'Что поможет на этой неделе' : 'Two steps for this week')}</h4>
            <ol>{section.steps.slice(0, 2).map((step, i) => <li key={i}>{step}</li>)}</ol>
          </div>}
          {section.recommendedReview && <p className={styles.care}>{section.followUp}</p>}
          <details className={styles.details}>
            <summary>{ru ? 'Подробное пояснение и источники' : 'More about this score & sources'}</summary>
            {!showSteps && section.steps.length > 0 && <div className={styles.recommendations}>
              <h4>{ru ? 'Что можно попробовать по желанию' : 'Optional steps to try'}</h4>
              <ol>{section.steps.slice(0, 2).map((step, i) => <li key={i}>{step}</li>)}</ol>
            </div>}
            {guide?.watch && <p><strong>{ru ? 'Что наблюдать:' : 'What to monitor:'}</strong> {guide.watch}</p>}
            {guide?.skill && <p><strong>{ru ? 'Навык:' : 'Optional skill:'}</strong> {guide.skill}</p>}
            {!section.recommendedReview && <p>{section.followUp}</p>}
            {section.limitations?.map(limit => <p key={limit}>{limit}</p>)}
            {section.steps.length > 2 && <ol>{section.steps.slice(2).map((step, i) => <li key={i}>{step}</li>)}</ol>}
            {section.source && <a href={section.source} target="_blank" rel="noopener noreferrer">{ru ? 'Исходный источник' : 'Original reference'} ↗</a>}
            <small>{section.bandBasis === 'screening'
              ? ru ? 'Скрининг не устанавливает диагноз.' : 'Screening results are not a diagnosis.'
              : ru ? 'Положение внутри шкалы не является клиническим порогом.' : 'Scale position is not a clinical cutoff.'}</small>
          </details>
        </article>
      })}
    </div>
    {report.instrumentText && <aside data-asrs6-instrument-text>
      <div lang={report.instrumentText.instrumentLocale}>
        <p>{report.instrumentText.eligibilityText}</p>
        <p>{report.instrumentText.printedScoringText}</p>
        <p>{report.instrumentText.safetyText}</p>
      </div>
      <p lang="en">{report.instrumentText.requiredSiteAttribution}</p>
      {report.instrumentText.formCopyright && <p lang="en">{report.instrumentText.formCopyright}</p>}
    </aside>}
    <div className={styles.footer}>
      <p>{ru
        ? 'Индикаторы показывают ответы на отдельных шкалах, а не процент здоровья. Изменение балла не доказывает изменение состояния.'
        : 'Each dial shows a questionnaire scale, not a health percentage. A score change alone does not prove a health change.'}</p>
      <details><summary>{ru ? 'О методике, ограничениях и версии интерпретации' : 'Method, limitations & interpretation version'}</summary>
        <p>{report.purpose}</p>
        <p>{report.note}</p>
        {report.seekSupport && <p>{report.seekSupport}</p>}
        <small>{ru ? 'Версия интерпретации' : 'Interpretation version'}: {report.rulesVersion}</small>
      </details>
    </div>
    <span id="hh-assessment-next-step" aria-hidden="true" style={{ scrollMarginTop: 80 }}/>
    <FreeCourseBanner locale={locale}/>
  </section>
}
