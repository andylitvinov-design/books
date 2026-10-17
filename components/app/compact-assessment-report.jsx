import { useState } from 'react'
import { FreeCourseBanner } from './free-course-banner'
import { ScoreGauge, ScoreTrend } from './assessment-gauge'
import { getTestScaleGuide } from '@/lib/assessments/scale-guides'
import { gaugeModel } from '@/lib/assessments/dashboard-gauges'
import { assessmentResultOverview } from '@/lib/assessments/result-overview'
import styles from './compact-assessment-report.module.css'

// Only presentation changes here: instrument scores, banding and recommendations
// are still sourced from the existing versioned result-report registry.
export function CompactAssessmentReport({ result, previous = null, report, locale = 'en' }) {
  const ru = locale === 'ru'
  const sections = Array.isArray(report?.sections) ? report.sections : []
  const guideByScale = new Map((getTestScaleGuide(result.definitionKey, locale)?.scales || []).map(scale => [scale.key, scale]))
  const overview = assessmentResultOverview(report, result, locale)
  const initialIndex = overview.initialIndex ?? 0
  const resultKey = result.id || JSON.stringify(result)
  const [selection, setSelection] = useState(() => ({ resultKey, index: initialIndex }))
  // Navigating to another saved result must surface its own review notice,
  // while ordinary rerenders of the same result retain the chosen scale.
  const activeIndex = selection.resultKey === resultKey ? selection.index : initialIndex
  if (selection.resultKey !== resultKey) setSelection({ resultKey, index: initialIndex })
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
  const anchor = model?.currentAnswerBand || null
  const rawNote = !model ? null : model.displayKind === 'screening-count'
    ? ru ? 'Количество ответов в заштрихованных клетках. Это не шкала тяжести.' : 'Number of responses in shaded cells. This is not a severity scale.'
    : model.orientation === 'difficulty'
      ? ru ? 'Больше баллов = больше описанных трудностей.' : 'A higher score means more reported difficulties.'
      : model.orientation === 'resource'
        ? ru ? 'Больше баллов = больше описанных ресурсов.' : 'A higher score means more reported resources.'
        : ru ? 'Описательная шкала: больше не означает лучше или хуже.' : 'Descriptive scale: higher is not automatically better or worse.'
  // The model supplies the semantic explanation separately from the numeric
  // score prefix. Legacy/specialised reports retain their complete explanation.
  const conciseMeaning = section.summary || section.meaning
  const canShowScore = typeof section.value === 'number' && Number.isFinite(section.value)
  const primarySupport = report.verified === false || section.bandBasis === 'unavailable'
    ? null : section.recommendedReview && section.followUp
      ? section.followUp : section.primarySupport || section.steps?.[0] || section.followUp

  return <section className={styles.report} data-personal-result-report data-compact-assessment-report
    aria-label={ru ? 'Мои результаты и рекомендации' : 'Results and recommendations'}>
    {report.verified === false && <p className={styles.contextNote} role="note" data-unverified-assessment-result>{report.intro}</p>}
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
          {canShowScore && <p className={styles.scale}>{section.bandBasis === 'unavailable'
            ? (ru ? 'Сохранённое значение' : 'Saved value') : (ru ? 'Баллы' : 'Score')}: {section.value} · {section.bandBasis === 'unavailable'
              ? (ru ? 'непроверенный сохранённый диапазон' : 'unverified saved range') : (ru ? 'шкала' : 'range')} {section.min}–{section.max}</p>}
          {rawNote && <p className={styles.scale} data-scale-direction>{rawNote}</p>}
          <ScoreTrend current={result} previous={previous} dimensionKey={section.key} locale={locale}/>
        </div>
      </div>
      {anchor && <section className={styles.answerReading} data-answer-interpretation aria-label={ru ? 'Оценка результата' : 'Your score in context'}>
        <p className={styles.readingLabel}>{ru ? 'Что означает ваш результат' : 'What your result means'}</p>
        <p className={styles.readingTitle}>{ru ? 'По ответам: ' : 'Based on your answers: '}{anchor.label}</p>
        <p>{anchor.note}</p>
      </section>}
      {conciseMeaning && !anchor && <p className={styles.explanation} data-scale-meaning>{conciseMeaning}</p>}
      {anchor && <section className={styles.answerRanges} data-answer-ranges aria-label={ru ? 'Пояснение диапазонов ответов' : 'Explanation of response ranges'}>
        <h4>{ru ? 'Диапазоны и их значение' : 'Score ranges explained'}</h4>
        <ol className={styles.rangeList}>
          {model.answerBands.map((band, index) => <li key={band.code}
            data-active-answer-range={band.current || undefined}
            aria-current={band.current ? 'true' : undefined}>
            <span className={styles.rangeSwatch} style={{ backgroundColor: ['#b78363', '#c7a66b', '#b1ae72', '#729a87', '#397f69'][Math.min(index, 4)] }} aria-hidden="true"/>
            <strong>{band.displayRange}</strong>
            <span>{band.label}</span>
            {band.current && <em>{ru ? 'Ваш диапазон' : 'Your range'}</em>}
          </li>)}
        </ol>
        <p className={styles.answerCaveat}>{ru
          ? 'Диапазоны показывают, к какому исходному варианту ответа ближе средний балл. Это ориентир для самонаблюдения, не медицинские нормы и не оценка «хорошо/плохо».'
          : 'These ranges show which original answer option is closest to your average. They guide self-reflection, not clinical norms or a pass/fail judgement.'}</p>
      </section>}
      {!anchor && section.limitations?.map(limit => <p key={limit} className={styles.contextNote} role="note" data-scale-limitation>{limit}</p>)}
      {primarySupport && <div className={styles.recommendations}>
        <h4>{ru ? 'Поддержка в вашем темпе' : 'Support at your own pace'}</h4>
        <p className={section.recommendedReview ? styles.care : styles.explanation}
          role={section.recommendedReview ? 'note' : undefined} data-primary-support>{primarySupport}</p>
      </div>}
      <details className={styles.details}>
        <summary>{ru ? 'Подробнее об этой шкале' : 'More about this scale'}</summary>
        {section.meaning && section.meaning !== conciseMeaning && <p>{section.meaning}</p>}
        {guide?.watch && <p><strong>{ru ? 'Что наблюдать:' : 'What to monitor:'}</strong> {guide.watch}</p>}
        {guide?.skill && <p><strong>{ru ? 'Навык по желанию:' : 'Optional skill:'}</strong> {guide.skill}</p>}
        {section.followUp && section.followUp !== primarySupport && <p>{section.followUp}</p>}
        {section.steps?.length > 0 && <ol>{section.steps.filter(step => step !== primarySupport).map((step, index) => <li key={index}>{step}</li>)}</ol>}
        {section.bandBasis === 'screening' && <p>{ru ? 'Скрининг не устанавливает диагноз.' : 'Screening is not a diagnosis.'}</p>}
        {anchor && section.meaning && <p>{section.meaning}</p>}
        {anchor && section.limitations?.map(limit => <p key={limit} data-scale-limitation>{limit}</p>)}
      </details>
    </article>

    {report.personalityType && <details className={styles.typeSummary} data-personality-type-summary>
      <summary>{ru ? 'Личностный профиль для размышления' : 'Personal pattern for reflection'}</summary>
      <h3>{report.personalityType.headline}</h3>
      <p>{report.personalityType.description}</p>
      {report.personalityType.alternatives?.map(alternative => <p key={alternative}>{alternative}</p>)}
      <small>{report.personalityType.warning}</small>
    </details>}
    {report.contextNote && !anchor && <p className={styles.contextNote} data-assessment-context>{report.contextNote}</p>}
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
        {report.contextNote && anchor && <p data-assessment-context>{report.contextNote}</p>}
        {report.methodology && <p>{report.methodology}</p>}
        {section.source && <a href={section.source} target="_blank" rel="noopener noreferrer">{ru ? 'Исходный источник' : 'Original reference'} ↗</a>}
        {report.note && <p>{report.note}</p>}
        {report.seekSupport && report.seekSupport !== primarySupport && <p>{report.seekSupport}</p>}
        <small>{ru ? 'Версия интерпретации' : 'Interpretation version'}: {report.rulesVersion}</small>
      </details>
    </div>
    <span id="hh-assessment-next-step" aria-hidden="true"/>
    <FreeCourseBanner locale={locale} compact/>
  </section>
}
