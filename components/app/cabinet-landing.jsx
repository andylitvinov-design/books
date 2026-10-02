'use client'

import { useMemo, useState } from 'react'
import { ClientCabinetEntry } from '@/components/client-cabinet-entry'
import { CURRENT_STATE_EN_V1, CURRENT_STATE_RU_V1 } from '@/data/assessments/current-state-v1'
import { MINI_IPIP_20_EN_V1 } from '@/data/assessments/mini-ipip-20-en-v1'
import { scoreAssessment } from '@/lib/assessments/scoring'

export const GUEST_RESULT_STORAGE_KEY = 'hh-guest-result:v1'

const UI = {
  en: {
    kicker: 'Your space',
    title: 'Personal Cabinet',
    intro: 'Sign in with Google to keep your results, build your personal portrait and see changes over time.',
    google: 'Continue with Google',
    unavailable: 'Google sign-in is not connected in this environment yet.',
    private: 'Private by default. You choose what to save and what to share.',
    tryTitle: 'Try without signing in',
    tryText: 'You can complete either test now. Your result appears immediately and is not added to an account unless you choose to save it.',
    stateTitle: 'How I feel now',
    stateText: '5 short questions about resource, tension, fatigue and how much your current difficulty affects daily life.',
    traitTitle: 'Personality tendencies',
    traitText: '20-item Mini-IPIP self-report in the original English wording.',
    traitNotice: 'The personality questionnaire uses the English original. It is a brief self-report, not an IQ test or diagnosis.',
    start: 'Start test',
    back: 'Back',
    next: 'Next',
    finish: 'See my result',
    question: 'Question',
    of: 'of',
    result: 'Your result',
    save: 'Save to my Cabinet',
    savedHint: 'Google sign-in will open. After you create your Cabinet, this result will be added once to your history.',
    restart: 'Take another test',
    legacyTitle: 'Already have an old private cabinet link?',
    legacyText: 'Legacy links still work as a compatibility option.',
    nonDiagnostic: 'Self-observation only. These tests do not provide a medical diagnosis and are not an emergency channel.',
  },
  ru: {
    kicker: 'Ваше пространство',
    title: 'Личный кабинет',
    intro: 'Войдите через Google, чтобы сохранять результаты, собирать личный портрет и видеть изменения со временем.',
    google: 'Продолжить с Google',
    unavailable: 'В этом окружении вход через Google пока не подключён.',
    private: 'По умолчанию всё приватно. Вы сами выбираете, что сохранять и чем делиться.',
    tryTitle: 'Попробовать без входа',
    tryText: 'Оба теста можно пройти прямо сейчас. Результат появится сразу и не попадёт в аккаунт, пока вы сами не нажмёте «Сохранить».',
    stateTitle: 'Моё состояние сейчас',
    stateText: '5 коротких вопросов о ресурсе, напряжении, усталости и влиянии текущей трудности на жизнь.',
    traitTitle: 'Личностные особенности',
    traitText: '20 утверждений Mini-IPIP в исходной английской формулировке.',
    traitNotice: 'Личностный опрос использует английский оригинал. Это краткий самоотчёт, а не IQ-тест и не диагноз.',
    start: 'Начать тест',
    back: 'Назад',
    next: 'Далее',
    finish: 'Показать результат',
    question: 'Вопрос',
    of: 'из',
    result: 'Ваш результат',
    save: 'Сохранить в личном кабинете',
    savedHint: 'Откроется вход через Google. После создания кабинета этот результат один раз добавится в вашу историю.',
    restart: 'Пройти другой тест',
    legacyTitle: 'У вас уже есть старая приватная ссылка на кабинет?',
    legacyText: 'Старые приватные ссылки продолжают работать как совместимый способ доступа.',
    nonDiagnostic: 'Только самонаблюдение. Эти тесты не ставят медицинский диагноз и не являются каналом экстренной помощи.',
  },
}

function definitionFor(id, locale) {
  if (id === 'state') return locale === 'ru' ? CURRENT_STATE_RU_V1 : CURRENT_STATE_EN_V1
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

export function CabinetLanding({ locale = 'en', appAvailable = false }) {
  const c = UI[locale] || UI.en
  const [active, setActive] = useState(null)
  const [answers, setAnswers] = useState({})
  const [index, setIndex] = useState(0)
  const [guestResult, setGuestResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const definition = useMemo(() => (active ? definitionFor(active, locale) : null), [active, locale])
  const question = definition?.questions[index]
  const selected = question ? answers[question.id] : undefined

  function start(id) {
    try {
      sessionStorage.removeItem(GUEST_RESULT_STORAGE_KEY)
    } catch {
      /* Guest results are temporary and may be unavailable in restricted browsers. */
    }
    setActive(id)
    setAnswers({})
    setIndex(0)
    setGuestResult(null)
    setError('')
  }

  function finish() {
    const scored = scoreAssessment(definition, answers)
    const payload = {
      operationId: crypto.randomUUID(),
      definitionKey: definition.key,
      definitionVersion: definition.version,
      instrumentLocale: definition.instrumentLocale,
      answers,
      measurementAt: new Date().toISOString(),
    }
    try {
      sessionStorage.setItem(GUEST_RESULT_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      /* The result still works in memory; saving will surface the browser limitation. */
    }
    setGuestResult({ definition, scored, payload })
  }

  async function signIn(payload = null) {
    if (payload) {
      try {
        sessionStorage.setItem(GUEST_RESULT_STORAGE_KEY, JSON.stringify(payload))
      } catch {
        setError(
          locale === 'ru'
            ? 'Браузер не разрешил временно сохранить результат для переноса.'
            : 'The browser could not keep this result temporarily for transfer.',
        )
        return
      }
    }
    if (!appAvailable) {
      setError(c.unavailable)
      return
    }
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/app/auth/start', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok || !body.redirectUrl) throw new Error('SIGN_IN_UNAVAILABLE')
      window.location.assign(body.redirectUrl)
    } catch {
      setError(c.unavailable)
      setBusy(false)
    }
  }

  return (
    <>
      <section className="client-entry-card cabinet-google-card" aria-labelledby="cabinet-title">
        <p className="about-kicker">{c.kicker}</p>
        <h1 id="cabinet-title">{c.title}</h1>
        <p>{c.intro}</p>
        <button className="cabinet-google-button" type="button" onClick={() => signIn()} disabled={busy}>
          <span className="cabinet-google-mark" aria-hidden="true">G</span>
          {c.google}
        </button>
        <p className="cabinet-private-note">{c.private}</p>
        {error && <p className="client-entry-error" role="alert">{error}</p>}
      </section>

      <section className="client-entry-card cabinet-guest-tests" aria-labelledby="guest-tests-title">
        <p className="about-kicker">{c.tryTitle}</p>
        <h2 id="guest-tests-title">{c.tryTitle}</h2>
        <p>{c.tryText}</p>

        {!active && (
          <div className="cabinet-test-grid">
            <article className="cabinet-test-card">
              <h3>{c.stateTitle}</h3>
              <p>{c.stateText}</p>
              <button type="button" onClick={() => start('state')}>{c.start}</button>
            </article>
            <article className="cabinet-test-card">
              <h3>{c.traitTitle}</h3>
              <p>{c.traitText}</p>
              <p className="cabinet-test-note">{c.traitNotice}</p>
              <button type="button" onClick={() => start('trait')}>{c.start}</button>
            </article>
          </div>
        )}

        {active && !guestResult && definition && question && (
          <div className="cabinet-guest-runner">
            <p className="cabinet-test-progress">{c.question} {index + 1} {c.of} {definition.questions.length}</p>
            <progress max={definition.questions.length} value={index + 1} />
            <h3>{question.text}</h3>
            {definition.key === 'mini-ipip-20' && <p className="cabinet-test-note">{c.traitNotice}</p>}
            <div className={definition.key === 'mini-ipip-20' ? 'cabinet-answer-list' : 'cabinet-answer-scale'}>
              {answerLabels(definition, question).map((option) => (
                <button
                  type="button"
                  key={option.value}
                  aria-pressed={selected === option.value}
                  onClick={() => setAnswers((current) => ({ ...current, [question.id]: option.value }))}
                >
                  {definition.key === 'mini-ipip-20' ? <><strong>{option.value}</strong><span>{option.label}</span></> : option.label}
                </button>
              ))}
            </div>
            {definition.key !== 'mini-ipip-20' && (
              <div className="cabinet-answer-anchors"><span>{question.anchors[0]}</span><span>{question.anchors[1]}</span></div>
            )}
            <div className="cabinet-test-actions">
              <button type="button" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}>{c.back}</button>
              {index < definition.questions.length - 1 ? (
                <button type="button" disabled={selected === undefined} onClick={() => setIndex((value) => value + 1)}>{c.next}</button>
              ) : (
                <button type="button" disabled={selected === undefined} onClick={finish}>{c.finish}</button>
              )}
            </div>
          </div>
        )}

        {guestResult && (
          <div className="cabinet-guest-result">
            <p className="about-kicker">{c.result}</p>
            <h3>{guestResult.definition.title}</h3>
            <div className="cabinet-result-grid">
              {guestResult.scored.dimensions.map((dimension) => (
                <div key={dimension.key}>
                  <span>{resultLabel(guestResult.definition, dimension)}</span>
                  <strong>{dimension.value}</strong>
                  <small>{dimension.min}–{dimension.max}</small>
                </div>
              ))}
            </div>
            <button className="cabinet-save-result" type="button" onClick={() => signIn(guestResult.payload)} disabled={busy}>
              {c.save}
            </button>
            <p className="cabinet-test-note">{c.savedHint}</p>
            <button
              className="cabinet-text-button"
              type="button"
              onClick={() => {
                try {
                  sessionStorage.removeItem(GUEST_RESULT_STORAGE_KEY)
                } catch {
                  /* Best-effort cleanup for the temporary signed-out result. */
                }
                setActive(null)
                setGuestResult(null)
                setAnswers({})
                setIndex(0)
              }}
            >
              {c.restart}
            </button>
          </div>
        )}
        <p className="cabinet-test-note">{c.nonDiagnostic}</p>
      </section>

      <details className="client-entry-card cabinet-legacy-entry">
        <summary>{c.legacyTitle}</summary>
        <p>{c.legacyText}</p>
        <ClientCabinetEntry locale={locale} />
      </details>
    </>
  )
}
