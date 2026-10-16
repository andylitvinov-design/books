import { useState } from 'react'
import { FreeCourseBanner } from './free-course-banner'
import { ScoreGauge, ScoreTrend } from './assessment-gauge'
import { getTestScaleGuide } from '@/lib/assessments/scale-guides'
import { gaugeModel } from '@/lib/assessments/dashboard-gauges'
import { assessmentResultOverview } from '@/lib/assessments/result-overview'
import styles from './compact-assessment-report.module.css'

function firstSentence(value) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  const match = trimmed.match(/^.+?[.!?](?=\s|$)/u)
  return match ? match[0] : trimmed
}

// Only presentation changes here: instrument scores, banding and recommendations
// are still sourced from the existing versioned result-report registry.
export function CompactAssessmentReport({ result, previous = null, report, locale = 'en' }) {
  const ru = locale === 'ru'
  const sections = Array.isArray(report?.sections) ? report.sections : []
  const guideByScale = new Map((getTestScaleGuide(result.definitionKey, locale)?.scales || []).map(scale => [scale.key, scale]))
  const overview = assessmentResultOverview(report, result, locale)
  const initialIndex = Math.max(0, sections.findIndex(item => item.recommendedReview))
  const resultKey = result.id || result
  const [selection, setSelection] = useState(() => ({ resultKey, index: initialIndex }))
  // Navigating to another saved result must surface its own review notice,
  // while ordinary rerenders of the same result retain the chosen scale.
  const activeIndex = selection.resultKey === resultKey ? selection.index : initialIndex
  const setActiveIndex = index => setSelection({ resultKey, index })
  // Empty/incompatible reports have no score to select; keep the optional course
  // boundary stable for legacy records without fabricating an instrument value.
  if (!sections.length) return <section data-personal-result-report data-compact-assessment-report>
    <small>{report.rulesVersion}</small>
    <FreeCourseBanner locale={locale} compact/>
  </section>
  const selectedIndex = activeIndex < sections.length ? activeIndex : 0
  const section = sections[selectedIndex]
  const dimension = section.bandBasis === 'unavailable' ? null : result.dimensions?.find(item => item.key === section.key)
  const guide = section.bandBasis === 'unavailable' ? null : guideByScale.get(section.key)
  const model = gaugeModel(dimension, result, locale)
  const rawNote = !model ? null : model.displayKind === 'screening-count'
    ? ru ? 'Количество ответов в заштрихованных клетках. Это не шкала тяжести.' : 'Number of responses in shaded cells. This is not a severity scale.'
    : model.orientation === 'difficulty'
      ? ru ? 'Больше баллов = больше описанных трудностей.' : 'A higher score means more reported difficulties.'
      : model.orientation === 'resource'
        ? ru ? 'Больше баллов = больше описанных ресурсов.' : 'A higher score means more reported resources.'
        : ru ? 'Описательная шкала: больше не означает лучше или хуже.' : 'Descriptive scale: higher is not automatically better or worse.'
  const conciseMeaning = firstSentence(section.meaning)
  const canShowScore = typeof section.value === 'number' && Number.isFinite(section.value)
  const isAsrs = result.definitionKey === 'asrs-6'

  return <section className={styles.report} data-personal-result-report data-compact-assessment-report
    aria-label={ru ? 'Мои результаты и рекомендации' : 'Results and recommendations'}>
    <section className={styles.picker} id="hh-assessment-scales" data-assessment-scales data-assessment-scale-picker
      aria-labelledby="hh-assessment-scale-title">
      <div className={styles.pickerHeader}>
        <h2 id="hh-assessment-scale-title">{ru ? 'Шкалы теста' : 'Test scales'}</h2>
        <span>{sections.length} {ru ? 'показателей' : 'measures'}</span>
      </div>
      <div className={styles.scaleTabs} role="group" aria-label={ru ? 'Выберите шкалу для просмотра' : 'Choose a scale to explore'}>
        {sections.map((item, index) => {
          const validScore = typeof item.value === 'number' && Number.isFinite(item.value)
          return <button type="button" key={item.key + ':' + index}
            data-assessment-scale-trigger={item.key} aria-controls="hh-assessment-scale-panel"
            aria-pressed={selectedIndex === index}
            className={styles.scaleTab + (selectedIndex === index ? ' ' + styles.selected : '')}
            onClick={() => setActiveIndex(index)}>
            <span className={styles.tabName}>{item.construct || item.title}</span>
            <span className={styles.tabMeta}>
              {validScore ? item.value + ' / ' + item.max : (item.band || (ru ? 'Без числового балла' : 'No numeric score'))}
              {item.recommendedReview && <span className={styles.reviewDot} aria-label={ru ? 'Рекомендовано профессиональное обсуждение' : 'Professional follow-up suggested'}>!</span>}
            </span>
          </button>
        })}
      </div>
      {sections.length > 6 && <label className={styles.jump}>
        {ru ? 'Быстрый выбор шкалы' : 'Jump to a scale'}
        <span className={styles.jumpControl} data-assessment-scale-select-control>
          <select value={selectedIndex} onChange={event => setActiveIndex(Number(event.target.value))}>
            {sections.map((item, index) => <option key={item.key + ':' + index} value={index}>{item.construct || item.title}</option>)}
          </select>
        </span>
      </label>}
    </section>

    <article id="hh-assessment-scale-panel" key={section.key + ':' + selectedIndex}
      className={styles.card} role="region" aria-label={section.construct || section.title}
      data-active-scale={section.key}>
      <div className={styles.measure}>
        <ScoreGauge dimension={dimension} locale={locale} result={result}/>
        <div className={styles.summary}>
          <h3>{section.construct || section.title}</h3>
          {section.band && <p className={styles.band}>{section.band}</p>}
          {canShowScore && <p className={styles.scale}>{ru ? 'Баллы' : 'Score'}: {section.value} · {ru ? 'шкала' : 'range'} {section.min}–{section.max}</p>}
          {rawNote && <p className={styles.scale} data-scale-direction>{rawNote}</p>}
          <ScoreTrend current={result} previous={previous} dimensionKey={section.key} locale={locale}/>
        </div>
      </div>
      {conciseMeaning && <p className={styles.explanation}>{conciseMeaning}</p>}
      {section.limitations?.map(limit => <p key={limit} className={styles.contextNote} role="note" data-scale-limitation>{limit}</p>)}
      {section.recommendedReview && section.followUp && <p className={styles.care} role="note">{section.followUp}</p>}
      {section.steps?.length > 0 && <div className={styles.recommendations}>
        <h4>{isAsrs
          ? (ru ? 'Пояснение к результату' : 'About your result')
          : (ru ? 'Два шага на неделю' : 'Two steps this week')}</h4>
        <ol>{section.steps.slice(0, 2).map((step, index) => <li key={index}>{step}</li>)}</ol>
      </div>}
      <details className={styles.details}>
        <summary>{ru ? 'Подробнее о шкале и источники' : 'More about this score & sources'}</summary>
        {section.meaning && section.meaning !== conciseMeaning && <p>{section.meaning}</p>}
        {guide?.watch && <p><strong>{ru ? 'Что наблюдать:' : 'What to monitor:'}</strong> {guide.watch}</p>}
        {guide?.skill && <p><strong>{ru ? 'Навык по желанию:' : 'Optional skill:'}</strong> {guide.skill}</p>}
        {!section.recommendedReview && section.followUp && <p>{section.followUp}</p>}
        {section.steps?.length > 2 && <ol>{section.steps.slice(2).map((step, index) => <li key={index}>{step}</li>)}</ol>}
        {section.source && <a href={section.source} target="_blank" rel="noopener noreferrer">{ru ? 'Исходный источник' : 'Original reference'} ↗</a>}
        {section.bandBasis === 'screening' && <p>{ru ? 'Скрининг не устанавливает диагноз.' : 'Screening is not a diagnosis.'}</p>}
      </details>
    </article>

    {report.personalityType && <details className={styles.typeSummary} data-personality-type-summary>
      <summary>{ru ? 'Личностный профиль для размышления' : 'Personal pattern for reflection'}</summary>
      <h3>{report.personalityType.headline}</h3>
      <p>{report.personalityType.description}</p>
      {report.personalityType.alternatives?.map(alternative => <p key={alternative}>{alternative}</p>)}
      <small>{report.personalityType.warning}</small>
    </details>}
    {report.contextNote && <p className={styles.contextNote} data-assessment-context>{report.contextNote}</p>}
    {report.instrumentText && <aside className={styles.instrumentText} data-asrs6-instrument-text>
      <div lang={report.instrumentText.instrumentLocale}>
        <p>{report.instrumentText.eligibilityText}</p>
        <p>{report.instrumentText.printedScoringText}</p>
        <p>{report.instrumentText.safetyText}</p>
      </div>
      <p lang="en">{report.instrumentText.requiredSiteAttribution}</p>
      {report.instrumentText.formCopyright && <p lang="en">{report.instrumentText.formCopyright}</p>}
    </aside>}

    <div className={styles.footer}>
      <p className={styles.safetyNote}>{ru
        ? 'Результаты описывают ответы на вопросы, а не процент здоровья или диагноз.'
        : 'Scores describe questionnaire answers, not a health percentage or diagnosis.'}</p>
      <details className={styles.methodDisclosure} data-assessment-methodology>
        <summary>{ru ? 'Методика, источники и ограничения' : 'Method, evidence & limitations'}</summary>
        {overview.measurementDateIso && <p><time dateTime={overview.measurementDateIso}>{overview.measurementDateLabel}</time></p>}
        {report.purpose && <p>{report.purpose}</p>}
        {report.methodology && <p>{report.methodology}</p>}
        {report.note && <p>{report.note}</p>}
        {report.seekSupport && <p>{report.seekSupport}</p>}
        <small>{ru ? 'Версия интерпретации' : 'Interpretation version'}: {report.rulesVersion}</small>
      </details>
    </div>
    <span id="hh-assessment-next-step" aria-hidden="true"/>
    <FreeCourseBanner locale={locale} compact/>
  </section>
}
