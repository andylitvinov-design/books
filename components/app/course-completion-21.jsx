'use client'

import { useEffect, useId, useRef, useState } from 'react'
import styles from './course-completion-21.module.css'

const WORDS = {
  en: {
    eyebrow: 'MY COURSE · FINAL REVIEW', title: 'Your 21-learning-day review',
    summary: 'This is a record of lesson activity. Completion and skipped days do not measure psychological improvement.',
    completed: 'Completed learning days', skipped: 'Skipped learning days', resolved: 'Learning days recorded',
    finished: 'Final day recorded', weekly: 'Review by learning week', week: 'Learning week', days: 'Days', day: 'Day',
    completedShort: 'completed', skippedShort: 'skipped', weekHint: 'Each learning week covers seven course steps, not necessarily seven calendar days.',
    checkins: 'Your saved optional check-ins', checkinHint: 'Subjective observations at the time you saved them, not a formal assessment or evidence of a course effect. Unanswered ratings are not zero.',
    checkinCount: 'Check-ins with a recorded observation', initial: 'First recorded check-in', latest: 'Latest recorded check-in',
    noCheckins: 'No optional check-in observations were saved.', wellbeing: 'Wellbeing', energy: 'Available energy',
    energyLabels: { low: 'Low', usual: 'Usual', ample: 'Ample' }, feelingChange: 'Your answer then, compared with the previous check-in',
    changeLabels: { better: 'Better', same: 'About the same', worse: 'Worse' }, missing: 'Not recorded', utc: 'UTC',
    helpful: 'Lessons you marked helpful', helpfulHint: 'These are completed lessons you explicitly marked helpful. Repeating them does not change your saved course progress.',
    noHelpful: 'No completed lessons were marked helpful.', review: 'Review day', unavailableLesson: 'Prepared lesson unavailable',
    plan: 'What would you like to keep practising?', planHint: 'Choose one to three completed practices, or choose a pause. This saves a personal plan without starting another course or scheduling reminders.',
    practices: 'Choose completed practices', selected: 'selected of 3', noPractices: 'No completed practices are currently available to repeat. You can still save a pause.',
    pace: 'My pace', paceLabels: { 'own-pace': 'At my own pace', occasional: 'Occasionally', pause: 'Take a pause' },
    pauseHint: 'A pause saves no practice choices. You can make another choice whenever you want.',
    stale: 'This selected practice is no longer available. Remove it before saving.', remove: 'Remove day',
    consent: 'I agree to privately save these practice choices and this pace in my account.',
    save: 'Save my plan', saving: 'Saving…', saved: 'Your saved plan', savedAt: 'Saved', noSavedPlan: 'No continuation plan has been saved yet.',
    draft: 'Choices below are unsent until you confirm and save them. Leaving or reloading this page can lose unsaved choices.',
    reassessment: 'Optional questionnaire review', reassessmentHint: 'Finishing 21 learning days does not mean a repeat is due. Whether and when to repeat a questionnaire is your choice; consider its stated timeframe.',
    interpretationHint: 'Score differences are observations, not proof of a course effect or clinically meaningful change.',
    noForms: 'The original questionnaire forms are not available for review here.', form: 'Exact form', version: 'Version', language: 'Questionnaire language',
    beforeDate: 'Original measurement', afterDate: 'Latest measurement after the course', noRepeat: 'No completed repeat after the course is available for this exact form.',
    timeframe: 'Questionnaire timeframe', sourceUnavailable: 'The exact original result is unavailable. A comparison cannot be shown.',
    meaningsUnavailable: 'Prepared interpretations for this exact comparison are unavailable. Scores are not compared here until their meanings are available.',
    missingMeaning: 'The prepared meaning for this result is unavailable.', range: 'Registered range',
    before: 'Before', after: 'After', difference: 'Difference', beforeMeaning: 'Original prepared meaning', afterMeaning: 'Latest prepared meaning', source: 'Interpretation source',
    repeat: 'Review optional repeat', repeatUnavailable: 'A repeat of this exact form is not available here.',
    confirmTitle: 'Start this optional questionnaire repeat?', confirmHint: 'This leaves this page and opens the exact questionnaire form shown below. Unsent plan choices will not be saved. Your original result and course history stay unchanged. A new result is saved through the questionnaire’s own completion step.',
    confirmRepeat: 'Start this exact form', cancel: 'Cancel', callbackError: 'The action did not finish. Your unsent choices are still here. Try again.',
  },
  ru: {
    eyebrow: 'МОЙ КУРС · ИТОГОВЫЙ ОБЗОР', title: 'Итоги 21 учебного дня',
    summary: 'Это запись работы с уроками. Количество выполненных и пропущенных дней не измеряет психологическое улучшение.',
    completed: 'Выполнено учебных дней', skipped: 'Пропущено учебных дней', resolved: 'Отмечено учебных дней',
    finished: 'Последний день отмечен', weekly: 'Обзор по учебным неделям', week: 'Учебная неделя', days: 'Дни', day: 'День',
    completedShort: 'выполнено', skippedShort: 'пропущено', weekHint: 'Учебная неделя включает семь шагов курса, которые могут занять больше семи календарных дней.',
    checkins: 'Сохранённые необязательные отметки', checkinHint: 'Это субъективные наблюдения на момент сохранения, а не формальная оценка или доказательство эффекта курса. Отсутствующие оценки не равны нулю.',
    checkinCount: 'Отметок с сохранённым наблюдением', initial: 'Первая сохранённая отметка', latest: 'Последняя сохранённая отметка',
    noCheckins: 'Необязательные наблюдения о самочувствии не сохранялись.', wellbeing: 'Самочувствие', energy: 'Доступная энергия',
    energyLabels: { low: 'Мало', usual: 'Обычно', ample: 'Достаточно' }, feelingChange: 'Ваш ответ тогда, по сравнению с предыдущей отметкой',
    changeLabels: { better: 'Лучше', same: 'Примерно так же', worse: 'Хуже' }, missing: 'Не указано', utc: 'UTC',
    helpful: 'Уроки, которые вы отметили как полезные', helpfulHint: 'Это выполненные уроки с вашей явной отметкой о пользе. Повтор не изменяет сохранённый прогресс курса.',
    noHelpful: 'Среди выполненных уроков нет отмеченных как полезные.', review: 'Повторить день', unavailableLesson: 'Подготовленный урок недоступен',
    plan: 'Что вы хотели бы продолжить практиковать?', planHint: 'Выберите от одной до трёх выполненных практик или паузу. Сохраняется личный план без запуска нового курса и настройки напоминаний.',
    practices: 'Выберите выполненные практики', selected: 'выбрано из 3', noPractices: 'Сейчас нет выполненных практик, доступных для повтора. Вы можете сохранить паузу.',
    pace: 'Мой темп', paceLabels: { 'own-pace': 'В своём темпе', occasional: 'Время от времени', pause: 'Сделать паузу' },
    pauseHint: 'При паузе практики не выбираются. Вы сможете изменить свой выбор, когда захотите.',
    stale: 'Эта выбранная практика больше недоступна. Уберите её перед сохранением.', remove: 'Убрать день',
    consent: 'Я согласен(на) приватно сохранить выбранные практики и темп в моём аккаунте.',
    save: 'Сохранить мой план', saving: 'Сохраняем…', saved: 'Мой сохранённый план', savedAt: 'Сохранён', noSavedPlan: 'План дальнейшей практики пока не сохранён.',
    draft: 'Выбор ниже не отправляется до вашего согласия и сохранения. Уход или перезагрузка страницы могут удалить несохранённый выбор.',
    reassessment: 'Необязательный обзор опросников', reassessmentHint: 'Завершение 21 учебного дня не означает, что пора повторять опросник. Вы сами решаете, нужен ли повтор и когда; учитывайте период, к которому относятся вопросы.',
    interpretationHint: 'Различия в баллах — наблюдения, а не доказательство эффекта курса или клинически значимого изменения.',
    noForms: 'Исходные версии опросников недоступны для обзора здесь.', form: 'Точная форма', version: 'Версия', language: 'Язык опросника',
    beforeDate: 'Исходное измерение', afterDate: 'Последнее измерение после курса', noRepeat: 'Для этой точной формы нет доступного завершённого повтора после курса.',
    timeframe: 'Период, к которому относятся вопросы', sourceUnavailable: 'Точный исходный результат недоступен. Сравнение показать нельзя.',
    meaningsUnavailable: 'Подготовленные интерпретации для этого точного сравнения недоступны. Баллы не сравниваются здесь до появления их значений.',
    missingMeaning: 'Подготовленное значение этого результата недоступно.', range: 'Зарегистрированный диапазон',
    before: 'До', after: 'После', difference: 'Разница', beforeMeaning: 'Подготовленное значение исходного результата', afterMeaning: 'Подготовленное значение последнего результата', source: 'Источник интерпретации',
    repeat: 'Рассмотреть необязательный повтор', repeatUnavailable: 'Повтор этой точной формы здесь недоступен.',
    confirmTitle: 'Начать этот необязательный повтор опросника?', confirmHint: 'Вы перейдёте с этой страницы к точной форме опросника, указанной ниже. Неотправленный выбор плана не сохранится. Исходный результат и история курса останутся прежними. Новый результат сохраняется на отдельном шаге завершения опросника.',
    confirmRepeat: 'Начать эту точную форму', cancel: 'Отмена', callbackError: 'Действие не завершилось. Неотправленный выбор остался на странице. Попробуйте ещё раз.',
  },
}

function dateText(value, locale, missing) {
  if (!value || !Number.isFinite(Date.parse(value))) return missing
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-GB', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC',
  }).format(new Date(value))
}

function SavedDate({ value, locale, t }) {
  return value && Number.isFinite(Date.parse(value))
    ? <time dateTime={value}>{dateText(value, locale, t.missing)} {t.utc}</time>
    : <span>{t.missing}</span>
}

function numeric(value, locale, missing, signed = false) {
  if (!Number.isFinite(value)) return missing
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2, ...(signed ? { signDisplay: 'exceptZero' } : {}) }).format(value)
}

function lessonLabel(lesson, t) {
  return `${t.day} ${lesson.day}${lesson.title ? ` · ${lesson.title}` : ''}`
}

function formKey(form) {
  return JSON.stringify([form.definitionId, form.definitionVersion, form.instrumentLocale, form.initialResultId,
    form.latestResultId, form.initialMeasurementAt, form.latestMeasurementAt, form.status, form.repeatAvailable])
}

function FormIdentity({ form, t }) {
  return <p className={styles.small}>{t.form}: {form.definitionId} · {t.version}: {form.definitionVersion} · {t.language}: {String(form.instrumentLocale || t.missing).toUpperCase()}</p>
}

function PreparedComparison({ scale, locale, t }) {
  const sourceUrl = typeof scale.source === 'string' ? scale.source : scale.source?.url
  const sourceTitle = typeof scale.source?.title === 'string' && scale.source.title.trim() ? scale.source.title : t.source
  const unit = locale === 'ru' ? ({ points: 'баллы', 'weighted-points': 'взвешенные баллы' }[scale.unit] || scale.unit) : scale.unit
  return <section className={styles.scale} data-course-comparison-scale={scale.key}>
    <h5>{scale.label}</h5>
    <p className={styles.small}>{t.range}: {numeric(scale.min, locale, t.missing)}–{numeric(scale.max, locale, t.missing)}{unit ? ` · ${unit}` : ''}</p>
    <dl className={styles.readings}>
      <div><dt>{t.before}</dt><dd>{numeric(scale.initialValue, locale, t.missing)}</dd></div>
      <div><dt>{t.after}</dt><dd>{numeric(scale.latestValue, locale, t.missing)}</dd></div>
      <div><dt>{t.difference}</dt><dd>{numeric(scale.change, locale, t.missing, true)}</dd></div>
    </dl>
    <div className={styles.meanings}>
      <div><h5>{t.beforeMeaning}</h5><p>{scale.initialMeaning || t.missingMeaning}</p></div>
      <div><h5>{t.afterMeaning}</h5><p>{scale.latestMeaning || t.missingMeaning}</p></div>
    </div>
    {typeof sourceUrl === 'string' && /^https:\/\//i.test(sourceUrl) && <a href={sourceUrl} target="_blank" rel="noreferrer">{sourceTitle}</a>}
  </section>
}

export default function CourseCompletion21({ locale = 'en', completion, reassessment, busy = false, onSavePlan, onReviewDay, onRetest }) {
  const lang = locale === 'ru' ? 'ru' : 'en', t = WORDS[lang], uid = useId()
  const [practiceDays, setPracticeDays] = useState([])
  const [pace, setPace] = useState('own-pace')
  const [consent, setConsent] = useState(false)
  const [repeatChoice, setRepeatChoice] = useState(null)
  const [working, setWorking] = useState(false)
  const [callbackError, setCallbackError] = useState(false)
  const actionLock = useRef(false), confirmationHeading = useRef(null), repeatTrigger = useRef(null)
  const disabled = busy || working

  useEffect(() => { setRepeatChoice(null) }, [lang, reassessment])
  useEffect(() => { if (repeatChoice) confirmationHeading.current?.focus() }, [repeatChoice])

  if (!completion) return null
  const lessons = completion.completedLessons || []
  const eligible = lessons.filter(lesson => lesson.replayable === true)
  const staleDays = practiceDays.filter(day => !eligible.some(lesson => lesson.day === day))
  const planValid = pace === 'pause' ? practiceDays.length === 0 : practiceDays.length >= 1 && practiceDays.length <= 3 && staleDays.length === 0
  const savedPlan = completion.continuationPlan
  const checkins = completion.subjectiveCheckins

  function choosePractice(day, checked) {
    if (disabled) return
    setPracticeDays(current => checked ? current.includes(day) || current.length >= 3 ? current : [...current, day].sort((a, b) => a - b) : current.filter(value => value !== day))
    setConsent(false)
  }

  function choosePace(value) {
    setPace(value)
    if (value === 'pause') setPracticeDays([])
    setConsent(false)
  }

  async function perform(callback, onSuccess) {
    if (disabled || actionLock.current) return
    actionLock.current = true
    setWorking(true)
    setCallbackError(false)
    try {
      const result = await callback()
      if (result !== false) onSuccess?.()
    } catch {
      setCallbackError(true)
    } finally {
      actionLock.current = false
      setWorking(false)
    }
  }

  function cancelRepeat() {
    if (disabled) return
    setRepeatChoice(null)
    repeatTrigger.current?.focus()
  }

  return <section className={styles.root} aria-labelledby={`${uid}-title`} aria-busy={disabled} data-course-completion-21>
    <header className={styles.hero}>
      <p className={styles.eyebrow}>{t.eyebrow}</p>
      <h2 id={`${uid}-title`}>{t.title}</h2>
      <p>{t.summary}</p>
      <dl className={styles.stats}>
        <div><dt>{t.completed}</dt><dd>{completion.completedDays}</dd></div>
        <div><dt>{t.skipped}</dt><dd>{completion.skippedDays}</dd></div>
        <div><dt>{t.resolved}</dt><dd>{completion.resolvedDays} / {completion.durationDays}</dd></div>
      </dl>
      <p className={styles.small}>{t.finished}: <SavedDate value={completion.finishedAt} locale={lang} t={t}/></p>
      <details className={styles.details}>
        <summary>{t.weekly}</summary>
        <p className={styles.small}>{t.weekHint}</p>
        <ul className={styles.weeks}>{completion.weeks?.map(week => <li key={week.week}>
          <strong>{t.week} {week.week}</strong><span className={styles.small}>{t.days} {week.fromDay}–{week.toDay}</span>
          <span>{week.completedDays} {t.completedShort} · {week.skippedDays} {t.skippedShort}</span>
        </li>)}</ul>
      </details>
      <details className={styles.details}>
        <summary>{t.checkins}</summary>
        <p className={styles.small}>{t.checkinHint}</p>
        {checkins ? <>
          <p className={styles.small}>{t.checkinCount}: {checkins.count}</p>
          <dl className={styles.checkins}>{[['initial', t.initial], ['latest', t.latest]].map(([key, label]) => {
            const entry = checkins[key]
            return <div key={key}><dt><strong>{label}</strong></dt><dd>
              {entry ? <><p className={styles.small}>{t.day} {entry.day} · <SavedDate value={entry.at} locale={lang} t={t}/></p>
                <p>{t.wellbeing}: {Number.isFinite(entry.wellbeing) ? `${entry.wellbeing} / 10` : t.missing}</p>
                <p>{t.energy}: {t.energyLabels[entry.energy] || t.missing}</p>
                <p>{t.feelingChange}: {t.changeLabels[entry.feelingChange] || t.missing}</p></> : t.missing}
            </dd></div>
          })}</dl>
        </> : <p>{t.noCheckins}</p>}
      </details>
    </header>

    <section className={styles.card} aria-labelledby={`${uid}-helpful`}>
      <h3 id={`${uid}-helpful`}>{t.helpful}</h3>
      <p className={styles.small}>{t.helpfulHint}</p>
      {completion.helpfulLessons?.length ? <ul className={styles.list}>{completion.helpfulLessons.map(lesson => <li key={lesson.day}>
        <span>{lessonLabel(lesson, t)}{!lesson.replayable && <span className={styles.small}> · {t.unavailableLesson}</span>}</span>
        <button type="button" disabled={disabled || !lesson.replayable || !onReviewDay} onClick={() => perform(() => onReviewDay(lesson.day))}>{t.review} {lesson.day}</button>
      </li>)}</ul> : <p>{t.noHelpful}</p>}
    </section>

    <section className={styles.card} aria-labelledby={`${uid}-plan`}>
      <h3 id={`${uid}-plan`}>{t.plan}</h3>
      <p>{t.planHint}</p>
      <section className={styles.savedPlan} aria-labelledby={`${uid}-saved`} data-course-saved-plan>
        <h4 id={`${uid}-saved`}>{t.saved}</h4>
        {savedPlan ? <>
          <p>{t.paceLabels[savedPlan.pace] || t.missing}</p>
          {savedPlan.practiceRefs?.length > 0 && <ul>{savedPlan.practiceRefs.map(lesson => <li key={lesson.day}>{lessonLabel(lesson, t)}{!lesson.replayable ? ` · ${t.unavailableLesson}` : ''}</li>)}</ul>}
          <p className={styles.small}>{t.savedAt}: <SavedDate value={savedPlan.savedAt} locale={lang} t={t}/></p>
        </> : <p>{t.noSavedPlan}</p>}
      </section>
      <form className={styles.form} onSubmit={event => {
        event.preventDefault()
        if (planValid && consent && onSavePlan) perform(() => onSavePlan({ practiceDays: [...practiceDays], pace, consent: true }), () => setConsent(false))
      }}>
        <p className={styles.small}>{t.draft}</p>
        <label className={styles.field}><span>{t.pace}</span><select value={pace} onChange={event => choosePace(event.target.value)} disabled={disabled}>
          {Object.entries(t.paceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <fieldset className={styles.choices} disabled={disabled} aria-describedby={`${uid}-selection`}>
          <legend>{t.practices}</legend>
          <p id={`${uid}-selection`} className={styles.small} aria-live="polite">{practiceDays.length} {t.selected}</p>
          {pace === 'pause' ? <p className={styles.small}>{t.pauseHint}</p> : eligible.length ? <div className={styles.choiceList}>
            {eligible.map(lesson => <label className={styles.check} key={lesson.day}>
              <input type="checkbox" checked={practiceDays.includes(lesson.day)} disabled={disabled || (!practiceDays.includes(lesson.day) && practiceDays.length >= 3)} onChange={event => choosePractice(lesson.day, event.target.checked)}/>
              <span>{lessonLabel(lesson, t)}</span>
            </label>)}
          </div> : <p>{t.noPractices}</p>}
          {staleDays.length > 0 && <ul className={styles.list}>{staleDays.map(day => <li key={day}>
            <span>{t.day} {day} · {t.stale}</span><button type="button" disabled={disabled} onClick={() => choosePractice(day, false)}>{t.remove} {day}</button>
          </li>)}</ul>}
        </fieldset>
        <label className={styles.check}><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} disabled={disabled}/><span>{t.consent}</span></label>
        <div className={styles.actions}><button className={styles.primary} type="submit" disabled={disabled || !planValid || !consent || !onSavePlan}>{disabled ? t.saving : t.save}</button></div>
      </form>
    </section>

    <section className={styles.card} aria-labelledby={`${uid}-reassessment`}>
      <h3 id={`${uid}-reassessment`}>{t.reassessment}</h3>
      <p>{t.reassessmentHint}</p>
      <p className={styles.small}>{t.interpretationHint}</p>
      {reassessment?.forms?.length ? reassessment.forms.map((form, index) => {
        const key = formKey(form), confirming = repeatChoice?.key === key && repeatChoice.locale === lang
        return <article className={styles.assessment} key={form.definitionId} aria-labelledby={`${uid}-form-${index}`}>
          <h4 id={`${uid}-form-${index}`}>{form.title}</h4>
          <FormIdentity form={form} t={t}/>
          <div className={styles.small}>
            <p>{t.beforeDate}: <SavedDate value={form.initialMeasurementAt} locale={lang} t={t}/></p>
            <p>{t.afterDate}: <SavedDate value={form.latestMeasurementAt} locale={lang} t={t}/></p>
            {form.timeframes?.length > 0 && <p>{t.timeframe}: {form.timeframes.join(' · ')}</p>}
          </div>
          {form.status === 'ready' ? <details className={styles.details}>
            <summary>{t.before} / {t.after}</summary>
            <div className={styles.scales}>{form.scales?.map(scale => <PreparedComparison key={scale.key} scale={scale} locale={lang} t={t}/>)}</div>
          </details> : <p className={styles.notice}>{form.status === 'source-unavailable' ? t.sourceUnavailable : form.status === 'not-repeated' ? t.noRepeat : t.meaningsUnavailable}</p>}
          {form.repeatAvailable === true && onRetest ? <>
            <div className={styles.actions}><button type="button" disabled={disabled} aria-label={`${t.repeat}: ${form.title}`} aria-expanded={confirming} aria-controls={confirming ? `${uid}-confirm-region-${index}` : undefined} onClick={event => {
              repeatTrigger.current = event.currentTarget
              setRepeatChoice({ key, locale: lang })
            }}>{t.repeat}</button></div>
            {confirming && <section id={`${uid}-confirm-region-${index}`} className={styles.confirmation} aria-labelledby={`${uid}-confirm-${index}`} onKeyDown={event => {
              if (event.key === 'Escape') { event.preventDefault(); cancelRepeat() }
            }}>
              <h5 id={`${uid}-confirm-${index}`} ref={confirmationHeading} tabIndex={-1}>{t.confirmTitle}</h5>
              <p>{t.confirmHint}</p><strong>{form.title}</strong><FormIdentity form={form} t={t}/>
              <div className={styles.actions}>
                <button type="button" className={styles.primary} disabled={disabled} onClick={() => perform(() => onRetest(form), () => setRepeatChoice(null))}>{t.confirmRepeat}</button>
                <button type="button" disabled={disabled} onClick={cancelRepeat}>{t.cancel}</button>
              </div>
            </section>}
          </> : <p className={styles.small}>{t.repeatUnavailable}</p>}
        </article>
      }) : <p>{t.noForms}</p>}
    </section>
    {callbackError && <p className={styles.notice} role="alert">{t.callbackError}</p>}
  </section>
}
