'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { ClientCabinetEntry } from '@/components/client-cabinet-entry'
import { MoodCheckIn } from '@/components/app/mood-checkin'
import { PublicTestExplorer } from '@/components/app/public-test-explorer'
import { TestRating } from '@/components/app/test-rating'
import { PersonalResultReport } from '@/components/app/personal-result-report'
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
    tryText: 'Choose self-checks for stress, mood and resilience. View guidance now; save results if you want to track changes over time.',
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
  if (!item?.startable || item.guestEligible === false || PUBLIC_GUEST_BLOCKED_KEYS.has(item.key)) return null
  return getAssessmentDefinition(
    item.key,
    item.version,
    item.instrumentLocale === 'dynamic' ? locale : item.instrumentLocale,
  )
}

function publicRecommendationDefinitions(locale) {
  return MONITORING_CATALOG
    .filter((item) => item.startable && item.guestEligible !== false && !PUBLIC_GUEST_BLOCKED_KEYS.has(item.key))
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
            disabled={disabled} onClick={() => void onChoose(option.value)}>
            {words ? <><strong>{option.value}</strong><span>{option.label}</span></> : option.label}
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
  const answeredCount = definition ? definition.questions.filter(item => Object.prototype.hasOwnProperty.call(answers, item.id)).length : 0
  const allAnswered = definition ? answeredCount === definition.questions.length : false
  const quickMinutes = definition ? Math.max(1, Number(monitoringCatalogItem(definition.key)?.durationMinutes) || Math.ceil(definition.questions.length / 5)) : 1
  const guidedMinutes = Math.max(quickMinutes + 1, Math.ceil(quickMinutes * 1.4))
  const timeUnit = locale === 'ru' ? 'мин' : 'min'

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

  async function submitSavedRun(currentRun, destination = 'report') {
    const result = await guestFetch('guest/runs/' + currentRun.id + '/submit', {
      expectedRevision: currentRun.revision,
    })
    setGuestResult(result)
    let advanced = null
    if (activePlan?.status === 'active') {
      advanced = await guestFetch('guest/test-plans/' + activePlan.id + '/advance', {
        completedRunId: result.runId,
        expectedRevision: activePlan.revision,
      })
      setActivePlan(advanced)
      const bootstrap = await guestFetch('guest/bootstrap')
      const rows = (bootstrap.results || []).filter(item => advanced.completedRunIds?.includes(item.runId))
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
    return result
  }

  async function choose(value, targetQuestion = question) {
    if (!run || !targetQuestion || busy) return
    const nextAnswers = { ...answers, [targetQuestion.id]: value }
    const quick = mode === 'quick'
    const firstMissing = definition.questions.findIndex(item => !Object.prototype.hasOwnProperty.call(nextAnswers, item.id))
    const progress = quick ? (firstMissing < 0 ? definition.questions.length : firstMissing) : index
    setAnswers(nextAnswers)
    setBusy(true)
    setSaveState(c.saving)
    setError('')
    try {
      const saved = await guestFetch('guest/runs/' + run.id + '/save', {
        answers: { [targetQuestion.id]: value },
        context: run.context || {},
        progress,
        expectedRevision: run.revision,
        operationId: crypto.randomUUID(),
      })
      setRun(saved)
      setAnswers(saved.answers || nextAnswers)
      setSaveState(c.saved)
      // Quick remains on the full questionnaire; Guided advances with the Next action.
    } catch {
      setAnswers(run.answers || {})
      setError(c.error)
      setSaveState('')
    } finally {
      setBusy(false)
    }
  }

  async function submitResult(currentRun = run, destination = 'report') {
    if (!currentRun || busy) return
    setBusy(true)
    setError('')
    try {
      await submitSavedRun(currentRun, destination)
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

  async function saveContextAndFinish(destination = 'report') {
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
      await submitResult(saved, destination)
    } catch {
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
      {phase === 'catalog' && <PublicTestExplorer locale={locale} embedded />}
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
        {phase === 'questions' ? (
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

        {phase === 'questions' && definition && question && run && (
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

            {definition.instructions && <p className="cabinet-test-note" lang={definition.instrumentLocale}>{definition.instructions}</p>}
            {mode === 'quick' ? (
              <div className="cabinet-quick-form">
                {definition.questions.map((item, step) => (
                  <fieldset key={item.id} className="cabinet-quick-question" disabled={busy}>
                    <legend>
                      <span className="cabinet-question-number">{c.question} {step + 1} / {definition.questions.length}</span>
                      <h3>{item.text}</h3>
                    </legend>
                    {definition.key === 'mini-ipip-20' && step === 0 && <p className="cabinet-test-note">{c.traitNotice}</p>}
                    {definition.key === 'cdc-hrqol-4' && item.id === 'hrqol4.04' && answers['hrqol4.02'] === 0 && answers['hrqol4.03'] === 0 && (
                      <p className="cabinet-test-note">{locale === 'ru' ? 'По правилам CDC, если физически и психологически нездоровых дней не было, здесь выберите 0.' : 'CDC guidance: if physical and mental unhealthy days were both 0, select 0 here.'}</p>
                    )}
                    <GuestAnswerChoices definition={definition} question={item} selected={answers[item.id]}
                      onChoose={value => choose(value, item)} disabled={busy} locale={locale} />
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
                        <textarea value={context[key] || ''} maxLength={1000}
                          onChange={event => setContext(value => ({ ...value, [key]: event.target.value }))} />
                      </label>
                    ))}
                  </details>
                )}
              </div>
            ) : (
              <div className="cabinet-guided-question">
                <h3>{question.text}</h3>
                {definition.key === 'mini-ipip-20' && <p className="cabinet-test-note">{c.traitNotice}</p>}
                {definition.key === 'cdc-hrqol-4' && question.id === 'hrqol4.04' && answers['hrqol4.02'] === 0 && answers['hrqol4.03'] === 0 && (
                  <p className="cabinet-test-note">{locale === 'ru' ? 'По правилам CDC, если физически и психологически нездоровых дней не было, здесь выберите 0.' : 'CDC guidance: if physical and mental unhealthy days were both 0, select 0 here.'}</p>
                )}
                <GuestAnswerChoices definition={definition} question={question} selected={selected}
                  onChoose={value => choose(value)} disabled={busy} locale={locale} />
              </div>
            )}
            <p className="cabinet-test-note hh-runner-save-state" role="status" aria-live="polite">{saveState}</p>
            <div className="cabinet-test-actions">
              {mode === 'guided' && (
                <button type="button" disabled={busy || index === 0}
                  onClick={() => { setIndex(value => value - 1); setSaveState('') }}>
                  {c.back}
                </button>
              )}
              {mode === 'guided' &&
                (index !== definition.questions.length - 1 || definition.optionalContext?.length > 0) && (
                <button type="button" disabled={busy || selected === undefined} onClick={next}>
                  {c.next}
                </button>
              )}
            </div>
            {((mode === 'guided' && index === definition.questions.length - 1 && allAnswered && !definition.optionalContext?.length) ||
              (mode === 'quick' && allAnswered)) && (
              <TestFinishActions locale={locale} disabled={busy} temporary
                onReport={() => definition.optionalContext?.length ? saveContextAndFinish('report') : submitResult(run, 'report')}
                onNext={() => definition.optionalContext?.length ? saveContextAndFinish('next') : submitResult(run, 'next')} />
            )}
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
            </div>
            <TestFinishActions locale={locale} disabled={busy} temporary
              onReport={() => saveContextAndFinish('report')}
              onNext={() => saveContextAndFinish('next')} />
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

            <PersonalResultReport result={guestResult} locale={locale} />
            <TestRating result={guestResult} locale={locale} audience="guest" onSaveResult={saveToCabinet} disabled={busy} />
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
            <section className="cabinet-result-section"><div className="cabinet-result-section-heading"><div><p className="about-kicker">{locale === 'ru' ? 'Пройдено' : 'Completed'}</p><h4>{planResults.length} {locale === 'ru' ? 'тестов' : 'tests'}</h4></div></div><div className="cabinet-test-list">{planResults.map((result) => <article className="cabinet-test-row cabinet-battery-result-row" key={result.id}><span className="cabinet-test-row-copy"><strong>{definitionTitle(getAssessmentDefinition(result.definitionKey, result.definitionVersion, result.instrumentLocale), locale)}</strong><small>{result.dimensions.length} {locale === 'ru' ? 'показателей' : 'measurements'} · {new Date(result.measurementAt).toLocaleString(locale)}</small><button className="cabinet-save-result" type="button" disabled={busy} onClick={() => saveToCabinet(result)}>{c.save}</button></span></article>)}</div></section>
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
