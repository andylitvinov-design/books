'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, LockKeyhole, Sparkles, Waves, ShieldCheck, Target, SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { COURSE_STEPS } from '@/lib/inner-growth/course-model'
import { ACTIVE_COURSE_PROGRAM_ID, COURSE_PROGRAMS, getCourseProgram, courseProgramFromTopics } from '@/lib/inner-growth/course-programs'
import { getCoursePreset } from '@/lib/inner-growth/course-presets'
import CoursePresetCatalog from './course-preset-catalog'
import MyCoursesDashboard from './my-courses-dashboard'
import { useSubscription } from './subscription-access'
import { courseTagsForExplorerFocus, courseConcernsFromIntent } from '@/lib/inner-growth/course-entry-intent'
import { readCourseEntryIntent } from '@/lib/inner-growth/course-entry-client'
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
    chooseProgram: 'One course is available now', personalCourse: 'Personalize my Anti-Stress course',
    personalPrompt: 'Choose the scales and daily goals that matter to you within OPORA Anti-Stress.',
    exploreTrack: 'Start Anti-Stress', soon: 'Coming soon', simpleSteps: 'Weekly Pulse baseline → optional tests → your focus → 14 daily lessons',
    free: 'Free to start', time: '5–12 minutes a day', note: 'Self-guided learning, not a diagnosis, psychotherapy session or emergency monitoring.',
    start: 'Start course for free', continue: 'Continue my course', consent: 'Your course choices, optional notes and practice progress are saved privately in your account when you start.',
    how: 'How it works', detailTitle: 'Six steps to your personal course',
    detailIntro: 'Start with what matters to you. You choose the tests and goals; then follow a personal daily practice plan.',
    consentTitle: 'Save your course privately?', consentHelp: 'Next: complete your Weekly Pulse (8 questions) before lesson 1; GAD-7 and Resource Pulse are optional. Your choices and notes are saved only after consent.',
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
    issue: 'We could not complete this course action. Your previously completed tests remain saved in My Tests; this module may still need to be started.',
    retry: 'Check saved status', safe: 'You can skip or stop a practice. If distress is severe or persistent, seek support from a qualified healthcare professional.',
    courses: 'My courses and history', chooseCourse: 'Choose a course', courseNumber: 'Course',
    newCourse: 'Start another course', activeCount: 'Active courses', courseLimit: 'Plan limit',
    limitReached: 'You have reached your active-course limit. Pause an active course before starting or resuming another.',
    overLimit: 'Your existing active courses and history are preserved after a plan change. New courses and resuming paused courses are limited until you are below your current allowance.',
    multiUnavailable: 'Only one course can run at a time. Close the current course to begin a new one.',
    historySafe: 'Closing a course frees its place. Saved tests and completed lessons remain in your history.',
    courseStatuses: { draft: 'In setup', active: 'Active', paused: 'Paused', completed: 'Completed', archived: 'Archived' },
    interest: 'Based on your choices', notDiagnostic: 'Weekly Pulse is an original non-diagnostic self-report; these are not clinical thresholds.',
  },
  ru: {
    eyebrow: 'МОЙ КУРС · HOLISTIC HOUSE', title: 'Больше спокойствия. Больше опоры.',
    intro: 'Ваш личный путь на 14 дней. Каждый день — один небольшой шаг.',
    chooseProgram: 'Сейчас доступен один курс', personalCourse: 'Настроить мой «Антистресс»',
    personalPrompt: 'Выберите важные лично вам шкалы и цели внутри программы «ОПОРА — Антистресс».',
    exploreTrack: 'Начать Антистресс', soon: 'Скоро', simpleSteps: 'Исходный тест Weekly Pulse → дополнительные тесты → ваш фокус → 14 уроков',
    free: 'Начать бесплатно', time: '5–12 минут в день', note: 'Самостоятельная практика, а не диагноз, сеанс психотерапии или экстренная помощь.',
    start: 'Начать курс бесплатно', continue: 'Продолжить мой курс', consent: 'После начала курса ваш выбор, добровольные заметки и прогресс сохраняются приватно в личном кабинете.',
    how: 'Как проходит курс', detailTitle: 'Шесть шагов личного курса',
    detailIntro: 'Начните с важных для вас тем. Вы сами выбираете тесты и цели, затем получаете ежедневные практики.',
    consentTitle: 'Сохранить курс приватно?', consentHelp: 'Далее — исходный Weekly Pulse (8 вопросов) до первого урока; GAD-7 и тест ресурсов по желанию. Данные сохраняются только после согласия.',
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
    issue: 'Не удалось завершить действие с курсом. Ранее пройденные тесты остаются в разделе «Мои тесты», но запуск модуля нужно проверить.',
    retry: 'Проверить сохранение', safe: 'Любое упражнение можно пропустить или остановить. Если состояние тяжёлое или ухудшается, обратитесь к квалифицированному специалисту.',
    courses: 'Мои курсы и история', chooseCourse: 'Выберите курс', courseNumber: 'Курс',
    newCourse: 'Начать ещё один курс', activeCount: 'Активные курсы', courseLimit: 'Лимит тарифа',
    limitReached: 'Достигнут лимит активных курсов. Поставьте один курс на паузу, чтобы начать или возобновить другой.',
    overLimit: 'После смены тарифа текущие активные курсы и история сохраняются. Начать новый или возобновить приостановленный курс можно, когда число активных курсов станет меньше лимита тарифа.',
    multiUnavailable: 'Одновременно доступен один курс. Закройте текущий курс, чтобы начать новый.',
    historySafe: 'Закрытие курса освобождает место. Пройденные тесты и занятия остаются в истории.',
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
  if (courseId) {
    url.searchParams.set('courseId', courseId)
    // A chosen lesson has its own URL. The Courses tab remains an index-only entry.
    if (url.searchParams.get('view') === 'courses') url.searchParams.delete('view')
  } else url.searchParams.delete('courseId')
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
  // Cabinet navigation opens the complete course list; explicit courseId links still open lessons.
  const coursesIndexEntry = searchParams.get('view') === 'courses'
  const router = useRouter()
  const [showCourse, setShowCourse] = useState(false)
  const requestedProgram = searchParams.get('program') === ACTIVE_COURSE_PROGRAM_ID ? getCourseProgram(ACTIVE_COURSE_PROGRAM_ID) : null
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState('list')
  const [pendingPrograms,setPendingPrograms]=useState({})
  const pendingProgramIntent=useRef({}),pendingProgramConcerns=useRef({})
  const selectorId = useId()
  const selectedCourse = useRef(null), currentAccount = useRef(accountId), mounted = useRef(false)
  const generation = useRef(0), readVersion = useRef(0), readController = useRef(null), actionLock = useRef(null)
  const newCourseId = useRef(null)
  const acceptedStartSerial = useRef(0)
  currentAccount.current = accountId
  const [courseEntry, setCourseEntry] = useState(null)
  const [personalEntryDismissed, setPersonalEntryDismissed] = useState(false)
  useEffect(() => { setCourseEntry(readCourseEntryIntent()) }, [])

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
      // Opening "Courses" resumes the only saved in-progress course, even at
      // the free 1/1 limit. A full plan only restricts creating a second course.
      const ownedCourses = Array.isArray(response.courses) ? response.courses : response.course ? [response.course] : []
      const resumable = ownedCourses.filter(item => item && Number(item.stage || 0) > 0 &&
        !['closed', 'archived', 'completed'].includes(item.status))
      const selectedIsOnlyCourse = resumable.length === 1 && resumable[0].id === response.course?.id
      if (openPrimaryToday && !courseId && response.course?.stage > 0 &&
          !['closed', 'archived', 'completed'].includes(response.course.status) &&
          (selectedIsOnlyCourse || response.course.stage === 4)) {
        setShowCourse(true)
        setView('detail'); replaceCourseUrl(selectedCourse.current)
      } else if (updateUrl) replaceCourseUrl(selectedCourse.current)
      return response
    } catch (e) { if (isCurrent()) setError(e.message); return null }
    finally { if (readController.current === controller) readController.current = null }
  }, [accountId])

  useEffect(() => {
    mounted.current = true; generation.current += 1
    actionLock.current = null; newCourseId.current = null
    setShowCourse(coursesIndexEntry || Boolean(selectedCourseFromUrl())); setBusy(false); setPendingPrograms({}); pendingProgramIntent.current={}; pendingProgramConcerns.current={}
    selectedCourse.current = selectedCourseFromUrl()
    setView(coursesIndexEntry ? 'list' : selectedCourse.current ? 'detail' : 'list')
    void refresh(selectedCourse.current, { updateUrl: Boolean(selectedCourse.current) && !coursesIndexEntry, openPrimaryToday: !coursesIndexEntry })
    const navigate = () => {
      generation.current += 1; actionLock.current = null; setBusy(false)
      selectedCourse.current = selectedCourseFromUrl()
      const returningToIndex = new URLSearchParams(window.location.search).get('view') === 'courses'
      setShowCourse(returningToIndex || Boolean(selectedCourse.current))
      setView(returningToIndex ? 'list' : selectedCourse.current ? 'detail' : 'list')


      void refresh(selectedCourse.current, { updateUrl: Boolean(selectedCourse.current) && !returningToIndex })
    }
    window.addEventListener('popstate', navigate)
    return () => {
      mounted.current = false; generation.current += 1; readVersion.current += 1
      readController.current?.abort()
      window.removeEventListener('popstate', navigate)
    }
  }, [refresh, coursesIndexEntry])

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
    setShowCourse(true)
    setView('detail')


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

  async function applyProgramIntake(started, programme, epoch, concerns = '') {
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
      concerns, focusTags: [...programme.focusTags],
    })
    if (!isSelected(courseId,epoch) || withTopics.course?.id !== courseId) throw new Error('COURSE_SELECTION_CHANGED')
    return withTopics
  }
  function clearPendingProgram(courseId) {
    delete pendingProgramIntent.current[courseId]
    delete pendingProgramConcerns.current[courseId]
    setPendingPrograms(previous=>{const next={...previous};delete next[courseId];return next})
  }
  async function act(action, values = {}) {
    if (actionLock.current) return
    if (action !== 'start') {
      try {
        const response=await courseCommand(action,values)
        if (!isSelected() || response.course?.id!==state?.course?.id) return
        if (['select-preset', 'select-personal'].includes(action)) acceptedStartSerial.current += 1
        acceptState(response)
        if (['select-preset','select-personal','intake'].includes(action)) clearPendingProgram(response.course.id)
      } catch (e) { acceptError(e.message) }
      return
    }
    const programme=getCourseProgram(values.programId)
    const entry=courseEntry
    const entryConcerns=courseConcernsFromIntent(entry, locale)
    if (values.consent !== true || (values.presetId && !getCoursePreset(values.presetId)) ||
        (values.programId && !programme) || (values.presetId && programme)) return
    let targetCourseId=selectedCourse.current
    const epoch=viewGeneration
    if (!isSelected(targetCourseId,epoch)) return
    const token = {}; actionLock.current = token; setBusy(true); setError('')
    readVersion.current += 1; readController.current?.abort()
    try {
      newCourseId.current ||= crypto.randomUUID()
      const restartingClosed = state?.course?.status === 'closed' && access?.multiCourseEnabled !== true
      const requestedCourseId=restartingClosed ? state.course.id : newCourseId.current
      const started = await request(accountId, { action: 'start', consent: true, courseId: requestedCourseId,
        // Legacy free accounts have one reusable course row, not parallel course slots.
        newCourse: access?.multiCourseEnabled === true, ...(restartingClosed ? { expectedRevision: state.course.revision } : {}), ...(values.presetId ? { presetId: values.presetId } : {}),
      })
      if (!isSelected(targetCourseId,epoch)) return
      if (started.course?.id !== requestedCourseId) throw new Error('COURSE_SELECTION_CHANGED')
      // Invalidate an old start button even if a closed legacy course reuses the same ID.
      acceptedStartSerial.current += 1
      readVersion.current += 1; readController.current?.abort()
      selectedCourse.current = targetCourseId = started.course.id
      setSnapshot({ accountId, value: started }); replaceCourseUrl(started.course.id)
      newCourseId.current = null; setView('detail'); setShowCourse(true)
      setCourseEntry(null) // Consume this mounted entry once; R3 retains its temporary test handoff.
      if ((started.course.presetId || null) !== (values.presetId || null)) throw new Error('COURSE_START_SELECTION_CHANGED')
      if (programme) {
        if (started.course.presetId) throw new Error('COURSE_PRESET_TESTS_FIXED')
        pendingProgramIntent.current[started.course.id]=programme.id
        pendingProgramConcerns.current[started.course.id]=entryConcerns
        setPendingPrograms(previous=>({...previous,[started.course.id]:programme.id}))
        const withTopics=await applyProgramIntake(started,programme,epoch,entryConcerns)
        if (!isSelected(targetCourseId,epoch)) return
        readVersion.current+=1;readController.current?.abort()
        setSnapshot({accountId,value:withTopics});clearPendingProgram(targetCourseId)
      } else if (!started.course.presetId && started.course.stage === 1) {
        const focusTags = courseTagsForExplorerFocus(entry?.focus)
        const concerns = courseConcernsFromIntent(entry, locale)
        // Apply public choices only after this owner explicitly consents.
        if (focusTags.length || concerns) {
          const withTopics = await request(accountId, { action: 'intake', courseId: targetCourseId,
            expectedRevision: started.course.revision, concerns, focusTags: [...focusTags] })
          if (!isSelected(targetCourseId,epoch) || withTopics.course?.id !== targetCourseId) throw new Error('COURSE_SELECTION_CHANGED')
          readVersion.current+=1;readController.current?.abort()
          setSnapshot({accountId,value:withTopics})
        }
      }
    } catch (e) { if (isSelected(targetCourseId,epoch)) setError(e.message) }
    finally { if (actionLock.current === token) { actionLock.current = null; if (mounted.current && currentAccount.current === accountId && generation.current === epoch) setBusy(false) } }
  }

  async function closeCourse() {
    const courseId = state?.course?.id, epoch = viewGeneration
    if (!courseId || !isSelected(courseId, epoch) || actionLock.current) return false
    try {
      const updated = await courseCommand('close')
      if (!isSelected(courseId, epoch) || updated.course?.id !== courseId) return false
      acceptState(updated)
      clearPendingProgram(courseId)
      setShowCourse(false)
      return true
    } catch (e) {
      if (isSelected(courseId, epoch)) setError(e.message || 'COURSE_CLOSE_UNAVAILABLE')
      return false
    }
  }

  // Every rendered CTA is bound to its account, selected course, and last
  // accepted start; a retained callback cannot start another course later.
  const renderedStartSerial = acceptedStartSerial.current
  function startSelectedCourse(presetId = null, programId = null) {
    if (!isSelected(state?.course?.id || null, viewGeneration) || renderedStartSerial !== acceptedStartSerial.current) return
    if (programId !== null && programId !== ACTIVE_COURSE_PROGRAM_ID) return
    if (busy || actionLock.current || (presetId !== null && !getCoursePreset(presetId)) ||
        (programId !== null && !getCourseProgram(programId)) ||
        (presetId && programId) || (view === 'switch' && programId)) return
    if (view !== 'switch' && (atLimit || (courses.some(course => course.status !== 'closed') && !access?.multiCourseEnabled))) return
    const values = { consent: true, ...(presetId ? { presetId } : {}), ...(programId ? { programId } : {}) }
    if (view === 'switch') {
      setView('detail')
      void act(presetId ? 'select-preset' : 'select-personal', values)
    } else {
      void act('start', values)
    }
  }
  async function retryProgramIntake() {
    const courseId=state?.course?.id,epoch=viewGeneration,programme=getCourseProgram(pendingPrograms[courseId])
    const concerns=pendingProgramConcerns.current[courseId] || ''
    const isCurrent=()=>isSelected(courseId,epoch)&&pendingProgramIntent.current[courseId]===programme?.id
    if (!programme || actionLock.current || !isCurrent()) return
    const token={};actionLock.current=token;setBusy(true);setError('')
    readVersion.current+=1;readController.current?.abort()
    try {
      const fresh=await request(accountId,undefined,{courseId})
      if (!isCurrent() || fresh.course?.id!==courseId || ['completed','archived'].includes(fresh.course.status)) throw new Error('COURSE_SELECTION_CHANGED')
      const withTopics=await applyProgramIntake(fresh,programme,epoch,concerns)
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
    setView(next)
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
  // On the legacy one-course schema, closing frees the existing owner row for
  // the next course. Sequential free courses must not require multi-course billing.
  const legacyFreeSlot = access?.multiCourseEnabled === false &&
    (courses.length === 0 || (courses.length === 1 && courses[0].status === 'closed'))
  const canAddCourse = Boolean(access && !atLimit && (access.multiCourseEnabled || legacyFreeSlot))
  const showDashboard = courses.length > 0 && view === 'list'
  const isHistory = ['completed', 'archived'].includes(state?.course?.status)
  const stage = view === 'new' || view === 'switch' || state?.course?.status === 'closed' ? 0 : state?.course?.stage || 0
  const stressWelcome = stage === 3 && !state?.course?.presetId &&
    courseProgramFromTopics(state?.course?.focusTags || [])?.id === 'stress'
  const visibleStep = stage === 1 ? 2 : stage === 2
    ? ((state?.course?.testKeys || []).length ? 4 : 3) : stage === 3 ? 5 : stage === 4 ? 6 : 1

  if (state === undefined && !error) return <section className={'hh-panel ' + styles.root} aria-busy="true"><p>{ru ? 'Открываем ваш курс…' : 'Opening your course…'}</p></section>
  if (!state) return <section className={'hh-panel ' + styles.root} role="alert"><h1>{t.personal}</h1><p>{t.issue}</p><button onClick={() => refresh()}>{t.retry}</button></section>

  // Returning from a test or following a programme link must keep the learner
  // inside the existing course onboarding flow.
  const testReturn = searchParams.get('tests') === 'complete' || searchParams.get('retest') === 'updated'
  const programmeEntry = stage === 0 && Boolean(requestedProgram)
  const fastAntistressEntry = !state?.course?.presetId && view !== 'switch' && (Boolean(requestedProgram) ||
    (showCourse && [1,2].includes(stage) && courseProgramFromTopics(state?.course?.focusTags||[])?.id===ACTIVE_COURSE_PROGRAM_ID && searchParams.get('entry')!=='personal'))
  const personalEntry = stage === 0 && !personalEntryDismissed && (Boolean(courseEntry) || searchParams.get('entry') === 'personal')
  if (!showCourse && !testReturn && !programmeEntry && !personalEntry && !fastAntistressEntry) return <CourseEntrySelector
    key={accountId + ':' + (state.course?.id || '')}
    accountId={accountId} course={state.course} access={access} locale={locale}
    onAdd={() => { if (isSelected() && canAddCourse) { setShowCourse(true); startAnother() } }}
    onCloseCourse={closeCourse} closing={busy}
    onOpen={() => {
      if (state.course?.id && state.course.stage > 0 && !['closed', 'archived'].includes(state.course.status)) {
        const activeChoices = courses.filter(item => item && item.stage > 0 &&
          !['closed', 'archived', 'completed'].includes(item.status))
        if (activeChoices.length === 1 && activeChoices[0].id === state.course.id) selectCourse(state.course.id)
        else setShowCourse(true) // Multiple courses still offer the dashboard picker.
      } else if (courses.length > 0) {
        // A closed course belongs in history, not a new-course setup shortcut.
        setShowCourse(true); changeView('list')
      } else if (canAddCourse) {
        setShowCourse(true); startAnother()
      } else {
        setShowCourse(true); changeView('list')
      }
    }}/>

  async function confirmFastStart() {
    const intent={accountId,courseId:selectedCourse.current,epoch:viewGeneration,programId:requestedProgram?.id||ACTIVE_COURSE_PROGRAM_ID}
    if (!fastAntistressEntry || stage!==0 || busy || actionLock.current || atLimit ||
        (courses.some(course=>course.status!=='closed')&&!access?.multiCourseEnabled) ||
        intent.accountId!==currentAccount.current || !isSelected(intent.courseId,intent.epoch)) return
    await act('start',{consent:true,programId:intent.programId})
  }

  // One explicit consent action, then the existing private intake. No catalogue,
  // six-step presentation, duplicate assessment or bypass of server validation.
  if (stage === 0 && fastAntistressEntry) return <div className={styles.root} data-my-course>
    <section className={styles.fastEntry} data-opora-fast-start>
      <span className={styles.fastKicker}>{ru ? 'ОПОРА · АНТИСТРЕСС' : 'OPORA · STRESS RELIEF'}</span>
      <h1>{ru ? 'Начните с короткого теста' : 'Start with one short check-in'}</h1>
      <p>{ru ? '8 вопросов Weekly Pulse помогут подобрать один из 5 уровней программы. Дополнительные тесты — только по желанию.' :
        'Eight Weekly Pulse questions help suggest one of five learning levels. Extra questionnaires are optional.'}</p>
      <p className={styles.fastConsent}><LockKeyhole size={18} aria-hidden="true" />{t.consent}</p>
      {error && <p className={styles.error} role="alert">{t.issue} ({error}) <button type="button" onClick={()=>refresh()}>{t.retry}</button></p>}
      <button type="button" className={'hh-primary ' + styles.fastStartButton}
        disabled={busy||atLimit||(courses.some(course=>course.status!=='closed')&&!access?.multiCourseEnabled)} onClick={() => void confirmFastStart()} data-opora-fast-consent>
        {busy ? (ru ? 'Подготавливаем тест…' : 'Preparing your test…')
          : (ru ? 'Перейти к стартовому тесту' : 'Continue to the first check-in')}
        <ArrowRight size={19} aria-hidden="true" />
      </button>
      <small>{t.note}</small>
    </section>
  </div>

  const compactBaselineNav = !showDashboard && !stressWelcome && !isHistory && stage === 2 &&
    !state.course?.presetId &&
    courseProgramFromTopics(state.course?.focusTags || [])?.id === ACTIVE_COURSE_PROGRAM_ID

  return <div className={styles.root + (compactBaselineNav ? ' ' + styles.compactBaselineRoot : '')} data-my-course>
    {showDashboard && <MyCoursesDashboard key={accountId + ':' + viewGeneration}
      courses={courses} membership={state.membership || { tier: access?.tier, maxActiveCourses: access?.activeCourseLimit, occupiedCount: access?.activeCourseCount }}
      locale={locale} busy={busy} canAddCourse={canAddCourse} canManageCourses={Boolean(access)} multiCourseEnabled={access?.multiCourseEnabled === true} overLimit={access?.overLimit}
      onOpen={course => selectCourse(course.id)} onNew={startAnother}
      onClose={course => manageCourse('close', course)} onPrimary={course => manageCourse('make-primary', course)}
    />}
    {compactBaselineNav && <nav className={styles.compactBaselineNav} aria-label={ru ? 'Навигация курса' : locale === 'es' ? 'Navegación del curso' : 'Course navigation'} data-opora-baseline-compact-nav>
      <button type="button" disabled={busy} onClick={() => changeView('list')}>
        <ArrowLeft size={15} aria-hidden="true"/>{ru ? 'Мои курсы' : locale === 'es' ? 'Mis cursos' : 'My courses'}
      </button>
      <button type="button" disabled={busy} onClick={() => changeView('switch')}>
        {ru ? 'Сменить направление' : locale === 'es' ? 'Cambiar dirección' : 'Change direction'}
      </button>
    </nav>}
    {!showDashboard && !stressWelcome && !compactBaselineNav && courses.length > 0 && <button type="button" className={styles.backCourses} onClick={() => changeView('list')}>
      ← {ru ? 'Мои курсы' : 'My courses'}
    </button>}
    {!showDashboard && !stressWelcome && stage !== 4 && view === 'detail' && courses.length > 1 && <section className={styles.courseSelector} aria-labelledby={selectorId + '-heading'}>
      <h2 id={selectorId + '-heading'}>{t.courses}</h2>
      <label htmlFor={selectorId}>{t.chooseCourse}</label>
      <select id={selectorId} value={state.course?.id || ''} disabled={busy} onChange={event => selectCourse(event.target.value)}>
        {courses.map((course, index) => <option key={course.id} value={course.id}>
          {t.courseNumber} {index + 1} · {t.courseStatuses[course.status] || course.status} · {course.startedAt || course.updatedAt ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(course.startedAt || course.updatedAt)) : ''}
        </option>)}
      </select>
      {access && <p className={styles.courseSlotCount} role="status">{t.activeCount}: {access.activeCourseCount} / {access.activeCourseLimit}</p>}
    </section>}
    {(showDashboard || courses.length === 0) && !stressWelcome ? <button type="button" className={styles.backToCourses + (stage === 3 ? ' ' + styles.routeBack : '')} onClick={() => {
      changeView('list'); setShowCourse(false); setPersonalEntryDismissed(true); setCourseEntry(null)
      if (testReturn || programmeEntry || personalEntry) router.replace(root + '/course')
    }}><ArrowLeft size={17} aria-hidden="true"/>{ru ? 'Мои курсы' : 'My courses'}</button> : null}
    {!showDashboard && stage === 0 && <header className={styles.hero}>
      <div>
        <p className="hh-kicker">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p className={styles.heroLead}>{t.intro}</p>
        <div className={styles.meta}><span><Sparkles size={16} aria-hidden="true"/>{t.free}</span><span><BookOpen size={16} aria-hidden="true"/>{t.time}</span></div>
        <div className={styles.heroActions}>
          <button type="button" className="hh-primary" disabled={busy} onClick={() => startSelectedCourse(null, requestedProgram?.id || ACTIVE_COURSE_PROGRAM_ID)}>{t.start}<ArrowRight size={18} aria-hidden="true"/></button>
          <a className={styles.textLink} href="#course-details">{t.how} ↓</a>
        </div>
        <p className={styles.privacy}><LockKeyhole size={15} aria-hidden="true"/>{t.consent}</p>
      </div>
      <div className={styles.heroMark} aria-hidden="true"><img src="/images/holistic-house/course-focus-mountain-boy.webp" alt="" width={320} height={220} loading="lazy" /></div>
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
            data-course-program-id={program.id} data-recommended={requestedProgram?.id === program.id}
             disabled={busy || program.id !== ACTIVE_COURSE_PROGRAM_ID}
             aria-disabled={program.id !== ACTIVE_COURSE_PROGRAM_ID}
             data-coming-soon={program.id !== ACTIVE_COURSE_PROGRAM_ID ? 'true' : undefined}
            onClick={() => startSelectedCourse(null,program.id)}>
            <span className={styles.programIcon}><Icon size={29} strokeWidth={1.8} aria-hidden="true"/></span>
            <span className={styles.programPain}>{program.pain[ru ? 'ru' : 'en']}</span>
            <strong>{program.title[ru ? 'ru' : 'en']}</strong>
            <span className={styles.programPromise}>{program.promise[ru ? 'ru' : 'en']}</span>
            <span className={styles.programOutcomes}>{program.outcome[ru ? 'ru' : 'en']}</span>
            <span className={styles.programAction}>{program.id === ACTIVE_COURSE_PROGRAM_ID ? t.exploreTrack : t.soon}{program.id === ACTIVE_COURSE_PROGRAM_ID && <ArrowRight size={16} aria-hidden="true"/>}</span>
          </button>
        })}
      </div>
      <button className={styles.personalTrack} type="button" disabled={busy}
        data-course-personal-program onClick={() => startSelectedCourse(null,ACTIVE_COURSE_PROGRAM_ID)}>
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
      onPreset={startSelectedCourse} onPersonal={() => startSelectedCourse(null)} switchMode /> : <details className={styles.overviewDisclosure} data-course-fixed-presets>
      <summary>{ru?'Курсы с фиксированным набором тестов':'Courses with fixed test sets'}</summary>
      <CoursePresetCatalog locale={locale} busy={busy} onPreset={startSelectedCourse} onPersonal={() => startSelectedCourse(null)} />
    </details>)}
    {!showDashboard && !isHistory && stage >= 1 && stage <= 2 && !fastAntistressEntry && <div className={styles.activeProgress} aria-label={t.step + ' ' + visibleStep + ' ' + t.of + ' 6'}>
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


    {!showDashboard && !isHistory && pendingPrograms[state?.course?.id] && <section className={styles.notice} data-course-program-retry>
      <p>{ru?'Курс создан. Завершите настройку выбранной программы:':'Your course is created. Finish setting up your chosen programme:'} {getCourseProgram(pendingPrograms[state.course.id])?.title?.[ru?'ru':'en']}</p>
      <button type="button" disabled={busy} onClick={()=>void retryProgramIntake()}>{ru?'Повторить настройку программы':'Retry programme setup'}</button>
    </section>}

    {!showDashboard && !stressWelcome && !isHistory && !compactBaselineNav && stage >= 1 && stage <= 3 && <button type="button" disabled={busy} className={styles.backCourses}
      onClick={() => changeView('switch')}>
      {ru ? 'Изменить направление курса' : 'Change course direction'}
    </button>}
    {!showDashboard && !isHistory && stage >= 1 && stage <= 3 && <CourseR3Steps
      stage={stage} locale={locale} data={data} state={state} busy={busy}
      key={accountId + ':' + state.course.id + ':' + (state.course.presetId || 'personal')}
      onAct={act} onCourseCommand={courseCommand} onCourseRead={readSelectedCourse} isCourseCurrent={isSelected}
      onState={acceptState} onError={acceptError} root={root} quickEntry={fastAntistressEntry}
    />}

    {!showDashboard && view === 'detail' && isHistory && stage < 4 && <section className={'hh-panel ' + styles.details} data-course-history-readonly>
      <h2>{t.courseStatuses[state.course.status]}</h2>
      <p>{ru ? 'Этот курс сохранён в истории. Его настройки доступны только для просмотра.' : 'This course is saved in your history. Its setup is now read-only.'}</p>
      <p>{t.selected}: {state.course.testKeys?.length || 0}</p>
    </section>}

    {!showDashboard && stage === 4 && <CourseToday locale={locale} key={state.course.id} courseId={state.course.id} accountId={accountId} access={access} onCourseChange={courseChanged} onExit={() => { if (isSelected(state.course.id,viewGeneration)) { changeView('list'); setShowCourse(false) } }} />}

    {stage !== 4 && !stressWelcome && !compactBaselineNav && <footer className={styles.footer}><LockKeyhole size={15}/><span>{t.safe} {t.note}</span></footer>}
  </div>
}

export default MyCourse
