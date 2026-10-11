'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, BookOpen, Check, CheckCircle2, CirclePause, ClipboardList, Feather, Heart, LockKeyhole, Play, RotateCcw, Sparkles, Target } from 'lucide-react'
import { GROWTH_GOALS, COURSE_TOPICS, COURSE_STEPS, courseLesson, growthSuggestions, suggestedCourseTopics } from '@/lib/inner-growth/course-model'
import { MONITORING_CATALOG } from '@/data/assessments/catalog'
import styles from './my-course.module.css'

const WORDS = {
  en: {
    eyebrow: 'MY COURSE · HOLISTIC HOUSE', title: 'Your personal path to inner growth',
    intro: 'A gentle, structured course shaped by what matters to you and the tests you choose. Practice psychological skills and observe change in your own time.',
    free: 'Free to start', time: '5–12 minutes a day', note: 'Self-guided learning, not a diagnosis, psychotherapy session or emergency monitoring.',
    start: 'Start my free course', continue: 'Continue my course', consent: 'I agree to privately save my course choices, voluntary concerns and practice progress in my account.',
    personal: 'My personal course', step: 'Step', of: 'of', planned: 'My journey',
    concernsTitle: 'Tell us what you want to work on', concernsHint: 'Describe a current difficulty or an important goal in your own words. Optional; do not include emergency information.',
    concernPlaceholder: 'For example: I would like to feel calmer in difficult conversations and have more inner support.',
    themes: 'What would you like to explore?', suggestions: 'Tests that may help explore your topics',
    suggestTopics: 'Suggest themes from my description', urgent: 'If you may be in danger or thinking of harming yourself, please contact local emergency services or a qualified crisis support service now. This course is not monitored for emergencies.',
    changes: 'Changes in my weekly check-ins', noComparison: 'You need at least two comparable weekly check-ins to see a change. This is different from your lesson completion progress.',
    changeNotice: 'These numbers describe your self-reports on different dates; they do not establish that the course caused a change.',
    explore: 'Open the full test finder', testHint: 'Use the existing My Tests filters to choose and save the tests that suit you. You may change your selection.',
    saveContinue: 'Save and open the test finder', selectedReady: 'My tests are selected — continue', selected: 'Selected tests', done: 'Completed', results: 'Saved results',
    testTitle: 'Explore yourself through testing', testText: 'Continue any saved test, or select new questionnaires. Your responses and detailed reports remain in your private account.',
    runTests: 'Go to My Tests', review: 'Review my results and growth options', noTests: 'Complete at least one test to proceed. You can always return here.',
    approveTitle: 'Choose the resources you want to develop', approveText: 'These suggestions are optional. Only you decide which skills to practise.',
    basedOn: 'Suggestions from your recent Holistic House Weekly Pulse', noDerived: 'Choose from these resources. We cannot identify personal low scales from compatible test data yet.',
    optional: 'You may choose 1–3 directions', consentGoals: 'I choose these goals and want a personal daily practice course.',
    duration: 'Course length', days14: '14 days · gentle start', days28: '28 days · deeper integration', confirm: 'Create my personal course', another: 'View full test reports',
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
    eyebrow: 'МОЙ КУРС · HOLISTIC HOUSE', title: 'Ваш личный путь внутреннего развития',
    intro: 'Бережный персональный курс на основе ваших запросов и выбранных тестов. Развивайте психологические навыки и наблюдайте за собой в собственном темпе.',
    free: 'Начать бесплатно', time: '5–12 минут в день', note: 'Самостоятельная практика, а не диагноз, сеанс психотерапии или экстренная помощь.',
    start: 'Начать мой бесплатный курс', continue: 'Продолжить мой курс', consent: 'Я согласен(на) на приватное сохранение выбора курса, добровольно описанных трудностей и прогресса в моём аккаунте.',
    personal: 'Мой личный курс', step: 'Этап', of: 'из', planned: 'Мой путь',
    concernsTitle: 'Что бы вы хотели изменить?', concernsHint: 'Опишите трудность или важную цель своими словами. Поле необязательное; не используйте его для экстренных обращений.',
    concernPlaceholder: 'Например: хочу спокойнее чувствовать себя в общении и больше опираться на себя.',
    themes: 'Какие темы вам близки?', suggestions: 'Тесты, которые помогут изучить эти темы',
    suggestTopics: 'Предложить темы на основе моего описания', urgent: 'Если вам сейчас угрожает опасность или есть мысли причинить себе вред, обратитесь в местную экстренную службу или кризисную службу поддержки. Этот курс не отслеживается специалистом в реальном времени.',
    changes: 'Изменения по недельным самоотчётам', noComparison: 'Для анализа изменений нужны хотя бы два сопоставимых недельных замера. Это отдельно от количества выполненных уроков.',
    changeNotice: 'Цифры описывают ваши ответы в разные даты, но не доказывают, что изменения вызваны курсом.',
    explore: 'Открыть полный подбор тестов', testHint: 'В существующем разделе My Tests выберите тесты по темам и проблемам, сохраните набор; его всегда можно изменить.',
    saveContinue: 'Сохранить и подобрать тесты', selectedReady: 'Тесты выбраны — продолжить', selected: 'Выбрано тестов', done: 'Пройдено', results: 'Сохранённые результаты',
    testTitle: 'Изучите себя с помощью тестов', testText: 'Продолжите сохранённые тесты или подберите новые. Ответы и подробные отчёты остаются в вашем кабинете.',
    runTests: 'Перейти к моим тестам', review: 'Посмотреть результаты и направления развития', noTests: 'Чтобы продолжить, пройдите хотя бы один тест. Вы сможете вернуться сюда.',
    approveTitle: 'Выберите ресурсы, которые хотите развивать', approveText: 'Предложения необязательны. Только вы решаете, какие навыки практиковать.',
    basedOn: 'Предложения по последнему недельному самоотчёту Holistic House', noDerived: 'Выберите нужные ресурсы. Пока нет совместимых данных, чтобы делать персональные выводы о шкалах.',
    optional: 'Можно выбрать 1–3 направления', consentGoals: 'Я выбираю эти цели и хочу проходить персональный ежедневный курс.',
    duration: 'Продолжительность курса', days14: '14 дней · мягкий старт', days28: '28 дней · углублённая практика', confirm: 'Создать мой личный курс', another: 'Посмотреть отчёты тестов',
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

const asLocale = (value, locale) => value?.[locale] || value?.en || ''
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
  const router = useRouter()
  const [state, setState] = useState(undefined)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [optIn, setOptIn] = useState(false)
  const [concerns, setConcerns] = useState('')
  const [focusTags, setFocusTags] = useState([])
  const [goals, setGoals] = useState([])
  const [goalsAccepted, setGoalsAccepted] = useState(false)
  const [durationDays, setDurationDays] = useState(14)
  const [sessionStep, setSessionStep] = useState(0)
  const [feedback, setFeedback] = useState('skip')

  async function refresh() {
    setError('')
    try {
      const response = await request()
      setState(response)
      setConcerns(response.course?.concerns || '')
      setFocusTags(response.course?.focusTags || [])
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
      setSessionStep(0)
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  const stateCourse = state?.course
  const stage = stateCourse?.stage || 0
  const assessment = state?.assessments || {}
  const suggested = useMemo(() => growthSuggestions(data.results || [], locale), [data.results, locale])
  const suggestedTopics = useMemo(() => suggestedCourseTopics(concerns), [concerns])
  const testCards = useMemo(() => {
    const match = MONITORING_CATALOG.filter((item) => item.startable && item.rightsStatus === 'cleared' &&
      (item.instrumentLocale === locale || item.instrumentLocale === 'dynamic') &&
      focusTags.some((tag) => item.topics?.includes(tag)))
    return match.slice(0, 3)
  }, [focusTags, locale])
  const total = stateCourse?.durationDays || 14
  const today = stateCourse?.today || 1
  const completions = stateCourse?.dayCompletions || {}
  const todayComplete = Boolean(completions[String(today)])
  const hasTestSelection = (assessment.plannedInSet > 0 && assessment.planStatus !== 'cancelled') ||
    assessment.resultsCount > 0
  const testsReady = assessment.resultsCount > 0 && (assessment.planStatus !== 'active' ||
    (assessment.plannedInSet > 0 && assessment.completedInSet >= assessment.plannedInSet))
  const activeGoal = stateCourse?.goals?.[(today - 1) % Math.max(stateCourse?.goals?.length || 1, 1)] || 'calm_regulation'
  const lesson = courseLesson(activeGoal, today, locale)
  const completed = Object.keys(completions).length
  const weekly = assessment.weeklyChange
  const weeklyNames = {
    'weekly.mood': ru ? 'Эмоциональное состояние' : 'Mood',
    'weekly.tension': ru ? 'Напряжение' : 'Tension',
    'weekly.load': ru ? 'Психологическая нагрузка' : 'Stress load',
    'weekly.recovery': ru ? 'Восстановление' : 'Recovery',
    'weekly.energy': ru ? 'Энергия' : 'Energy',
    'weekly.clarity': ru ? 'Ясность' : 'Mental clarity',
    'weekly.connection': ru ? 'Поддержка' : 'Connection',
    'weekly.functioning': ru ? 'Повседневная активность' : 'Daily functioning',
  }

  if (state === undefined && !error) return <section className={'hh-panel ' + styles.root} aria-busy="true"><p>{ru ? 'Открываем ваш курс…' : 'Opening your course…'}</p></section>
  if (!state) return <section className={'hh-panel ' + styles.root} role="alert"><h1>{t.personal}</h1><p>{t.issue}</p><button onClick={refresh}>{t.retry}</button></section>

  return <div className={styles.root} data-my-course>
    <header className={styles.hero}>
      <div>
        <p className="hh-kicker">{t.eyebrow}</p>
        <h1>{stage ? t.personal : t.title}</h1>
        <p>{t.intro}</p>
        <div className={styles.meta}><span><Sparkles size={15} aria-hidden="true"/>{t.free}</span><span><BookOpen size={15} aria-hidden="true"/>{t.time}</span></div>
      </div>
      <div className={styles.heroMark} aria-hidden="true"><Feather size={55} strokeWidth={1.1}/></div>
    </header>
    <Journey stage={stage} locale={locale}/>
    {error && <p className={styles.error} role="alert">{t.issue} ({error}) <button type="button" onClick={refresh}>{t.retry}</button></p>}

    {stage === 0 && <section className={'hh-panel ' + styles.chapter}>
      <p className={styles.small}>{t.note}</p>
      <label className={styles.consent}><input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)}/><span>{t.consent}</span></label>
      <button type="button" className="hh-primary" disabled={!optIn || busy} onClick={() => act('start', { consent: true })}>{t.start}<ArrowRight size={17}/></button>
      <p className={styles.privacy}><LockKeyhole size={15} aria-hidden="true"/>{t.note}</p>
    </section>}

    {stage === 1 && <section className={'hh-panel ' + styles.chapter}>
      <p className="hh-kicker">{t.step} 1 {t.of} 4</p>
      <h2>{t.concernsTitle}</h2><p>{t.concernsHint}</p>
      <label htmlFor="growth-concerns" className={styles.formLabel}>{t.concernsTitle}</label>
      <textarea id="growth-concerns" rows={4} maxLength={1000} value={concerns} placeholder={t.concernPlaceholder}
        onChange={(e) => setConcerns(e.target.value)} />
      {suggestedTopics.urgent && <p role="alert" className={styles.error}>{t.urgent}</p>}
      {suggestedTopics.topics.length > 0 && !suggestedTopics.urgent &&
        <button type="button" className={styles.suggestButton} onClick={() => setFocusTags(suggestedTopics.topics)}>
          <Sparkles size={16} aria-hidden="true"/>{t.suggestTopics}
        </button>}
      <div><strong>{t.themes}</strong><div className={styles.chips}>
        {COURSE_TOPICS.map((tag) => <button key={tag.id} type="button" aria-pressed={focusTags.includes(tag.id)}
          onClick={() => setFocusTags((tags) => tags.includes(tag.id) ? tags.filter((x) => x !== tag.id) : [...tags,tag.id])}>
          {asLocale(tag.title,locale)}
        </button>)}
      </div></div>
      {testCards.length > 0 && <div className={styles.testMatches}>
        <strong>{t.suggestions}</strong>
        {testCards.map((item) => <div key={item.key} className={styles.testMatch}><ClipboardList size={17}/><span>{asLocale(item.title,locale)}</span><small>~{item.durationMinutes} min</small></div>)}
      </div>}
      <p className={styles.small}>{t.testHint}</p>
      <button type="button" className="hh-primary" disabled={busy || suggestedTopics.urgent} onClick={async () => {
        if (busy || suggestedTopics.urgent) return
        setBusy(true)
        setError('')
        try {
          const saved = await request({ action:'intake', expectedRevision:stateCourse.revision, concerns, focusTags })
          setState(saved)
          router.push(root + '/tests')
        } catch (e) { setError(e.message) }
        finally { setBusy(false) }
      }}>{t.saveContinue}<ArrowRight size={17}/></button>
      {hasTestSelection && <button type="button" disabled={busy || suggestedTopics.urgent}
        onClick={async () => {
          if (busy || suggestedTopics.urgent) return
          setBusy(true); setError('')
          try {
            const saved = await request({ action:'intake', expectedRevision:stateCourse.revision, concerns, focusTags })
            setState(await request({ action:'to-tests', expectedRevision:saved.course.revision }))
          } catch (e) { setError(e.message) }
          finally { setBusy(false) }
        }}>{t.selectedReady}<ArrowRight size={17}/></button>}
    </section>}

    {stage === 2 && <section className={'hh-panel ' + styles.chapter}>
      <p className="hh-kicker">{t.step} 2 {t.of} 4</p>
      <h2>{t.testTitle}</h2><p>{t.testText}</p>
      <div className={styles.stats}><div><strong>{assessment.plannedInSet || 0}</strong><span>{t.selected}</span></div><div><strong>{assessment.completedInSet || 0}</strong><span>{t.done}</span></div><div><strong>{assessment.resultsCount || 0}</strong><span>{t.results}</span></div></div>
      <Link href={root + '/tests'} className="hh-primary" prefetch={false}>{t.runTests}<ArrowRight size={17}/></Link>
      <p className={styles.small}>{t.noTests}</p>
      <button type="button" disabled={busy || !testsReady} onClick={() => act('review')}>{t.review}<ArrowRight size={17}/></button>
    </section>}

    {stage === 3 && <section className={'hh-panel ' + styles.chapter}>
      <p className="hh-kicker">{t.step} 3 {t.of} 4</p>
      <h2>{t.approveTitle}</h2><p>{t.approveText}</p>
      <Link href={root + '/portfolio'} prefetch={false} className={styles.textLink}>{t.another}<ArrowRight size={16}/></Link>
      <p className={styles.small}>{suggested.length ? t.basedOn : t.noDerived}</p>
      <div className={styles.goals}>
        {Object.entries(GROWTH_GOALS).map(([key, value]) => {
          const evidence = suggested.find((r) => r.goal === key)
          const selected = goals.includes(key)
          return <label key={key} className={styles.goal} data-selected={selected}>
            <input type="checkbox" checked={selected} disabled={!selected && goals.length >= 3}
              onChange={(e) => setGoals((prev) => e.target.checked ? [...prev, key] : prev.filter((k) => k !== key))}/>
            <span><strong>{asLocale(value.title,locale)}</strong><small>{asLocale(value.description,locale)}</small>
              {evidence && <em>{t.interest}: {evidence.scaleKey} · {evidence.response}/10 · {new Date(evidence.measuredAt).toLocaleDateString(ru?'ru-RU':'en-CA')}</em>}
            </span>
          </label>
        })}
      </div>
      <p className={styles.small}>{t.optional} · {t.notDiagnostic}</p>
      <fieldset className={styles.length}><legend>{t.duration}</legend>
        <label><input type="radio" checked={durationDays===14} onChange={() => setDurationDays(14)} name="growth-duration"/>{t.days14}</label>
        <label><input type="radio" checked={durationDays===28} onChange={() => setDurationDays(28)} name="growth-duration"/>{t.days28}</label>
      </fieldset>
      <label className={styles.consent}><input type="checkbox" checked={goalsAccepted} onChange={(e)=>setGoalsAccepted(e.target.checked)}/><span>{t.consentGoals}</span></label>
      <button type="button" className="hh-primary" disabled={busy || !goals.length || !goalsAccepted}
        onClick={() => act('choose-goals', { goals, durationDays, consent:true })}>{t.confirm}<ArrowRight size={17}/></button>
    </section>}

    {stage === 4 && <section className={'hh-panel ' + styles.chapter}>
      <div className={styles.sessionHeader}>
        <div><p className="hh-kicker">{t.step} 4 {t.of} 4</p><h2>{t.session}</h2><p>{t.day} {today} / {total} · {t.min}</p></div>
        <span className={styles.sessionSymbol}><Heart size={24}/></span>
      </div>
      <div className={styles.progressLabel}><strong>{t.progress}</strong><span>{completed} / {total} {t.completeCount}</span></div>
      <div className={styles.dayGrid} aria-label={t.progress}>
        {Array.from({ length: total }, (_, index) => <span key={index} data-completed={Boolean(completions[String(index + 1)])}
          data-current={index + 1 === today} title={t.day + ' ' + (index + 1)} />)}
      </div>
      <div className={styles.practiceIntro}><strong>{t.goal}: {asLocale(GROWTH_GOALS[activeGoal].title,locale)}</strong><p>{t.prepared}</p></div>
      {stateCourse.status === 'paused' ? <p className={styles.notice}>{t.paused}</p> :
       todayComplete ? <div className={styles.done}><CheckCircle2 size={22}/><div><strong>{t.completed}</strong><p>{t.already}</p></div></div> :
       sessionStep === 0 ? <div className={styles.practiceActions}>
         <button type="button" className="hh-primary" onClick={() => setSessionStep(1)}><Play size={17}/>{t.begin}</button>
         <button type="button" onClick={() => setSessionStep(2)}>{t.short}</button>
       </div> : <div className={styles.practiceBody}>
         {sessionStep === 1 && <><p className="hh-kicker">{t.aphorism}</p><blockquote>“{lesson.aphorism}”</blockquote><p>{lesson.teaching}</p></>}
         {sessionStep === 2 && <><p className="hh-kicker">{t.meditate}</p><p>{lesson.meditation}</p><p className={styles.small}>{t.prepared}</p></>}
         {sessionStep === 3 && <><p className="hh-kicker">{t.ritual}</p><p>{lesson.ritual}</p></>}
         {sessionStep === 4 && <><p className="hh-kicker">{t.reflection}</p><p>{lesson.reflection}</p>
           <fieldset className={styles.feedback}><legend>{t.askFeedback}</legend>
             {[['helped',t.helped],['neutral',t.neutral],['uncomfortable',t.uncomfortable],['skip',t.skip]].map(([value,label])=>
               <label key={value}><input type="radio" name="growth-feedback" value={value} checked={feedback===value} onChange={()=>setFeedback(value)}/>{label}</label>)}
           </fieldset>
         </>}
         {sessionStep < 4 ? <button type="button" className="hh-primary" onClick={()=>setSessionStep(x=>x+1)}>{t.next}<ArrowRight size={17}/></button> :
           <button type="button" className="hh-primary" disabled={busy} onClick={()=>act('complete-day',{day:today,feedback})}>{t.finish}<Check size={17}/></button>}
       </div>}
      <div className={styles.bottomActions}>
        <button type="button" disabled={busy} onClick={()=>act(stateCourse.status==='paused'?'resume':'pause')}>
          {stateCourse.status==='paused'?<RotateCcw size={16}/>:<CirclePause size={16}/>}
          {stateCourse.status==='paused'?t.resume:t.pause}
        </button>
        <Link href={root + '/portfolio'} prefetch={false}>{t.mood}</Link>
      </div>
      <aside className={styles.comparison}><Target size={18}/><div><strong>{t.changes}</strong>
        {weekly ? <div className={styles.weeklyChanges}>
          <small>{new Date(weekly.from).toLocaleDateString(ru?'ru-RU':'en-CA')} → {new Date(weekly.to).toLocaleDateString(ru?'ru-RU':'en-CA')}</small>
          <div className={styles.scoreGrid}>
            {weekly.changes.filter((item)=>Object.hasOwn(weeklyNames,item.key)).map((item)=>
              <span key={item.key}><strong>{weeklyNames[item.key]}</strong><small>{item.from} → {item.to} / 10</small></span>)}
          </div>
          <p>{t.changeNotice}</p>
        </div> : <p>{t.noComparison}</p>}
        <p>{t.compareNote}</p><Link href={root+'/monitoring'} prefetch={false}>{t.compare} →</Link></div></aside>
    </section>}

    <footer className={styles.footer}><LockKeyhole size={15}/><span>{t.safe} {t.note}</span></footer>
  </div>
}

export default MyCourse
