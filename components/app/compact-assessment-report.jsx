import { useState } from 'react'
import { FreeCourseBanner } from './free-course-banner'
import { ScoreGauge, ScoreTrend } from './assessment-gauge'
import { getTestScaleGuide } from '@/lib/assessments/scale-guides'
import { assessmentEvidenceStatus } from '@/lib/assessments/assessment-evidence-status'
import { gaugeModel } from '@/lib/assessments/dashboard-gauges'
import { assessmentResultOverview } from '@/lib/assessments/result-overview'
import styles from './compact-assessment-report.module.css'


function phq4ShortName(key, locale) {
  const ru = locale === 'ru'
  return {
    'symptoms.phq4.total': ru ? 'Общий результат' : 'Overall',
    'symptoms.phq4.depression': ru ? 'Симптомы сниженного настроения' : 'Low-mood symptoms',
    'symptoms.phq4.anxiety': ru ? 'Тревога' : 'Anxiety',
  }[key] || null
}

// Published bands keep source-defined boundaries. The text below explains
// their meanings without treating screening results as diagnoses.
function explainPublishedLevel(code, locale) {
  const ru = locale === 'ru'
  const copy = {
    below_screen: [
      'Ниже опубликованного скринингового порога. Это не исключает трудностей, если они беспокоят.',
      'Below the published screening threshold. Difficulties may still be present.',
    ],
    screen_signal: [
      'На уровне или выше скринингового порога. При беспокоящих симптомах можно обсудить их со специалистом.',
      'At or above a screening threshold. Discuss concerning symptoms with a qualified professional.',
    ],
    minimal: [
      'Самый нижний из опубликованных диапазонов для данного опросника.',
      'The lowest published symptom range for this questionnaire.',
    ],
    mild: [
      'Следующий диапазон отмеченных симптомов: выше минимального, но ниже средних категорий.',
      'The next published symptom range: above minimal, below the middle categories.',
    ],
    moderate: [
      'Средний из опубликованных диапазонов; полезно учесть влияние симптомов на повседневную жизнь.',
      'A middle published range; consider how the reported symptoms affect daily life.',
    ],
    moderately_severe: [
      'Диапазон выше умеренного: это основание внимательнее оценить беспокоящие проявления.',
      'A range above moderate; consider a closer review of concerning experiences.',
    ],
    severe: [
      'Верхняя опубликованная категория опросника — это не самостоятельный диагноз.',
      'The questionnaire’s highest published category; it is not a diagnosis.',
    ],
    low: [
      'Нижний опубликованный диапазон выраженности сообщаемых симптомов.',
      'A lower published range of reported symptoms.',
    ],
    medium: [
      'Промежуточный опубликованный диапазон выраженности сообщаемых симптомов.',
      'An intermediate published range of reported symptoms.',
    ],
    high: [
      'Верхний опубликованный диапазон выраженности сообщаемых симптомов.',
      'An upper published range of reported symptoms.',
    ],
    low_coping: [
      'По этой шкале отмечается сравнительно меньше устойчивых способов совладания.',
      'Fewer resilient coping responses are reported on this scale.',
    ],
    mid_coping: [
      'По этой шкале отмечается промежуточная выраженность способов совладания.',
      'An intermediate range of resilient coping responses on this scale.',
    ],
    high_coping: [
      'По этой шкале отмечается сравнительно больше устойчивых способов совладания.',
      'More resilient coping responses are reported on this scale.',
    ],
  }
  return copy[code]?.[ru ? 0 : 1] || (ru
    ? 'Опубликованный диапазон опросника описывает ответы, но не устанавливает диагноз.'
    : 'This published questionnaire interval describes responses, not a diagnosis.')
}

// Only presentation changes here: instrument scores, banding and recommendations
// are still sourced from the existing versioned result-report registry.
export function CompactAssessmentReport({ result, previous = null, report, locale = 'en', focusScaleKey = null }) {
  const ru = locale === 'ru'
  const sections = Array.isArray(report?.sections) ? report.sections : []
  const phq4 = result?.definitionKey === 'phq-4' && report?.verified !== false &&
    sections.length === 3 && ['symptoms.phq4.total', 'symptoms.phq4.depression', 'symptoms.phq4.anxiety']
      .every(key => sections.some(section => section.key === key && section.bandBasis === 'screening'))
  const mood = phq4 ? sections.find(section => section.key === 'symptoms.phq4.depression') : null
  const anxiety = phq4 ? sections.find(section => section.key === 'symptoms.phq4.anxiety') : null
  const total = phq4 ? sections.find(section => section.key === 'symptoms.phq4.total') : null
  const guideByScale = new Map((getTestScaleGuide(result.definitionKey, locale)?.scales || []).map(scale => [scale.key, scale]))
  const overview = assessmentResultOverview(report, result, locale)
  // Details from a portrait select the exact saved source scale, never an unrelated test scale.
  const focusedIndex = typeof focusScaleKey === 'string' ? sections.findIndex(item => item.key === focusScaleKey) : -1
  const initialIndex = focusedIndex >= 0 ? focusedIndex : (overview.initialIndex ?? 0)
  const resultKey = (result.id || JSON.stringify(result)) + ':' + (focusScaleKey || '')
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
  const evidence = assessmentEvidenceStatus({ result, section, report, locale })
  const dimension = section.bandBasis === 'unavailable' || !Array.isArray(result?.dimensions)
    ? null : result.dimensions.find(item => item?.key === section.key)
  const guide = section.bandBasis === 'unavailable' ? null : guideByScale.get(section.key)
  const model = gaugeModel(dimension, result, locale)
  const anchor = model?.currentAnswerBand || null
  const scoreLevelGuide = model?.scoreLevelGuide || null
  const rangeReading = model?.rangeReading || null
  const situationObservation = model?.observation || null
  const hasPlainLanguageGuide = Boolean(
    (scoreLevelGuide || anchor) && (result?.definitionKey?.startsWith('hh-') || result?.definitionKey?.startsWith('cbi-'))
  )
  const rawNote = !model ? null : model.displayKind === 'screening-count'
    ? ru ? 'Количество ответов в заштрихованных клетках. Это не шкала тяжести.' : 'Number of responses in shaded cells. This is not a severity scale.'
    : section.bandBasis === 'screening'
      ? ru ? 'Больше баллов означает больше отмеченных симптомов — не показатель здоровья.' : 'Higher scores reflect more reported symptoms, not a health score.'
    : model.orientation === 'difficulty'
      ? ru ? 'Больше баллов = больше описанных трудностей.' : 'A higher score means more reported difficulties.'
      : model.orientation === 'resource'
        ? ru ? 'Больше баллов = больше описанных ресурсов.' : 'A higher score means more reported resources.'
        : ru ? 'Описательная шкала: больше не означает лучше или хуже.' : 'Descriptive scale: higher is not automatically better or worse.'
  // The model supplies the semantic explanation separately from the numeric
  // score prefix. Legacy/specialised reports retain their complete explanation.
  const conciseMeaning = section.summary || section.meaning
  const canShowScore = typeof section.value === 'number' && Number.isFinite(section.value)
  // Keep material integrity, translation and mixed-polarity warnings visible.
  // Only repetitive methodological boilerplate for safely identified original
  // HH self-reflection scales belongs behind the method disclosure.
  const materialCaveat = section.limitations?.some(note =>
    /translation|unvalidated|russian form|without reversing|перевод|английск|русск|без разворота/i.test(note))
  const showCaveatsInline = report.verified === false || section.bandBasis === 'unavailable' ||
    !result?.definitionKey?.startsWith('hh-') || materialCaveat
  const primarySupport = report.verified === false || section.bandBasis === 'unavailable'
    ? null : section.recommendedReview && section.followUp
      ? section.followUp : section.primarySupport || section.steps?.[0] || section.followUp

  return <section className={styles.report} data-personal-result-report data-compact-assessment-report
    aria-label={ru ? 'Мои результаты и рекомендации' : 'Results and recommendations'}>
    {report.verified === false && <p className={styles.contextNote} role="note" data-unverified-assessment-result>{report.intro}</p>}
    {report.verified === true && report.checkinInsight?.kind === 'original-descriptive-checkin' &&
      <aside className={styles.checkinReflection} role="note"
        aria-label={ru ? 'Самонаблюдение по вашим ответам' : 'Reflection on your answers'}
        data-original-checkin-reflection data-checkin-focus-key={report.checkinInsight.focusKey}>
        <h2>{ru ? 'Из ваших ответов' : 'From your answers'}</h2>
        <p>{report.checkinInsight.summary}</p>
        <p className={styles.checkinReflectionQuestion}>
          <strong>{ru ? 'Вопрос для самонаблюдения: ' : 'One question to consider: '}</strong>
          {report.checkinInsight.reflectionQuestion}
        </p>
      </aside>}
    <section className={styles.picker} id="hh-assessment-scales" data-assessment-scales data-assessment-scale-picker
      aria-labelledby="hh-assessment-scale-title">
      <div className={styles.pickerHeader}>
        <h2 id="hh-assessment-scale-title">{ru ? 'Шкалы теста' : 'Test scales'}</h2>
        <span>{sections.length} {ru ? 'показателей' : 'measures'}</span>
      </div>
      {phq4 && <div className={styles.phq4Overview} data-phq4-overview role="note">
        <strong>{anxiety.recommendedReview
          ? ru ? 'На что обратить внимание: тревога' : 'Key finding: anxiety deserves attention'
          : mood.recommendedReview
            ? ru ? 'На что обратить внимание: настроение' : 'Key finding: mood deserves attention'
            : ru ? 'Ваш результат за две недели' : 'Your two-week overview'}</strong>
        <p>{ru
          ? `Тревога ${anxiety.value}/6 — ${anxiety.value >= 3 ? 'достигнут скрининговый порог 3' : 'ниже порога 3'}; настроение ${mood.value}/6 — ${mood.value >= 3 ? 'достигнут порог 3' : 'ниже порога 3'}. Общая сумма ${total.value}/12 («${total.band}»). Показатели помогают выбрать тему для уточнения, а не поставить диагноз.`
          : `Anxiety ${anxiety.value}/6 — ${anxiety.value >= 3 ? 'meets the screening threshold of 3' : 'below the threshold of 3'}; mood ${mood.value}/6 — ${mood.value >= 3 ? 'meets the threshold of 3' : 'below the threshold of 3'}. Total ${total.value}/12 (“${total.band}”). These scores guide follow-up, not diagnosis.`}</p>
      </div>}
      <div className={styles.scaleTabs + (phq4 ? ' ' + styles.phq4ScaleTabs : '')}
        data-phq4-compact-tabs={phq4 || undefined}
        role="group" aria-label={ru ? 'Выберите шкалу для просмотра' : 'Choose a scale to explore'}>
        {sections.map((item, index) => {
          const validScore = typeof item.value === 'number' && Number.isFinite(item.value)
          return <button type="button" key={item.key + ':' + index}
            data-assessment-scale-trigger={item.key} aria-controls="hh-assessment-scale-panel"
            aria-pressed={selectedIndex === index}
            className={styles.scaleTab + (selectedIndex === index ? ' ' + styles.selected : '')}
            onClick={() => setActiveIndex(index)}>
            <span className={styles.tabName}>{phq4ShortName(item.key, locale) || item.construct || item.title}</span>
            <span className={styles.tabMeta}>
              {validScore ? (item.min === 0 ? item.value + ' / ' + item.max : item.value + ' · ' + item.min + '–' + item.max) : (item.band || (ru ? 'Без числового балла' : 'No numeric score'))}
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
      <div className={styles.measure + (!showCaveatsInline && section.bandBasis === 'descriptive' ? ' ' + styles.quietGauge : '')}>
        <ScoreGauge dimension={dimension} locale={locale} result={result} showLegend={false} showScaleNote={false}/>
        <div className={styles.summary}>
          <h3>{phq4ShortName(section.key, locale) || section.construct || section.title}</h3>
          {rangeReading && <p className={styles.currentScoreRange} data-current-score-range>
            <strong>{rangeReading.selectedCaption}:</strong> {rangeReading.current.label}
            <span>{rangeReading.current.displayRange}</span>
          </p>}
          {!rangeReading && scoreLevelGuide && <p className={styles.band} data-descriptive-score-current>{scoreLevelGuide.current.label}</p>}
          {!rangeReading && section.band && section.bandBasis !== 'descriptive' && <p className={styles.band + (section.recommendedReview ? ' ' + styles.bandNeedsReview : '')}>{section.band}</p>}
          {canShowScore && <p className={styles.scale}>{section.bandBasis === 'unavailable'
            ? (ru ? 'Сохранённое значение' : 'Saved value') : (ru ? 'Баллы' : 'Score')}: {section.value} · {section.bandBasis === 'unavailable'
              ? (ru ? 'непроверенный сохранённый диапазон' : 'unverified saved range') : (ru ? 'шкала' : 'range')} {section.min}–{section.max}</p>}
          {rawNote && <p className={styles.scale} data-scale-direction>{rawNote}</p>}
          <ScoreTrend current={result} previous={previous} dimensionKey={section.key} locale={locale}/>
        </div>
      </div>
      <p className={styles.evidenceStatus} data-assessment-evidence-status={evidence.kind} role="note">
        <strong>{evidence.label}:</strong> {evidence.summary}
      </p>
      {rangeReading && <section className={styles.rangeReport} data-assessment-range-report
        data-range-kind={rangeReading.kind}
        aria-label={ru ? 'Шкала, диапазоны и характеристика результата' : 'Scale, ranges and score interpretation'}>
        <p className={styles.rangeEyebrow}>{ru ? 'ХАРАКТЕРИСТИКА РЕЗУЛЬТАТА' : 'YOUR SCORE INTERPRETATION'}</p>
        <h4 className={styles.rangeHeading}>{rangeReading.heading}</h4>
        <p className={styles.rangeNarrative} data-current-score-position data-range-characterization>
          {rangeReading.narrative}
        </p>
        {rangeReading.contentBoundary && <p className={styles.rangeContext} data-author-construct-boundary role="note">
          <strong>{ru ? 'Что измеряют вопросы и чего нельзя заключать:' : 'What these questions cover and cannot establish:'}</strong>
          {' '}{rangeReading.contentBoundary}
        </p>}
        {rangeReading.contextual && <p className={styles.rangeContext} data-range-context>
          <strong>{ru ? 'Что можно заметить:' : 'What to look for:'}</strong> {rangeReading.contextual}
        </p>}
        {rangeReading.trait && conciseMeaning && <p className={styles.traitReading} data-personality-scale-characterization>
          <strong>{ru ? 'В каких особенностях это проявляется:' : 'How this trait may appear:'}</strong> {conciseMeaning}
        </p>}
        <div className={styles.rangeHeader}>
          <h5>{rangeReading.rangeTitle}</h5>
          <span>{ru ? 'Ваш уровень выделен' : 'Your range is highlighted'}</span>
        </div>
        <ol className={styles.rangeMap} data-all-score-ranges aria-label={rangeReading.rangeTitle}>
          {rangeReading.rows.map((band, index) => <li key={band.code}
            data-score-range={band.code} data-selected-score-range={band.current || undefined}
            aria-current={band.current ? 'true' : undefined}>
            <small className={styles.rangePosition}>{rangeReading.rows.length > 1 ? index + 1 : (ru ? 'Шкала' : 'Scale')}</small>
            <b>{band.displayRange}</b>
            <span>{band.originalAnswerCode !== null && band.originalAnswerCode !== undefined
              ? (ru ? '≈ вариант ' : '≈ option ') + band.originalAnswerCode + ' · ' : ''}{band.label}</span>
            {band.current && <em>{ru ? 'Ваш' : 'Yours'}</em>}
          </li>)}
        </ol>
        {rangeReading.rows.length > 1 && <details className={styles.rangeDescriptions} data-score-range-descriptions>
          <summary>{ru ? 'Пояснения всех диапазонов' : 'What every range means'}</summary>
          <ol className={styles.rangeDetailsList}>
            {rangeReading.rows.map(band => <li key={band.code}
              data-score-range-description={band.code}
              data-selected-score-description={band.current || undefined}>
              <strong>{band.displayRange} — {band.label}</strong>
              <p>{band.note}</p>
              {Array.isArray(band.scorePoints) && <small data-attainable-score-points>
                {ru ? 'Достижимые баллы: ' : 'Attainable scores: '}
                {band.scorePoints.length <= 18
                  ? band.scorePoints.map(point => new Intl.NumberFormat(ru ? 'ru-RU' : 'en-US',
                      { maximumFractionDigits: 2 }).format(point)).join('; ')
                  : (ru ? 'всего ' : 'total ') + band.scorePoints.length}
              </small>}
              {band.current && <small>{ru ? 'Ваш текущий диапазон' : 'Your current range'}</small>}
            </li>)}
          </ol>
        </details>}
        <p className={styles.rangeCaveat} data-range-evidence-status>{rangeReading.caution}</p>
        {rangeReading.sourceQuestions?.length > 0 && <details className={styles.rangeDescriptions}
          data-author-cluster-source-items>
          <summary>{ru ? 'Какие вопросы входят в эту шкалу' : 'Which questions contribute to this scale'}
            {' · '}{rangeReading.sourceQuestions.length}</summary>
          <p data-author-cluster-scoring>{rangeReading.scoringNote}</p>
          {rangeReading.sourceResponseOptions?.length > 0 && <div data-author-response-codes
            aria-label={ru ? 'Числа и названия исходных вариантов ответа' : 'Numeric codes and original answer labels'}>
            <strong>{ru ? 'Как кодируются ответы:' : 'Original answer codes:'}</strong>
            <ol className={styles.rangeDetailsList}>
              {rangeReading.sourceResponseOptions.map(option => <li key={option.value}>
                <strong>{option.value}</strong>{' — '}{option.label}
              </li>)}
            </ol>
          </div>}
          {rangeReading.legacyVersion && <p role="note" data-legacy-version-incompatible>
            {ru ? 'Архивная версия ' : 'Archived version '}{rangeReading.legacyVersion}
            {ru ? ' · новая версия ' : ' · current version '}{rangeReading.newerVersion}
            {ru ? '. Общие баллы разных версий напрямую не сравниваются.' : '. Scores are not directly comparable across these versions.'}
          </p>}
          <ol className={styles.rangeDetailsList} data-author-cluster-items>
            {rangeReading.sourceQuestions.map(question => <li key={question.id}>
              {question.domain && <strong>{question.domain}: </strong>}{question.text}
            </li>)}
          </ol>
        </details>}
      </section>}
      {!rangeReading && model?.bands?.length > 0 && <div className={styles.bandStrip} data-score-band-strip
        aria-label={ru ? 'Диапазоны скрининга и ваш результат' : 'Screening intervals and your result'}>
        {model.bands.map(band => <span key={band.code}
          className={(band.code === model.currentBand?.code) ? (section.recommendedReview ? styles.reviewInterval : styles.currentInterval) : ''}
          aria-current={(band.code === model.currentBand?.code) ? 'true' : undefined}>
          <b>{band.from}–{band.to}</b> {band.label}{(band.code === model.currentBand?.code) ? (ru ? ' · ваш' : ' · yours') : ''}
          <small>{explainPublishedLevel(band.code, locale)}</small>
        </span>)}
      </div>}
      {!rangeReading && scoreLevelGuide && <section className={styles.levelGuide} data-descriptive-score-guide
        aria-label={ru ? 'Пояснение вашего результата и уровней шкалы' : 'Explanation of your result and scale levels'}>
        <p className={styles.levelEyebrow}>{ru ? 'ПОНЯТНЫЙ РАЗБОР РЕЗУЛЬТАТА' : 'YOUR SCORE EXPLAINED'}</p>
        <h4 className={styles.levelTitle}>{scoreLevelGuide.title}: {scoreLevelGuide.current.label}</h4>
        <p className={styles.levelLead} data-current-score-position>{scoreLevelGuide.current.note}</p>
        <p className={styles.levelOverview}>{scoreLevelGuide.overview}</p>
        {scoreLevelGuide.observation && <p className={styles.levelObservation} data-situation-observation>
          <strong>{ru ? 'Что заметить:' : 'What to notice:'}</strong> {scoreLevelGuide.observation}
        </p>}
        <div className={styles.levelMeter} data-level-direction={model?.orientation || 'neutral'} aria-hidden="true">
          {scoreLevelGuide.bands.map(band => <span key={band.code}
            data-current-position={band.current || undefined} />)}
        </div>
        <details className={styles.levelDisclosure} data-score-level-disclosure>
          <summary>{ru ? 'Все пять уровней — пояснение каждого' : 'All five levels — what each means'}</summary>
        <h5 className={styles.levelSubheading}>{scoreLevelGuide.heading}</h5>
        <ol className={styles.levelList} data-score-level-descriptions>
          {scoreLevelGuide.bands.map((band, index) => <li key={band.code}
            data-current-position={band.current || undefined}
            aria-current={band.current ? 'true' : undefined}>
            <span className={styles.levelIndex}>{index + 1}</span>
            <div className={styles.levelBody}>
              <div className={styles.levelHeading}>
                <strong>{band.label}</strong>
                <span>{band.displayRange}</span>
              </div>
              <p>{band.note}</p>
              {band.current && <small>{ru ? 'Ваш участок шкалы' : 'Your scale position'}</small>}
            </div>
          </li>)}
        </ol>
        </details>
        <p className={styles.levelCaveat}>{scoreLevelGuide.caveat}</p>
      </section>}
      {!rangeReading && anchor && <section className={styles.answerReading} data-answer-interpretation aria-label={ru ? 'Оценка результата' : 'Your score in context'}>
        <p className={styles.readingLabel}>{ru ? 'Что означает ваш результат' : 'What your result means'}</p>
        <p className={styles.readingTitle}>{anchor.levelLabel ? anchor.levelLabel + ' · ' : ''}{anchor.label}</p>
        <p>{anchor.note}</p>
        {situationObservation && <p className={styles.levelObservation} data-situation-observation>
          <strong>{ru ? 'Что заметить:' : 'What to notice:'}</strong> {situationObservation}
        </p>}
      </section>}
      {!rangeReading && section.responseAnchors && <div className={styles.responseEndpoints} data-questionnaire-anchors>
        <span><strong>{section.min}</strong> {section.responseAnchors.low}</span>
        <span><strong>{section.max}</strong> {section.responseAnchors.high}</span>
      </div>}
      {conciseMeaning && !hasPlainLanguageGuide && !rangeReading && <section className={styles.interpretation} aria-label={ru ? 'Что показывают ваши ответы' : 'What your answers show'}>
        <h4>{ru ? 'Что показывают ваши ответы' : 'What your answers show'}</h4>
        <p className={styles.explanation} data-scale-meaning>{conciseMeaning}</p>
      </section>}
      {conciseMeaning && (hasPlainLanguageGuide || rangeReading) && <details className={styles.measureDetails} data-technical-score-reading>
        <summary>{ru ? 'Точная методика расчёта результата' : 'How the questionnaire score is calculated'}</summary>
        <p>{conciseMeaning}</p>
      </details>}
      {!rangeReading && anchor && <section className={styles.answerRanges} data-answer-ranges aria-label={ru ? 'Пояснение диапазонов ответов' : 'Explanation of response ranges'}>
        <h4>{ru ? 'Пять описательных диапазонов' : 'Five descriptive response ranges'}</h4>
        <ol className={styles.rangeList}>
          {model.answerBands.map((band, index) => <li key={band.code}
            data-active-answer-range={band.current || undefined} data-answer-level={index + 1}
            aria-current={band.current ? 'true' : undefined}>
            <span className={styles.rangeSwatch} style={{ backgroundColor: ['#b78363', '#c7a66b', '#b1ae72', '#729a87', '#397f69'][Math.min(index, 4)] }} aria-hidden="true"/>
            <span className={styles.rangeContent}>
              <span className={styles.rangeHeading}>
                <strong>{band.displayRange}</strong>
                <b>{band.levelLabel || band.label}</b>
              </span>
              {band.levelLabel && <small>{band.label}</small>}
              <span className={styles.rangeNarrative}>{band.note}</span>
              {band.current && <em>{ru ? 'Ваш диапазон' : 'Your range'}</em>}
            </span>
          </li>)}
        </ol>
        <p className={styles.answerCaveat}>{ru
          ? 'Диапазоны показывают, к какому исходному варианту ответа ближе средний балл. Это ориентир для самонаблюдения, не медицинские нормы и не оценка «хорошо/плохо».'
          : 'These ranges show which original answer option is closest to your average. They guide self-reflection, not clinical norms or a pass/fail judgement.'}</p>
      </section>}
      {showCaveatsInline && section.limitations?.map(limit => <p key={limit} className={styles.contextNote} role="note" data-scale-limitation>{limit}</p>)}
      {primarySupport && <div className={styles.recommendations}>
        <h4>{ru ? 'Поддержка в вашем темпе' : 'Support at your own pace'}</h4>
        <p className={section.recommendedReview ? styles.care : styles.explanation}
          role={section.recommendedReview ? 'note' : undefined} data-primary-support>{primarySupport}</p>
      </div>}
      <details className={styles.details}>
        <summary>{ru ? 'Подробнее об этой шкале' : 'More about this scale'}</summary>
        {section.bandBasis === 'descriptive' && section.band && <p className={styles.technicalBand}>{section.band}</p>}
        {section.meaning && section.meaning !== conciseMeaning && <p>{section.meaning}</p>}
        {!showCaveatsInline && section.limitations?.map(limit => <p key={limit} data-scale-limitation>{limit}</p>)}
        {guide?.watch && <p><strong>{ru ? 'Что наблюдать:' : 'What to monitor:'}</strong> {guide.watch}</p>}
        {guide?.skill && <p><strong>{ru ? 'Навык по желанию:' : 'Optional skill:'}</strong> {guide.skill}</p>}
        {section.followUp && section.followUp !== primarySupport && <p>{section.followUp}</p>}
        {section.steps?.length > 0 && <ol>{section.steps.filter(step => step !== primarySupport).map((step, index) => <li key={index}>{step}</li>)}</ol>}
        {section.bandBasis === 'screening' && <p>{ru ? 'Скрининг не устанавливает диагноз.' : 'Screening is not a diagnosis.'}</p>}

      </details>
    </article>

    {report.personalityType && <section className={styles.typeSummary} data-personality-type-summary>
      <p className={styles.rangeEyebrow}>{ru ? 'ЛИЧНОСТНЫЙ ПРОФИЛЬ ПО ОТВЕТАМ' : 'PERSONALITY PATTERN FROM RESPONSES'}</p>
      <h3>{report.personalityType.headline}</h3>
      <p>{report.personalityType.description}</p>
      {report.personalityType.alternatives?.length > 0 && <details>
        <summary>{ru ? 'Другие возможные интерпретации' : 'Other possible interpretations'}</summary>
        {report.personalityType.alternatives.map(alternative => <p key={alternative}>{alternative}</p>)}
      </details>}
      <small>{report.personalityType.warning}</small>
    </section>}
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
        {evidence.limitations && <p data-assessment-reliability-caveat>{evidence.limitations}</p>}
        {evidence.languageNote && <p data-assessment-language-caveat>{evidence.languageNote}</p>}
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
