'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { ClientCabinetEntry } from '@/components/client-cabinet-entry'
import { MoodCheckIn } from '@/components/app/mood-checkin'
import { PublicTestExplorer } from '@/components/app/public-test-explorer'
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
    googleNote: 'Optional: you can select and take a battery of tests without signing in.',
    unavailable: 'This feature is temporarily unavailable. Your existing private Cabinet link still works below.',
    testsKicker: 'Mind–Body Monitor',
    tryTitle: 'Your Mind–Body Monitor',
    tryText: 'Complete the selected test battery to track your concerns and review each result.',
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
    stateAnalysisCta: 'Take a free state analysis and get recommendations',
    stateAnalysisMeta: 'Free · ~1 min · no sign-in required',
    batteryCta: 'Build a personal test battery',
    batteryMeta: 'Choose several areas and depth — we rank the most relevant tests for you.',
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
    quickText: 'One tap saves your answer and moves straight to the next question.',
    guided: 'Guided',
    guidedTitle: 'Calm & guided',
    guidedText: 'A slower step-by-step flow with a clear Next action.',
    sameModeResult: 'Both use the same questions and produce the same result.',
    tapContinue: 'Tap an answer to save it and continue automatically.',
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
    save: 'Save to my Cabinet',
    saveHint: 'Saving is optional. Only this selected result will be attached to the Google account you confirm.',
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
    googleNote: 'Необязательно: набор тестов можно подобрать и пройти без входа.',
    unavailable: 'Эта функция временно недоступна. Старая приватная ссылка на кабинет по-прежнему работает ниже.',
    testsKicker: 'Монитор состояния',
    tryTitle: 'Ваш монитор состояния',
    tryText: 'Пройдите подобранный набор тестов и просматривайте результаты по каждому направлению.',
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
    stateAnalysisCta: 'Пройти бесплатный тест-анализ состояния и получить рекомендации',
    stateAnalysisMeta: 'Бесплатно · ~1 мин · без регистрации',
    batteryCta: 'Подобрать персональную батарею тестов',
    batteryMeta: 'Выберите несколько зон и глубину — мы расставим подходящие тесты по приоритету.',
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
    quickText: 'Один ответ — и сразу следующий вопрос. Минимум лишних шагов.',
    guided: 'Guided',
    guidedTitle: 'С сопровождением',
    guidedText: 'Спокойный пошаговый формат с понятной кнопкой «Далее».',
    sameModeResult: 'В обоих режимах используются те же вопросы и тот же расчёт результата.',
    tapContinue: 'Нажмите на ответ — он сохранится, и тест продолжится автоматически.',
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
    save: 'Сохранить в личном кабинете',
    saveHint: 'Сохранение необязательно. Только этот выбранный результат будет добавлен в подтверждённый Google-аккаунт.',
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
  if (!item?.startable || PUBLIC_GUEST_BLOCKED_KEYS.has(item.key)) return null
  return getAssessmentDefinition(
    item.key,
    item.version,
    item.instrumentLocale === 'dynamic' ? locale : item.instrumentLocale,
  )
}

function publicRecommendationDefinitions(locale) {
  return MONITORING_CATALOG
    .filter((item) => item.startable && !PUBLIC_GUEST_BLOCKED_KEYS.has(item.key))
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
  if (Array.isArray(definition.responseAnchors) && Number.isInteger(min))
    return definition.responseAnchors.map((label, index) => ({ value: min + index, label }))
  return Array.from({ length: max - min + 1 }, (_, index) => ({
    value: min + index,
    label: String(min + index),
  }))
}

function resultLabel(definition, dimension) {
  return dimension.sourceConstruct || definition.questions.find((item) => item.id === dimension.key)?.label || dimension.key
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

export function CabinetLanding({ locale = 'en', appAvailable = false, legacySelector = null }) {
  const c = UI[locale] || UI.en
  const searchParams = useSearchParams()
  const planId = searchParams.get('plan')
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
  const [sessionExpires, setSessionExpires] = useState(null)
  const [pendingMood, setPendingMood] = useState(null)
  const [latestGuestMood, setLatestGuestMood] = useState(null)
  const [adult, setAdult] = useState(false)
  const [necessary, setNecessary] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saveState, setSaveState] = useState('')
  const [error, setError] = useState('')
  const definition = useMemo(() => (active ? definitionFor(active, locale) : null), [active, locale])
  const question = definition?.questions[index]
  const selected = question ? answers[question.id] : undefined

  useEffect(() => {
    let live = true
    guestFetch('guest/bootstrap')
      .then(async (bootstrap) => {
        if (!live) return
        setSessionExpires(bootstrap.expiresAt)
        setLatestGuestMood(bootstrap.moodCheckins?.[0] || null)
        if (!planId) return
        const plan = await guestFetch('guest/test-plans/' + encodeURIComponent(planId))
        if (!live) return
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
    const created = await guestFetch('guest/runs', {
      definitionKey: def.key,
      definitionVersion: def.version,
      instrumentLocale: def.instrumentLocale,
      operationId: crypto.randomUUID(),
    })
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
  }

  async function begin(id, moodPayload = pendingMood) {
    const def = definitionFor(id, locale)
    if (!def) {
      setError(c.error)
      return
    }
    setActive(id)
    setGuestResult(null)
    setError('')
    setSaveState('')
    setBusy(true)
    try {
      const bootstrap = await guestFetch('guest/bootstrap')
      setSessionExpires(bootstrap.expiresAt)
      setLatestGuestMood(bootstrap.moodCheckins?.[0] || null)
      if (moodPayload) await persistGuestMood(moodPayload)
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
      if (e.status === 401 || e.code === 'GUEST_SESSION_REQUIRED') {
        setPhase('consent')
      } else {
        setError(c.error)
      }
    } finally {
      setBusy(false)
    }
  }

  async function createGuestSession() {
    if (!adult || !necessary || !definition) return
    setBusy(true)
    setError('')
    try {
      const session = await guestFetch('guest/session', {
        adult: true,
        necessary: true,
        uiLocale: locale === 'ru' ? 'ru' : 'en',
        timezone: localZone(),
      })
      setSessionExpires(session.expiresAt)
      if (pendingMood) await persistGuestMood(pendingMood)
      await startRun(definition)
    } catch {
      setError(c.error)
    } finally {
      setBusy(false)
    }
  }

  async function submitSavedRun(currentRun) {
    const result = await guestFetch('guest/runs/' + currentRun.id + '/submit', {
      expectedRevision: currentRun.revision,
    })
    setGuestResult(result)
    if (activePlan?.status === 'active') {
      const advanced = await guestFetch(`guest/test-plans/${activePlan.id}/advance`, {
        completedRunId: result.runId,
        expectedRevision: activePlan.revision,
      })
      setActivePlan(advanced)
      const bootstrap = await guestFetch('guest/bootstrap')
      const rows = (bootstrap.results || []).filter((item) => advanced.completedRunIds?.includes(item.runId))
      setPlanResults(rows)
      setPhase(advanced.status === 'completed' ? 'summary' : 'result')
    } else {
      setPhase('result')
    }
    return result
  }

  async function choose(value) {
    if (!run || !question || busy) return
    const nextAnswers = { ...answers, [question.id]: value }
    const quick = mode === 'quick'
    const lastQuestion = index === definition.questions.length - 1
    setAnswers(nextAnswers)
    setBusy(true)
    setSaveState(c.saving)
    setError('')
    try {
      const saved = await guestFetch('guest/runs/' + run.id + '/save', {
        answers: { [question.id]: value },
        context: run.context || {},
        progress: quick ? Math.min(index + 1, definition.questions.length) : index,
        expectedRevision: run.revision,
        operationId: crypto.randomUUID(),
      })
      setRun(saved)
      setAnswers(saved.answers || nextAnswers)
      setSaveState(c.saved)
      if (quick) {
        if (!lastQuestion) {
          setIndex((value) => value + 1)
        } else if (definition.optionalContext?.length > 0) {
          setPhase('context')
        } else {
          await submitSavedRun(saved)
        }
      }
    } catch {
      setError(c.error)
      setSaveState('')
    } finally {
      setBusy(false)
    }
  }

  async function submitResult(currentRun = run) {
    if (!currentRun || busy) return
    setBusy(true)
    setError('')
    try {
      await submitSavedRun(currentRun)
    } catch {
      setError(c.error)
    } finally {
      setBusy(false)
    }
  }

  async function next() {
    if (selected === undefined || busy || !run) return
    setBusy(true)
    setSaveState(c.saving)
    setError('')
    try {
      const saved = await guestFetch('guest/runs/' + run.id + '/save', {
        answers: {},
        context: run.context || {},
        progress: Math.min(index + 1, definition.questions.length),
        expectedRevision: run.revision,
        operationId: crypto.randomUUID(),
      })
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
      setError(c.error)
      setSaveState('')
    } finally {
      setBusy(false)
    }
  }

  async function saveContextAndFinish() {
    if (!run || busy) return
    setBusy(true)
    setError('')
    try {
      const saved = await guestFetch('guest/runs/' + run.id + '/save', {
        answers: {},
        context,
        progress: definition.questions.length,
        expectedRevision: run.revision,
        operationId: crypto.randomUUID(),
      })
      setRun(saved)
      setBusy(false)
      await submitResult(saved)
    } catch {
      setError(c.error)
      setBusy(false)
    }
  }

  async function saveToCabinet(resultToSave = guestResult) {
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
    setSaveState('')
    setError('')
  }

  async function continuePlan() {
    if (!activePlan || activePlan.status !== 'active') return
    const definition = getDefinitionById(activePlan.definitionIds[activePlan.currentIndex])
    await begin(definition.key)
  }

  return (
    <>
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

      {phase === "catalog" && <PublicTestExplorer locale={locale} embedded />}

      {phase !== 'catalog' && <section className="cabinet-guest-tests" id="cabinet-tests" aria-labelledby="guest-tests-title">
        <header className="library-heading cabinet-tests-heading">
          <p className="about-kicker">{c.testsKicker}</p>
          <h2 id="guest-tests-title">{c.tryTitle}</h2>
          <p>{c.tryText}</p>
        </header>

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

        {phase === 'mode' && definition && run && (
          <div className="cabinet-guest-runner hh-test-mode-picker">
            <div className="hh-test-mode-intro">
              <p className="cabinet-test-progress">{definitionTitle(definition, locale)}</p>
              <h3>{c.modeTitle}</h3>
              <p>{c.modeText}</p>
            </div>
            <div className="hh-test-mode-grid">
              <button className="hh-test-mode-card" type="button" onClick={() => { setMode('quick'); setPhase('questions') }}>
                <span className="hh-test-mode-icon" aria-hidden="true">⚡</span>
                <span><small>{c.quick}</small><strong>{c.quickTitle}</strong><em>{c.quickText}</em></span>
              </button>
              <button className="hh-test-mode-card" type="button" onClick={() => { setMode('guided'); setPhase('questions') }}>
                <span className="hh-test-mode-icon" aria-hidden="true">✦</span>
                <span><small>{c.guided}</small><strong>{c.guidedTitle}</strong><em>{c.guidedText}</em></span>
              </button>
            </div>
            <p className="cabinet-test-note hh-test-mode-same">{c.sameModeResult}</p>
            <div className="cabinet-test-actions">
              <button type="button" onClick={resetToCatalog}>{c.back}</button>
            </div>
          </div>
        )}

        {phase === 'questions' && definition && question && run && (
          <div className={`cabinet-guest-runner cabinet-guest-runner--${mode || 'guided'}`}>
            <div className="hh-runner-topline">
              <p className="cabinet-test-progress">
                {c.question} {index + 1} {c.of} {definition.questions.length}
              </p>
              <div className="hh-test-mode-toggle" role="group" aria-label={c.modeTitle}>
                <button type="button" aria-pressed={mode === 'quick'} onClick={() => setMode('quick')}>⚡ {c.quick}</button>
                <button type="button" aria-pressed={mode === 'guided'} onClick={() => setMode('guided')}>✦ {c.guided}</button>
              </div>
            </div>
            <div
              className="hh-runner-segments"
              role="progressbar"
              aria-valuemin="1"
              aria-valuemax={definition.questions.length}
              aria-valuenow={index + 1}
            >
              {definition.questions.map((item, step) => (
                <span
                  key={item.id}
                  className={step < index ? 'is-done' : step === index ? 'is-current' : ''}
                  aria-hidden="true"
                />
              ))}
            </div>
            {mode === 'guided' && <p className="hh-guided-step">{c.guidedPrompt}</p>}
            <h3>{question.text}</h3>
            {definition.key === 'mini-ipip-20' && <p className="cabinet-test-note">{c.traitNotice}</p>}
            <div className={Array.isArray(definition.responseAnchors) ? 'cabinet-answer-list' : 'cabinet-answer-scale'}>
              {answerLabels(definition, question).map((option) => (
                <button
                  type="button"
                  key={option.value}
                  aria-pressed={selected === option.value}
                  disabled={busy}
                  onClick={() => choose(option.value)}
                >
                  {Array.isArray(definition.responseAnchors)
                    ? <><strong>{option.value}</strong><span>{option.label}</span></>
                    : option.label}
                </button>
              ))}
            </div>
            {!Array.isArray(definition.responseAnchors) && question.anchors && (
              <div className="cabinet-answer-anchors">
                <span>{question.anchors[0]}</span><span>{question.anchors[1]}</span>
              </div>
            )}
            {mode === 'quick' && <p className="cabinet-test-note hh-quick-hint">{c.tapContinue}</p>}
            <p className="cabinet-test-note" role="status">{saveState}</p>
            <div className="cabinet-test-actions">
              <button
                type="button"
                disabled={busy || index === 0}
                onClick={() => { setIndex((value) => value - 1); setSaveState('') }}
              >
                {c.back}
              </button>
              {mode === 'guided' && (
                <button type="button" disabled={busy || selected === undefined} onClick={next}>
                  {index === definition.questions.length - 1 && !definition.optionalContext?.length
                    ? c.finish
                    : c.next}
                </button>
              )}
            </div>
          </div>
        )}

        {phase === 'context' && definition?.optionalContext?.length > 0 && (
          <div className="cabinet-guest-runner">
            <h3>{c.contextTitle}</h3>
            <p>{c.contextText}</p>
            <label>{c.focus}<textarea value={context.current_focus} maxLength={1000} onChange={(e) => setContext((v) => ({ ...v, current_focus: e.target.value }))} /></label>
            <label>{c.trigger}<textarea value={context.trigger} maxLength={1000} onChange={(e) => setContext((v) => ({ ...v, trigger: e.target.value }))} /></label>
            <label>{c.helps}<textarea value={context.what_helps} maxLength={1000} onChange={(e) => setContext((v) => ({ ...v, what_helps: e.target.value }))} /></label>
            <label>{c.desiredChange}<textarea value={context.desired_change} maxLength={1000} onChange={(e) => setContext((v) => ({ ...v, desired_change: e.target.value }))} /></label>
            <label>{c.note}<textarea value={context.note} maxLength={1000} onChange={(e) => setContext((v) => ({ ...v, note: e.target.value }))} /></label>
            <div className="cabinet-test-actions">
              <button type="button" disabled={busy} onClick={() => setPhase('questions')}>{c.back}</button>
              <button type="button" disabled={busy} onClick={saveContextAndFinish}>{c.finish}</button>
            </div>
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

            <section className="cabinet-result-section" aria-labelledby="guest-result-values">
              <div className="cabinet-result-section-heading">
                <div>
                  <p className="about-kicker">{locale === 'ru' ? 'Результаты' : 'Results'}</p>
                  <h4 id="guest-result-values">{locale === 'ru' ? 'Ваши показатели' : 'Your measurements'}</h4>
                </div>
                <p>
                  {locale === 'ru'
                    ? 'Это личная точка отсчёта. Повторные совместимые замеры помогут увидеть изменения со временем.'
                    : 'This is a personal baseline. Compatible repeat measurements can show change over time.'}
                </p>
              </div>
              <div className="cabinet-result-grid" data-count={Math.min(guestResult.dimensions.length, 3)}>
                {guestResult.dimensions.map((dimension) => (
                  <section key={dimension.key}>
                    <h5>{resultLabel(definition, dimension)}</h5>
                    <div className="cabinet-result-score">
                      <strong>{dimension.value}</strong>
                      <small>/ {dimension.max}</small>
                    </div>
                    <div className="cabinet-result-scale">
                      <span>{locale === 'ru' ? 'Шкала' : 'Scale'} {dimension.min}–{dimension.max}</span>
                      <b>{locale === 'ru' ? 'Первый замер' : 'Baseline'}</b>
                    </div>
                  </section>
                ))}
              </div>
            </section>

            <div className="cabinet-result-actions-grid">
              <section className="cabinet-result-save-panel">
                <p className="about-kicker">{locale === 'ru' ? 'Сохранить динамику' : 'Keep your history'}</p>
                <h4>{locale === 'ru' ? 'Сохранить результат в кабинете' : 'Save this result to your Cabinet'}</h4>
                <p>{c.saveHint}</p>
                <button className="cabinet-save-result" type="button" onClick={saveToCabinet} disabled={busy}>
                  {c.save}
                </button>
              </section>

              <aside className="cabinet-result-consultation" aria-label={c.consultTitle}>
                <p className="about-kicker">{c.consultKicker}</p>
                <h4>{c.consultTitle}</h4>
                <p>{c.consultText}</p>
                <Link className="cabinet-result-consultation-action" href={`/${locale}/services`} prefetch={false}>
                  {c.consultAction}
                </Link>
              </aside>
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
            <section className="cabinet-result-section"><div className="cabinet-result-section-heading"><div><p className="about-kicker">{locale === 'ru' ? 'Пройдено' : 'Completed'}</p><h4>{planResults.length} {locale === 'ru' ? 'тестов' : 'tests'}</h4></div></div><div className="cabinet-test-list">{planResults.map((result) => <article className="cabinet-test-row" key={result.id}><span className="cabinet-test-row-copy"><strong>{definitionTitle(getAssessmentDefinition(result.definitionKey, result.definitionVersion, result.instrumentLocale), locale)}</strong><small>{result.dimensions.length} {locale === 'ru' ? 'показателей' : 'measurements'} · {new Date(result.measurementAt).toLocaleString(locale)}</small><button className="cabinet-save-result" type="button" disabled={busy} onClick={() => saveToCabinet(result)}>{c.save}</button></span></article>)}</div></section>
            <footer className="cabinet-result-footer"><p className="cabinet-test-note">{locale === 'ru' ? 'Каждый тест имеет отдельный результат. Вы можете по желанию сохранить конкретные результаты в личном кабинете через Google.' : 'Each test has a separate result. Choose which results to save to your private Cabinet with Google.'}</p><div className="cabinet-test-actions"><button className="cabinet-text-button" type="button" onClick={resetToCatalog}>{c.restart}</button></div></footer>
          </article>
        )}
        {error && phase !== 'catalog' && <p className="client-entry-error" role="alert">{error}</p>}
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
