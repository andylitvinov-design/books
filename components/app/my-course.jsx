'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, Check, LockKeyhole, Sparkles } from 'lucide-react'
import { COURSE_STEPS } from '@/lib/inner-growth/course-model'
import CourseToday from './course-today'
import Course14DayOverview from './course-14-day-overview'
import CourseR3Steps from './course-r3-steps'
import styles from './my-course.module.css'
import './my-course-theme.css'

const WORDS = {
  en: {
    eyebrow: 'MY COURSE · HOLISTIC HOUSE', title: 'My personal course',
    intro: 'Explore your stress patterns, choose your own tests and build practical skills with short daily exercises.',
    free: 'Free to start', time: '5–12 minutes a day', note: 'Self-guided learning, not a diagnosis, psychotherapy session or emergency monitoring.',
    start: 'Start course for free', continue: 'Continue my course', consent: 'I agree to privately save my course choices, voluntary concerns and practice progress in my account.',
    how: 'How it works', detailTitle: 'Six steps to your personal course',
    detailIntro: 'Start with what matters to you. You choose the tests and goals; then follow a personal daily practice plan.',
    consentTitle: 'Save your course privately?', consentHelp: 'Your choices and optional notes are stored in your private account only after your consent.',
    consentConfirm: 'Agree & start', cancel: 'Not now',
    focusIntro: 'Pick any areas you would like to explore. Add a description only if you want to.',
    optionalSituation: 'Describe my situation (optional)',
    testChoiceTitle: 'You decide which tests to take', testChoiceHint: 'Recommendations are optional. Choose and save only the tests you want.',
    chooseMyTests: 'Choose my own tests', seeSuggestions: 'See suggested tests', hideSuggestions: 'Hide suggestions',
    suggestionsOptional: 'Nothing here is added automatically. Open any suggestion to review it or choose a different test.',
    saveReturn: 'After saving your chosen tests, you will return to your course.',
    personal: 'My personal course', step: 'Step', of: 'of', planned: 'My journey',
    concernsTitle: 'Tell us what you want to work on', concernsHint: 'Describe a current difficulty or an important goal in your own words. Optional; do not include emergency information.',
    concernPlaceholder: 'For example: I would like to feel calmer in difficult conversations and have more inner support.',
    themes: 'What would you like to explore?', suggestions: 'Tests that may help explore your topics',
    suggestTopics: 'Suggest themes from my description', urgent: 'If you may be in danger or thinking of harming yourself, please contact local emergency services or a qualified crisis support service now. This course is not monitored for emergencies.',
    changes: 'Changes in my weekly check-ins', noComparison: 'You need at least two comparable weekly check-ins to see a change. This is different from your lesson completion progress.',
    changeNotice: 'These numbers describe your self-reports on different dates; they do not establish that the course caused a change.',
    explore: 'Open the full test finder', testHint: 'Use the existing My Tests filters to choose and save the tests that suit you. You may change your selection.',
    saveContinue: 'Open the test finder', selectedReady: 'Continue with my chosen tests', selected: 'Selected tests', done: 'Completed', results: 'Saved results',
    testTitle: 'Explore yourself through testing', testText: 'Continue any saved test, or select new questionnaires. Your responses and detailed reports remain in your private account.',
    runTests: 'Go to My Tests', review: 'Review my results and growth options', noTests: 'Complete at least one test to proceed. You can always return here.',
    approveTitle: 'Choose the resources you want to develop', approveText: 'These suggestions are optional. Only you decide which skills to practise.',
    basedOn: 'Suggestions from your recent Holistic House Weekly Pulse', noDerived: 'Choose from these resources. We cannot identify personal low scales from compatible test data yet.',
    optional: 'You may choose 1–3 directions', consentGoals: 'I choose these goals and want a personal daily practice course.',
    duration: 'Course length', days14: '14 days · gentle start', days28: '28 days · deeper integration', confirm: 'Create my personal course',
    urgentHelp: 'If you are in immediate danger or considering self-harm, contact local emergency or crisis support services now. This course is not monitored by a therapist.',
    targetPrompt: 'The one personal problem I want to observe each day',targetHint: 'Choose specific words. The daily question will be: How difficult was this problem over the last 24 hours? (0–10).',
    intentionPrompt: 'One real-life skill I would like to build (optional)',nextCycleHint: 'After 14 days you may start a new cycle with a new goal.', another: 'View full test reports',
    session: 'Today’s personal lesson', day: 'Day', goal: 'Developing', min: 'about 6 min',
    prepared: 'Your own pace. Keep your eyes open, do not force your breath or feelings, and stop if uncomfortable.',
    begin: 'Start today’s practice', short: 'Choose a shorter exercise', next: 'Continue', meditate: 'Grounding or visualization', reflection: 'Reflect',
    aphorism: 'A thought for today', ritual: 'Small ritual and action', finish: 'Save today’s practice',
    helped: 'Helpful', neutral: 'Neutral', uncomfortable: 'Uncomfortable', skip: 'Prefer not to say',
    askFeedback: 'How did this feel?', completed: 'Today’s practice saved', already: 'You have finished this lesson. Return for your next daily step.',
    progress: 'Practice journey', completeCount: 'lessons completed', pause: 'Pause course', resume: 'Resume course',
    paused: 'Your course is paused. You may resume when ready.', mood: 'Check my test results', compare: 'Repeat tests when they are due',
    compareNote: 'Course activity is different from psychological change. Repeat only suitable tests at their recommended intervals, then review comparable results in Insights.',
    issue: 'Your course is temporarily unavailable. No personal information has been saved by this page. Please try again.',
    retry: 'Try again', safe: 'You can skip or stop a practice. If distress is severe or persistent, seek support from a qualified healthcare professional.',
    interest: 'Based on your choices', notDiagnostic: 'Weekly Pulse is an original non-diagnostic self-report; these are not clinical thresholds.',
  },
  ru: {
    eyebrow: 'МОЙ КУРС · HOLISTIC HOUSE', title: 'Мой личный курс',
    intro: 'Узнайте больше о своих стрессовых зонах, выберите нужные тесты и развивайте полезные навыки с короткими ежедневными практиками.',
    free: 'Начать бесплатно', time: '5–12 минут в день', note: 'Самостоятельная практика, а не диагноз, сеанс психотерапии или экстренная помощь.',
    start: 'Начать курс бесплатно', continue: 'Продолжить мой курс', consent: 'Я согласен(на) на приватное сохранение выбора курса, добровольно описанных трудностей и прогресса в моём аккаунте.',
    how: 'Как проходит курс', detailTitle: 'Шесть шагов личного курса',
    detailIntro: 'Начните с важных для вас тем. Вы сами выбираете тесты и цели, затем получаете ежедневные практики.',
    consentTitle: 'Сохранить курс приватно?', consentHelp: 'Ваш выбор и необязательные заметки сохранятся только в личном кабинете после согласия.',
    consentConfirm: 'Согласен(на), начать', cancel: 'Не сейчас',
    focusIntro: 'Отметьте интересующие темы. Описывать свою ситуацию необязательно.',
    optionalSituation: 'Описать ситуацию (необязательно)',
    testChoiceTitle: 'Вы сами решаете, какие тесты пройти', testChoiceHint: 'Рекомендации необязательны. Выберите и сохраните только нужные вам тесты.',
    chooseMyTests: 'Выбрать тесты самостоятельно', seeSuggestions: 'Посмотреть рекомендации', hideSuggestions: 'Скрыть рекомендации',
    suggestionsOptional: 'Ничего не добавится автоматически. Можете открыть предложенный тест или выбрать любой другой.',
    saveReturn: 'После сохранения выбранных тестов вы вернётесь в свой курс.',
    personal: 'Мой личный курс', step: 'Этап', of: 'из', planned: 'Мой путь',
    concernsTitle: 'Что бы вы хотели изменить?', concernsHint: 'Опишите трудность или важную цель своими словами. Поле необязательное; не используйте его для экстренных обращений.',
    concernPlaceholder: 'Например: хочу спокойнее чувствовать себя в общении и больше опираться на себя.',
    themes: 'Какие темы вам близки?', suggestions: 'Тесты, которые помогут изучить эти темы',
    suggestTopics: 'Предложить темы на основе моего описания', urgent: 'Если вам сейчас угрожает опасность или есть мысли причинить себе вред, обратитесь в местную экстренную службу или кризисную службу поддержки. Этот курс не отслеживается специалистом в реальном времени.',
    changes: 'Изменения по недельным самоотчётам', noComparison: 'Для анализа изменений нужны хотя бы два сопоставимых недельных замера. Это отдельно от количества выполненных уроков.',
    changeNotice: 'Цифры описывают ваши ответы в разные даты, но не доказывают, что изменения вызваны курсом.',
    explore: 'Открыть полный подбор тестов', testHint: 'В существующем разделе My Tests выберите тесты по темам и проблемам, сохраните набор; его всегда можно изменить.',
    saveContinue: 'Открыть подбор тестов', selectedReady: 'Продолжить с выбранными тестами', selected: 'Выбрано тестов', done: 'Пройдено', results: 'Сохранённые результаты',
    testTitle: 'Изучите себя с помощью тестов', testText: 'Продолжите сохранённые тесты или подберите новые. Ответы и подробные отчёты остаются в вашем кабинете.',
    runTests: 'Перейти к моим тестам', review: 'Посмотреть результаты и направления развития', noTests: 'Чтобы продолжить, пройдите хотя бы один тест. Вы сможете вернуться сюда.',
    approveTitle: 'Выберите ресурсы, которые хотите развивать', approveText: 'Предложения необязательны. Только вы решаете, какие навыки практиковать.',
    basedOn: 'Предложения по последнему недельному самоотчёту Holistic House', noDerived: 'Выберите нужные ресурсы. Пока нет совместимых данных, чтобы делать персональные выводы о шкалах.',
    optional: 'Можно выбрать 1–3 направления', consentGoals: 'Я выбираю эти цели и хочу проходить персональный ежедневный курс.',
    duration: 'Продолжительность курса', days14: '14 дней · мягкий старт', days28: '28 дней · углублённая практика', confirm: 'Создать мой личный курс',
    urgentHelp: 'При непосредственной опасности или мыслях о причинении себе вреда обратитесь в местную экстренную или кризисную службу. Этот курс не отслеживается специалистом в реальном времени.',
    targetPrompt: 'Одна конкретная проблема, за которой я хочу наблюдать',targetHint: 'Выберите понятную формулировку. Каждый день вопрос будет: насколько выражена проблема за последние 24 часа? (0–10).',
    intentionPrompt: 'Какой навык хочу применять в жизни? (необязательно)',nextCycleHint: 'После 14 дней можно начать новый цикл с другой целью.', another: 'Посмотреть отчёты тестов',
    session: 'Персональный урок сегодня', day: 'День', goal: 'Развиваем', min: 'около 6 минут',
    prepared: 'Работайте в своём темпе. Можно не закрывать глаза, не менять дыхание и прекращать упражнение при дискомфорте.',
    begin: 'Начать сегодняшнюю практику', short: 'Короткая версия упражнения', next: 'Продолжить', meditate: 'Заземление или визуализация', reflection: 'Рефлексия',
    aphorism: 'Афоризм дня', ritual: 'Маленький ритуал и действие', finish: 'Сохранить практику',
    helped: 'Помогло', neutral: 'Нейтрально', uncomfortable: 'Некомфортно', skip: 'Не хочу отвечать',
    askFeedback: 'Как прошло упражнение?', completed: 'Практика сегодня сохранена', already: 'Этот урок завершён. Следующий будет доступен в другой день.',
    progress: 'Путь практики', completeCount: 'уроков пройдено', pause: 'Поставить на паузу', resume: 'Продолжить курс',
    paused: 'Курс на паузе. Вы можете вернуться к нему в удобное время.', mood: 'Посмотреть свои результаты', compare: 'Повторить тесты в подходящий срок',
    compareNote: 'Количество занятий не равно улучшению психического состояния. Сопоставляйте только совместимые результаты тестов в Insights и учитывайте рекомендованные интервалы.',
    issue: 'Курс временно недоступен. Эта страница не сохранила персональные сведения. Попробуйте ещё раз.',
    retry: 'Повторить', safe: 'Любое упражнение можно пропустить или остановить. Если состояние тяжёлое или ухудшается, обратитесь к квалифицированному специалисту.',
    interest: 'С учётом ваших тем', notDiagnostic: 'Weekly Pulse — авторский недиагностический самоотчёт; это не клинические пороги.',
  },
}

async function request(body) {
  const response = await fetch('/api/app/course', {
    method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'COURSE_UNAVAILABLE')
  return data
}

function Journey({ stage, locale }) {
  return <ol className={styles.timeline} aria-label={locale === 'ru' ? 'Этапы курса' : 'Course stages'}>
    {COURSE_STEPS.map((step, index) => <li key={index}
      className={stage > index + 1 ? styles.passed : stage === index + 1 ? styles.current : ''}
      aria-current={stage === index + 1 ? 'step' : undefined}>
      <span className={styles.number}>{stage > index + 1 ? <Check size={17} aria-hidden="true" /> : index + 1}</span>
      <div><strong>{step[locale]}</strong><small>{step.detail[locale]}</small></div>
    </li>)}
  </ol>
}

export function MyCourse({ data, locale = 'en' }) {
  const ru = locale === 'ru'
  const t = WORDS[locale] || WORDS.en
  const root = '/' + locale + '/app'
  const [state, setState] = useState(undefined)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [optIn, setOptIn] = useState(false)
  const startDialogRef = useRef(null)

  async function refresh() {
    setError('')
    try {
      const response = await request()
      setState(response)
    } catch (e) { setError(e.message) }
  }
  useEffect(() => { void refresh() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function act(action, values = {}) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const response = await request({ action, ...(action === 'start' ? {} : { expectedRevision: state.course?.revision }), ...values })
      setState(response)
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  function openStartDialog() {
    if (busy) return
    setOptIn(false)
    startDialogRef.current?.showModal()
  }

  async function courseCommand(action,values={}) {
    if (!state?.course) throw new Error('COURSE_NOT_STARTED')
    return request({ action, expectedRevision:state.course.revision, ...values })
  }

  const stage = state?.course?.stage || 0
  const visibleStep = stage === 1 ? 2 : stage === 2
    ? ((state?.course?.testKeys || []).length ? 4 : 3) : stage === 3 ? 5 : stage === 4 ? 6 : 1

  if (state === undefined && !error) return <section className={'hh-panel ' + styles.root} aria-busy="true"><p>{ru ? 'Открываем ваш курс…' : 'Opening your course…'}</p></section>
  if (!state) return <section className={'hh-panel ' + styles.root} role="alert"><h1>{t.personal}</h1><p>{t.issue}</p><button onClick={refresh}>{t.retry}</button></section>

  return <div className={styles.root} data-my-course>
    {stage === 0 && <header className={styles.hero}>
      <div>
        <p className="hh-kicker">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p className={styles.heroLead}>{t.intro}</p>
        <div className={styles.meta}><span><Sparkles size={16} aria-hidden="true"/>{t.free}</span><span><BookOpen size={16} aria-hidden="true"/>{t.time}</span></div>
        <div className={styles.heroActions}>
          <button type="button" className="hh-primary" disabled={busy} onClick={openStartDialog}>{t.start}<ArrowRight size={18} aria-hidden="true"/></button>
          <a className={styles.textLink} href="#course-details">{t.how} ↓</a>
        </div>
      </div>
      <div className={styles.heroMark} aria-hidden="true"><img src="/images/holistic-house/andy-about.png" alt="" width={118} height={118} loading="lazy" /></div>
    </header>}
    {stage === 0 && <Course14DayOverview locale={locale} />}
    {stage >= 1 && stage <= 3 && <div className={styles.activeProgress} aria-label={t.step + ' ' + visibleStep + ' ' + t.of + ' 6'}>
      <strong>{t.step} {visibleStep} {t.of} 6</strong><progress max={6} value={visibleStep}/>
    </div>}
    {error && <p className={styles.error} role="alert">{error==='URGENT_SUPPORT_NEEDED'?t.urgentHelp:t.issue} ({error}) <button type="button" onClick={refresh}>{t.retry}</button></p>}

    {stage === 0 && <section className={'hh-panel ' + styles.details} id="course-details">
      <p className="hh-kicker">{t.how}</p>
      <h2>{t.detailTitle}</h2>
      <p>{t.detailIntro}</p>
      <Journey stage={1} locale={locale}/>
      <button type="button" className="hh-primary" disabled={busy} onClick={openStartDialog}>{t.start}<ArrowRight size={18} aria-hidden="true"/></button>
      <p className={styles.privacy}><LockKeyhole size={15} aria-hidden="true"/>{t.note}</p>
    </section>}

    {stage === 0 && <dialog ref={startDialogRef} className={styles.startDialog}
      aria-labelledby="course-consent-heading" onClose={() => setOptIn(false)}>
      <h2 id="course-consent-heading">{t.consentTitle}</h2>
      <p>{t.consentHelp}</p>
      <label className={styles.consent}><input type="checkbox" checked={optIn}
        onChange={(e) => setOptIn(e.target.checked)}/><span>{t.consent}</span></label>
      <div className={styles.dialogActions}>
        <button type="button" className="hh-primary" disabled={!optIn || busy} onClick={() => {
          startDialogRef.current?.close()
          void act('start', { consent: true })
        }}>{t.consentConfirm}<ArrowRight size={17} aria-hidden="true"/></button>
        <button type="button" disabled={busy} onClick={() => startDialogRef.current?.close()}>{t.cancel}</button>
      </div>
    </dialog>}

    {stage >= 1 && stage <= 3 && <CourseR3Steps
      stage={stage} locale={locale} data={data} state={state} busy={busy}
      onAct={act} onCourseCommand={courseCommand}
      onState={setState} onError={setError} root={root}
    />}

    {stage === 4 && <CourseToday locale={locale} />}

    {stage !== 4 && <footer className={styles.footer}><LockKeyhole size={15}/><span>{t.safe} {t.note}</span></footer>}
  </div>
}

export default MyCourse
