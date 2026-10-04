'use client'

import { useEffect, useMemo, useState } from 'react'
import { ClientCabinetEntry } from '@/components/client-cabinet-entry'
import { MoodCheckIn } from '@/components/app/mood-checkin'
import { CURRENT_STATE_EN_V2, CURRENT_STATE_RU_V2 } from '@/data/assessments/current-state-v2'
import { MINI_IPIP_20_EN_V1 } from '@/data/assessments/mini-ipip-20-en-v1'

const UI = {
  en: {
    kicker: 'Your space',
    title: 'Your personal space',
    intro: 'Notice how you feel, keep your results and see what changes over time.',
    google: 'Continue with Google',
    googleNote: 'An account keeps your results across devices. You can try the tests below without signing in.',
    unavailable: 'This feature is temporarily unavailable. Your existing private Cabinet link still works below.',
    testsKicker: 'Tests',
    tryTitle: 'Try without signing in',
    tryText: 'Complete either test and see the full result before deciding whether to create an account.',
    stateTitle: 'How I feel now',
    stateText: '5 short questions about resource, tension, fatigue and how much your current difficulty affects daily life.',
    traitTitle: 'Personality tendencies',
    traitText: '20-item Mini-IPIP self-report in the original English wording.',
    traitNotice: 'This questionnaire uses the English original. It is a brief self-report, not an IQ test or diagnosis.',
    start: 'Start test',
    consentTitle: 'Before you start',
    consentText: 'Your answers will be stored temporarily so this browser can resume the test. No name or email is required.',
    adult: 'I am 18 or older.',
    necessary: 'I agree to temporary private processing of my answers and result for this self-observation test.',
    continue: 'Continue',
    back: 'Back',
    next: 'Next',
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
    kicker: 'Ваше пространство',
    title: 'Ваше личное пространство',
    intro: 'Замечайте своё состояние, сохраняйте результаты и наблюдайте изменения со временем.',
    google: 'Продолжить с Google',
    googleNote: 'Аккаунт сохраняет результаты между устройствами. Тесты ниже можно попробовать без регистрации.',
    unavailable: 'Эта функция временно недоступна. Старая приватная ссылка на кабинет по-прежнему работает ниже.',
    testsKicker: 'Тесты',
    tryTitle: 'Пройти без регистрации',
    tryText: 'Пройдите любой тест и получите полный результат до решения о создании аккаунта.',
    stateTitle: 'Моё состояние сейчас',
    stateText: '5 коротких вопросов о ресурсе, напряжении, усталости и влиянии текущей трудности на жизнь.',
    traitTitle: 'Личностные особенности',
    traitText: '20 утверждений Mini-IPIP в исходной английской формулировке.',
    traitNotice: 'Опрос использует английский оригинал. Это краткий самоотчёт, а не IQ-тест и не диагноз.',
    start: 'Начать тест',
    consentTitle: 'Перед началом',
    consentText: 'Ответы временно сохраняются, чтобы этот браузер мог продолжить тест. Имя и email не нужны.',
    adult: 'Мне 18 лет или больше.',
    necessary: 'Я согласен на временную приватную обработку ответов и результата для этого теста самонаблюдения.',
    continue: 'Продолжить',
    back: 'Назад',
    next: 'Далее',
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
  const [context, setContext] = useState({ current_focus: '', trigger: '', what_helps: '', desired_change: '', note: '' })
  const [guestResult, setGuestResult] = useState(null)
  const [sessionExpires, setSessionExpires] = useState(null)
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
        const existing = bootstrap.runs.at(-1)
        if (!existing) return
        const id = existing.definitionKey === 'hh-current-state' ? 'state' : 'trait'
        const def = definitionFor(id, locale)
        if (existing.definitionId !== def.id) return
        setActive(id)
        setRun(existing)
        setAnswers(existing.answers || {})
        setContext(existing.context || { current_focus: '', trigger: '', what_helps: '', desired_change: '', note: '' })
        setIndex(
          Math.min(
            Math.max(0, Number(existing.progress || 0)),
            Math.max(0, def.questions.length - 1),
          ),
        )
        setPhase('questions')
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
    setPhase('questions')
  }

  async function begin(id) {
    const def = definitionFor(id, locale)
    setActive(id)
    setGuestResult(null)
    setError('')
    setSaveState('')
    setBusy(true)
    try {
      const bootstrap = await guestFetch('guest/bootstrap')
      setSessionExpires(bootstrap.expiresAt)
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
        setPhase('questions')
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
      await startRun(definition)
    } catch {
      setError(c.error)
    } finally {
      setBusy(false)
    }
  }

  async function choose(value) {
    if (!run || !question || busy) return
    const nextAnswers = { ...answers, [question.id]: value }
    setAnswers(nextAnswers)
    setBusy(true)
    setSaveState(c.saving)
    setError('')
    try {
      const saved = await guestFetch('guest/runs/' + run.id + '/save', {
        answers: { [question.id]: value },
        context: run.context || {},
        progress: Math.min(index + 1, definition.questions.length),
        expectedRevision: run.revision,
        operationId: crypto.randomUUID(),
      })
      setRun(saved)
      setAnswers(saved.answers || nextAnswers)
      setSaveState(c.saved)
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
      const result = await guestFetch('guest/runs/' + currentRun.id + '/submit', {
        expectedRevision: currentRun.revision,
      })
      setGuestResult(result)
      setPhase('result')
    } catch {
      setError(c.error)
    } finally {
      setBusy(false)
    }
  }

  async function next() {
    if (selected === undefined || busy) return
    if (index < definition.questions.length - 1) {
      setIndex((value) => value + 1)
      setSaveState('')
      return
    }
    if (definition.key === 'hh-current-state') {
      setPhase('context')
      setSaveState('')
      return
    }
    await submitResult()
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
    setPhase('catalog')
    setContext({ current_focus: '', trigger: '', what_helps: '', desired_change: '', note: '' })
    setGuestResult(null)
    setSaveState('')
    setError('')
  }

  return (
    <>
      <MoodCheckIn locale={locale} onQuickCheckin={() => begin('state')} disabled={busy} />

      <section className="cabinet-account-row" aria-labelledby="cabinet-title">
        <div className="cabinet-account-copy">
          <p className="about-kicker">{c.kicker}</p>
          <h2 id="cabinet-title">{c.title}</h2>
          <p>{c.intro}</p>
          <small>{c.googleNote}</small>
        </div>
        <button className="cabinet-google-button cabinet-google-row-action" type="button" onClick={() => signIn()} disabled={busy}>
          <span>{c.google}</span>
          <span aria-hidden="true">›</span>
        </button>
        {error && phase === 'catalog' && <p className="client-entry-error cabinet-account-error" role="alert">{error}</p>}
      </section>

      <section className="cabinet-guest-tests" id="cabinet-tests" aria-labelledby="guest-tests-title">
        <header className="library-heading cabinet-tests-heading">
          <p className="about-kicker">{c.testsKicker}</p>
          <h2 id="guest-tests-title">{c.tryTitle}</h2>
          <p>{c.tryText}</p>
        </header>

        {phase === 'catalog' && (
          <div className="cabinet-test-list" aria-label={c.tryTitle}>
            <button className="cabinet-test-row" type="button" disabled={busy} onClick={() => begin('state')}>
              <span className="cabinet-test-count" aria-hidden="true">5</span>
              <span className="cabinet-test-row-copy">
                <strong>{c.stateTitle}</strong>
                <small>{c.stateText}</small>
              </span>
              <span className="cabinet-test-arrow" aria-hidden="true">›</span>
            </button>
            <button className="cabinet-test-row" type="button" disabled={busy} onClick={() => begin('trait')}>
              <span className="cabinet-test-count" aria-hidden="true">20</span>
              <span className="cabinet-test-row-copy">
                <strong>{c.traitTitle}</strong>
                <small>{c.traitText}</small>
              </span>
              <span className="cabinet-test-arrow" aria-hidden="true">›</span>
            </button>
          </div>
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

        {phase === 'questions' && definition && question && run && (
          <div className="cabinet-guest-runner">
            <p className="cabinet-test-progress">
              {c.question} {index + 1} {c.of} {definition.questions.length}
            </p>
            <progress max={definition.questions.length} value={index + 1} />
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
            <p className="cabinet-test-note" role="status">{saveState}</p>
            <div className="cabinet-test-actions">
              <button
                type="button"
                disabled={busy || index === 0}
                onClick={() => { setIndex((value) => value - 1); setSaveState('') }}
              >
                {c.back}
              </button>
              <button type="button" disabled={busy || selected === undefined} onClick={next}>
                {index === definition.questions.length - 1 && definition.key !== 'hh-current-state'
                  ? c.finish
                  : c.next}
              </button>
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
