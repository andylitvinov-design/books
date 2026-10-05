'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { ClientCabinetEntry } from '@/components/client-cabinet-entry'
import { MoodCheckIn } from '@/components/app/mood-checkin'
import { CURRENT_STATE_EN_V2, CURRENT_STATE_RU_V2 } from '@/data/assessments/current-state-v2'
import { MINI_IPIP_20_EN_V1 } from '@/data/assessments/mini-ipip-20-en-v1'
import { MONITOR_AREAS } from '@/data/assessments/mind-body-monitor-registry'

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
    areasTitle: 'What you can monitor',
    areasText: 'More areas appear only when a real questionnaire is ready and safe to use.',
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
    areasTitle: 'Что можно отслеживать',
    areasText: 'Новые области появляются только когда реальный опросник готов и безопасен для использования.',
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

function testArtwork(locale, id) {
  const suffix = locale === 'ru' ? 'ru-v1' : 'en-v2'
  return id === 'state'
    ? `/images/holistic-house/video-posters/home-${suffix}.webp`
    : `/images/holistic-house/video-posters/services-${suffix}.webp`
}

function definitionFor(id, locale) {
  if (id === 'state') return locale === 'ru' ? CURRENT_STATE_RU_V2 : CURRENT_STATE_EN_V2
  return MINI_IPIP_20_EN_V1
}

function answerLabels(definition, question) {
  if (definition.key === 'mini-ipip-20')
    return definition.responseAnchors.map((label, index) => ({ value: index + 1, label }))
  return Array.from({ length: question.max - question.min + 1 }, (_, index) => ({
    value: question.min + index,
    label: String(question.min + index),
  }))
}

function resultLabel(definition, dimension) {
  if (dimension.dimensionClass === 'trait') return dimension.sourceConstruct
  return definition.questions.find((item) => item.id === dimension.key)?.label || dimension.key
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
  const definition = useMemo(() => (active ? definitionFor(active, locale) : null), [active, locale])
  const question = definition?.questions[index]
  const selected = question ? answers[question.id] : undefined

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
        } else if (definition.key === 'hh-current-state') {
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
      } else if (definition.key === 'hh-current-state') {
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

            <div className="cabinet-monitor-areas" aria-labelledby="cabinet-monitor-areas-title">
              <div>
                <p className="cabinet-monitor-label" id="cabinet-monitor-areas-title">{c.areasTitle}</p>
                <p className="cabinet-test-note">{c.areasText}</p>
              </div>
              <div className="cabinet-monitor-area-list" aria-label={c.areasTitle}>
                {MONITOR_AREAS.slice(0, 8).map((area) => (
                  <span key={area.key}>{area[locale] || area.en}</span>
                ))}
              </div>
              <Link className="cabinet-monitor-wuxing" href={`/${locale}/wu-xing`}>
                {c.wuXing}<ChevronRight aria-hidden="true" />
              </Link>
            </div>
          </>
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
              <p className="cabinet-test-progress">{definition.key === 'hh-current-state' ? c.stateTitle : c.traitTitle}</p>
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
            <div className={definition.key === 'mini-ipip-20' ? 'cabinet-answer-list' : 'cabinet-answer-scale'}>
              {answerLabels(definition, question).map((option) => (
                <button
                  type="button"
                  key={option.value}
                  aria-pressed={selected === option.value}
                  disabled={busy}
                  onClick={() => choose(option.value)}
                >
                  {definition.key === 'mini-ipip-20'
                    ? <><strong>{option.value}</strong><span>{option.label}</span></>
                    : option.label}
                </button>
              ))}
            </div>
            {definition.key !== 'mini-ipip-20' && (
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
                  {index === definition.questions.length - 1 && definition.key !== 'hh-current-state'
                    ? c.finish
                    : c.next}
                </button>
              )}
            </div>
          </div>
        )}

        {phase === 'context' && definition?.key === 'hh-current-state' && (
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
          <div className="cabinet-guest-result">
            <p className="about-kicker">{c.result}</p>
            <h3>{definition.key === 'hh-current-state' ? c.stateTitle : c.traitTitle}</h3>
            <p>{c.measured}: {new Date(guestResult.measurementAt).toLocaleString(locale)}</p>
            <p className="cabinet-test-note">
              {c.source}: {guestResult.definitionKey} · {guestResult.instrumentLocale?.toUpperCase()} · {guestResult.definitionVersion}
            </p>
            <div className="cabinet-result-grid">
              {guestResult.dimensions.map((dimension) => (
                <div key={dimension.key}>
                  <span>{resultLabel(definition, dimension)}</span>
                  <strong>{dimension.value}</strong>
                  <small>{dimension.min}–{dimension.max}</small>
                </div>
              ))}
            </div>
            <button className="cabinet-save-result" type="button" onClick={saveToCabinet} disabled={busy}>
              {c.save}
            </button>
            <p className="cabinet-test-note">{c.saveHint}</p>
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
          </div>
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
