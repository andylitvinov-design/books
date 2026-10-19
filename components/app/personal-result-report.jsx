import Link from 'next/link'
import { buildAssessmentResultReport } from '@/lib/assessments/result-report'
import { getTestScaleGuide } from '@/lib/assessments/scale-guides'
import styles from './personal-result-report.module.css'
import { CompactAssessmentReport } from './compact-assessment-report'
import { CheckinFacetReport } from './checkin-facet-report'

export function PersonalResultReport({ result, locale = 'en', previous = null, focusScaleKey = null }) {
  const report = buildAssessmentResultReport(result, locale)
  if (!report.sections.length) return <section data-personal-result-report data-unverified-assessment-result>
    <p role="note">{report.intro}</p>
  </section>
  if (report.reportKind === 'checkin-facets' && report.verified === true) return <CheckinFacetReport result={result} report={report} locale={locale} focusScaleKey={focusScaleKey} />
  const ru = locale === 'ru'
  const bach = report.reportKind === 'bach'
  const verified = report.verified !== false
  // Keep the bespoke Bach ranking presentation; numeric tests use the concise dial layout.
  if (!bach) return <CompactAssessmentReport result={result} previous={previous} report={report} locale={locale} focusScaleKey={focusScaleKey} />
  const scaleGuide = getTestScaleGuide(result?.definitionKey, locale)
  const byScale = new Map((scaleGuide?.scales || []).map(scale=>[scale.key,scale]))
  const hasTrainableSkills = Boolean(scaleGuide?.skillAxes?.length)
  const featured = bach && verified ? report.sections.slice(0, report.highlightedCount) : report.sections
  const extra = bach && verified ? report.sections.slice(report.highlightedCount) : []
  const renderCard = (section, index) => (
    <article key={section.key + ':' + index} className={styles.card}>
      <div className={styles.cardHead}>
        <span className={styles.number}>{String(index + 1).padStart(2, '0')}</span>
        <div>
          {bach && verified && section.group !== 'not-marked' && (
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
          {bach && verified && <p className={styles.bachSelectedGroup} data-bach-selected-group={section.group}>
            <strong>{ru ? 'Статус совпадения:' : 'Match status:'}</strong>{' '}
            {section.group === 'main' ? (ru ? 'ведущая эмоциональная тема' : 'leading emotional theme')
              : section.group === 'support' ? (ru ? 'дополнительная тема для изучения' : 'supporting theme for reflection')
                : (ru ? 'тема вне ведущих совпадений' : 'theme outside the leading matches')}
          </p>}
          <p className={styles.score}>{bach
            ? (verified ? (ru ? 'Вес совпадений' : 'Weighted match') : (ru ? 'Сохранённое значение' : 'Saved value')) + ': ' +
              (section.value ?? (ru ? 'недоступно' : 'unavailable')) + ' (' +
              (verified ? (ru ? 'диапазон' : 'range') : (ru ? 'непроверенный сохранённый диапазон' : 'unverified saved range')) + ' ' +
              (section.min ?? '?') + '–' + (section.max ?? '?') + ')'
            : (ru ? 'Результат' : 'Your score') + ': ' + section.value + ' (' + (ru ? 'диапазон' : 'range') + ' ' + section.min + '–' + section.max + ')'}</p>
        </div>
      </div>
      <p className={styles.meaning}>{section.meaning}</p>
      {!bach && byScale.has(section.key) && <div className={styles.observation} data-report-scale={section.key}>
        <p><strong>{ru?'Что наблюдать':'What to monitor'}:</strong> {byScale.get(section.key).watch}</p>
        {!!byScale.get(section.key).skill && <p><strong>{ru?'Навык по желанию':'Optional skill'}:</strong> {byScale.get(section.key).skill}</p>}
      </div>}
      {!bach && section.bandBasis && <p className={styles.band}>{section.bandBasis === 'screening' ? (ru ? 'Опубликованный скрининговый диапазон' : 'Published screening band') : section.bandBasis === 'published-reference' ? (ru ? 'Справочный диапазон инструмента' : 'Instrument reference band') : (ru ? 'Описательный показатель' : 'Descriptive measure')}</p>}
      {section.steps.length > 0 && <>
        <h4>{ru ? 'Что попробовать за неделю' : 'Try this over the next week'}</h4>
        <ol className={styles.steps}>
          {section.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </>}
      {section.limitations?.map(limitation => <p key={limitation} className={styles.followUp}>{limitation}</p>)}
      <p className={styles.followUp}>{section.followUp}</p>
      {section.source && <a className={styles.source} href={section.source} target="_blank" rel="noopener noreferrer">{ru ? 'Источник интерпретации' : 'Interpretation source'}</a>}
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
          {report.scaleNote && <p>{report.scaleNote}</p>}
          {report.source && <a className={styles.source} href={report.source} target="_blank" rel="noopener noreferrer">{ru ? 'Источник опросника' : 'Questionnaire source'}</a>}
          {report.methodology && <p className={styles.methodology}><strong>{ru ? 'Происхождение и профессиональный статус' : 'Origin & evidence'}:</strong> {report.methodology}</p>}
        </div>
      </header>
      {bach && verified && <section className={styles.bachScaleGuide} data-bach-score-reading>
        <h3>{ru ? 'Как читать эмоциональный профиль' : 'How to read your emotional profile'}</h3>
        <p>{ru
          ? 'Здесь не используются клинические уровни. Каждая тема получает вес совпадений по вашим ответам и свою позицию относительно других тем именно этого прохождения.'
          : 'There are no clinical severity levels here. Each emotional theme receives a weighted match score and a position relative to the other themes in this particular response set.'}</p>
        <div className={styles.bachRankLegend} data-bach-match-categories>
          <span><strong>{ru ? '3 ведущие темы' : '3 leading themes'}</strong>
            {ru ? 'Самые заметные совпадения для размышления' : 'Most prominent questionnaire matches to explore'}</span>
          <span><strong>{ru ? 'До 4 дополнительных' : 'Up to 4 supporting'}</strong>
            {ru ? 'Другие заметные эмоциональные темы' : 'Other notable emotional themes'}</span>
          <span><strong>{ru ? 'Остальные темы' : 'Other themes'}</strong>
            {ru ? 'Не входят в ведущую группу этого прохождения' : 'Outside this attempt’s leading matches'}</span>
        </div>
        <small>{ru
          ? 'Группы основаны на рейтинге ответов, а не на опубликованных диагностических порогах. Результат не является назначением препаратов или эссенций.'
          : 'Groups reflect within-attempt response ranking, not published diagnostic cutoffs. The result is not a remedy or essence prescription.'}</small>
      </section>}
      {bach && verified && featured.length > 0 && (
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
        {!bach && hasTrainableSkills && <Link className={styles.myCourseLink} href={`/${ru?'ru':'en'}/app/course`} prefetch={false}>
          {ru?'Выбрать навык и начать бесплатный личный курс →':'Choose a skill and explore your free personal course →'}
        </Link>}
        {!bach && report.rulesVersion && <small className={styles.ruleVersion}>{ru ? 'Версия интерпретации' : 'Interpretation version'}: {report.rulesVersion}</small>}
      </footer>
    </section>
  )
}
