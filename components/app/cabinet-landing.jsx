'use client'
import { TraumaFrontMatter, TraumaSectionInstructions } from './trauma-administration'
import { hasTraumaAdministration, traumaContextReady } from '@/lib/assessments/trauma-administration'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { ClientCabinetEntry } from '@/components/client-cabinet-entry'
import { PublicTestExplorer } from '@/components/app/public-test-explorer'
import { GuestScaleInterpretation } from '@/components/app/guest-scale-interpretation'
import guestActions from './guest-result-actions.module.css'
import { Asrs6SourceNotice, Asrs6ChoiceMarker, asrs6ChoiceClass } from '@/components/app/asrs6-source-notice'
import { TestFinishActions } from '@/components/app/test-finish-actions'
import { TestRatingCard } from '@/components/app/test-rating-card'
import { CURRENT_STATE_EN_V2, CURRENT_STATE_RU_V2 } from '@/data/assessments/current-state-v2'
import { MINI_IPIP_20_EN_V1 } from '@/data/assessments/mini-ipip-20-en-v1'
import { MONITORING_CATALOG, monitoringCatalogItem } from '@/data/assessments/catalog'
import { getAssessmentDefinition, getDefinitionById } from '@/lib/assessments/definitions'
import { isGuestReference, replaceGuestRoute as replaceGuestRoutePath } from '@/lib/app/guest-route'

const UI = {
  en: {
    kicker: 'Account',
    title: 'Enter your personal cabinet',
    intro: 'Sign in to see saved test batteries, track changes over time and keep your private results together.',
    google: 'Enter personal cabinet with Google',
    googleNote: 'Continue with Google to keep your selected tests and results in your private Cabinet.',
    unavailable: 'This feature is temporarily unavailable. Your existing private Cabinet link still works below.',
    testsKicker: 'Mind–Body Monitor',
    tryTitle: 'Free wellbeing & resources monitoring',
    tryText: 'Take available tests without registering. See your scores and gauges first; free explanations and advice are available in your Cabinet.',
    recommended: 'Recommended now',
    otherChecks: 'Other self-checks',
    areasTitle: 'What you can monitor',
    areasText: 'More areas appear only when a real questionnaire is ready and safe to use.',
    recommenderKicker: 'Personal test selection',
    recommenderTitle: 'Build a test set for what matters to you',
    recommenderText: 'Mark what is bothering you or feels important right now. We will rank the available tests by relevance and the depth you prefer.',
    recommenderStyle: 'Test style',
    recommenderEngaging: 'Fun / engaging',
    recommenderProfessional: 'Professional',
    recommenderLength: 'Length',
    recommenderShort: 'Short',
    recommenderMedium: 'Medium',
    recommenderComprehensive: 'Comprehensive',
    recommenderNoMatches: 'No exact match. Try enabling another style or length.',
    recommenderBuild: 'Build my test set',
    recommenderChoose: 'Choose at least one area.',
    recommenderResults: 'Recommended for your request',
    recommenderPrivacy: 'Your choices are used only to rank this set and are not saved unless you explicitly consent to a test.',
    recommenderRank: 'Priority',
    stateAnalysisCta: 'Start a free wellbeing check-in',
    stateAnalysisMeta: 'Free · ~1 min · no sign-in required',
    batteryCta: 'Create my free monitoring plan',
    batteryMeta: 'Choose areas and depth to find relevant self-checks for your plan.',
    wuXing: 'Personal Wu Xing profile',
    stateTitle: 'Current State Check',
    stateText: '5 questions · ~1 min',
    traitTitle: 'Personality Baseline',
    traitText: '20 questions · ~3 min',
    traitNotice: 'This questionnaire uses the English original. It is a brief self-report, not an IQ test or diagnosis.',
    start: 'Start test',
    back: 'Back',
    next: 'Next',
    modeTitle: 'Choose your test experience',
    modeText: 'Same questions and scoring — only the pace changes.',
    quick: 'Quick',
    quickTitle: 'Fast & simple',
    quickText: 'All questions on one page. Answers save automatically.',
    guided: 'Guided',
    guidedTitle: 'Calm & guided',
    guidedText: 'One compact question per screen, with Next to continue.',
    sameModeResult: 'Both use the same questions and produce the same result.',
    tapContinue: 'All questions are here. Your answers save as you go.',
    guidedPrompt: 'Take your time. Choose the answer that feels closest to your experience.',
    finish: 'See my result',
    question: 'Question',
    of: 'of',
    saved: 'Saved',
    saving: 'Saving…',
    contextTitle: 'Optional context',
    contextText: 'You may leave these fields blank.',
    focus: 'What is on your mind?',
    trigger: 'What changed or seems to trigger this?',
    helps: 'What helps you?',
    desiredChange: 'What would you like to change?',
    note: 'Anything else you want to note?',
    result: 'Your result',
    measured: 'Measured',
    source: 'Source',
    save: 'Create my Cabinet and get explanations',
    saveHint: 'Sign in with Google to get free explanations of your scores and personal recommendations in your Cabinet.',
    consultKicker: 'If you would like to discuss your result',
    consultTitle: 'Book a consultation with a specialist',
    consultText: 'Choose a practitioner and review the result together. Your result stays private and is not shared automatically.',
    consultAction: 'Choose a specialist',
    temporary: 'Available temporarily in this browser until',
    restart: 'Take another test',
    delete: 'Delete temporary result',
    legacyTitle: 'Already have a private link from Andy?',
    legacyText: 'Open the earlier private Cabinet here. This access stays separate from your Google account.',
    legacyContinue: 'Continue previous private Cabinet',
    nonDiagnostic: 'Self-observation only. These tests do not provide a medical diagnosis and are not an emergency channel.',
    error: 'Something could not be saved or loaded. Please retry.',
  },
  ru: {
    kicker: 'Аккаунт',
    title: 'Войти в личный кабинет',
    intro: 'Войдите, чтобы видеть свои наборы тестов, отслеживать динамику и хранить результаты в личном кабинете.',
    google: 'Войти в личный кабинет через Google',
    googleNote: 'Для сохранения выбранных тестов и результатов предусмотрен вход через Google.',
    unavailable: 'Эта функция временно недоступна. Старая приватная ссылка на кабинет по-прежнему работает ниже.',
    testsKicker: 'Монитор состояния',
    tryTitle: 'Бесплатный мониторинг состояния и ресурсов',
    tryText: 'Проходите доступные тесты без регистрации. Сначала смотрите шкалы и баллы, затем получайте бесплатные пояснения и рекомендации в кабинете.',
    recommended: 'Рекомендуем сейчас',
    otherChecks: 'Другие самопроверки',
    areasTitle: 'Что можно отслеживать',
    areasText: 'Новые области появляются только когда реальный опросник готов и безопасен для использования.',
    recommenderKicker: 'Индивидуальный подбор',
    recommenderTitle: 'Подобрать комплект тестов под ваш запрос',
    recommenderText: 'Отметьте, что сейчас беспокоит или важно. Мы расставим доступные тесты по приоритету с учётом выбранных тем и желаемой глубины.',
    recommenderStyle: 'Тип теста',
    recommenderEngaging: 'Лёгкие / игровые',
    recommenderProfessional: 'Профессиональные',
    recommenderLength: 'Длина',
    recommenderShort: 'Короткие',
    recommenderMedium: 'Средние',
    recommenderComprehensive: 'Комплексные',
    recommenderNoMatches: 'Точного совпадения нет. Включите ещё один тип или длину.',
    recommenderBuild: 'Собрать мой набор',
    recommenderChoose: 'Выберите хотя бы одну тему.',
    recommenderResults: 'Рекомендуем по вашему запросу',
    recommenderPrivacy: 'Выбор используется только для расчёта этого набора и не сохраняется без вашего явного согласия на прохождение теста.',
    recommenderRank: 'Приоритет',
    stateAnalysisCta: 'Начать бесплатную проверку состояния',
    stateAnalysisMeta: 'Бесплатно · ~1 мин · без регистрации',
    batteryCta: 'Составить мой бесплатный план мониторинга',
    batteryMeta: 'Выберите направления и глубину, чтобы подобрать подходящие опросники.',
    wuXing: 'Личный профиль У-Син',
    stateTitle: 'Состояние сейчас',
    stateText: '5 вопросов · ~1 мин',
    traitTitle: 'Личностный профиль',
    traitText: '20 вопросов · ~3 мин',
    traitNotice: 'Опрос использует английский оригинал. Это краткий самоотчёт, а не IQ-тест и не диагноз.',
    start: 'Начать тест',
    back: 'Назад',
    next: 'Далее',
    modeTitle: 'Как вы хотите пройти тест?',
    modeText: 'Вопросы и расчёт одинаковые — меняется только темп.',
    quick: 'Quick',
    quickTitle: 'Быстро',
    quickText: 'Все вопросы на одной странице, ответы сохраняются автоматически.',
    guided: 'Guided',
    guidedTitle: 'С сопровождением',
    guidedText: 'Один вопрос на экране и кнопка «Далее».',
    sameModeResult: 'В обоих режимах используются те же вопросы и тот же расчёт результата.',
    tapContinue: 'Все вопросы перед вами. Ответы сохраняются по мере заполнения.',
    guidedPrompt: 'Не спешите. Выберите вариант, который ближе всего к вашему ощущению.',
    finish: 'Показать результат',
    question: 'Вопрос',
    of: 'из',
    saved: 'Сохранено',
    saving: 'Сохраняем…',
    contextTitle: 'Контекст — по желанию',
    contextText: 'Эти поля можно оставить пустыми.',
    focus: 'Что сейчас занимает ваше внимание?',
    trigger: 'Что изменилось или что, кажется, запускает это?',
    helps: 'Что помогает вам?',
    desiredChange: 'Что вы хотели бы изменить?',
    note: 'Что ещё важно отметить?',
    result: 'Ваш результат',
    measured: 'Дата измерения',
    source: 'Источник',
    save: 'Создать кабинет и получить пояснения',
    saveHint: 'Войдите через Google и бесплатно получите пояснения к результатам и индивидуальные рекомендации в своём кабинете.',
    consultKicker: 'Если хочется обсудить результат',
    consultTitle: 'Заказать консультацию специалиста',
    consultText: 'Можно выбрать подходящего специалиста и спокойно разобрать результат вместе. Ваш результат остаётся приватным и не передаётся автоматически.',
    consultAction: 'Выбрать специалиста',
    temporary: 'Временно доступно в этом браузере до',
    restart: 'Пройти другой тест',
    delete: 'Удалить временный результат',
    legacyTitle: 'Уже есть приватная ссылка от Andy?',
    legacyText: 'Старый приватный кабинет открывается здесь и остаётся отдельным от Google-аккаунта.',
    legacyContinue: 'Продолжить предыдущий приватный кабинет',
    nonDiagnostic: 'Только самонаблюдение. Эти тесты не ставят медицинский диагноз и не являются каналом экстренной помощи.',
    error: 'Не удалось загрузить или сохранить данные. Повторите попытку.',
  },
}

const PUBLIC_GUEST_BLOCKED_KEYS = new Set(['phq-9'])

function definitionFor(id, locale) {
  if (id === 'state') return locale === 'ru' ? CURRENT_STATE_RU_V2 : CURRENT_STATE_EN_V2
  if (id === 'trait') return MINI_IPIP_20_EN_V1
  const item = monitoringCatalogItem(id)
  if (!item?.startable || item.rightsStatus !== 'cleared' || item.guestEligible === false || PUBLIC_GUEST_BLOCKED_KEYS.has(item.key)) return null
  return getAssessmentDefinition(
    item.key,
    item.version,
    item.instrumentLocale === 'dynamic' ? locale : item.instrumentLocale,
  )
}

function publicRecommendationDefinitions(locale) {
  return MONITORING_CATALOG
    .filter((item) => item.startable && item.rightsStatus === 'cleared' && item.guestEligible !== false && !PUBLIC_GUEST_BLOCKED_KEYS.has(item.key))
    .map((item) =>
      getAssessmentDefinition(
        item.key,
        item.version,
        item.instrumentLocale === 'dynamic' ? locale : item.instrumentLocale,
      ),
    )
}

function definitionTitle(definition, locale) {
  const item = monitoringCatalogItem(definition.key)
  return item?.title?.[locale] || item?.title?.en || definition.title
}

function definitionMeta(definition, locale) {
  const item = monitoringCatalogItem(definition.key)
  const count = item?.questionCount || definition.questions.length
  const duration = item?.durationMinutes || 2
  const language = definition.instrumentLocale !== locale ? ` · ${definition.instrumentLocale.toUpperCase()}` : ''
  return `${count} ${locale === 'ru' ? 'вопросов' : 'questions'} · ~${duration} ${locale === 'ru' ? 'мин' : 'min'}${language}`
}

function answerLabels(definition, question) {
  const min = question.min ?? definition.answerScale?.min
  const max = question.max ?? definition.answerScale?.max
  const anchors = question.responseAnchors || definition.responseAnchors
  if (Array.isArray(anchors) && Number.isInteger(min))
    return anchors.map((label, index) => ({ value: min + index, label }))
  return Array.from({ length: max - min + 1 }, (_, index) => ({
    value: min + index,
    label: String(min + index),
  }))
}

function localZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

async function guestFetch(path, body, method) {
  const response = await fetch('/api/app/' + path, {
    method: method || (body ? 'POST' : 'GET'),
    cache: 'no-store',
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const value = await response.json().catch(() => ({ error: 'SERVICE_UNAVAILABLE' }))
  if (!response.ok) {
    const error = new Error(value.error || 'SERVICE_UNAVAILABLE')
    error.code = value.error
    error.status = response.status
    throw error
  }
  return value
}


function GuestAnswerChoices({ definition, question, selected, onChoose, disabled, locale }) {
  if (question.inputType === 'day-count') return (
    <label className="cabinet-day-count-select">
      <span>{locale === 'ru' ? 'Количество дней за последние 30 дней (0–30)' : 'Number of days in the past 30 days (0–30)'}</span>
      <select aria-label={locale === 'ru' ? 'Количество дней' : 'Number of days'} value={selected ?? ''}
        disabled={disabled} onChange={event => { if (event.target.value !== '') void onChoose(Number(event.target.value)) }}>
        <option value="" disabled>{locale === 'ru' ? 'Выберите число дней' : 'Select number of days'}</option>
        {Array.from({ length: question.max - question.min + 1 }, (_, i) => question.min + i).map(value => (
          <option key={value} value={value}>{value}</option>
        ))}
      </select>
    </label>
  )
  const words = Array.isArray(question.responseAnchors || definition.responseAnchors)
  return (
    <>
      <div className={words ? 'cabinet-answer-list' : 'cabinet-answer-scale'}>
        {answerLabels(definition, question).map(option => (
          <button type="button" key={option.value} aria-pressed={selected === option.value}
            className={asrs6ChoiceClass(definition, question, option.value)}
            disabled={disabled} onClick={() => void onChoose(option.value)}>
            {words ? <>{definition.key !== 'asrs-6' && <strong>{option.value}</strong>}<span lang={definition.instrumentLocale}>{option.label}</span></> : option.label}
            <Asrs6ChoiceMarker definition={definition} question={question} value={option.value} />
          </button>
        ))}
      </div>
      {!Array.isArray(definition.responseAnchors) && question.anchors && (
        <div className="cabinet-answer-anchors">
          <span>{question.anchors[0]}</span><span>{question.anchors.at(-1)}</span>
        </div>
      )}
    </>
  )
}

export function CabinetLanding({ locale = 'en', appAvailable = false, legacySelector = null }) {
  const c = UI[locale] || UI.en
  const searchParams = useSearchParams()
  const planId = searchParams.get('plan')
  const requestedGuestTests = searchParams.get('startTests')
  const requestedGuestRun = searchParams.get('run')
  const requestedGuestResult = searchParams.get('result')
  const [active, setActive] = useState(null)
  const [run, setRun] = useState(null)
  const [answers, setAnswers] = useState({})
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState('catalog')
  const [mode, setMode] = useState('quick')
  const [context, setContext] = useState({ current_focus: '', trigger: '', what_helps: '', desired_change: '', note: '' })
  const [guestResult, setGuestResult] = useState(null)
  const [activePlan, setActivePlan] = useState(null)
  const [planResults, setPlanResults] = useState([])
  const initialLaunchRef = useRef(null)
  const [sessionExpires, setSessionExpires] = useState(null)
  const [busy, setBusy] = useState(false)
  const [saveState, setSaveState] = useState('')
  const [error, setError] = useState('')
  const runLifetime = useRef(0)
  const selfGuestRoute = useRef(null)
  const saveOperation = useRef(null)
  const saving = useRef(false)
  const completion = useRef(null)
  const submitting = useRef(false)
  const recoveryPending = Boolean(saveOperation.current || completion.current)
  // A resumed attempt keeps its exact registered version and instrument language.
  // UI language changes only labels; a new selection may use the UI locale.
  const definition = useMemo(() => {
    if (run) {
      try { return getDefinitionById(run.definitionId) } catch { return null }
    }
    return active ? definitionFor(active, locale) : null
  }, [run, active, locale])
  const question = definition?.questions[index]
  const selected = question ? answers[question.id] : undefined
  const answeredCount = definition ? definition.questions.filter(item => Object.prototype.hasOwnProperty.call(answers, item.id)).length : 0
  const allAnswered = definition ? answeredCount === definition.questions.length : false
  const quickMinutes = definition ? Math.max(1, Number(monitoringCatalogItem(definition.key)?.durationMinutes) || Math.ceil(definition.questions.length / 5)) : 1
  const guidedMinutes = Math.max(quickMinutes + 1, Math.ceil(quickMinutes * 1.4))
  const timeUnit = locale === 'ru' ? 'мин' : 'min'

  function replaceGuestRoute({ planId = null, runId = null, resultId = null } = {}) {
    // Next observes replaceState. Do not let our own URL update replay bootstrap
    // over an active run, an unsaved zero answer, or pending retry recovery.
    const route = JSON.stringify([planId, runId, resultId])
    const previousRoute = selfGuestRoute.current
    selfGuestRoute.current = route
    try { return replaceGuestRoutePath({ planId, runId, resultId }) }
    catch (error) { selfGuestRoute.current = previousRoute; throw error }
  }

  useEffect(() => () => {
    runLifetime.current += 1
    initialLaunchRef.current = null
    selfGuestRoute.current = null
  }, [])

  useEffect(() => {
    let live = true
    const route = JSON.stringify([planId, requestedGuestRun, requestedGuestResult])
    if (selfGuestRoute.current === route) {
      selfGuestRoute.current = null
      return
    }
    selfGuestRoute.current = null
    // A real URL navigation owns a new lifetime, including pending run creation.
    const epoch = ++runLifetime.current
    saving.current = false
    submitting.current = false
    saveOperation.current = null
    completion.current = null
    setBusy(false)
    setActive(null)
    setRun(null)
    setAnswers({})
    setMode('quick')
    setGuestResult(null)
    setActivePlan(null)
    setPlanResults([])
    setSaveState('')
    setError('')
    setPhase('catalog')
    // Result and draft references identify only a server-owned guest record.
    // Never use URL-carried answer payloads or unsaved client-side scores.
    if ((requestedGuestResult && !isGuestReference(requestedGuestResult)) ||
        (requestedGuestRun && !isGuestReference(requestedGuestRun)) ||
        (planId && !isGuestReference(planId)) ||
        (requestedGuestResult && requestedGuestRun)) {
      setError(c.error)
      return
    }
    guestFetch('guest/bootstrap')
      .then(async (bootstrap) => {
        if (!live || runLifetime.current !== epoch) return
        setSessionExpires(bootstrap.expiresAt)
        const plan = planId
          ? await guestFetch('guest/test-plans/' + encodeURIComponent(planId))
          : bootstrap.activeTestPlan
        if (!live || runLifetime.current !== epoch) return
        if (planId && plan && !requestedGuestRun && !requestedGuestResult) {
          setActivePlan(plan)
          setPlanResults((bootstrap.results || []).filter(item => plan.completedRunIds?.includes(item.runId)))
        }

        if (requestedGuestResult) {
          const result = (bootstrap.results || []).find((item) => item.id === requestedGuestResult)
          if (!result) throw new Error('GUEST_RESULT_UNAVAILABLE')
          // Only reveal a result already authorized by this same-browser guest cookie.
          setActive(result.definitionKey)
          setGuestResult(result)
          setRun(null)
          if (plan && plan.completedRunIds?.includes(result.runId)) {
            setActivePlan(plan)
            setPlanResults((bootstrap.results || []).filter(item => plan.completedRunIds.includes(item.runId)))
          }
          setPhase('result')
          return
        }

        if (requestedGuestRun) {
          const existing = (bootstrap.runs || []).find(item => item.id === requestedGuestRun)
          if (!existing) throw new Error('GUEST_RUN_UNAVAILABLE')
          const definition = getDefinitionById(existing.definitionId)
          if (!definition) throw new Error('GUEST_TEST_UNAVAILABLE')
          const owningPlan = plan?.status === 'active' && plan.definitionIds?.[plan.currentIndex] === definition.id ? plan : null
          if (planId && !owningPlan) throw new Error('GUEST_PLAN_RUN_MISMATCH')
          if (owningPlan) {
            setActivePlan(owningPlan)
            setPlanResults((bootstrap.results || []).filter(item => owningPlan.completedRunIds?.includes(item.runId)))
          }
          setActive(definition.key)
          setRun(existing)
          setAnswers(existing.answers || {})
          setContext(existing.context || { current_focus: '', trigger: '', what_helps: '', desired_change: '', note: '' })
          setIndex(Math.min(Math.max(0, Number(existing.progress || 0)), Math.max(0, definition.questions.length - 1)))
          setMode('quick')
          setPhase('questions')
          return
        }

        if (!planId || !plan) return
        if (plan.status === 'completed') {
          setPhase('summary')
          return
        }
        const nextDefinition = getDefinitionById(plan.definitionIds[plan.currentIndex])
        if (!nextDefinition) throw new Error('GUEST_TEST_UNAVAILABLE')
        const existing = (bootstrap.runs || []).find(item => item.definitionId === nextDefinition.id)
        setActive(nextDefinition.key)
        if (existing) {
          setRun(existing)
          setAnswers(existing.answers || {})
          setContext(existing.context || { current_focus: '', trigger: '', what_helps: '', desired_change: '', note: '' })
          setIndex(Math.min(Math.max(0, Number(existing.progress || 0)), Math.max(0, nextDefinition.questions.length - 1)))
          setPhase('questions')
        } else {
          await startRun(nextDefinition, plan.id)
        }
      })
      .catch(() => {
        if (!live || runLifetime.current !== epoch) return
        if (requestedGuestRun || requestedGuestResult || planId) {
          setError(locale === 'ru'
            ? 'Временный результат или тест недоступен. Возможно, срок гостевой сессии истёк. Начните новый тест.'
            : 'This temporary result or test is unavailable. Your guest session may have expired. Start a new test.')
        }
      })
    return () => { live = false }
    // UI locale only changes labels; it must not restart the persisted instrument.
  }, [planId, requestedGuestRun, requestedGuestResult])

  useEffect(() => {
    // Dedicated /client/tests passes only allowlisted public definition keys.
    // URL resume references take precedence over a stale initial selection.
    if (!requestedGuestTests) { initialLaunchRef.current = null; return }
    if (requestedGuestResult || requestedGuestRun || planId) return
    if (!requestedGuestTests || initialLaunchRef.current === requestedGuestTests) return
    initialLaunchRef.current = requestedGuestTests
    const keys = [...new Set(requestedGuestTests.split(',').map(value => value.trim()).filter(Boolean))]
    if (keys.length === 0 || keys.length > 12) { setError(c.error); return }
    void beginGuestBattery(keys.map(key => ({ key })))
  }, [requestedGuestTests, requestedGuestRun, requestedGuestResult, planId])

  async function signIn(intentId = null) {
    if (!appAvailable) {
      setError(c.unavailable)
      return
    }
    setBusy(true)
    setError('')
    try {
      const response = await guestFetch('auth/start', {
        locale,
        ...(intentId ? { intentId } : {}),
      })
      window.location.assign(response.redirectUrl)
    } catch {
      setError(c.unavailable)
      setBusy(false)
    }
  }

  async function startRun(def, owningPlanId = null) {
    const epoch = runLifetime.current
    const created = await guestFetch('guest/runs', {
      definitionKey: def.key,
      definitionVersion: def.version,
      instrumentLocale: def.instrumentLocale,
      operationId: crypto.randomUUID(),
    })
    if (runLifetime.current !== epoch) return
    runLifetime.current += 1
    saving.current = false
    submitting.current = false
    saveOperation.current = null
    completion.current = null
    setRun(created)
    setAnswers(created.answers || {})
    setContext(created.context || { current_focus: '', trigger: '', what_helps: '', desired_change: '', note: '' })
    const nextIndex = Math.min(
      Math.max(0, Number(created.progress || 0)),
      Math.max(0, def.questions.length - 1),
    )
    setIndex(nextIndex)
    setMode('quick')
    setPhase('questions')
    setBusy(false)
    replaceGuestRoute({ planId: owningPlanId, runId: created.id })
  }

  async function bootstrapForStartedTest(epoch = runLifetime.current) {
    // A guest session is created only after the visitor deliberately starts a test.
    try {
      return await guestFetch('guest/bootstrap')
    } catch (error) {
      if (runLifetime.current !== epoch) return null
      if (error.status !== 401 || error.code !== 'GUEST_SESSION_REQUIRED') throw error
      const session = await guestFetch('guest/session', {
        adult: true,
        necessary: true,
        uiLocale: locale === 'ru' ? 'ru' : 'en',
        timezone: localZone(),
      })
      if (runLifetime.current !== epoch) return null
      setSessionExpires(session.expiresAt)
      return guestFetch('guest/bootstrap')
    }
  }

  async function begin(id, pinnedDefinition = null) {
    const def = pinnedDefinition || definitionFor(id, locale)
    if (!def) {
      setError(c.error)
      return
    }
    const epoch = ++runLifetime.current
    saving.current = false
    submitting.current = false
    saveOperation.current = null
    completion.current = null
    if (!pinnedDefinition) { setActivePlan(null); setPlanResults([]) }
    setRun(null)
    setActive(id)
    setGuestResult(null)
    setError('')
    setSaveState('')
    setBusy(true)
    try {
      const bootstrap = await bootstrapForStartedTest()
      if (runLifetime.current !== epoch) return
      setSessionExpires(bootstrap.expiresAt)
      if (runLifetime.current !== epoch) return
      const currentPlan = pinnedDefinition && activePlan?.status === 'active' && activePlan.definitionIds?.[activePlan.currentIndex] === def.id ? activePlan : null
      const existing = bootstrap.runs.find((item) => item.definitionId === def.id)
      if (existing) {
        setRun(existing)
        setAnswers(existing.answers || {})
        setContext(existing.context || { current_focus: '', trigger: '', what_helps: '', desired_change: '', note: '' })
        setIndex(
          Math.min(
            Math.max(0, Number(existing.progress || 0)),
            Math.max(0, def.questions.length - 1),
          ),
        )
        setMode('quick')
        setPhase('questions')
        replaceGuestRoute({planId: currentPlan?.id, runId: existing.id})
      } else {
        await startRun(def, currentPlan?.id)
      }
    } catch {
      if (runLifetime.current !== epoch) return
      setError(c.error)
    } finally {
      if (runLifetime.current === epoch) setBusy(false)
    }
  }

  async function beginGuestBattery(entries) {
    const keys = entries.map(entry => entry.key)
    if (keys.length < 1 || keys.length > 12 || new Set(keys).size !== keys.length) {
      setError(c.error)
      return
    }
    const definitions = []
    for (const key of keys) {
      try {
        const resolved = definitionFor(key, locale)
        if (!resolved) { setError(c.error); return }
        definitions.push(resolved)
      } catch { setError(c.error); return }
    }
    if (definitions.length === 1) {
      setActivePlan(null)
      return begin(definitions[0].key)
    }

    const epoch = ++runLifetime.current
    saving.current = false
    submitting.current = false
    saveOperation.current = null
    completion.current = null
    setRun(null)
    setActivePlan(null)
    setAnswers({})
    setMode('quick')
    setActive(definitions[0].key)
    setGuestResult(null)
    setPlanResults([])
    setSaveState('')
    setError('')
    setBusy(true)
    try {
      const bootstrap = await bootstrapForStartedTest()
      if (runLifetime.current !== epoch) return
      setSessionExpires(bootstrap.expiresAt)
      const plan = await guestFetch('guest/test-plans', {
        items: definitions.map(item => ({
          definitionKey: item.key, definitionVersion: item.version, instrumentLocale: item.instrumentLocale,
        })),
        replaceActive: true,
        operationId: crypto.randomUUID(),
      })
      if (runLifetime.current !== epoch) return
      setActivePlan(plan)
      if (plan.status === 'completed') {
        const latest = await guestFetch('guest/bootstrap')
        if (runLifetime.current !== epoch) return
        setPlanResults((latest.results || []).filter(row => plan.completedRunIds?.includes(row.runId)))
        replaceGuestRoute({planId: plan.id})
        setPhase('summary')
      } else {
        // Reopening the same guest battery resumes the actual outstanding test,
        // rather than restarting the first item or losing previous measurements.
        const next = getDefinitionById(plan.definitionIds[plan.currentIndex])
        setActive(next.key)
        await startRun(next, plan.id)
      }
    } catch {
      if (runLifetime.current !== epoch) return
      setError(c.error)
    } finally { if (runLifetime.current === epoch) setBusy(false) }
  }

  async function saveGuestRun(body) {
    if (saving.current) throw new Error('SAVE_IN_PROGRESS')
    if (completion.current) throw new Error('IMMUTABLE_RUN')
    const epoch = runLifetime.current
    const pending = saveOperation.current || { runId: run.id, body }
    if (pending.runId !== run.id) throw new Error('RUN_CHANGED')
    saveOperation.current = pending
    saving.current = true
    try {
      const saved = await guestFetch('guest/runs/' + pending.runId + '/save', pending.body)
      if (runLifetime.current !== epoch) throw new Error('RUN_CHANGED')
      saveOperation.current = null
      return saved
    } catch (error) {
      pending.errorCode = error.code
      throw error
    } finally {
      if (runLifetime.current === epoch) saving.current = false
    }
  }

  async function retryGuestSave() {
    const epoch = runLifetime.current
    if (busy || saving.current || !saveOperation.current) return
    setBusy(true)
    setError('')
    try {
      const saved = await saveGuestRun(saveOperation.current.body)
      if (runLifetime.current !== epoch) return
      setRun(saved)
      setAnswers(saved.answers || {})
      setContext(saved.context || {})
      setSaveState(c.saved)
    } catch {
      if (runLifetime.current === epoch) setError(c.error)
    } finally {
      if (runLifetime.current === epoch) setBusy(false)
    }
  }

  async function reloadGuestRun() {
    const epoch = runLifetime.current
    if (busy || saving.current || !run) return
    setBusy(true)
    setError('')
    try {
      const fresh = await guestFetch('guest/runs/' + run.id)
      if (runLifetime.current !== epoch) return
      saveOperation.current = null
      setRun(fresh)
      setAnswers(fresh.answers || {})
      setContext(fresh.context || {})
      setIndex(Math.min(fresh.progress || 0, definition.questions.length - 1))
      setSaveState('')
      if (!['draft', 'in_progress'].includes(fresh.status)) resetToCatalog()
    } catch {
      if (runLifetime.current === epoch) setError(c.error)
    } finally {
      if (runLifetime.current === epoch) setBusy(false)
    }
  }

  async function saveTraumaContext() {
    const epoch = runLifetime.current
    if (!run || busy || saving.current || saveOperation.current) return
    setBusy(true)
    setError('')
    try {
      const saved = await saveGuestRun({
        answers: {}, context, progress: index, expectedRevision: run.revision, operationId: crypto.randomUUID(),
      })
      if (runLifetime.current !== epoch) return
      setRun(saved)
      setContext(saved.context || {})
    } catch {
      if (runLifetime.current === epoch) setError(c.error)
    } finally {
      if (runLifetime.current === epoch) setBusy(false)
    }
  }

  async function submitSavedRun(currentRun, destination = 'report') {
    const epoch = runLifetime.current
    const request = async (path, body) => {
      if (runLifetime.current !== epoch) throw new Error('RUN_CHANGED')
      const response = await guestFetch(path, body)
      if (runLifetime.current !== epoch) throw new Error('RUN_CHANGED')
      return response
    }
    if (!completion.current) completion.current = { run: currentRun, destination, result: null }
    const pending = completion.current
    if (pending.run.id !== currentRun.id) throw new Error('RUN_CHANGED')
    destination = pending.destination
    const result = pending.result || await request('guest/runs/' + pending.run.id + '/submit', {
      expectedRevision: pending.run.revision,
    })
    pending.result = result
    setGuestResult(result)
    let advanced = null
    if (activePlan) {
      // A lost advance response may have already credited this exact run.
      const fresh = await request('guest/test-plans/' + encodeURIComponent(activePlan.id))
      if (!fresh) throw new Error('PLAN_UNAVAILABLE')
      advanced = fresh.completedRunIds?.includes(result.runId) ? fresh : await request('guest/test-plans/' + fresh.id + '/advance', {
        completedRunId: result.runId,
        expectedRevision: fresh.revision,
      })
      setActivePlan(advanced)
      const refreshed = await request('guest/bootstrap')
      const rows = (refreshed.results || []).filter(item => advanced.completedRunIds?.includes(item.runId))
      setPlanResults(rows)
    }
    if (destination === 'next') {
      if (advanced?.status === 'active' && advanced.definitionIds?.[advanced.currentIndex]) {
        const nextDefinition = getDefinitionById(advanced.definitionIds[advanced.currentIndex])
        setActive(nextDefinition.key)
        await startRun(nextDefinition, advanced.id)
      } else if (advanced?.status === 'completed') {
        replaceGuestRoute({planId: advanced.id})
        setPhase('summary')
      } else {
        setActive(null)
        setRun(null)
        setMode('quick')
        setPhase('catalog')
      }
    } else {
      // Persist only opaque IDs so a refresh restores the same scored scales and CTA.
      replaceGuestRoute({planId: advanced?.id || activePlan?.id, resultId: result.id})
      setPhase('result')
    }
    if (completion.current === pending) completion.current = null
    return result
  }

  async function choose(value, targetQuestion = question) {
    const epoch = runLifetime.current
    if (!run || !targetQuestion || busy || saving.current || recoveryPending) return
    const nextAnswers = { ...answers, [targetQuestion.id]: value }
    const quick = mode === 'quick'
    const firstMissing = definition.questions.findIndex(item => !Object.prototype.hasOwnProperty.call(nextAnswers, item.id))
    const progress = quick ? (firstMissing < 0 ? definition.questions.length : firstMissing) : index
    setAnswers(nextAnswers)
    setBusy(true)
    setSaveState(c.saving)
    setError('')
    try {
      const saved = await saveGuestRun({
        answers: { [targetQuestion.id]: value },
        context: run.context || {},
        progress,
        expectedRevision: run.revision,
        operationId: crypto.randomUUID(),
      })
      if (runLifetime.current !== epoch) return
      setRun(saved)
      setAnswers(saved.answers || nextAnswers)
      setSaveState(c.saved)
      // Quick remains on the full questionnaire; Guided advances with the Next action.
    } catch {
      if (runLifetime.current !== epoch) return
      setAnswers(run.answers || {})
      setError(c.error)
      setSaveState('')
    } finally {
      if (runLifetime.current === epoch) setBusy(false)
    }
  }

  async function submitResult(currentRun = run, destination = 'report') {
    const epoch = runLifetime.current
    if (!currentRun || busy || submitting.current || saving.current || saveOperation.current) return
    submitting.current = true
    setBusy(true)
    setError('')
    try {
      await submitSavedRun(currentRun, destination)
    } catch {
      if (runLifetime.current !== epoch) return
      setError(c.error)
    } finally {
      if (runLifetime.current === epoch) { submitting.current = false; setBusy(false) }
    }
  }

  async function next() {
    const epoch = runLifetime.current
    if (selected === undefined || busy || !run || saving.current || recoveryPending) return
    setBusy(true)
    setSaveState(c.saving)
    setError('')
    try {
      const saved = await saveGuestRun({
        answers: {},
        context: run.context || {},
        progress: Math.min(index + 1, definition.questions.length),
        expectedRevision: run.revision,
        operationId: crypto.randomUUID(),
      })
      if (runLifetime.current !== epoch) return
      setRun(saved)
      setSaveState(c.saved)
      if (index < definition.questions.length - 1) {
        setIndex((value) => value + 1)
      } else if (definition.optionalContext?.length > 0) {
        setPhase('context')
      } else {
        await submitSavedRun(saved)
      }
    } catch {
      if (runLifetime.current !== epoch) return
      setError(c.error)
      setSaveState('')
    } finally {
      if (runLifetime.current === epoch) setBusy(false)
    }
  }

  async function saveContextAndFinish(destination = 'report') {
    const epoch = runLifetime.current
    if (!run || busy || saving.current || saveOperation.current) return
    if (completion.current) { await submitResult(completion.current.run, completion.current.destination); return }
    setBusy(true)
    setError('')
    try {
      const saved = await saveGuestRun({
        answers: {},
        context,
        progress: definition.questions.length,
        expectedRevision: run.revision,
        operationId: crypto.randomUUID(),
      })
      if (runLifetime.current !== epoch) return
      setRun(saved)
      setBusy(false)
      await submitResult(saved, destination)
    } catch {
      if (runLifetime.current !== epoch) return
      setError(c.error)
      setBusy(false)
    }
  }

  async function saveToCabinet(selectedResult = guestResult) {
    // React may pass a click event to the original result button; preserve that path.
    const resultToSave = selectedResult?.id ? selectedResult : guestResult
    if (!resultToSave || busy) return
    setBusy(true)
    setError('')
    try {
      const intent = await guestFetch('save-intents', {
        sourceKind: 'guest_result',
        sourceId: resultToSave.id,
        operationId: crypto.randomUUID(),
      })
      if (intent.signedIn) {
        window.location.assign('/' + locale + '/app/continue?intent=' + encodeURIComponent(intent.id) + '&auto=1')
        return
      }
      await signIn(intent.id)
    } catch {
      setError(c.error)
      setBusy(false)
    }
  }

  async function deleteResult() {
    if (!guestResult || busy) return
    setBusy(true)
    setError('')
    try {
      await guestFetch('guest/results/' + guestResult.id + '/delete', {})
      resetToCatalog()
    } catch {
      setError(c.error)
    } finally {
      setBusy(false)
    }
  }

  function resetToCatalog() {
    setBusy(false)
    runLifetime.current += 1
    saving.current = false
    submitting.current = false
    saveOperation.current = null
    completion.current = null
    replaceGuestRoute()
    setActive(null)
    setRun(null)
    setAnswers({})
    setIndex(0)
    setMode('quick')
    setPhase('catalog')
    setContext({ current_focus: '', trigger: '', what_helps: '', desired_change: '', note: '' })
    setGuestResult(null)
    setActivePlan(null)
    setPlanResults([])
    setSaveState('')
    setError('')
  }

  async function continuePlan() {
    if (!activePlan || activePlan.status !== 'active') return
    let definition
    try { definition = getDefinitionById(activePlan.definitionIds[activePlan.currentIndex]) } catch { setError(c.error); return }
    if (!definition) { setError(c.error); return }
    replaceGuestRoute({planId: activePlan.id})
    await begin(definition.key, definition)
  }

  return (
    <>
      {phase === 'catalog' && <div id="cabinet-tests"><PublicTestExplorer locale={locale} embedded onGuestStart={beginGuestBattery} /></div>}
      {phase === 'catalog' && (
      <section className="cabinet-signin-strip cabinet-signin-hero" aria-labelledby="cabinet-title">
        <div className="cabinet-signin-copy">
          <p className="about-kicker">{c.kicker}</p>
          <h2 id="cabinet-title">{c.title}</h2>
          <p>{c.intro}</p>
          <small>{c.googleNote}</small>
        </div>
        <button className="cabinet-google-button cabinet-google-inline" type="button" onClick={() => signIn()} disabled={busy}>
          <span>{c.google}</span>
          <ChevronRight aria-hidden="true" />
        </button>
        {error && phase === 'catalog' && <p className="client-entry-error cabinet-account-error" role="alert">{error}</p>}
      </section>
      )}


      {phase !== 'catalog' && <section className="cabinet-guest-tests" id="cabinet-tests" aria-labelledby="guest-tests-title">
        {phase === 'questions' && definition ? (
          <header className="cabinet-tests-heading cabinet-tests-heading--compact">
            <h2 id="guest-tests-title">{definitionTitle(definition, locale)}</h2>
          </header>
        ) : (
          <header className="library-heading cabinet-tests-heading">
            <p className="about-kicker">{c.testsKicker}</p>
            <h2 id="guest-tests-title">{c.tryTitle}</h2>
            <p>{c.tryText}</p>
          </header>
        )}

        {run && !definition && <div className="cabinet-guest-runner" role="alert">
          <p>{locale === 'ru' ? 'Эта сохранённая версия теста сейчас недоступна. Ответы не изменены.' : 'This saved test version is currently unavailable. Your answers have not been changed.'}</p>
          <button type="button" disabled={busy} onClick={resetToCatalog}>{c.back}</button>
        </div>}

        {phase === 'questions' && definition && run && hasTraumaAdministration(definition) && !traumaContextReady(definition, run.context || {}) && (
          <TraumaFrontMatter definition={definition} context={context} onChange={setContext}
            onContinue={saveTraumaContext} onExit={resetToCatalog} busy={busy || recoveryPending} error={error} />
        )}

        {phase === 'questions' && definition && question && run && traumaContextReady(definition, run.context || {}) && (
          <div className={`cabinet-guest-runner cabinet-guest-runner--${mode}`}>
            <div className="hh-runner-topline">
              <p className="cabinet-test-progress">
                {mode === 'quick'
                  ? `${answeredCount} / ${definition.questions.length} ${locale === 'ru' ? 'ответов' : 'answered'}`
                  : `${c.question} ${index + 1} ${c.of} ${definition.questions.length}`}
              </p>
              <div className="hh-test-mode-toggle" role="group" aria-label={c.modeTitle}>
                <button type="button" aria-pressed={mode === 'quick'} onClick={() => setMode('quick')}>
                  ⚡ {c.quick}<small>~{quickMinutes} {timeUnit}</small>
                </button>
                <button type="button" aria-pressed={mode === 'guided'} onClick={() => {
                  const missing = definition.questions.findIndex(item => !Object.prototype.hasOwnProperty.call(answers, item.id))
                  setIndex(missing < 0 ? definition.questions.length - 1 : missing)
                  setMode('guided')
                }}>
                  ✦ {c.guided}<small>~{guidedMinutes} {timeUnit}</small>
                </button>
              </div>
            </div>
            <div className="hh-runner-segments" role="progressbar" aria-label={c.question}
              aria-valuemin="0" aria-valuemax={definition.questions.length}
              aria-valuenow={mode === 'quick' ? answeredCount : index}>
              {definition.questions.map((item, step) => (
                <span key={item.id}
                  className={mode === 'quick'
                    ? (Object.prototype.hasOwnProperty.call(answers, item.id) ? 'is-done' : '')
                    : step < index ? 'is-done' : step === index ? 'is-current' : ''}
                  aria-hidden="true" />
              ))}
            </div>

            {hasTraumaAdministration(definition) && <p lang="en" className="cabinet-test-note">{definition.safetyText}</p>}
            {definition.instructions && <p className="cabinet-test-note" lang={definition.instrumentLocale}>{definition.instructions}</p>}
            <Asrs6SourceNotice definition={definition} startedAt={run.startedAt} locale={locale} />
            {mode === 'quick' ? (
              <div className="cabinet-quick-form">
                {definition.questions.map((item, step) => (
                  <fieldset key={item.id} className="cabinet-quick-question" disabled={busy || recoveryPending}>
                    <legend>
                      <span className="cabinet-question-number">{c.question} {step + 1} / {definition.questions.length}</span>
                      <TraumaSectionInstructions question={item} />
                      <h3>{item.text}</h3>
                    </legend>
                    {definition.key === 'mini-ipip-20' && step === 0 && <p className="cabinet-test-note">{c.traitNotice}</p>}
                    {definition.key === 'cdc-hrqol-4' && item.id === 'hrqol4.04' && answers['hrqol4.02'] === 0 && answers['hrqol4.03'] === 0 && (
                      <p className="cabinet-test-note">{locale === 'ru' ? 'По правилам CDC, если физически и психологически нездоровых дней не было, здесь выберите 0.' : 'CDC guidance: if physical and mental unhealthy days were both 0, select 0 here.'}</p>
                    )}
                    <GuestAnswerChoices definition={definition} question={item} selected={answers[item.id]}
                      onChoose={value => choose(value, item)} disabled={busy || recoveryPending} locale={locale} />
                  </fieldset>
                ))}
                <p className="cabinet-test-note hh-quick-hint">{c.tapContinue}</p>
                {allAnswered && definition.optionalContext?.length > 0 && (
                  <details className="cabinet-quick-context">
                    <summary>{c.contextTitle}</summary>
                    <p className="cabinet-test-note">{c.contextText}</p>
                    {[
                      ['current_focus', c.focus],
                      ['trigger', c.trigger],
                      ['what_helps', c.helps],
                      ['desired_change', c.desiredChange],
                      ['note', c.note],
                    ].map(([key, label]) => (
                      <label key={key}>{label}
                        <textarea disabled={busy || recoveryPending} value={context[key] || ''} maxLength={1000}
                          onChange={event => setContext(value => ({ ...value, [key]: event.target.value }))} />
                      </label>
                    ))}
                  </details>
                )}
              </div>
            ) : (
              <div className="cabinet-guided-question">
                <TraumaSectionInstructions question={question} />
                  <h3>{question.text}</h3>
                {definition.key === 'mini-ipip-20' && <p className="cabinet-test-note">{c.traitNotice}</p>}
                {definition.key === 'cdc-hrqol-4' && question.id === 'hrqol4.04' && answers['hrqol4.02'] === 0 && answers['hrqol4.03'] === 0 && (
                  <p className="cabinet-test-note">{locale === 'ru' ? 'По правилам CDC, если физически и психологически нездоровых дней не было, здесь выберите 0.' : 'CDC guidance: if physical and mental unhealthy days were both 0, select 0 here.'}</p>
                )}
                <GuestAnswerChoices definition={definition} question={question} selected={selected}
                  onChoose={value => choose(value)} disabled={busy || recoveryPending} locale={locale} />
              </div>
            )}
            <p className="cabinet-test-note hh-runner-save-state" role="status" aria-live="polite">{saveState}</p>
            <div className="cabinet-test-actions">
              {mode === 'guided' && (
                <button type="button" disabled={busy || recoveryPending || index === 0}
                  onClick={() => { setIndex(value => value - 1); setSaveState('') }}>
                  {c.back}
                </button>
              )}
              {mode === 'guided' &&
                (index !== definition.questions.length - 1 || definition.optionalContext?.length > 0) && (
                <button type="button" disabled={busy || recoveryPending || selected === undefined} onClick={next}>
                  {c.next}
                </button>
              )}
            </div>
            {((mode === 'guided' && index === definition.questions.length - 1 && allAnswered && !definition.optionalContext?.length) ||
              (mode === 'quick' && allAnswered)) && (
              <TestFinishActions locale={locale} disabled={busy || recoveryPending} temporary guestScaleOnly
                onReport={() => definition.optionalContext?.length ? saveContextAndFinish('report') : submitResult(run, 'report')}
                />
            )}
          </div>
        )}

        {phase === 'context' && definition?.optionalContext?.length > 0 && (
          <div className="cabinet-guest-runner">
            <h3>{c.contextTitle}</h3>
            <p>{c.contextText}</p>
            <label>{c.focus}<textarea disabled={busy || recoveryPending} value={context.current_focus} maxLength={1000} onChange={(e) => setContext((v) => ({ ...v, current_focus: e.target.value }))} /></label>
            <label>{c.trigger}<textarea disabled={busy || recoveryPending} value={context.trigger} maxLength={1000} onChange={(e) => setContext((v) => ({ ...v, trigger: e.target.value }))} /></label>
            <label>{c.helps}<textarea disabled={busy || recoveryPending} value={context.what_helps} maxLength={1000} onChange={(e) => setContext((v) => ({ ...v, what_helps: e.target.value }))} /></label>
            <label>{c.desiredChange}<textarea disabled={busy || recoveryPending} value={context.desired_change} maxLength={1000} onChange={(e) => setContext((v) => ({ ...v, desired_change: e.target.value }))} /></label>
            <label>{c.note}<textarea disabled={busy || recoveryPending} value={context.note} maxLength={1000} onChange={(e) => setContext((v) => ({ ...v, note: e.target.value }))} /></label>
            <div className="cabinet-test-actions">
              <button type="button" disabled={busy || recoveryPending} onClick={() => setPhase('questions')}>{c.back}</button>
            </div>
            <TestFinishActions locale={locale} disabled={busy || recoveryPending} temporary guestScaleOnly
              onReport={() => saveContextAndFinish('report')}
              />
          </div>
        )}

        {phase === 'result' && guestResult && definition && (
          <article className="cabinet-guest-result cabinet-result-page">
            <header className="cabinet-result-hero">
              <div>
                <p className="about-kicker">{c.result}</p>
                <h3>{definitionTitle(definition, locale)}</h3>
              </div>
              <div className="cabinet-result-meta">
                <span>{new Date(guestResult.measurementAt).toLocaleString(locale)}</span>
                <span>{guestResult.instrumentLocale?.toUpperCase()}</span>
              </div>
            </header>

            <GuestScaleInterpretation result={guestResult} locale={locale} />
            <TestRatingCard locale={locale} definitionKey={guestResult.definitionKey} guest />
            <section className={guestActions.capture} data-guest-analysis-gate aria-label={locale === 'ru' ? 'Бесплатные пояснения к тесту' : 'Free test explanations'}>
              <p className={guestActions.kicker}>{locale === 'ru' ? 'БЕСПЛАТНО · ЧЕРЕЗ GOOGLE' : 'FREE · WITH GOOGLE'}</p>
              <h4 className={guestActions.heading}>{locale === 'ru' ? 'Что означают ваши результаты?' : 'What do your scores mean?'}</h4>
              <p className={guestActions.explain}>{c.saveHint}</p>
              <button className={guestActions.googleButton} type="button" onClick={saveToCabinet} disabled={busy}>
                <span className={guestActions.googleMark} aria-hidden="true">G</span>
                <span>{c.save}</span>
                <span className={guestActions.buttonArrow} aria-hidden="true">→</span>
              </button>
              <p className={guestActions.privacy}>{locale === 'ru'
                ? 'Этот тест сохраняется в аккаунте только после вашего подтверждения.'
                : 'This test is saved to your account only after you confirm.'}</p>
            </section>

            <nav className={guestActions.nextActions} aria-label={locale === 'ru' ? 'Что делать дальше' : 'Next steps'}>
              <a className={guestActions.secondary} href={`/${locale}/courses/antistress`}>
                {locale === 'ru' ? 'Пройти антистресс-курс →' : 'Take the Anti-Stress course →'}
              </a>
              <button className={guestActions.secondary} type="button" disabled={busy}
                onClick={activePlan?.status === 'active' ? continuePlan : resetToCatalog}>
                {locale === 'ru' ? 'Перейти к следующему тесту →' : 'Go to the next test →'}
              </button>
            </nav>

            <details className={guestActions.more}>
              <summary>{locale === 'ru' ? 'Управление результатом' : 'Result options'}</summary>
              <div className={guestActions.moreBody}>
                <p>{c.source}: {guestResult.definitionKey} · {guestResult.definitionVersion} · {guestResult.instrumentLocale?.toUpperCase()}</p>
                {(guestResult.expiresAt || sessionExpires) && <p>{c.temporary} {new Date(guestResult.expiresAt || sessionExpires).toLocaleString(locale)}.</p>}
                {activePlan?.status === 'completed' && (
                  <button type="button" disabled={busy}
                    onClick={() => { replaceGuestRoute({planId: activePlan.id}); setPhase('summary') }}>
                    {locale === 'ru' ? 'Обзор пройденных тестов' : 'View completed test set'}
                  </button>
                )}
                <button type="button" disabled={busy} onClick={deleteResult}>{c.delete}</button>
              </div>
            </details>
          </article>
        )}
        {phase === 'summary' && activePlan && (
          <article className="cabinet-guest-result cabinet-result-page">
            <header className="cabinet-result-hero"><div><p className="about-kicker">{locale === 'ru' ? 'Набор завершён' : 'Set complete'}</p><h3>{locale === 'ru' ? 'Ваш общий обзор' : 'Your combined overview'}</h3><p className="cabinet-result-intro">{locale === 'ru' ? 'Здесь собраны отдельные результаты без единого медицинского балла или диагноза.' : 'This brings together your separate results without creating a single medical score or diagnosis.'}</p></div></header>
            <section className="cabinet-result-section"><div className="cabinet-result-section-heading"><div><p className="about-kicker">{locale === 'ru' ? 'Пройдено' : 'Completed'}</p><h4>{planResults.length} {locale === 'ru' ? 'тестов' : 'tests'}</h4></div></div><div className="cabinet-test-list">{planResults.map((result) => <article className="cabinet-test-row cabinet-battery-result-row" key={result.id}><span className="cabinet-test-row-copy"><strong>{definitionTitle(getAssessmentDefinition(result.definitionKey, result.definitionVersion, result.instrumentLocale), locale)}</strong><small>{result.dimensions.length} {locale === 'ru' ? 'показателей' : 'measurements'} · {new Date(result.measurementAt).toLocaleString(locale)}</small><button className="cabinet-save-result" type="button" disabled={busy} onClick={() => saveToCabinet(result)}>{c.save}</button></span></article>)}</div></section>
            <footer className="cabinet-result-footer"><p className="cabinet-test-note">{locale === 'ru' ? 'Каждый тест имеет отдельный результат. Вы можете по желанию сохранить конкретные результаты в личном кабинете через Google.' : 'Each test has a separate result. Choose which results to save to your private Cabinet with Google.'}</p><div className="cabinet-test-actions"><button className="cabinet-text-button" type="button" onClick={resetToCatalog}>{c.restart}</button></div></footer>
          </article>
        )}
        {error && phase !== 'catalog' && <div className="client-entry-error" role="alert">
          <p>{error}</p>
          {(saveOperation.current || completion.current) && <button type="button" disabled={busy}
            onClick={() => completion.current ? submitResult(completion.current.run, completion.current.destination) : retryGuestSave()}>
            {locale === 'ru' ? 'Повторить' : 'Retry'}
          </button>}
          {['REVISION_CONFLICT', 'IMMUTABLE_RUN', 'IDEMPOTENCY_CONFLICT'].includes(saveOperation.current?.errorCode) && <button type="button" disabled={busy} onClick={reloadGuestRun}>
            {locale === 'ru' ? 'Загрузить сохранённые ответы' : 'Reload saved answers'}
          </button>}
        </div>}
        <p className="cabinet-test-note">{c.nonDiagnostic}</p>
      </section>}

      <details className="client-entry-card cabinet-legacy-entry">
        <summary>{c.legacyTitle}</summary>
        <p>{c.legacyText}</p>
        {legacySelector && (
          <p>
            <a className="personal-consultation-submit" href={`/${locale}/client/${legacySelector}`}>
              {c.legacyContinue}
            </a>
          </p>
        )}
        <ClientCabinetEntry locale={locale} />
      </details>
    </>
  )
}
