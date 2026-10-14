'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, LockKeyhole, Sparkles, Waves, ShieldCheck, Target, SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { COURSE_STEPS } from '@/lib/inner-growth/course-model'
import { COURSE_PROGRAMS, getCourseProgram, courseProgramFromTopics } from '@/lib/inner-growth/course-programs'
import { getCoursePreset } from '@/lib/inner-growth/course-presets'
import CoursePresetCatalog from './course-preset-catalog'
import MyCoursesDashboard from './my-courses-dashboard'
import { useSubscription } from './subscription-access'
import CourseToday from './course-today'
import CourseEntrySelector from './course-entry-selector'
import Course14DayOverview from './course-14-day-overview'
import CourseR3Steps from './course-r3-steps'
import styles from './my-course.module.css'
import './my-course-theme.css'

const WORDS = {
  en: {
    eyebrow: 'MY COURSE · HOLISTIC HOUSE', title: 'Feel calmer. Grow stronger.',
    intro: 'A personal 14-day journey, one small step at a time. Choose what matters to you.',
    chooseProgram: 'Where would you like to begin?', personalCourse: 'Create my personal course',
    personalPrompt: 'A programme built around my own question and priorities.',
    exploreTrack: 'Choose this course', simpleSteps: 'Tests → 3 focus areas → 14 daily lessons',
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
    courses: 'My courses and history', chooseCourse: 'Choose a course', courseNumber: 'Course',
    newCourse: 'Start another course', activeCount: 'Active courses', courseLimit: 'Plan limit',
    limitReached: 'You have reached your active-course limit. Pause an active course before starting or resuming another.',
    overLimit: 'Your existing active courses and history are preserved after a plan change. New courses and resuming paused courses are limited until you are below your current allowance.',
    multiUnavailable: 'Additional courses are not available yet. Your current course and history are preserved.',
    historySafe: 'Pausing frees an active-course place. It never deletes your course history or saved progress.',
    courseStatuses: { draft: 'In setup', active: 'Active', paused: 'Paused', completed: 'Completed', archived: 'Archived' },
    interest: 'Based on your choices', notDiagnostic: 'Weekly Pulse is an original non-diagnostic self-report; these are not clinical thresholds.',
  },
  ru: {
    eyebrow: 'МОЙ КУРС · HOLISTIC HOUSE', title: 'Больше спокойствия. Больше опоры.',
    intro: 'Ваш личный путь на 14 дней. Каждый день — один небольшой шаг.',
    chooseProgram: 'С чего хотите начать?', personalCourse: 'Создать персональный курс',
    personalPrompt: 'Программа под мой собственный запрос и приоритеты.',
    exploreTrack: 'Выбрать курс', simpleSteps: 'Тесты → 3 направления → 14 ежедневных уроков',
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
    courses: 'Мои курсы и история', chooseCourse: 'Выберите курс', courseNumber: 'Курс',
    newCourse: 'Начать ещё один курс', activeCount: 'Активные курсы', courseLimit: 'Лимит тарифа',
    limitReached: 'Достигнут лимит активных курсов. Поставьте один курс на паузу, чтобы начать или возобновить другой.',
    overLimit: 'После смены тарифа текущие активные курсы и история сохраняются. Начать новый или возобновить приостановленный курс можно, когда число активных курсов станет меньше лимита тарифа.',
    multiUnavailable: 'Дополнительные курсы пока недоступны. Текущий курс и история сохраняются.',
    historySafe: 'Пауза освобождает место для активного курса. История и сохранённый прогресс не удаляются.',
    courseStatuses: { draft: 'Настройка', active: 'Активен', paused: 'На паузе', completed: 'Завершён', archived: 'В архиве' },
    interest: 'С учётом ваших тем', notDiagnostic: 'Weekly Pulse — авторский недиагностический самоотчёт; это не клинические пороги.',
  },
}

async function request(accountId, body, { courseId, signal } = {}) {
  if (!accountId) throw new Error('ACCOUNT_REQUIRED')
  const response = await fetch('/api/app/course' + (body?.courseId || courseId ? '?courseId=' + encodeURIComponent(body?.courseId || courseId) : ''), {
    method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', signal,
    headers: { 'X-HH-Account-ID': accountId, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const value = await response.json()
  if (!response.ok || value?.error || !value || typeof value !== 'object' || Array.isArray(value)) throw new Error(value?.error || 'COURSE_UNAVAILABLE')
  return value
}
const selectedCourseFromUrl = () => new URLSearchParams(window.location.search).get('courseId') || null
function replaceCourseUrl(courseId) {
  const url = new URL(window.location.href)
  if (courseId) url.searchParams.set('courseId', courseId)
  else url.searchParams.delete('courseId')
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
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
  const accountId = data?.account?.id
  const { status: billingStatus, phase: billingPhase } = useSubscription()
  const billingScope = useRef(null)
  const [snapshot, setSnapshot] = useState(undefined)
  const state = snapshot?.accountId === accountId ? snapshot.value : undefined
  const searchParams = useSearchParams()
  const router = useRouter()
  const [showCourse, setShowCourse] = useState(false)
  const requestedProgram = getCourseProgram(searchParams.get('program'))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [optIn, setOptIn] = useState(false)
  const [view, setView] = useState('list'), [selectedPreset, setSelectedPreset] = useState(null)
  const [selectedProgram,setSelectedProgram]=useState(null),[pendingPrograms,setPendingPrograms]=useState({})
  const startIntent=useRef(null),pendingProgramIntent=useRef({})
  const startDialogRef = useRef(null), selectorId = useId()
  const selectedCourse = useRef(null), currentAccount = useRef(accountId), mounted = useRef(false)
  const generation = useRef(0), readVersion = useRef(0), readController = useRef(null), actionLock = useRef(null)
  const newCourseId = useRef(null)
  currentAccount.current = accountId

  const refresh = useCallback(async (courseId = selectedCourse.current, { background = false, updateUrl = true, openPrimaryToday = false } = {}) => {
    const epoch = generation.current, version = ++readVersion.current
    readController.current?.abort()
    const controller = new AbortController()
    readController.current = controller
    const isCurrent = () => mounted.current && currentAccount.current === accountId && generation.current === epoch && readVersion.current === version && !controller.signal.aborted
    if (!background) { setError(''); setSnapshot(undefined) }
    try {
      const response = await request(accountId, undefined, { courseId, signal: controller.signal })
      if (!isCurrent()) return null
      if (courseId && response.course?.id !== courseId) throw new Error('COURSE_SELECTION_CHANGED')
      selectedCourse.current = response.course?.id || null
      setSnapshot({ accountId, value: response })
      if (openPrimaryToday && !courseId && response.course?.stage === 4 && response.course.status !== 'archived') {
        setView('detail');replaceCourseUrl(selectedCourse.current)
      } else if (updateUrl) replaceCourseUrl(selectedCourse.current)
      return response
    } catch (e) { if (isCurrent()) setError(e.message); return null }
    finally { if (readController.current === controller) readController.current = null }
  }, [accountId])

  useEffect(() => {
    mounted.current = true; generation.current += 1
    actionLock.current = null; newCourseId.current = null
    setShowCourse(Boolean(selectedCourseFromUrl())); setBusy(false); setOptIn(false); setSelectedPreset(null); setSelectedProgram(null); setPendingPrograms({}); pendingProgramIntent.current={}; startIntent.current=null
    startDialogRef.current?.close()
    selectedCourse.current = selectedCourseFromUrl()
    setView(selectedCourse.current ? 'detail' : 'list')
    void refresh(selectedCourse.current, { updateUrl: Boolean(selectedCourse.current), openPrimaryToday: true })
    const navigate = () => {
      generation.current += 1; actionLock.current = null; setBusy(false)
      selectedCourse.current = selectedCourseFromUrl()
      setView(selectedCourse.current ? 'detail' : 'list')
      startDialogRef.current?.close()
      void refresh(selectedCourse.current, { updateUrl: Boolean(selectedCourse.current) })
    }
    window.addEventListener('popstate', navigate)
    return () => {
      mounted.current = false; generation.current += 1; readVersion.current += 1
      readController.current?.abort()
      window.removeEventListener('popstate', navigate)
    }
  }, [refresh])

  useEffect(() => {
    if (billingPhase !== 'ready') return
    const stamp = JSON.stringify([billingStatus?.entitlement?.tier, billingStatus?.entitlement?.paidThrough])
    const previous = billingScope.current
    billingScope.current = { accountId, stamp }
    if (!previous || previous.accountId !== accountId || previous.stamp === stamp) return
    // A confirmed entitlement change triggers an owner-scoped read only.
    // Checkout clicks and redirect query strings never grant course capacity.
    void refresh(selectedCourse.current, { background: true, updateUrl: Boolean(selectedCourseFromUrl()) })
  }, [accountId, billingPhase, billingStatus?.entitlement?.tier, billingStatus?.entitlement?.paidThrough, refresh])

  const viewGeneration = generation.current
  function isSelected(courseId = state?.course?.id, epoch = viewGeneration) {
    return mounted.current && currentAccount.current === accountId && generation.current === epoch && selectedCourse.current === courseId
  }
  function acceptState(response) {
    if (!isSelected() || response?.course?.id !== state?.course?.id) return
    readVersion.current += 1; readController.current?.abort()
    setSnapshot({ accountId, value: response })
  }
  function acceptError(message) { if (isSelected()) setError(message) }
  function selectCourse(courseId) {
    generation.current += 1; actionLock.current = null; setBusy(false)
    selectedCourse.current = courseId
    setView('detail')
    startDialogRef.current?.close()
    void refresh(courseId)
  }

  async function readSelectedCourse() {
    const courseId = state?.course?.id, epoch = viewGeneration
    if (!courseId || !isSelected(courseId, epoch)) throw new Error('COURSE_SELECTION_CHANGED')
    const response = await request(accountId, undefined, { courseId })
    if (!isSelected(courseId, epoch) || response.course?.id !== courseId) throw new Error('COURSE_SELECTION_CHANGED')
    return response
  }
  async function courseCommand(action, values = {}) {
    const courseId = state?.course?.id, epoch = viewGeneration
    if (!courseId || !isSelected(courseId, epoch)) throw new Error('COURSE_SELECTION_CHANGED')
    if (actionLock.current) throw new Error('COURSE_ACTION_PENDING')
    const token = {}; actionLock.current = token; setBusy(true); setError('')
    readVersion.current += 1; readController.current?.abort()
    try {
      const response = await request(accountId, { action, expectedRevision: state.course.revision, ...values, courseId })
      if (!isSelected(courseId, epoch)) throw new Error('COURSE_SELECTION_CHANGED')
      if (response.course?.id !== courseId) throw new Error('COURSE_SELECTION_CHANGED')
      return response
    } finally { if (actionLock.current === token) { actionLock.current = null; if (isSelected(courseId, epoch)) setBusy(false) } }
  }

  async function applyProgramIntake(started, programme, epoch) {
    const courseId=started.course?.id
    if (!courseId || !isSelected(courseId,epoch)) throw new Error('COURSE_SELECTION_CHANGED')
    if (started.course.presetId) throw new Error('COURSE_PRESET_TESTS_FIXED')
    if (started.course.stage !== 1) {
      if (started.course.stage >= 2 && courseProgramFromTopics(started.course.focusTags)?.id === programme.id) return started
      throw new Error('COURSE_SELECTION_CHANGED')
    }
    const withTopics=await request(accountId, {
      action: 'intake', courseId,
      expectedRevision: started.course.revision,
      concerns: '', focusTags: [...programme.focusTags],
    })
    if (!isSelected(courseId,epoch) || withTopics.course?.id !== courseId) throw new Error('COURSE_SELECTION_CHANGED')
    return withTopics
  }
  function clearPendingProgram(courseId) {
    delete pendingProgramIntent.current[courseId]
    setPendingPrograms(previous=>{const next={...previous};delete next[courseId];return next})
  }
  async function act(action, values = {}) {
    if (actionLock.current) return
    if (action !== 'start') {
      try {
        const response=await courseCommand(action,values)
        if (!isSelected() || response.course?.id!==state?.course?.id) return
        acceptState(response)
        if (['select-preset','select-personal','intake'].includes(action)) clearPendingProgram(response.course.id)
      } catch (e) { acceptError(e.message) }
      return
    }
    const programme=getCourseProgram(values.programId)
    if (values.consent !== true || (values.presetId && !getCoursePreset(values.presetId)) ||
        (values.programId && !programme) || (values.presetId && programme)) return
    let targetCourseId=selectedCourse.current
    const epoch=viewGeneration
    if (!isSelected(targetCourseId,epoch)) return
    const token = {}; actionLock.current = token; setBusy(true); setError('')
    readVersion.current += 1; readController.current?.abort()
    try {
      newCourseId.current ||= crypto.randomUUID()
      const requestedCourseId=newCourseId.current
      const started = await request(accountId, { action: 'start', consent: true, courseId: requestedCourseId,
        newCourse: true, ...(values.presetId ? { presetId: values.presetId } : {}),
      })
      if (!isSelected(targetCourseId,epoch)) return
      if (started.course?.id !== requestedCourseId) throw new Error('COURSE_SELECTION_CHANGED')
      readVersion.current += 1; readController.current?.abort()
      selectedCourse.current = targetCourseId = started.course.id
      setSnapshot({ accountId, value: started }); replaceCourseUrl(started.course.id)
      newCourseId.current = null; setView('detail')
      if ((started.course.presetId || null) !== (values.presetId || null)) throw new Error('COURSE_START_SELECTION_CHANGED')
      if (programme) {
        if (started.course.presetId) throw new Error('COURSE_PRESET_TESTS_FIXED')
        pendingProgramIntent.current[started.course.id]=programme.id
        setPendingPrograms(previous=>({...previous,[started.course.id]:programme.id}))
        const withTopics=await applyProgramIntake(started,programme,epoch)
        if (!isSelected(targetCourseId,epoch)) return
        readVersion.current+=1;readController.current?.abort()
        setSnapshot({accountId,value:withTopics});clearPendingProgram(targetCourseId)
      }
    } catch (e) { if (isSelected(targetCourseId,epoch)) setError(e.message) }
    finally { if (actionLock.current === token) { actionLock.current = null; if (mounted.current && currentAccount.current === accountId && generation.current === epoch) setBusy(false) } }
  }

  function openStartDialog(presetId = null, programId = null) {
    if (busy || (presetId !== null && !getCoursePreset(presetId)) || (programId !== null && !getCourseProgram(programId)) ||
        (presetId && programId) || (view === 'switch' && programId)) return
    if (view !== 'switch' && (atLimit || (courses.length > 0 && !access?.multiCourseEnabled))) return
    setSelectedPreset(presetId);setSelectedProgram(programId);setOptIn(false)
    startIntent.current={accountId,courseId:selectedCourse.current,epoch:viewGeneration,presetId,programId,switching:view==='switch'}
    startDialogRef.current?.showModal()
  }
  const renderedStartIntent=startIntent.current
  async function confirmStart() {
    if (!optIn || busy) return
    const intent=startIntent.current
    if (!intent || intent!==renderedStartIntent || intent.accountId!==accountId || !isSelected(intent.courseId,intent.epoch) || actionLock.current) return
    startIntent.current=null;startDialogRef.current?.close()
    if (intent.switching) {
      setView('detail')
      await act(intent.presetId ? 'select-preset' : 'select-personal',{consent:true,...(intent.presetId?{presetId:intent.presetId}:{})})
    } else {
      await act('start', { consent: true, ...(intent.presetId ? { presetId: intent.presetId } : {}), ...(intent.programId ? { programId: intent.programId } : {}) })
    }
  }
  async function retryProgramIntake() {
    const courseId=state?.course?.id,epoch=viewGeneration,programme=getCourseProgram(pendingPrograms[courseId])
    const isCurrent=()=>isSelected(courseId,epoch)&&pendingProgramIntent.current[courseId]===programme?.id
    if (!programme || actionLock.current || !isCurrent()) return
    const token={};actionLock.current=token;setBusy(true);setError('')
    readVersion.current+=1;readController.current?.abort()
    try {
      const fresh=await request(accountId,undefined,{courseId})
      if (!isCurrent() || fresh.course?.id!==courseId || ['completed','archived'].includes(fresh.course.status)) throw new Error('COURSE_SELECTION_CHANGED')
      const withTopics=await applyProgramIntake(fresh,programme,epoch)
      if (!isCurrent()) return
      readVersion.current+=1;readController.current?.abort()
      setSnapshot({accountId,value:withTopics});clearPendingProgram(courseId)
    } catch(e) {if(isSelected(courseId,epoch))setError(e.message)}
    finally {if(actionLock.current===token){actionLock.current=null;if(isSelected(courseId,epoch))setBusy(false)}}
  }
  function changeView(next) {
    // Leaving a detail page invalidates all of its callbacks, including when
    // returning to the same course after cancelling a new-course selection.
    generation.current += 1; readVersion.current += 1
    readController.current?.abort(); actionLock.current = null; setBusy(false)
    startDialogRef.current?.close(); setView(next)
    if (next === 'list') {
      replaceCourseUrl(null)
      void refresh(selectedCourse.current, { background: true, updateUrl: false })
    }
  }
  function startAnother() { if (!busy && canAddCourse) changeView('new') }
  async function manageCourse(action, item) {
    const courseId = selectedCourse.current, epoch = viewGeneration
    const target = courses.find(course => course.id === item.id && course.revision === item.revision)
    if (!target || !isSelected(courseId, epoch) || actionLock.current) return
    const token = {}; actionLock.current = token; setBusy(true); setError('')
    readVersion.current += 1; readController.current?.abort()
    try {
      const response = await request(accountId, { action, courseId: target.id, expectedRevision: target.revision })
      if (!isSelected(courseId, epoch)) return
      if (response.course?.id !== target.id) throw new Error('COURSE_SELECTION_CHANGED')
      readVersion.current += 1; readController.current?.abort()
      selectedCourse.current = target.id
      setSnapshot({ accountId, value: response })
    } catch (e) { if (isSelected(courseId, epoch)) setError(e.message) }
    finally { if (actionLock.current === token) { actionLock.current = null; if (mounted.current && currentAccount.current === accountId && generation.current === epoch) setBusy(false) } }
  }
  function courseChanged() { if (isSelected()) void refresh(state.course.id, { background: true }) }

  const courses = Array.isArray(state?.courses) ? state.courses : state?.course ? [state.course] : []
  const access = state?.access
  const atLimit = Boolean(access && access.activeCourseCount >= access.activeCourseLimit)
  const canAddCourse = Boolean(access?.multiCourseEnabled && !atLimit)
  const showDashboard = courses.length > 0 && view === 'list'
  const isHistory = ['completed', 'archived'].includes(state?.course?.status)
  const stage = view === 'new' || view === 'switch' ? 0 : state?.course?.stage || 0
  const visibleStep = stage === 1 ? 2 : stage === 2
    ? ((state?.course?.testKeys || []).length ? 4 : 3) : stage === 3 ? 5 : stage === 4 ? 6 : 1

  if (state === undefined && !error) return <section className={'hh-panel ' + styles.root} aria-busy="true"><p>{ru ? 'Открываем ваш курс…' : 'Opening your course…'}</p></section>
  if (!state) return <section className={'hh-panel ' + styles.root} role="alert"><h1>{t.personal}</h1><p>{t.issue}</p><button onClick={() => refresh()}>{t.retry}</button></section>

  // Returning from a test or following a programme link must keep the learner
  // inside the existing course onboarding flow.
  const testReturn = searchParams.get('tests') === 'complete' || searchParams.get('retest') === 'updated'
  const programmeEntry = stage === 0 && Boolean(requestedProgram)
  if (!showCourse && !testReturn && !programmeEntry) return <CourseEntrySelector
    key={accountId + ':' + (state.course?.id || '')}
    accountId={accountId} course={state.course} access={access} locale={locale}
    onAdd={() => { if (isSelected() && canAddCourse) { setShowCourse(true); startAnother() } }}
    onOpen={() => setShowCourse(true)}/>

  return <div className={styles.root} data-my-course>
    {showDashboard && <MyCoursesDashboard key={accountId + ':' + viewGeneration}
      courses={courses} membership={state.membership || { tier: access?.tier, maxActiveCourses: access?.activeCourseLimit, occupiedCount: access?.activeCourseCount }}
      locale={locale} busy={busy} canAddCourse={canAddCourse} canManageCourses={Boolean(access?.multiCourseEnabled)} overLimit={access?.overLimit}
      onOpen={course => selectCourse(course.id)} onNew={startAnother}
      onClose={course => manageCourse('close', course)} onPrimary={course => manageCourse('make-primary', course)}
    />}
    {!showDashboard && courses.length > 0 && <button type="button" className={styles.backCourses} onClick={() => changeView('list')}>
      ← {ru ? 'Мои курсы' : 'My courses'}
    </button>}
    {!showDashboard && stage !== 4 && view === 'detail' && courses.length > 0 && <section className={styles.courseSelector} aria-labelledby={selectorId + '-heading'}>
      <h2 id={selectorId + '-heading'}>{t.courses}</h2>
      <label htmlFor={selectorId}>{t.chooseCourse}</label>
      <select id={selectorId} value={state.course?.id || ''} disabled={busy} onChange={event => selectCourse(event.target.value)}>
        {courses.map((course, index) => <option key={course.id} value={course.id}>
          {t.courseNumber} {index + 1} · {t.courseStatuses[course.status] || course.status} · {course.startedAt || course.updatedAt ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(course.startedAt || course.updatedAt)) : ''}
        </option>)}
      </select>
      {access && <p role="status">{t.activeCount}: {access.activeCourseCount} / {access.activeCourseLimit} · {access.tier}</p>}
      {access?.overLimit ? <p className={styles.notice}>{t.overLimit}</p> : atLimit ? <p className={styles.notice}>{t.limitReached}</p> : null}
      {!access?.multiCourseEnabled && <p className={styles.small}>{t.multiUnavailable}</p>}
      <p className={styles.small}>{t.historySafe}</p>
      <button type="button" className="hh-primary" disabled={busy || !canAddCourse} onClick={startAnother}>{t.newCourse}</button>
    </section>}
    {showDashboard || courses.length === 0 ? <button type="button" className={styles.backToCourses} onClick={() => {
      changeView('list'); setShowCourse(false)
      if (testReturn || programmeEntry) router.replace(root + '/course')
    }}><ArrowLeft size={17} aria-hidden="true"/>{ru ? 'Мои курсы' : 'My courses'}</button> : null}
    {!showDashboard && stage === 0 && <header className={styles.hero}>
      <div>
        <p className="hh-kicker">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p className={styles.heroLead}>{t.intro}</p>
        <div className={styles.meta}><span><Sparkles size={16} aria-hidden="true"/>{t.free}</span><span><BookOpen size={16} aria-hidden="true"/>{t.time}</span></div>
        <div className={styles.heroActions}>
          <button type="button" className="hh-primary" disabled={busy} onClick={() => openStartDialog(null, requestedProgram?.id || null)}>{t.start}<ArrowRight size={18} aria-hidden="true"/></button>
          <a className={styles.textLink} href="#course-details">{t.how} ↓</a>
        </div>
      </div>
      <div className={styles.heroMark} aria-hidden="true"><img src="/images/holistic-house/hero-olive-incense.webp" alt="" width={320} height={220} loading="lazy" /></div>
    </header>}
    {!showDashboard && view !== 'switch' && stage === 0 && <section className={styles.programSelection} data-course-program-selection aria-label={t.chooseProgram}>
      <div className={styles.programHeading}>
        <h2>{t.chooseProgram}</h2>
        <p>{t.simpleSteps}</p>
        {requestedProgram && <p className={styles.preselectedProgram} data-course-preselected-program={requestedProgram.id}>{ru ? 'По вашему направлению подойдёт курс:' : 'Suggested for your chosen direction:'} <strong>{requestedProgram.title[ru ? 'ru' : 'en']}</strong></p>}
      </div>
      <div className={styles.programGrid}>
        {COURSE_PROGRAMS.map((program, index) => {
          const Icon = [Waves, ShieldCheck, Target][index]
          return <button className={styles.programCard} key={program.id} type="button"
            data-course-program-id={program.id} data-recommended={requestedProgram?.id === program.id} disabled={busy}
            onClick={() => openStartDialog(null,program.id)}>
            <span className={styles.programIcon}><Icon size={29} strokeWidth={1.8} aria-hidden="true"/></span>
            <span className={styles.programPain}>{program.pain[ru ? 'ru' : 'en']}</span>
            <strong>{program.title[ru ? 'ru' : 'en']}</strong>
            <span className={styles.programPromise}>{program.promise[ru ? 'ru' : 'en']}</span>
            <span className={styles.programOutcomes}>{program.outcome[ru ? 'ru' : 'en']}</span>
            <span className={styles.programAction}>{t.exploreTrack}<ArrowRight size={16} aria-hidden="true"/></span>
          </button>
        })}
      </div>
      <button className={styles.personalTrack} type="button" disabled={busy}
        data-course-personal-program onClick={() => openStartDialog(null)}>
        <SlidersHorizontal size={24} aria-hidden="true"/>
        <span><strong>{t.personalCourse}</strong><small>{t.personalPrompt}</small></span>
        <ArrowRight size={21} aria-hidden="true"/>
      </button>
    </section>}
    {!showDashboard && stage === 0 && <details className={styles.overviewDisclosure}>
      <summary>{t.how}</summary>
      <Course14DayOverview locale={locale} />
    </details>}
    {!showDashboard && stage === 0 && (view === 'switch' ? <CoursePresetCatalog locale={locale} busy={busy}
      onPreset={openStartDialog} onPersonal={() => openStartDialog(null)} switchMode /> : <details className={styles.overviewDisclosure} data-course-fixed-presets>
      <summary>{ru?'Курсы с фиксированным набором тестов':'Courses with fixed test sets'}</summary>
      <CoursePresetCatalog locale={locale} busy={busy} onPreset={openStartDialog} onPersonal={() => openStartDialog(null)} />
    </details>)}
    {!showDashboard && !isHistory && stage >= 1 && stage <= 3 && <div className={styles.activeProgress} aria-label={t.step + ' ' + visibleStep + ' ' + t.of + ' 6'}>
      <strong>{t.step} {visibleStep} {t.of} 6</strong><progress max={6} value={visibleStep}/>
    </div>}
    {error && <p className={styles.error} role="alert">{error==='URGENT_SUPPORT_NEEDED'?t.urgentHelp:['COURSE_LIMIT_REACHED','ACTIVE_COURSE_LIMIT_REACHED'].includes(error)?t.limitReached:t.issue} ({error}) <button type="button" onClick={() => refresh()}>{t.retry}</button></p>}

    {!showDashboard && stage === 0 && <section className={'hh-panel ' + styles.details} id="course-details">
      <p className="hh-kicker">{t.how}</p>
      <h2>{t.detailTitle}</h2>
      <p>{t.detailIntro}</p>
      <Journey stage={1} locale={locale}/>
      <p className={styles.privacy}><LockKeyhole size={15} aria-hidden="true"/>{t.note}</p>
    </section>}

    <dialog ref={startDialogRef} className={styles.startDialog}
      aria-labelledby="course-consent-heading" onClose={() => {setOptIn(false);startIntent.current=null}}>
      <h2 id="course-consent-heading">{selectedPreset ? getCoursePreset(selectedPreset)?.title?.[ru ? 'ru' : 'en'] : t.consentTitle}</h2>
      {getCourseProgram(selectedProgram) && <p className={styles.selectedProgramName}>{getCourseProgram(selectedProgram).title[ru ? "ru" : "en"]}</p>}
      <p>{t.consentHelp}</p>
      <label className={styles.consent}><input type="checkbox" checked={optIn}
        onChange={(e) => setOptIn(e.target.checked)}/><span>{t.consent}</span></label>
      <div className={styles.dialogActions}>
        <button type="button" className="hh-primary" disabled={!optIn || busy} onClick={() => void confirmStart()}>{t.consentConfirm}<ArrowRight size={17} aria-hidden="true"/></button>
        <button type="button" disabled={busy} onClick={() => startDialogRef.current?.close()}>{t.cancel}</button>
      </div>
    </dialog>

    {!showDashboard && !isHistory && pendingPrograms[state?.course?.id] && <section className={styles.notice} data-course-program-retry>
      <p>{ru?'Курс создан. Завершите настройку выбранной программы:':'Your course is created. Finish setting up your chosen programme:'} {getCourseProgram(pendingPrograms[state.course.id])?.title?.[ru?'ru':'en']}</p>
      <button type="button" disabled={busy} onClick={()=>void retryProgramIntake()}>{ru?'Повторить настройку программы':'Retry programme setup'}</button>
    </section>}

    {!showDashboard && !isHistory && stage >= 1 && stage <= 3 && <button type="button" disabled={busy} className={styles.backCourses}
      onClick={() => changeView('switch')}>
      {ru ? 'Изменить направление курса' : 'Change course direction'}
    </button>}
    {!showDashboard && !isHistory && stage >= 1 && stage <= 3 && <CourseR3Steps
      stage={stage} locale={locale} data={data} state={state} busy={busy}
      key={accountId + ':' + state.course.id + ':' + (state.course.presetId || 'personal')}
      onAct={act} onCourseCommand={courseCommand} onCourseRead={readSelectedCourse} isCourseCurrent={isSelected}
      onState={acceptState} onError={acceptError} root={root}
    />}

    {!showDashboard && view === 'detail' && isHistory && stage < 4 && <section className={'hh-panel ' + styles.details} data-course-history-readonly>
      <h2>{t.courseStatuses[state.course.status]}</h2>
      <p>{ru ? 'Этот курс сохранён в истории. Его настройки доступны только для просмотра.' : 'This course is saved in your history. Its setup is now read-only.'}</p>
      <p>{t.selected}: {state.course.testKeys?.length || 0}</p>
    </section>}

    {!showDashboard && stage === 4 && <CourseToday locale={locale} key={state.course.id} courseId={state.course.id} accountId={accountId} access={access} onCourseChange={courseChanged} />}

    {stage !== 4 && <footer className={styles.footer}><LockKeyhole size={15}/><span>{t.safe} {t.note}</span></footer>}
  </div>
}

export default MyCourse
