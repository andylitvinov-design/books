'use client'
import { TraumaFrontMatter, TraumaSectionInstructions } from './trauma-administration'
import { hasTraumaAdministration, traumaContextReady } from '@/lib/assessments/trauma-administration'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { ClientCabinetEntry } from '@/components/client-cabinet-entry'
import { MoodCheckIn } from '@/components/app/mood-checkin'
import { PublicTestExplorer } from '@/components/app/public-test-explorer'
import { GuestScaleInterpretation } from '@/components/app/guest-scale-interpretation'
import { Asrs6SourceNotice, Asrs6ChoiceMarker, asrs6ChoiceClass } from '@/components/app/asrs6-source-notice'
import { TestFinishActions } from '@/components/app/test-finish-actions'
import { CURRENT_STATE_EN_V2, CURRENT_STATE_RU_V2 } from '@/data/assessments/current-state-v2'
import { MINI_IPIP_20_EN_V1 } from '@/data/assessments/mini-ipip-20-en-v1'
import { MONITORING_CATALOG, monitoringCatalogItem } from '@/data/assessments/catalog'
import { getAssessmentDefinition, getDefinitionById } from '@/lib/assessments/definitions'

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
    tryText: 'Take available tests without registering. See your scale scores first, then choose whether to open free analysis in your Cabinet.',
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
    consentTitle: 'Before you start',
    consentText: 'Your answers will be stored temporarily so this browser can resume the test. No name or email is required.',
    adult: 'I am 18 or older.',
    necessary: 'I agree to temporary private processing of my answers and result for this self-observation test.',
    continue: 'Continue',
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
    save: 'Create / sign in to my Cabinet — get free analysis',
    saveHint: 'Read your scales without signing in. For full free analysis and recommendations, confirm saving only this test to your chosen Google account.',
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
    tryText: 'Выберите опросники о стрессе, настроении и ресурсах. Получите рекомендации и сохраняйте результаты для наблюдения за динамикой.',
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
    consentTitle: 'Перед началом',
    consentText: 'Ответы временно сохраняются, чтобы этот браузер мог продолжить тест. Имя и email не нужны.',
    adult: 'Мне 18 лет или больше.',
    necessary: 'Я согласен на временную приватную обработку ответов и результата для этого теста самонаблюдения.',
    continue: 'Продолжить',
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
    save: 'Создать / войти в мой кабинет и получить анализ (бесплатно)',
    saveHint: 'Шкалы доступны без регистрации. Для полного бесплатного анализа и рекомендаций подтвердите сохранение только этого теста в выбранный Google-аккаунт.',
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
  const [active, setActive] = useState(null)
  const [run, setRun] = useState(null)
  const [answers, setAnswers] = useState({})
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState('catalog')
  const [mode, setMode] = useState(null)
  const [context, setContext] = useState({ current_focus: '', trigger: '', what_helps: '', desired_change: '', note: '' })
  const [guestResult, setGuestResult] = useState(null)
  const [activePlan, setActivePlan] = useState(null)
  const [planResults, setPlanResults] = useState([])
  const [pendingGuestDefinitions, setPendingGuestDefinitions] = useState([])
  const initialLaunchRef = useRef(null)
  const [sessionExpires, setSessionExpires] = useState(null)
  const [pendingMood, setPendingMood] = useState(null)
  const [latestGuestMood, setLatestGuestMood] = useState(null)
  const [adult, setAdult] = useState(false)
  const [necessary, setNecessary] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saveState, setSaveState] = useState('')
  const [error, setError] = useState('')
  const runLifetime = useRef(0)
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

  useEffect(() => {
    let live = true
    const epoch = runLifetime.current
    guestFetch('guest/bootstrap')
      .then(async (bootstrap) => {
        if (!live || runLifetime.current !== epoch) return
        setSessionExpires(bootstrap.expiresAt)
        setLatestGuestMood(bootstrap.moodCheckins?.[0] || null)
        if (!planId) return
        const plan = await guestFetch('guest/test-plans/' + encodeURIComponent(planId))
        if (!live || runLifetime.current !== epoch) return
        setActivePlan(plan)
        const planResultRows = (bootstrap.results || []).filter((result) => plan.completedRunIds?.includes(result.runId))
        setPlanResults(planResultRows)
        if (plan.status === 'completed') {
          setPhase('summary')
          return
        }
        const nextDefinition = getDefinitionById(plan.definitionIds[plan.currentIndex])
        const existing = bootstrap.runs.find((item) => item.definitionId === nextDefinition.id)
        setActive(nextDefinition.key)
        if (existing) {
          setRun(existing)
          setAnswers(existing.answers || {})
          setContext(existing.context || { current_focus: '', trigger: '', what_helps: '', desired_change: '', note: '' })
          setIndex(Math.min(Math.max(0, Number(existing.progress || 0)), Math.max(0, nextDefinition.questions.length - 1)))
          setPhase('mode')
        } else {
          await startRun(nextDefinition)
        }
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [locale, planId])

  useEffect(() => {
    // Only public definition keys travel from /client/tests, never answers/results.
    if (!requestedGuestTests || initialLaunchRef.current === requestedGuestTests) return
    initialLaunchRef.current = requestedGuestTests
    const keys = [...new Set(requestedGuestTests.split(',').map(value => value.trim()).filter(Boolean))]
    if (keys.length === 0 || keys.length > 12) { setError(c.error); return }
    void beginGuestBattery(keys.map(key => ({ key })))
  }, [requestedGuestTests])

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

  async function handleGuestMoodChange(payload) {
    setPendingMood(payload)
    try {
      const saved = await guestFetch('guest/mood', {
        ...payload,
        timezone: localZone(),
        sourceSurface: 'cabinet_landing',
      })
      setLatestGuestMood(saved)
      setPendingMood(null)
      return saved
    } catch (e) {
      if (e.status === 401 || e.code === 'GUEST_SESSION_REQUIRED') return null
      setError(c.error)
      return null
    }
  }

  async function persistGuestMood(payload = pendingMood) {
    if (!payload) return null
    try {
      const saved = await guestFetch('guest/mood', {
        ...payload,
        timezone: localZone(),
        sourceSurface: 'cabinet_landing',
      })
      setLatestGuestMood(saved)
      setPendingMood(null)
      return saved
    } catch {
      return null
    }
  }

  async function startRun(def) {
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
    setMode(null)
    setPhase('mode')
    setBusy(false)
  }

  async function begin(id, moodPayload = pendingMood, pinnedDefinition = null) {
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
    setRun(null)
    setActive(id)
    setGuestResult(null)
    setError('')
    setSaveState('')
    setBusy(true)
    try {
      const bootstrap = await guestFetch('guest/bootstrap')
      if (runLifetime.current !== epoch) return
      setSessionExpires(bootstrap.expiresAt)
      setLatestGuestMood(bootstrap.moodCheckins?.[0] || null)
      if (moodPayload) await persistGuestMood(moodPayload)
      if (runLifetime.current !== epoch) return
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
        setMode(null)
        setPhase('mode')
      } else {
        await startRun(def)
      }
    } catch (e) {
      if (runLifetime.current !== epoch) return
      if (e.status === 401 || e.code === 'GUEST_SESSION_REQUIRED') {
        setPhase('consent')
      } else {
        setError(c.error)
      }
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
      setPendingGuestDefinitions([])
      setActivePlan(null)
      return begin(definitions[0].key, null)
    }

    const epoch = ++runLifetime.current
    saving.current = false
    submitting.current = false
    saveOperation.current = null
    completion.current = null
    setRun(null)
    setActivePlan(null)
    setAnswers({})
    setMode(null)
    setPendingGuestDefinitions(definitions)
    setActive(definitions[0].key)
    setGuestResult(null)
    setPlanResults([])
    setSaveState('')
    setError('')
    setBusy(true)
    try {
      const bootstrap = await guestFetch('guest/bootstrap')
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
      setPendingGuestDefinitions([])
      if (plan.status === 'completed') {
        const latest = await guestFetch('guest/bootstrap')
        if (runLifetime.current !== epoch) return
        setPlanResults((latest.results || []).filter(row => plan.completedRunIds?.includes(row.runId)))
        setPhase('summary')
      } else {
        // Reopening the same guest battery resumes the actual outstanding test,
        // rather than restarting the first item or losing previous measurements.
        const next = getDefinitionById(plan.definitionIds[plan.currentIndex])
        setActive(next.key)
        await startRun(next)
      }
    } catch (cause) {
      if (runLifetime.current !== epoch) return
      if (cause.status === 401 || cause.code === 'GUEST_SESSION_REQUIRED') setPhase('consent')
      else { setError(c.error); setPendingGuestDefinitions([]) }
    } finally { if (runLifetime.current === epoch) setBusy(false) }
  }

  async function createGuestSession() {
    if (!adult || !necessary || !definition) return
    const epoch = ++runLifetime.current
    setBusy(true)
    setError('')
    try {
      const session = await guestFetch('guest/session', {
        adult: true,
        necessary: true,
        uiLocale: locale === 'ru' ? 'ru' : 'en',
        timezone: localZone(),
      })
      if (runLifetime.current !== epoch) return
      setSessionExpires(session.expiresAt)
      if (pendingMood) await persistGuestMood(pendingMood)
      if (runLifetime.current !== epoch) return
      let nextDefinition = definition
      if (pendingGuestDefinitions.length > 1) {
        const plan = await guestFetch('guest/test-plans', {
          items: pendingGuestDefinitions.map(item => ({
            definitionKey: item.key, definitionVersion: item.version, instrumentLocale: item.instrumentLocale,
          })),
          replaceActive: true,
          operationId: crypto.randomUUID(),
        })
        if (runLifetime.current !== epoch) return
        setActivePlan(plan)
        setPlanResults([])
        setPendingGuestDefinitions([])
        if (plan.status === 'completed') {
          const latest = await guestFetch('guest/bootstrap')
          if (runLifetime.current !== epoch) return
          setPlanResults((latest.results || []).filter(row => plan.completedRunIds?.includes(row.runId)))
          setPhase('summary')
          return
        }
        nextDefinition = getDefinitionById(plan.definitionIds[plan.currentIndex])
        setActive(nextDefinition.key)
      }
      await startRun(nextDefinition)
    } catch {
      if (runLifetime.current !== epoch) return
      setError(c.error)
    } finally {
      if (runLifetime.current === epoch) setBusy(false)
    }
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
        await startRun(nextDefinition)
      } else if (advanced?.status === 'completed') {
        setPhase('summary')
      } else {
        setActive(null)
        setRun(null)
        setMode(null)
        setPhase('catalog')
      }
    } else {
      // Always display this saved attempt's full recommendations.
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
        window.location.assign('/' + locale + '/app/continue?intent=' + encodeURIComponent(intent.id))
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
    setActive(null)
    setRun(null)
    setAnswers({})
    setIndex(0)
    setMode(null)
    setPhase('catalog')
    setContext({ current_focus: '', trigger: '', what_helps: '', desired_change: '', note: '' })
    setGuestResult(null)
    setActivePlan(null)
    setPlanResults([])
    setPendingGuestDefinitions([])
    setSaveState('')
    setError('')
  }

  async function continuePlan() {
    if (!activePlan || activePlan.status !== 'active') return
    const definition = getDefinitionById(activePlan.definitionIds[activePlan.currentIndex])
    await begin(definition.key, pendingMood, definition)
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

      <MoodCheckIn
        locale={locale}
        latestMood={latestGuestMood}
        onMoodChange={handleGuestMoodChange}
        onDismiss={(payload) => {
          if (pendingMood?.operationId === payload.operationId) setPendingMood(null)
        }}
        onQuickCheckin={(payload) => {
          setPendingMood(payload)
          begin('state', payload)
        }}
        disabled={busy}
      />

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

        {phase === 'consent' && (
          <div className="cabinet-guest-runner">
            <h3>{c.consentTitle}</h3>
            <p>{c.consentText}</p>
            {definition?.key === 'mini-ipip-20' && <p className="cabinet-test-note">{c.traitNotice}</p>}
            <label className="hh-check">
              <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
              {c.adult}
            </label>
            <label className="hh-check">
              <input type="checkbox" checked={necessary} onChange={(e) => setNecessary(e.target.checked)} />
              {c.necessary}
            </label>
            <div className="cabinet-test-actions">
              <button type="button" onClick={resetToCatalog}>{c.back}</button>
              <button type="button" disabled={busy || !adult || !necessary} onClick={createGuestSession}>
                {c.continue}
              </button>
            </div>
          </div>
        )}

        {run && !definition && <div className="cabinet-guest-runner" role="alert">
          <p>{locale === 'ru' ? 'Эта сохранённая версия теста сейчас недоступна. Ответы не изменены.' : 'This saved test version is currently unavailable. Your answers have not been changed.'}</p>
          <button type="button" disabled={busy} onClick={resetToCatalog}>{c.back}</button>
        </div>}

        {['mode', 'questions'].includes(phase) && definition && run && hasTraumaAdministration(definition) && !traumaContextReady(definition, run.context || {}) && (
          <TraumaFrontMatter definition={definition} context={context} onChange={setContext}
            onContinue={saveTraumaContext} onExit={resetToCatalog} busy={busy || recoveryPending} error={error} />
        )}

        {phase === 'mode' && definition && run && traumaContextReady(definition, run.context || {}) && (
          <div className="cabinet-guest-runner hh-test-mode-picker">
            <div className="hh-test-mode-intro">
              <p className="cabinet-test-progress">{definitionTitle(definition, locale)}</p>
              <h3>{c.modeTitle}</h3>
              <p>{c.modeText}</p>
            </div>
            <div className="hh-test-mode-grid">
              <button className="hh-test-mode-card" type="button" onClick={() => { setMode('quick'); setPhase('questions') }}>
                <span className="hh-test-mode-icon" aria-hidden="true">⚡</span>
                <span><small>{c.quick} · ~{quickMinutes} {timeUnit}</small><strong>{c.quickTitle}</strong><em>{c.quickText}</em></span>
              </button>
              <button className="hh-test-mode-card" type="button" onClick={() => { setMode('guided'); setPhase('questions') }}>
                <span className="hh-test-mode-icon" aria-hidden="true">✦</span>
                <span><small>{c.guided} · ~{guidedMinutes} {timeUnit}</small><strong>{c.guidedTitle}</strong><em>{c.guidedText}</em></span>
              </button>
            </div>
            <p className="cabinet-test-note hh-test-mode-same">{c.sameModeResult}</p>
            <div className="cabinet-test-actions">
              <button type="button" onClick={resetToCatalog}>{c.back}</button>
            </div>
          </div>
        )}

        {phase === 'questions' && definition && question && run && traumaContextReady(definition, run.context || {}) && (
          <div className={`cabinet-guest-runner cabinet-guest-runner--${mode || 'guided'}`}>
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
                <p className="cabinet-result-intro">
                  {locale === 'ru'
                    ? 'Ваш личный результат самонаблюдения — спокойно, без ярлыков и автоматических выводов.'
                    : 'Your personal self-observation result — calm, private and without automatic labels.'}
                </p>
              </div>
              <div className="cabinet-result-meta">
                <span>{new Date(guestResult.measurementAt).toLocaleString(locale)}</span>
                <span>{guestResult.instrumentLocale?.toUpperCase()}</span>
              </div>
            </header>

            <GuestScaleInterpretation result={guestResult} locale={locale} />
            <div className="cabinet-result-actions-grid" data-guest-analysis-gate style={{ display: 'block', maxWidth: 780, margin: '22px auto' }}>
              <section className="cabinet-result-save-panel">
                <p className="about-kicker">{locale === 'ru' ? 'Бесплатный персональный анализ' : 'Free personal analysis'}</p>
                <h4>{locale === 'ru' ? 'Полный анализ ваших результатов' : 'Understand your complete results'}</h4>
                <p>{c.saveHint}</p>
                <button className="cabinet-save-result" type="button" onClick={saveToCabinet} disabled={busy}>
                  {c.save}
                </button>
              </section>

              
            </div>

            <footer className="cabinet-result-footer">
              <p className="cabinet-test-note">
                {c.source}: {guestResult.definitionKey} · {guestResult.definitionVersion} · {guestResult.instrumentLocale?.toUpperCase()}
              </p>
              {(guestResult.expiresAt || sessionExpires) && (
                <p className="cabinet-test-note">
                  {c.temporary} {new Date(guestResult.expiresAt || sessionExpires).toLocaleString(locale)}.
                </p>
              )}
              <div className="cabinet-test-actions">
                {activePlan?.status === 'active' && (
                  <button className="cabinet-save-result" type="button" disabled={busy} onClick={continuePlan}>
                    {locale === 'ru' ? 'Продолжить набор' : 'Continue set'}
                  </button>
                )}
                <button className="cabinet-text-button" type="button" disabled={busy} onClick={resetToCatalog}>
                  {c.restart}
                </button>
                <button className="cabinet-text-button" type="button" disabled={busy} onClick={deleteResult}>
                  {c.delete}
                </button>
              </div>
            </footer>
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
