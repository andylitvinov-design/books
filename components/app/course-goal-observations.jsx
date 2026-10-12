'use client'

import { useId } from 'react'
import styles from './course-goal-observations.module.css'

const WORDS = {
  en: {
    title: 'Optional observations about your chosen goals',
    prompt: 'How well does each statement fit your experience today?',
    optional: 'Every answer is optional. There is no preferred answer. You can leave a statement unanswered or explicitly skip it without a course penalty.',
    storage: 'When you save the completed learning day, these selected ratings and skips are saved privately in your account for your weekly reports. Choosing an option alone sends nothing. Leaving or reloading this page can lose unsaved choices.',
    scope: 'These are subjective observations about one skill or experience, separate from your formal test results. They do not measure health, recovery or treatment results, and a change does not show that the course caused it.',
    language: 'Statement and response language', languages: { en: 'English', ru: 'Russian' }, version: 'Statement version', statement: 'Statement identifier',
    family: 'Statement family', familyVersion: 'Statement family version',
    pinned: 'Wording can vary between learning days while staying close to the same goal. Each answer keeps its exact statement and language. Changing the interface language does not translate saved statements. Different goals, languages and statement-family versions are separate series.',
    skip: 'Skip this statement', clear: 'Clear this choice', unanswered: 'Not answered', skipped: 'Explicitly skipped',
    reportsTitle: 'Your private weekly observations',
    reportTiming: 'Reports appear here after learning days 7, 14 and 21 are recorded. Learning weeks can span more than seven calendar days.',
    noReports: 'No weekly observation report is available yet.',
    reportScope: 'Each series groups answers to close-meaning statements for the same goal, statement family and language over the period shown. Wording can vary; equivalence as a measurement has not been established. A raw difference describes answers only, not improvement or a course effect. Missing answers are not zero.',
    week: 'Learning week', days: 'Learning days', day: 'Learning day', recorded: 'Checkpoint recorded',
    thisWeek: 'This learning week', courseToDate: 'Since the course began', savedTitle: 'Saved observations about your goals',
    noSeries: 'No statement observations were saved for this learning week.',
    noCumulative: 'No statement observations were saved from the start of the course through this checkpoint.',
    count: 'Recorded ratings', presented: 'Statements presented', first: 'First recorded rating', latest: 'Latest recorded rating',
    difference: 'Latest minus first', missing: 'Unanswered statements', skippedCount: 'Explicitly skipped statements',
    noRatings: 'No rating was recorded for this series.', oneRating: 'One rating is available. At least two are needed for a difference.',
    noDifference: 'At least two ratings in this exact series are needed for a difference.',
    observations: 'Saved observations and dates', localDate: 'Course local date', savedAt: 'Saved at', notRecorded: 'Not recorded',
    missingSessions: 'Learning days without a saved session', missingSnapshots: 'Completed learning days without saved statements',
    skippedLessons: 'Skipped learning days (no ratings)', unknownHistory: 'Missing historical statements are not reconstructed or counted as zero.',
  },
  ru: {
    title: 'Необязательные наблюдения по выбранным целям',
    prompt: 'Насколько каждое утверждение соответствует вашему опыту сегодня?',
    optional: 'Все ответы необязательны. Предпочтительного ответа нет. Можно оставить утверждение без ответа или явно пропустить его без последствий для прохождения курса.',
    storage: 'При сохранении выполненного учебного дня выбранные оценки и пропуски приватно сохраняются в вашем аккаунте для еженедельных отчётов. Сам выбор ответа ничего не отправляет. Уход или перезагрузка страницы могут удалить несохранённый выбор.',
    scope: 'Это субъективные наблюдения об отдельном навыке или опыте, отдельно от результатов формальных тестов. Они не измеряют здоровье, восстановление или результаты лечения, а изменение не доказывает влияние курса.',
    language: 'Язык утверждения и ответов', languages: { en: 'Английский', ru: 'Русский' }, version: 'Версия утверждения', statement: 'Идентификатор утверждения',
    family: 'Группа утверждений', familyVersion: 'Версия группы утверждений',
    pinned: 'Формулировка может меняться между учебными днями, сохраняя близкий смысл для одной цели. У каждого ответа сохраняются точное утверждение и его язык. Смена языка интерфейса не переводит сохранённые утверждения. Разные цели, языки и версии группы утверждений показаны отдельными сериями.',
    skip: 'Пропустить утверждение', clear: 'Убрать этот выбор', unanswered: 'Без ответа', skipped: 'Явно пропущено',
    reportsTitle: 'Мои приватные наблюдения за неделю',
    reportTiming: 'Отчёты появляются здесь после сохранения учебных дней 7, 14 и 21. Учебная неделя может длиться больше семи календарных дней.',
    noReports: 'Еженедельный отчёт о наблюдениях пока недоступен.',
    reportScope: 'Каждая серия объединяет ответы на близкие по смыслу утверждения для одной цели, группы утверждений и языка за указанный период. Формулировки могут меняться; их измерительная эквивалентность не установлена. Разница баллов описывает только ответы, а не улучшение или влияние курса. Отсутствующий ответ не равен нулю.',
    week: 'Учебная неделя', days: 'Учебные дни', day: 'Учебный день', recorded: 'Контрольный день сохранён',
    thisWeek: 'За эту учебную неделю', courseToDate: 'С начала курса', savedTitle: 'Сохранённые наблюдения по целям',
    noSeries: 'За эту учебную неделю наблюдения по утверждениям не сохранялись.',
    noCumulative: 'С начала курса до этого контрольного дня наблюдения по утверждениям не сохранялись.',
    count: 'Сохранено оценок', presented: 'Предъявлено утверждений', first: 'Первая сохранённая оценка', latest: 'Последняя сохранённая оценка',
    difference: 'Последний минус первый', missing: 'Утверждений без ответа', skippedCount: 'Явно пропущено утверждений',
    noRatings: 'В этой серии нет сохранённых оценок.', oneRating: 'Сохранена одна оценка. Для разницы нужны хотя бы две.',
    noDifference: 'Для разницы нужны хотя бы две оценки в этой точной серии.',
    observations: 'Сохранённые наблюдения и даты', localDate: 'Местная дата курса', savedAt: 'Время сохранения', notRecorded: 'Не записано',
    missingSessions: 'Учебные дни без сохранённого занятия', missingSnapshots: 'Выполненные учебные дни без сохранённых утверждений',
    skippedLessons: 'Пропущенные учебные дни (без оценок)', unknownHistory: 'Отсутствующие исторические утверждения не восстанавливаются и не считаются нулём.',
  },
}

const localeOf = locale => locale === 'ru' ? 'ru' : 'en'
const ratingValid = rating => Number.isInteger(rating) && rating >= 1 && rating <= 5
const textValid = value => typeof value === 'string' && value.trim().length > 0
const rowDisplayable = row => row && ['en', 'ru'].includes(row.contentLocale) &&
  ['goalId', 'seriesId', 'statementId', 'statementKey', 'statementVersion', 'statementText'].every(key => textValid(row[key]))
const seriesDisplayable = row => row && ['en', 'ru'].includes(row.contentLocale) &&
  ['goalId', 'seriesId', 'statementFamilyId', 'statementFamilyVersion'].every(key => textValid(row[key]))
const anchorsDisplayable = anchors => Array.isArray(anchors) && anchors.length === 5 &&
  anchors.every((anchor, index) => anchor.value === index + 1 && ['en', 'ru'].every(lang => textValid(anchor.label?.[lang])))
const countText = (value, t) => Number.isInteger(value) && value >= 0 ? value : t.notRecorded

function StatementIdentity({ row, t }) {
  return <dl className={styles.identity}>
    <div><dt>{t.language}</dt><dd>{t.languages[row.contentLocale]}</dd></div>
    <div><dt>{t.version}</dt><dd>{row.statementVersion}</dd></div>
    <div><dt>{t.statement}</dt><dd>{row.statementId}</dd></div>
  </dl>
}

function FamilyIdentity({ row, t }) {
  return <dl className={styles.identity}>
    <div><dt>{t.language}</dt><dd>{t.languages[row.contentLocale]}</dd></div>
    <div><dt>{t.family}</dt><dd>{row.statementFamilyId}</dd></div>
    <div><dt>{t.familyVersion}</dt><dd>{row.statementFamilyVersion}</dd></div>
  </dl>
}

function SavedStatement({ point, t }) {
  if (!textValid(point?.statementText) || !['en', 'ru'].includes(point.contentLocale)) return null
  return <div className={styles.savedStatement}>
    <p lang={point.contentLocale}>{point.statementText}</p>
    <StatementIdentity row={point} t={t} />
  </div>
}

function choiceFor(row, answers) {
  if (!Array.isArray(answers)) return null
  const matches = answers.filter(answer => answer?.goalId === row.goalId && answer.statementId === row.statementId &&
    answer.statementKey === row.statementKey && answer.seriesId === row.seriesId)
  if (matches.length !== 1) return null
  const rating = matches[0].rating
  return ratingValid(rating) || rating === 'skip' ? rating : null
}

/**
 * Controlled, local-only fields. The caller keeps `answers` as an array of choices,
 * upserts each onChange choice by seriesId, and submits them only on finish-day.
 * The server-issued snapshot binds statement text, version, language and exact goal.
 * Changing a choice emits only the five allowed keys; clearing emits rating: 'missing'.
 * A skipped learning day must omit these choices entirely.
 */
export function GoalObservationFields({ snapshot, answers = [], onChange, disabled = false, locale = 'en' }) {
  const id = useId(), lang = localeOf(locale), t = WORDS[lang]
  if (!snapshot || !Array.isArray(snapshot.rows) || !snapshot.rows.length || !snapshot.rows.every(rowDisplayable) || !anchorsDisplayable(snapshot.anchors)) return null
  const editable = !disabled && typeof onChange === 'function'
  function change(row, rating) {
    if (editable) onChange({ goalId: row.goalId, statementId: row.statementId, statementKey: row.statementKey, seriesId: row.seriesId, rating })
  }
  return <section className={styles.root} aria-labelledby={`${id}-title`} data-course-goal-observations="">
    <h3 id={`${id}-title`}>{t.title}</h3>
    <div className={styles.disclosure} id={`${id}-disclosure`}>
      <p>{t.storage}</p><p>{t.optional}</p><p>{t.scope}</p>
    </div>
    <p>{t.prompt}</p>
    <p className={styles.small}>{t.pinned}</p>
    {snapshot.rows.map((row, index) => {
      const selected = choiceFor(row, answers), statementLang = row.contentLocale
      return <fieldset key={row.seriesId} className={styles.statement} disabled={!editable} aria-describedby={`${id}-disclosure ${id}-${index}-statement ${id}-${index}-identity`}>
        <legend><span lang={statementLang}>{row.goalLabel?.[statementLang] || row.statementId}</span></legend>
        <p id={`${id}-${index}-statement`} className={styles.statementText} lang={statementLang}>{row.statementText}</p>
        <div id={`${id}-${index}-identity`}><StatementIdentity row={row} t={t} /></div>
        <div className={styles.choices}>
          {snapshot.anchors.map(anchor => {
            const rating = anchor.value, label = anchor.label[statementLang]
            return <label key={rating} className={styles.choice} lang={statementLang}>
              <input type="radio" name={`${id}-${index}`} value={rating} checked={selected === rating} disabled={!editable} onChange={() => change(row, rating)} />
              <span>{rating} · {label}</span>
            </label>
          })}
          <label className={styles.choice}>
            <input type="radio" name={`${id}-${index}`} value="skip" checked={selected === 'skip'} disabled={!editable} onChange={() => change(row, 'skip')} />
            <span>{t.skip}</span>
          </label>
        </div>
        <div className={styles.choiceFooter}>
          <span className={styles.small} aria-live="polite">{selected === null ? t.unanswered : selected === 'skip' ? t.skipped : `${selected} / 5`}</span>
          <button type="button" onClick={() => change(row, 'missing')} disabled={!editable || selected === null}>{t.clear}</button>
        </div>
      </fieldset>
    })}
  </section>
}

function dateText(value, locale, withTime = false) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return null
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-GB', {
    dateStyle: 'medium', ...(withTime ? { timeStyle: 'short' } : {}), timeZone: 'UTC',
  }).format(new Date(value))
}

function ObservationDate({ point, locale, t }) {
  const date = dateText(point?.localDate, locale), time = dateText(point?.observedAt, locale, true)
  return <span className={styles.pointDate}>
    <span>{t.day} {point?.day ?? t.notRecorded}</span>
    <span>{t.localDate}: {date ? <time dateTime={point.localDate}>{date}</time> : t.notRecorded}</span>
    <span>{t.savedAt}: {time ? <time dateTime={point.observedAt}>{time} UTC</time> : t.notRecorded}</span>
  </span>
}

function RatingPoint({ point, locale, t }) {
  if (!point || !ratingValid(point.rating)) return <span>{t.notRecorded}</span>
  return <><strong>{point.rating} / 5</strong><ObservationDate point={point} locale={locale} t={t} /><SavedStatement point={point} t={t} /></>
}

/** Read-only archived rows for a saved lesson. No current catalog or editable controls. */
export function SavedCourseGoalObservations({ record, locale = 'en' }) {
  const id = useId(), lang = localeOf(locale), t = WORDS[lang]
  if (!record || !Array.isArray(record.rows) || !record.rows.length || !record.rows.every(rowDisplayable)) return null
  return <section className={styles.root} aria-labelledby={`${id}-title`} data-course-saved-goal-observations="">
    <h3 id={`${id}-title`}>{t.savedTitle}</h3><p className={styles.small}>{t.scope}</p>
    <ObservationDate point={{ day: record.day, observedAt: record.observedAt, localDate: record.localDate }} locale={lang} t={t} />
    {record.rows.map(row => <article className={styles.series} key={row.seriesId}>
      <h4 lang={row.contentLocale}>{row.goalLabel?.[row.contentLocale] || row.statementId}</h4>
      <SavedStatement point={row} t={t} />
      <p>{row.status === 'rated' && ratingValid(row.rating) ? `${row.rating} / 5` : row.status === 'skipped' ? t.skipped : t.unanswered}</p>
      {anchorsDisplayable(record.anchors) && <p className={styles.small} lang={row.contentLocale}>{record.anchors.map(anchor => `${anchor.value} · ${anchor.label[row.contentLocale]}`).join('; ')}</p>}
    </article>)}
  </section>
}

function DayGaps({ coverage, t }) {
  const groups = [
    ['missingSessionDays', t.missingSessions],
    ['missingSnapshotDays', t.missingSnapshots],
    ['skippedLessonDays', t.skippedLessons],
  ].filter(([key]) => Array.isArray(coverage?.[key]) && coverage[key].length > 0)
  if (!groups.length) return null
  return <div className={styles.disclosure}>
    <dl className={styles.identity}>{groups.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{coverage[key].join(', ')}</dd></div>)}</dl>
    <p className={styles.small}>{t.unknownHistory}</p>
  </div>
}

function SeriesReport({ row, anchors, locale, t }) {
  const hasDifference = row.count >= 2 && Number.isInteger(row.rawDelta) && row.rawDelta >= -4 && row.rawDelta <= 4
  const observations = Array.isArray(row.observations) ? row.observations : []
  return <article className={styles.series} data-course-goal-series="">
    <h6 lang={row.contentLocale}>{row.goalLabel?.[row.contentLocale] || row.statementFamilyId}</h6>
    <FamilyIdentity row={row} t={t} />
    <p className={styles.small} lang={row.contentLocale}>{anchors.map(anchor => `${anchor.value} · ${anchor.label[row.contentLocale]}`).join('; ')}</p>
    <dl className={styles.counts}>
      <div><dt>{t.count}</dt><dd>{countText(row.count, t)}</dd></div>
      <div><dt>{t.presented}</dt><dd>{countText(row.presentedCount, t)}</dd></div>
      <div><dt>{t.missing}</dt><dd>{countText(row.missingCount, t)}</dd></div>
      <div><dt>{t.skippedCount}</dt><dd>{countText(row.skippedCount, t)}</dd></div>
    </dl>
    <dl className={styles.readings}>
      <div><dt>{t.first}</dt><dd><RatingPoint point={row.first} locale={locale} t={t} /></dd></div>
      <div><dt>{t.latest}</dt><dd><RatingPoint point={row.latest} locale={locale} t={t} /></dd></div>
      <div><dt>{t.difference}</dt><dd>{hasDifference ? <strong>{row.rawDelta > 0 ? '+' : ''}{row.rawDelta}</strong> : t.noDifference}</dd></div>
    </dl>
    {row.count === 0 && <p>{t.noRatings}</p>}
    {row.count === 1 && <p>{t.oneRating}</p>}
    {observations.length > 0 && <details className={styles.details}>
      <summary>{t.observations}</summary>
      <ul className={styles.observations}>{observations.map((point, index) => <li key={`${point.day}-${index}`}>
        <span>{point.status === 'rated' && ratingValid(point.rating) ? `${point.rating} / 5` : point.status === 'skipped' ? t.skipped : t.unanswered}</span>
        <ObservationDate point={point} locale={locale} t={t} />
        <SavedStatement point={point} t={t} />
      </li>)}</ul>
    </details>}
  </article>
}

/** Displays only already-released backend reports; no clock, recomputation or delivery action. */
export function CourseGoalWeeklyReports({ reports = [], locale = 'en' }) {
  const id = useId(), lang = localeOf(locale), t = WORDS[lang]
  const available = Array.isArray(reports) ? reports.filter(report => report?.status === 'available' &&
    [7, 14, 21].includes(report.checkpointDay) && report.learningDays?.to === report.checkpointDay &&
    report.learningDays?.from === report.checkpointDay - 6 && Array.isArray(report.series) && anchorsDisplayable(report.anchors)) : []
  return <section className={styles.root} aria-labelledby={`${id}-title`} data-course-goal-weekly-reports="">
    <h3 id={`${id}-title`}>{t.reportsTitle}</h3>
    <p>{t.reportTiming}</p><p>{t.scope}</p><p className={styles.small}>{t.reportScope}</p>
    <p className={styles.small}>{t.pinned}</p>
    {!available.length && <p>{t.noReports}</p>}
    {available.map(report => <section key={report.reportId} className={styles.week} aria-label={`${t.week} ${report.checkpointDay / 7}`} data-course-goal-weekly-report={report.checkpointDay}>
      <h4>{t.week} {report.checkpointDay / 7} · {t.days} {report.learningDays.from}–{report.learningDays.to}</h4>
      <p className={styles.small}>{t.recorded}: {dateText(report.resolvedLocalDate, lang) || t.notRecorded}</p>
      <DayGaps coverage={report.coverage} t={t} />
      <section className={styles.seriesGroup} aria-label={t.thisWeek} data-course-goal-period="week">
        <h5>{t.thisWeek} · {t.days} {report.learningDays.from}–{report.learningDays.to}</h5>
        {report.series.filter(seriesDisplayable).length === 0 && <p>{t.noSeries}</p>}
        {report.series.filter(seriesDisplayable).map(row => <SeriesReport key={row.seriesId} row={row} anchors={report.anchors} locale={lang} t={t} />)}
      </section>
      {Array.isArray(report.cumulativeSeries) && report.cumulativeLearningDays?.from === 1 && report.cumulativeLearningDays?.to === report.checkpointDay &&
        <section className={styles.seriesGroup} aria-label={t.courseToDate} data-course-goal-period="course-to-date">
          <h5>{t.courseToDate} · {t.days} 1–{report.checkpointDay}</h5>
          {report.cumulativeSeries.filter(seriesDisplayable).map(row => <SeriesReport key={row.seriesId} row={row} anchors={report.anchors} locale={lang} t={t} />)}
          {report.cumulativeSeries.filter(seriesDisplayable).length === 0 && <p>{t.noCumulative}</p>}
        </section>}
    </section>)}
  </section>
}
