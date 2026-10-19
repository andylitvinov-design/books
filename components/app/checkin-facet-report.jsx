import { ScoreGauge } from './assessment-gauge'
import styles from './personal-result-report.module.css'

// Reached only through the verified exact-source report branch. Preserve the
// instrument's facet order and wording; no score-based choice or ranking.
export function CheckinFacetReport({ result, report, locale = 'en', focusScaleKey = null }) {
  const ru = locale === 'ru'
  const sourceLocale = result.instrumentLocale
  const focusedKey = typeof focusScaleKey === 'string' && report.sections.some(section => section.key === focusScaleKey)
    ? focusScaleKey : null
  const recall = {
    'right-now': ru ? 'Прямо сейчас' : 'Right now',
    'past-7-days': ru ? 'Последние 7 дней' : 'Past 7 days',
    'past-30-days': ru ? 'Последние 30 дней' : 'Past 30 days',
  }[result.timeframe]
  const { answered, expected, missing, complete } = report.completeness

  return <section className={styles.report} data-personal-result-report data-checkin-facet-report
    aria-label={report.title}>
    <header className={styles.heading}>
      <h2 lang={sourceLocale}>{report.title}</h2>
      <p>{report.intro}</p>
      {report.purpose && <p>{report.purpose}</p>}
      {recall && <p data-checkin-recall><strong>{ru ? 'Период ответа:' : 'Response period:'}</strong> {recall}</p>}
      <p data-checkin-completeness={complete ? 'complete' : 'incomplete'}>
        {ru ? 'Ответов:' : 'Responses:'} {answered} / {expected}.{' '}
        {ru ? 'Пропусков:' : 'Missing:'} {missing}.
      </p>
      {sourceLocale !== (ru ? 'ru' : 'en') && <p role="note" data-checkin-original-language>
        {ru
          ? 'Формулировки вопросов и ответов сохранены на английском языке исходной формы.'
          : 'Question wording and response labels are preserved in the original Russian form.'}
      </p>}
      {report.methodology && <p className={styles.methodology} role="note" data-checkin-evidence>
        <strong>{ru ? 'Происхождение и ограничения:' : 'Origin and limitations:'}</strong> {report.methodology}
      </p>}
    </header>
    <div id="hh-assessment-scales" className={styles.grid} data-assessment-scales>
      {report.sections.map((section, index) => {
        const focused = focusedKey === section.key
        const dimension = result.dimensions.find(item => item.key === section.key)
        return <article key={section.key} className={styles.card}
          id={focused ? 'hh-assessment-scale-panel' : `hh-assessment-facet-${index + 1}`}
          data-checkin-facet={section.key} data-active-scale={focused ? section.key : undefined}
          aria-labelledby={`hh-checkin-facet-title-${index + 1}`}>
          {focused && <p className={styles.groupLabel} data-checkin-requested-focus>{ru ? 'Выбранный вами аспект' : 'The aspect you selected'}</p>}
          <h3 id={`hh-checkin-facet-title-${index + 1}`} lang={sourceLocale}>{section.construct || section.label || section.title}</h3>
          <ScoreGauge dimension={dimension} result={result} locale={locale} showScaleNote={false} />
          {(section.summary || section.meaning) && <p className={styles.meaning}>{section.summary || section.meaning}</p>}
        </article>
      })}
    </div>
    {report.note && <footer className={styles.footer}><p role="note">{report.note}</p></footer>}
  </section>
}
