'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { ClientCabinetEntry } from '@/components/client-cabinet-entry'
import { MoodCheckIn } from '@/components/app/mood-checkin'
import { monitoringCatalogItem } from '@/data/assessments/catalog'
import { getAssessmentDefinition } from '@/lib/assessments/definitions'
import {
  TEST_RECOMMENDATION_FOCUS,
  rankAssessmentDefinitions,
} from '@/lib/assessments/test-recommendations'

const UI = {
  en: {
    kicker: 'Account',
    title: 'Your personal space',
    intro: 'Keep your results and history across devices.',
    google: 'Continue with Google',
    googleNote: 'Optional — the quick checks below work without signing in.',
    unavailable: 'This feature is temporarily unavailable. Your existing private Cabinet link still works below.',
    testsKicker: 'Mind–Body Monitor',
    tryTitle: 'Your Mind–Body Monitor',
    tryText: 'Start with one useful check-in. Save results only if you want to build a personal timeline over time.',
    recommended: 'Recommended now',
    otherChecks: 'Other self-checks',
    recommenderKicker: 'Personal test selection',
    recommenderTitle: 'Find the right set of tests for you',
    recommenderText: 'Choose what feels most relevant right now and how deep you want to go. We will rank the available tests by fit.',
    depth: 'Depth',
    quickDepth: 'Short',
    balancedDepth: 'Medium',
    deepDepth: 'Deeper',
    buildRecommendations: 'Find my tests',
    chooseFocus: 'Choose at least one area.',
    recommenderPrivacy: 'Your choices are used only for this recommendation and are not saved to your profile.',
    rankedTitle: 'Your recommended set',
    rankedText: 'Start with the first test, then continue only if the next one still feels useful.',
    priority: 'Priority',
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
    title: 'Ваше личное пространство',
    intro: 'Сохраняйте результаты и историю между устройствами.',
    google: 'Продолжить с Google',
    googleNote: 'Необязательно — быстрые тесты ниже работают без регистрации.',
    unavailable: 'Эта функция временно недоступна. Старая приватная ссылка на кабинет по-прежнему работает ниже.',
    testsKicker: 'Монитор состояния',
    tryTitle: 'Ваш монитор состояния',
    tryText: 'Начните с одной полезной проверки. Сохраняйте результаты только если хотите наблюдать личную динамику со временем.',
    recommended: 'Рекомендуем сейчас',
    otherChecks: 'Другие самопроверки',
    recommenderKicker: 'Индивидуальный подбор тестов',
    recommenderTitle: 'Подберите комплект тестов под ваш запрос',
    recommenderText: 'Отметьте, что сейчас беспокоит или важно, и выберите глубину. Мы расставим доступные тесты по весам и покажем наиболее подходящие.',
    depth: 'Глубина',
    quickDepth: 'Коротко',
    balancedDepth: 'Средне',
    deepDepth: 'Глубже',
    buildRecommendations: 'Подобрать тесты',
    chooseFocus: 'Отметьте хотя бы одну тему.',
    recommenderPrivacy: 'Выбранные темы используются только для расчёта рекомендаций и не сохраняются в профиле.',
    rankedTitle: 'Подходящий набор',
    rankedText: 'Начните с первого теста. Остальные можно пройти позже, только если они остаются полезными.',
    priority: 'Приоритет',
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

const PUBLIC_RECOMMENDATION_KEYS = Object.freeze([
  'hh-current-state',
  'hh-weekly-pulse',
  'mini-ipip-20',
  'phq-4',
  'k6',
  'gad-7',
  'hh-resource-pulse',
  'hh-monthly-profile',
])

function catalogKey(id) {
  if (id === 'state') return 'hh-current-state'
  if (id === 'trait') return 'mini-ipip-20'
  return id
}

function definitionFor(id, locale) {
  const key = catalogKey(id)
  const item = monitoringCatalogItem(key)
  if (!item?.startable || !PUBLIC_RECOMMENDATION_KEYS.includes(key)) return null
  return getAssessmentDefinition(
    key,
    item.version,
    item.instrumentLocale === 'dynamic' ? locale : item.instrumentLocale,
  )
}

function guestRecommendationDefinitions(locale) {
  return PUBLIC_RECOMMENDATION_KEYS.map((key) => definitionFor(key, locale)).filter(Boolean)
}

function definitionTitle(definition, locale) {
  const item = monitoringCatalogItem(definition.key)
  return item?.title?.[locale] || item?.title?.en || definition.title
}

function testArtwork(locale, id) {
  const suffix = locale === 'ru' ? 'ru-v1' : 'en-v2'
  const item = monitoringCatalogItem(catalogKey(id))
  return item?.axis === 'baseline'
    ? `/images/holistic-house/video-posters/services-${suffix}.webp`
    : `/images/holistic-house/video-posters/home-${suffix}.webp`
}

function answerLabels(definition, question) {
  const min = question.min ?? definition.answerScale?.min
  const max = question.max ?? definition.answerScale?.max
  if (Array.isArray(definition.responseAnchors) && definition.responseAnchors.length)
    return definition.responseAnchors.map((label, index) => ({ value: min + index, label }))
  return Array.from({ length: max - min + 1 }, (_, index) => ({
    value: min + index,
    label: String(min + index),
  }))
}

function resultLabel(definition, dimension) {
  const question = definition.questions.find((item) => item.id === dimension.key)
  return dimension.sourceConstruct || question?.label || question?.text || dimension.key
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
  const [active, setActive] = useState(null)
  const [run, setRun] = useState(null)
  const [answers, setAnswers] = useState({})
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState('catalog')
  const [mode, setMode] = useState(null)
  const [context, setContext] = useState({ current_focus: '', trigger: '', what_helps: '', desired_change: '', note: '' })
  const [guestResult, setGuestResult] = useState(null)
  const [sessionExpires, setSessionExpires] = useState(null)
  const [pendingMood, setPendingMood] = useState(null)
  const [latestGuestMood, setLatestGuestMood] = useState(null)
  const [adult, setAdult] = useState(false)
  const [necessary, setNecessary] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saveState, setSaveState] = useState('')
  const [error, setError] = useState('')
  const [selectedFocus, setSelectedFocus] = useState([])
  const [depth, setDepth] = useState('balanced')
  const [personalized, setPersonalized] = useState(null)
  const definition = useMemo(() => (active ? definitionFor(active, locale) : null), [active, locale])
  const recommendationDefinitions = useMemo(() => guestRecommendationDefinitions(locale), [locale])
  const question = definition?.questions[index]
  const selected = question ? answers[question.id] : undefined
  const responseLabels = Boolean(definition?.responseAnchors?.length)

  useEffect(() => {
    let live = true
    guestFetch('guest/bootstrap')
      .then((bootstrap) => {
        if (!live) return
        setSessionExpires(bootstrap.expiresAt)
        setLatestGuestMood(bootstrap.moodCheckins?.[0] || null)
        // Keep the external Cabinet on the test catalog even when a guest run exists.
        // A saved draft resumes only after the visitor explicitly chooses that test card.
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [locale])

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

  function toggleFocus(key) {
    setSelectedFocus((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    )
    setPersonalized(null)
  }

  function buildRecommendations() {
    if (!selectedFocus.length) return
    setPersonalized(
      rankAssessmentDefinitions(recommendationDefinitions, {
        focus: selectedFocus,
        depth,
      }).slice(0, 3),
    )
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
    setPhase('result')
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
        } else if (definition.optionalContext?.length) {
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
      } else if (definition.optionalContext?.length) {
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

  async function saveToCabinet() {
    if (!guestResult || busy) return
    setBusy(true)
    setError('')
    try {
      const intent = await guestFetch('save-intents', {
        sourceKind: 'guest_result',
        sourceId: guestResult.id,
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
    setSaveState('')
    setError('')
  }

  return (
    <>
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

      <section className="cabinet-guest-tests" id="cabinet-tests" aria-labelledby="guest-tests-title">
        <header className="library-heading cabinet-tests-heading">
          <p className="about-kicker">{c.testsKicker}</p>
          <h2 id="guest-tests-title">{c.tryTitle}</h2>
          <p>{c.tryText}</p>
        </header>

        {phase === 'catalog' && (
          <>
            <div className="cabinet-monitor-recommended">
              <p className="cabinet-monitor-label">{c.recommended}</p>
              <button className="cabinet-test-row cabinet-test-row--recommended" type="button" aria-label={`${c.start}: ${c.stateTitle}`} disabled={busy} onClick={() => begin('state')}>
                <span className="cabinet-test-image" aria-hidden="true">
                  <Image alt="" fill sizes="(max-width: 600px) 72px, 128px" src={testArtwork(locale, 'state')} />
                </span>
                <span className="cabinet-test-row-copy">
                  <strong>{c.stateTitle}</strong>
                  <small>{c.stateText}</small>
                </span>
                <ChevronRight className="cabinet-test-chevron" aria-hidden="true" />
              </button>
            </div>

            <div className="cabinet-test-list" aria-label={c.otherChecks}>
              <p className="cabinet-monitor-label">{c.otherChecks}</p>
              <button className="cabinet-test-row" type="button" aria-label={`${c.start}: ${c.traitTitle}`} disabled={busy} onClick={() => begin('trait')}>
                <span className="cabinet-test-image" aria-hidden="true">
                  <Image alt="" fill sizes="(max-width: 600px) 72px, 128px" src={testArtwork(locale, 'trait')} />
                </span>
                <span className="cabinet-test-row-copy">
                  <strong>{c.traitTitle}</strong>
                  <small>{c.traitText}</small>
                </span>
                <ChevronRight className="cabinet-test-chevron" aria-hidden="true" />
              </button>
            </div>

            <section className="cabinet-monitor-areas cabinet-public-recommender" aria-labelledby="cabinet-public-recommender-title">
              <div>
                <p className="cabinet-monitor-label">{c.recommenderKicker}</p>
                <h3 id="cabinet-public-recommender-title">{c.recommenderTitle}</h3>
                <p className="cabinet-test-note">{c.recommenderText}</p>
              </div>

              <div className="hh-test-focus-grid cabinet-public-focus-grid">
                {TEST_RECOMMENDATION_FOCUS.map((item) => (
                  <button
                    type="button"
                    key={item.key}
                    aria-pressed={selectedFocus.includes(item.key)}
                    onClick={() => toggleFocus(item.key)}
                  >
                    {item.label[locale] || item.label.en}
                  </button>
                ))}
              </div>

              <fieldset className="hh-test-depth cabinet-public-depth">
                <legend>{c.depth}</legend>
                {[
                  ['quick', c.quickDepth],
                  ['balanced', c.balancedDepth],
                  ['deep', c.deepDepth],
                ].map(([key, label]) => (
                  <button
                    type="button"
                    key={key}
                    aria-pressed={depth === key}
                    onClick={() => {
                      setDepth(key)
                      setPersonalized(null)
                    }}
                  >
                    {label}
                  </button>
                ))}
              </fieldset>

              <div className="hh-test-recommender-footer cabinet-public-recommender-footer">
                <button
                  className="hh-primary"
                  type="button"
                  disabled={!selectedFocus.length}
                  onClick={buildRecommendations}
                >
                  {c.buildRecommendations}
                </button>
                {!selectedFocus.length && <span>{c.chooseFocus}</span>}
                <small>{c.recommenderPrivacy}</small>
              </div>

              {personalized && (
                <div className="cabinet-public-ranked" aria-live="polite">
                  <div className="cabinet-public-ranked-heading">
                    <p className="cabinet-monitor-label">{c.rankedTitle}</p>
                    <p className="cabinet-test-note">{c.rankedText}</p>
                  </div>
                  {personalized.map((entry, index) => {
                    const def = entry.definition
                    const item = monitoringCatalogItem(def.key)
                    const title = definitionTitle(def, locale)
                    const meta = `${c.priority} ${index + 1} · ${item?.questionCount || def.questions.length} ${locale === 'ru' ? 'вопросов' : 'questions'} · ~${item?.durationMinutes || 2} ${locale === 'ru' ? 'мин' : 'min'}${def.instrumentLocale !== locale ? ` · ${def.instrumentLocale.toUpperCase()}` : ''}`
                    return (
                      <button
                        className="cabinet-test-row cabinet-public-ranked-row"
                        type="button"
                        key={def.id}
                        aria-label={`${c.start}: ${title}`}
                        disabled={busy}
                        onClick={() => begin(def.key)}
                      >
                        <span className="cabinet-test-image" aria-hidden="true">
                          <Image alt="" fill sizes="(max-width: 600px) 72px, 128px" src={testArtwork(locale, def.key)} />
                        </span>
                        <span className="cabinet-test-row-copy">
                          <small className="cabinet-public-rank-meta">{meta}</small>
                          <strong>{title}</strong>
                          <small>{item?.description?.[locale] || item?.description?.en}</small>
                        </span>
                        <ChevronRight className="cabinet-test-chevron" aria-hidden="true" />
                      </button>
                    )
                  })}
                </div>
              )}

              <Link className="cabinet-monitor-wuxing" href={`/${locale}/wu-xing`}>
                {c.wuXing}<ChevronRight aria-hidden="true" />
              </Link>
            </section>
          </>
        )}

        {phase === 'consent' && (
          <div className="cabinet-guest-runner">
            <h3>{c.consentTitle}</h3>
            <p>{c.consentText}</p>
            {definition?.instrumentLocale !== locale && (
              <p className="cabinet-test-note">
                {locale === 'ru'
                  ? 'Этот опросник сейчас доступен в английском оригинале.'
                  : 'This questionnaire is currently available in its English source version.'}
              </p>
            )}
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
            {definition.instrumentLocale !== locale && definition.key !== 'mini-ipip-20' && (
              <p className="cabinet-test-note">
                {locale === 'ru'
                  ? 'Вопросы этого теста представлены на английском.'
                  : 'This test uses the English source wording.'}
              </p>
            )}
            {definition.key === 'mini-ipip-20' && <p className="cabinet-test-note">{c.traitNotice}</p>}
            <div className={responseLabels ? 'cabinet-answer-list' : 'cabinet-answer-scale'}>
              {answerLabels(definition, question).map((option) => (
                <button
                  type="button"
                  key={option.value}
                  aria-pressed={selected === option.value}
                  disabled={busy}
                  onClick={() => choose(option.value)}
                >
                  {responseLabels
                    ? <><strong>{option.value}</strong><span>{option.label}</span></>
                    : option.label}
                </button>
              ))}
            </div>
            {!responseLabels && question.anchors?.length === 2 && (
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

        {phase === 'context' && Boolean(definition?.optionalContext?.length) && (
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
                    ? 'Ваш личный замер состояния — спокойно, без ярлыков и автоматических выводов.'
                    : 'Your personal measurement — calm, private and without automatic labels.'}
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
        {error && phase !== 'catalog' && <p className="client-entry-error" role="alert">{error}</p>}
        <p className="cabinet-test-note">{c.nonDiagnostic}</p>
      </section>

      <section className="cabinet-signin-strip" aria-labelledby="cabinet-title">
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
