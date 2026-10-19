'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronRight, Compass, Eye, Flag,
  Heart, Leaf, Lightbulb, LockKeyhole, Medal, PauseCircle, Shield, Sparkles,
  Sprout, Star, Target, Trophy, Wind, X,
} from 'lucide-react'
import CourseGuidedTimer from './course-guided-timer'
import styles from './course-quest.module.css'

const COPY = {
  en: {
    map: 'Your learning path', pathIntro: 'Four chapters · fourteen small steps',
    today: 'Today', done: 'Completed', missed: 'Earlier day', later: 'Coming up',
    launch: 'Start today’s quest', revisit: 'See my completed day',
    locked: 'Finish the previous lesson first. Your next lesson unlocks on a new local day; nothing is lost if you take a break.',
    past: 'This day has passed. Missing practice is not counted as zero.',
    reward: 'Learning XP', rewardNote: 'For saved participation only, never for how you feel or answer.',
    progress: 'Lessons saved', chapter1: 'Discover your patterns', chapter2: 'Make room for choice',
    chapter3: 'Bring it into life', chapter4: 'Make it yours', preview: 'A small takeaway',
    close: 'Close lesson', checkin: 'How strong was your concern?', insight: 'A useful idea',
    practice: 'Try a guided practice', action: 'Take it into life',
    reflection: 'Keep one insight', complete: 'You showed up today!',
    completeOld: 'You have already completed this day',
    completeBody: 'Your lesson is safely saved in your private course history.',
    xpEarned: '+20 learning XP', backMap: 'Back to my path', replay: 'Read the lesson again',
    checkinPrompt: 'Over the last 24 hours, how strongly did this concern bother you?',
    checkinOptional: 'This check-in is optional. There is no right or wrong number.',
    from: '0 · No concern', to: '10 · Very strong concern',
    extraCheckin: 'More observations (optional)', interference: 'How much did it interrupt your day?',
    resource: 'How much support did you feel?', note: 'Private note (optional)',
    saveNext: 'Save & continue', skip: 'Skip for today', next: 'Continue',
    back: 'Back', previous: 'Previous', quick: 'Short', standard: 'Standard',
    gentle: 'Without imagery', safety: 'Eyes may stay open. Breathe naturally. Stop or skip anything uncomfortable.',
    timer: 'A timer is optional. Move on when you are ready.',
    read: 'Read the idea', recall: 'Remember a familiar skill', working: 'A flexible thought to try',
    workingCaution: 'You do not have to believe it or force a feeling.',
    smallAction: 'A small real-life experiment', ritual: 'Your small action',
    symbol: 'Optional symbolic reflection', words: 'Use words', imagery: 'Use an image',
    symbolCaution: 'Metaphors are for reflection, not diagnosis or treatment.',
    reflectPrompt: 'What would you like to remember tomorrow?',
    journal: 'One honest sentence is enough. You can leave this blank.',
    feedback: 'How did the practice feel?', helped: 'Helpful', neutral: 'Neutral',
    uncomfortable: 'Uncomfortable', noAnswer: 'Prefer not to say',
    extraReflection: 'Before/after ratings (optional)', before: 'Concern difficulty just before practice (0 = none, 10 = very difficult)',
    after: 'Concern difficulty just after practice (0 = none, 10 = very difficult)', notRated: 'Not rated',
    finish: 'Complete today’s lesson', finished: 'Saved to My Course',
    skipPractice: 'Skip the guided practice', private: 'Saved privately when you finish',
    pointsNotGrades: 'XP rewards participation, not symptom scores or “correct” answers.',
    noLesson: 'Your next lesson is not available yet.',
    lesson: 'Day', of: 'of', stage: 'Step', stop: 'Pause and return to map',
    savedCheckin: 'Your earlier check-in is available to correct.',
    seenBefore: 'Feel free to review. No duplicate reward will be granted.',
    restart: 'Start again', saveError: 'The change could not be saved. Please try again.',
  },
  ru: {
    map: 'Мой путь обучения', pathIntro: 'Четыре главы · четырнадцать маленьких шагов',
    today: 'Сегодня', done: 'Завершено', missed: 'Прошлый день', later: 'Впереди',
    launch: 'Начать задание дня', revisit: 'Посмотреть пройденный день',
    locked: 'Завершите предыдущий урок. Следующий откроется в новый календарный день; во время перерыва уроки не пропадают.',
    past: 'Этот день прошёл. Пропуски не считаются нулевыми результатами.',
    reward: 'Баллы участия', rewardNote: 'Только за сохранённые действия, не за самочувствие и ответы.',
    progress: 'Сохранено уроков', chapter1: 'Замечаем свои реакции', chapter2: 'Находим свободу выбора',
    chapter3: 'Переносим в жизнь', chapter4: 'Создаём свой способ', preview: 'Результат дня',
    close: 'Закрыть урок', checkin: 'Насколько сильным было беспокойство?', insight: 'Идея на сегодня',
    practice: 'Попробуйте практику', action: 'Примените в жизни',
    reflection: 'Сохраните один вывод', complete: 'Сегодня вы сделали шаг!',
    completeOld: 'Этот день уже завершён',
    completeBody: 'Ваш урок надёжно сохранён в личной истории курса.',
    xpEarned: '+20 баллов участия', backMap: 'Вернуться на карту', replay: 'Прочитать урок ещё раз',
    checkinPrompt: 'Оцените силу беспокойства за последние 24 часа.',
    checkinOptional: 'Этот замер необязателен. Здесь нет правильных и неправильных чисел.',
    from: '0 · Не беспокоило', to: '10 · Очень сильно',
    extraCheckin: 'Дополнительные наблюдения (по желанию)', interference: 'Насколько это мешало вашим делам?',
    resource: 'Насколько ощущалась поддержка?', note: 'Личная заметка (по желанию)',
    saveNext: 'Сохранить и продолжить', skip: 'Пропустить сегодня', next: 'Продолжить',
    back: 'Назад', previous: 'Предыдущий', quick: 'Короткая',
    standard: 'Обычная', gentle: 'Без визуализаций',
    safety: 'Глаза можно оставить открытыми, дыхание не менять. Любой неудобный шаг пропускайте.',
    timer: 'Таймер необязателен. Можно продолжать в своём темпе.',
    read: 'Идея дня', recall: 'Вспомните знакомый навык', working: 'Гибкая рабочая мысль',
    workingCaution: 'Необязательно верить этой мысли или заставлять себя что-либо чувствовать.',
    smallAction: 'Маленький эксперимент в жизни', ritual: 'Небольшое действие',
    symbol: 'Образная рефлексия (необязательно)', words: 'Словами', imagery: 'Через образ',
    symbolCaution: 'Метафора служит только для размышления, не для диагностики и лечения.',
    reflectPrompt: 'Что вы хотели бы вспомнить завтра?',
    journal: 'Достаточно одного честного предложения. Поле можно оставить пустым.',
    feedback: 'Как прошла практика?', helped: 'Помогло', neutral: 'Нейтрально',
    uncomfortable: 'Было некомфортно', noAnswer: 'Не хочу отвечать',
    extraReflection: 'Оценки до/после (по желанию)', before: 'Трудность до практики (0 — не беспокоит, 10 — очень сильно)',
    after: 'Трудность после практики (0 — не беспокоит, 10 — очень сильно)', notRated: 'Не оценивалось',
    finish: 'Завершить сегодняшний урок', finished: 'Сохранено в My Course',
    skipPractice: 'Пропустить практику', private: 'Сохранится приватно после завершения',
    pointsNotGrades: 'Баллы — за участие, не за симптомы или «правильные» ответы.',
    noLesson: 'Следующий урок пока недоступен.',
    lesson: 'День', of: 'из', stage: 'Шаг', stop: 'Пауза и возврат на карту',
    savedCheckin: 'Предыдущий замер можно уточнить.',
    seenBefore: 'Вы можете перечитать урок. Баллы повторно не начисляются.',
    restart: 'Начать заново', saveError: 'Не удалось сохранить. Попробуйте ещё раз.',
  },
}

const ICONS = [Compass, Eye, Shield, Wind, Lightbulb, Sprout, Star, Target, Flag, Leaf, Heart, Sparkles, Medal, Trophy]
const STARTS = {
  1: 'chapter1', 4: 'chapter2', 8: 'chapter3', 12: 'chapter4',
}
const STATES = { completed: 'done', today: 'today', past: 'missed', upcoming: 'later', planned: 'later' }

function NumericGrid({ value, onChange, label }) {
  return <fieldset className={styles.numberField}>
    <legend>{label}</legend>
    <div className={styles.numberGrid}>
      {Array.from({ length: 11 }, (_, number) => <button key={number} type="button"
        aria-pressed={value === number} onClick={() => onChange(number)}>{number}</button>)}
    </div>
  </fieldset>
}

function OptionalNumber({ label, value, onChange, t }) {
  return <label className={styles.optionalNumber}>{label}
    <select value={value === null ? '' : String(value)}
      onChange={event => onChange(event.target.value === '' ? null : Number(event.target.value))}>
      <option value="">{t.notRated}</option>
      {Array.from({ length: 11 }, (_, number) => <option key={number} value={number}>{number}/10</option>)}
    </select>
  </label>
}

export function CourseQuestMap({ locale = 'en', cycle, progress, roadmap = [], paused, finished, onPlay }) {
  const t = COPY[locale] || COPY.en
  const [selected, setSelected] = useState(null)
  const [showAllDays, setShowAllDays] = useState(false)
  useEffect(() => { setSelected(null); setShowAllDays(false) }, [cycle.id, cycle.day])
  const count = Number(progress.practiceCount) || 0
  // Do not incentivize recording sensitive symptoms: only saved lessons earn XP.
  const xp = 20 * count
  const journeyLength = cycle.durationDays || 14
  const firstVisibleDay = Math.min(Math.max(1, cycle.day - 1), Math.max(1, journeyLength - 4))
  const visibleRoadmap = showAllDays ? roadmap : roadmap.filter(item => item.day >= firstVisibleDay && item.day < firstVisibleDay + 5)

  return <section className={styles.mapShell} data-course-quest-map aria-label={t.map}>
    <header className={styles.mapHeader}>
      <div><p className={styles.eyebrow}>{locale==='ru'?'Путешествие в 14 дней':'Your 14-day journey'}</p>
        <h3>{t.map}</h3><p>{t.pathIntro}</p></div>
      <div className={styles.pointBox} title={t.rewardNote}>
        <Sparkles size={18} aria-hidden="true"/><strong>{xp}</strong><small>XP</small>
      </div>
    </header>
    <div className={styles.mapProgress}><span>{t.progress}: <strong>{count}/{cycle.durationDays || 14}</strong></span>
      <progress max={cycle.durationDays || 14} value={count} aria-label={t.progress}/></div>
    <ol className={styles.path}>
      {visibleRoadmap.map((item) => {
        const index = roadmap.findIndex(day => day.day === item.day)
        const Icon = ICONS[index % ICONS.length]
        const active = item.status === 'today' && !finished
        const complete = item.status === 'completed'
        const expanded = selected === item.day
        return <li key={item.day} className={styles.pathRow} data-course-day={item.day}
          data-status={STATES[item.status] || 'later'} data-side={index % 2 === 0 ? 'left' : 'right'}>
          {STARTS[item.day] && <p className={styles.chapter}>
            <span>{locale === 'ru' ? 'Глава' : 'Chapter'} {Object.keys(STARTS).indexOf(String(item.day)) + 1}</span>
            <strong>{t[STARTS[item.day]]}</strong>
          </p>}
          <button className={styles.pathNode} type="button" aria-pressed={expanded}
            aria-current={active ? 'step' : undefined}
            aria-label={t.lesson + ' ' + item.day + ': ' + (item.programmeDay?.title || item.title) + '. ' + (complete ? t.done : active ? t.today : item.status === 'past' ? t.missed : t.later)}
            onClick={() => setSelected(expanded ? null : item.day)}>
            {complete ? <Check size={29} strokeWidth={3} aria-hidden="true"/> : (item.status === 'planned' || item.status === 'upcoming') ? <LockKeyhole size={26} strokeWidth={2.2} aria-hidden="true"/> : <Icon size={31} strokeWidth={2.4} aria-hidden="true"/>}
          </button>
          <span className={styles.pathLabel}>
            <small>{t.lesson} {String(item.day).padStart(2, '0')}</small>
            <strong>{item.programmeDay?.title || item.title}</strong>
          </span>
          {expanded && <div className={styles.pathPreview} data-course-day-preview>
            <div className={styles.previewMeta}><span>{t.lesson} {String(item.day).padStart(2,'0')}</span>
              <span>{complete ? t.done : active ? t.today : item.status === 'past' ? t.missed : t.later}</span></div>
            <p className={styles.journeySummary}>{item.programmeDay?.prompt || item.outcome}</p>
            {(active || (complete && item.day === cycle.day)) && <button type="button"
              className={styles.primaryButton} disabled={paused} onClick={onPlay}>
              {complete ? t.revisit : t.launch}<ArrowRight size={17}/></button>}
            {!active && !complete && <small className={styles.previewHint}>
              {item.status === 'past' ? t.past : t.locked}</small>}
          </div>}
        </li>
      })}
    </ol>
    {roadmap.length > 5 && <button className={styles.pathToggle} type="button"
      aria-expanded={showAllDays} onClick={() => { setShowAllDays(value => !value); setSelected(null) }}>
      {showAllDays ? (locale === 'ru' ? 'Свернуть путь' : 'Show fewer lessons')
        : (locale === 'ru' ? 'Все 14 уроков' : 'View all 14 lessons')}
    </button>}
    <img className={styles.journeyScene} src="/images/holistic-house/course-focus-mountain-boy.webp" alt=""
      width={860} height={245} loading="lazy" aria-hidden="true"/>
    <p className={styles.mapFootnote}><LockKeyhole size={14} aria-hidden="true"/>{t.rewardNote}</p>
  </section>
}

export function CourseQuestPlayer({ locale = 'en', data, busy, onClose, onCheckin, onSession, onPreferences }) {
  const t = COPY[locale] || COPY.en
  const cycle = data.cycle
  const lesson = data.lesson || {}
  const today = data.currentCheckin
  const session = data.currentSession
  const initiallyCompleted = Boolean(session)
  const [step, setStep] = useState(initiallyCompleted ? 5 : 0)
  const [section, setSection] = useState(0)
  const [severity, setSeverity] = useState(today?.severity ?? null)
  const [interference, setInterference] = useState(today?.interference ?? null)
  const [resource, setResource] = useState(today?.resource ?? null)
  const [note, setNote] = useState(today?.note || '')
  const [feedback, setFeedback] = useState(session?.feedback || 'skip')
  const [reflection, setReflection] = useState(session?.reflection || '')
  const [before, setBefore] = useState(session?.beforeNow ?? null)
  const [after, setAfter] = useState(session?.afterNow ?? null)
  const [symbolMode, setSymbolMode] = useState('words')
  const [rewardEarned, setRewardEarned] = useState(false)
  const [localBusy, setLocalBusy] = useState(false)
  const [saveError, setSaveError] = useState('')
  const containerRef = useRef(null)
  const closeRef = useRef(onClose)
  const checkinOperation = useRef(null)
  const sessionOperation = useRef(null)
  const sections = (lesson.sections || []).filter(item => ['arrive', 'meditation', 'finish'].includes(item.kind))
  const noImagery = cycle.preferences?.imagery === 'no_imagery'
  const mainSteps = [t.checkin, t.insight, t.practice, t.action, t.reflection]
  const headline = step === 5 ? (initiallyCompleted && !rewardEarned ? t.completeOld : t.complete) : mainSteps[step]
  const pending = busy || localBusy
  closeRef.current = () => { if (!pending) onClose() }
  const alreadySaved = Boolean(data.currentSession)

  useEffect(() => {
    const original = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    containerRef.current?.querySelector('button')?.focus()
    const handleKeys = event => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); return }
      if (event.key !== 'Tab') return
      const targets = [...(containerRef.current?.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary') || [])]
        .filter(element => element.getClientRects().length > 0)
      if (!targets.length) return
      const first = targets[0], last = targets.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKeys)
    return () => {
      document.removeEventListener('keydown', handleKeys)
      document.body.style.overflow = overflow
      if (original?.isConnected) original.focus()
    }
  }, [])

  async function saveCheckin() {
    if (!Number.isInteger(severity)) { setStep(1); return }
    const unchanged = today && severity === today.severity && interference === today.interference &&
      resource === today.resource && note === (today.note || '')
    if (unchanged) { setStep(1); return }
    setLocalBusy(true)
    setSaveError('')
    try {
      if (!checkinOperation.current) checkinOperation.current = crypto.randomUUID()
      const result = await onCheckin({
        severity, interference, resource, note, operationId: checkinOperation.current,
        ...(today ? { expectedRevision: today.revision } : {}),
      })
      if (result) { checkinOperation.current = null; setStep(1) }
      else setSaveError(t.saveError)
    } catch { setSaveError(t.saveError) }
    finally { setLocalBusy(false) }
  }

  async function saveLesson() {
    if (alreadySaved) { setStep(5); return }
    setLocalBusy(true)
    setSaveError('')
    try {
      if (!sessionOperation.current) sessionOperation.current = crypto.randomUUID()
      const result = await onSession({
        day: cycle.day, lessonId: lesson.id, operationId: sessionOperation.current,
        feedback, beforeNow: before, afterNow: after, reflection,
      })
      if (result) { sessionOperation.current = null; setRewardEarned(true); setStep(5) }
      else setSaveError(t.saveError)
    } catch { setSaveError(t.saveError) }
    finally { setLocalBusy(false) }
  }

  async function setPracticePreference(patch) {
    setLocalBusy(true)
    setSaveError('')
    try { if (!await onPreferences(patch)) setSaveError(t.saveError) }
    catch { setSaveError(t.saveError) }
    finally { setLocalBusy(false) }
  }

  function advance() {
    if (step === 2 && section < sections.length - 1) { setSection(value => value + 1); return }
    if (step < 4) { setStep(value => value + 1); setSection(0) }
    else if (step === 4) void saveLesson()
  }

  return <div className={styles.playerOverlay} role="dialog" aria-modal="true"
    aria-label={t.lesson + ' ' + cycle.day + ': ' + headline}
    ref={containerRef} data-course-quest-player data-course-quest-one-screen="v1">
    <div className={styles.playerFrame}>
      <header className={styles.playerHeader}>
        <button className={styles.iconButton} type="button" aria-label={t.close}
          disabled={pending} onClick={onClose}><X size={25}/></button>
        <div className={styles.stepBars} role="progressbar" aria-label={t.stage}
          aria-valuemin={0} aria-valuemax={5} aria-valuenow={Math.min(step, 5)}>
          {mainSteps.map((name, index) => <span key={name} data-state={index < step ? 'done' : index === step ? 'current' : 'next'} />)}
        </div>
        <span className={styles.playerDay}>{cycle.day}/14</span>
      </header>
      <main className={styles.playerMain} key={step}>
        <p className={styles.eyebrow}>{t.lesson} {cycle.day} · {step < 5 ? t.stage + ' ' + (step + 1) + ' ' + t.of + ' 5' : t.finished}</p>
        <h2>{headline}</h2>
        {saveError && <p className={styles.saveError} role="alert">{saveError}</p>}
        {step === 0 && <>
          <p className={styles.prompt}>{data.target?.label || lesson.journey?.heading}</p>
          <p className={styles.description}>{t.checkinPrompt}</p>
          <NumericGrid value={severity} onChange={setSeverity} label={t.checkinPrompt}/>
          <div className={styles.scaleEnds}><span>{t.from}</span><span>{t.to}</span></div>
          <p className={styles.subtle}>{t.checkinOptional}</p>
          {today && <p className={styles.notice}><CheckCircle2 size={17}/>{t.savedCheckin}</p>}
          <details className={styles.optionalDetails}>
            <summary>{t.extraCheckin}</summary>
            <div className={styles.optionalContent}>
              <OptionalNumber label={t.interference} value={interference} onChange={setInterference} t={t}/>
              <OptionalNumber label={t.resource} value={resource} onChange={setResource} t={t}/>
              <label className={styles.textField}>{t.note}<textarea maxLength={500} rows={2} value={note} onChange={event => setNote(event.target.value)}/></label>
            </div>
          </details>
        </>}
        {step === 1 && <>
          <div className={styles.illustration}><Lightbulb size={48} strokeWidth={1.65}/></div>
          {lesson.practiceV3?.recall && <div className={styles.recallBox}><strong>{t.recall}</strong><p>{lesson.practiceV3.recall}</p></div>}
          <blockquote className={styles.aphorism}>“{lesson.aphorism}”</blockquote>
          <p className={styles.description}>{lesson.sections?.find(item => item.kind === 'learn')?.text}</p>
          {lesson.workbook?.workingPosition && <div className={styles.tip}><strong>{t.working}</strong>
            <p>{lesson.workbook.workingPosition}</p><small>{t.workingCaution}</small></div>}
        </>}
        {step === 2 && <>
          <div className={styles.illustration}><Wind size={47} strokeWidth={1.55}/></div>
          <p className={styles.description}>{t.safety}</p>
          <div className={styles.preferenceRow} role="group" aria-label={t.practice}>
            <button type="button" disabled={pending} aria-pressed={cycle.preferences?.length === 'quick'}
              onClick={() => void setPracticePreference({ length: 'quick' })}>{t.quick}</button>
            <button type="button" disabled={pending} aria-pressed={cycle.preferences?.length !== 'quick'}
              onClick={() => void setPracticePreference({ length: 'standard' })}>{t.standard}</button>
            <button type="button" disabled={pending} aria-pressed={noImagery}
              onClick={() => void setPracticePreference({ imagery: noImagery ? 'optional' : 'no_imagery' })}>{t.gentle}</button>
          </div>
          {sections[section] && <article className={styles.guidedCard}>
            <span className={styles.stepIndex}>{t.stage} {section + 1} {t.of} {sections.length}</span>
            <h3>{sections[section].title}</h3>
            <p>{sections[section].text}</p>
            <CourseGuidedTimer key={cycle.id + ':' + cycle.day + ':' + section + ':' + (cycle.preferences?.length || 'standard')}
              seconds={sections[section].seconds} locale={locale}/>
          </article>}
          <p className={styles.subtle}>{t.timer}</p>
        </>}
        {step === 3 && <>
          <div className={styles.illustration}><Sprout size={47} strokeWidth={1.55}/></div>
          <div className={styles.taskCard}><strong>{t.ritual}</strong><p>{lesson.ritual}</p></div>
          {lesson.workbook?.microPractice && <div className={styles.taskCard}>
            <strong>{t.smallAction}</strong><p>{lesson.workbook.microPractice}</p></div>}
          {lesson.practiceV4 && <details className={styles.optionalDetails}>
            <summary>{t.symbol}</summary>
            <div className={styles.optionalContent}>
              <strong>{lesson.practiceV4.symbol}</strong>
              <div className={styles.preferenceRow}>
                <button aria-pressed={symbolMode === 'words' || noImagery} type="button" onClick={() => setSymbolMode('words')}>{t.words}</button>
                <button aria-pressed={symbolMode === 'image' && !noImagery} disabled={noImagery}
                  type="button" onClick={() => setSymbolMode('image')}>{t.imagery}</button>
              </div>
              <p>{symbolMode === 'image' && !noImagery ? lesson.practiceV4.invitation : lesson.practiceV4.withoutImagery}</p>
              <small>{t.symbolCaution}</small>
            </div>
          </details>}
        </>}
        {step === 4 && <>
          <p className={styles.prompt}>{lesson.workbook?.question || lesson.reflection || t.reflectPrompt}</p>
          {lesson.workbook?.sentenceStarter && <p className={styles.subtle}>{lesson.workbook.sentenceStarter}</p>}
          <fieldset className={styles.feedbackChoices}><legend>{t.feedback}</legend>
            {[['helped', t.helpful, Heart], ['neutral', t.neutral, Leaf],
              ['uncomfortable', t.uncomfortable, Shield], ['skip', t.noAnswer, PauseCircle]].map(([key, title, Icon]) =>
              <button key={key} type="button" aria-pressed={feedback === key}
                onClick={() => setFeedback(key)}><Icon size={19}/>{title}</button>)}
          </fieldset>
          <label className={styles.textField}>{t.reflection}
            <textarea rows={4} maxLength={500} value={reflection}
              placeholder={lesson.workbook?.sentenceStarter || ''}
              onChange={event => setReflection(event.target.value)}/>
            <small>{t.journal}</small></label>
          <details className={styles.optionalDetails}><summary>{t.extraReflection}</summary>
            <div className={styles.optionalContent}>
              <OptionalNumber label={t.before} value={before} onChange={setBefore} t={t}/>
              <OptionalNumber label={t.after} value={after} onChange={setAfter} t={t}/>
            </div>
          </details>
          <p className={styles.privateNote}><LockKeyhole size={15}/>{t.private}</p>
        </>}
        {step === 5 && <div className={styles.celebration}>
          <div className={styles.trophy} aria-hidden="true"><Trophy size={65} strokeWidth={1.55}/><Star size={24} className={styles.trophyStar}/></div>
          <p>{t.completeBody}</p>
          {rewardEarned && <strong className={styles.reward}><Sparkles size={22}/>{t.xpEarned}</strong>}
          {initiallyCompleted && !rewardEarned && <p className={styles.subtle}>{t.seenBefore}</p>}
          <p className={styles.subtle}>{t.pointsNotGrades}</p>
          <button type="button" className={styles.replayButton} onClick={() => setStep(1)}>{t.replay}<ChevronRight size={16}/></button>
        </div>}
      </main>
      <footer className={styles.playerFooter}>
        {step < 5 && <>
          <div className={styles.footerRow}>
            {step > 0 && <button type="button" className={styles.secondaryButton} disabled={pending}
              onClick={() => { setStep(value => value - 1); setSection(0) }}><ArrowLeft size={17}/>{t.back}</button>}
            {step === 0 && <button type="button" className={styles.secondaryButton} disabled={pending}
              onClick={() => setStep(1)}>{t.skip}</button>}
            {step === 2 && <button type="button" className={styles.secondaryButton} disabled={pending}
              onClick={() => { setStep(3); setSection(0) }}>{t.skipPractice}</button>}
          </div>
          <button type="button" className={styles.primaryButton} disabled={pending}
            onClick={step === 0 ? () => void saveCheckin() : advance}>
            {step === 0 ? (Number.isInteger(severity) ? t.saveNext : t.next) : step === 4 ? (alreadySaved ? t.backMap : t.finish) : t.next}
            {step === 4 ? <Check size={18}/> : <ArrowRight size={18}/>}
          </button>
          <small>{t.pointsNotGrades}</small>
        </>}
        {step === 5 && <button type="button" className={styles.primaryButton} onClick={onClose}>
          {t.backMap}<ArrowRight size={18}/></button>}
      </footer>
    </div>
  </div>
}
