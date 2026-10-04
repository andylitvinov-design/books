'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { COPY, labelFor, explanationFor } from './copy'
import { getAssessmentDefinition, getDefinitionById } from '@/lib/assessments/definitions'
import { compareResults, seriesFor, chronological } from '@/lib/profile/history'
import { APP_SERVICES } from '@/data/app-services'
import { AssessmentReading } from '@/components/assessment-reading'
import { MoodCheckIn } from '@/components/app/mood-checkin'
import { formatReportDate, getPortraitNextStep, latestCompatibleChange, reportTimeline } from '@/lib/app/cabinet-ux'

export async function appFetch(path, body, method) {
  const response = await fetch(`/api/app/${path}`, {
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
function message(error, c) {
  return error?.code === 'REVISION_CONFLICT' || error?.code === 'CONFLICT'
    ? c.conflict
    : error?.code === 'RECENT_SIGN_IN_REQUIRED'
      ? c.reauth
      : error?.code === 'NOT_FOUND'
        ? c.notFound
        : c.error
}
function dateLabel(value, locale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  )
}
function localZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}
function goSignedOut(setData) {
  setData(null)
  try {
    const channel = new BroadcastChannel('hh-app-session')
    channel.postMessage('signed-out')
    channel.close()
  } catch {
    /* No persistent browser fallback. */
  }
}
export default function AppWorkspace({ locale, path = [] }) {
  const c = COPY[locale],
    router = useRouter(),
    [data, setData] = useState(null),
    [state, setState] = useState('loading'),
    [error, setError] = useState(null)
  const [busy, setBusy] = useState(false),
    [deleted, setDeleted] = useState(false)
  const page = path[0] || 'portrait',
    recordId = path[1],
    root = `/${locale}/app`
  const load = useCallback(async () => {
    setError(null)
    try {
      const fresh = await appFetch('bootstrap')
      setData(fresh)
      setState('ready')
    } catch (e) {
      setData(null)
      setError(e)
      setState(
        e.status === 401
          ? 'signed-out'
          : e.code === 'DELETION_REQUESTED'
            ? 'deletion'
            : e.code === 'APP_UNAVAILABLE'
              ? 'unavailable'
              : 'error',
      )
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])
  useEffect(() => {
    let channel
    try {
      channel = new BroadcastChannel('hh-app-session')
      channel.onmessage = (e) => {
        if (e.data === 'signed-out') {
          setData(null)
          setState('signed-out')
          router.refresh()
        }
      }
    } catch {
      /* No browser storage fallback. */
    }
    const restore = (e) => {
        if (e.persisted) {
          setData(null)
          setState('loading')
          load()
        }
      },
      hide = () => {
        setData(null)
        setState('loading')
      }
    window.addEventListener('pageshow', restore)
    window.addEventListener('pagehide', hide)
    return () => {
      channel?.close()
      window.removeEventListener('pageshow', restore)
      window.removeEventListener('pagehide', hide)
    }
  }, [load, router])
  async function signin() {
    setBusy(true)
    setError(null)
    try {
      const result = await appFetch('auth/start', { locale })
      window.location.assign(result.redirectUrl)
    } catch (e) {
      setError(e)
      setBusy(false)
    }
  }
  async function logout(allDevices = false) {
    setBusy(true)
    try {
      await appFetch('auth/logout', { allDevices })
    } catch (e) {
      setError(e)
    } finally {
      goSignedOut(setData)
      setState('signed-out')
      setBusy(false)
      router.replace(root)
    }
  }
  if (deleted || state === 'deletion')
    return (
      <main className="hh-app">
        <section className="hh-panel">
          <p className="hh-kicker">Holistic House</p>
          <h1>{c.deletion}</h1>
          <p role="status">{c.deletionReceived}</p>
          <a href={`/${locale}/client`}>{c.legacy}</a>
        </section>
      </main>
    )
  if (state === 'loading')
    return (
      <main className="hh-app" aria-busy="true">
        <p className="hh-kicker">Holistic House</p>
        <h1>{c.loading}</h1>
      </main>
    )
  if (state !== 'ready')
    return (
      <main className="hh-app">
        <section className="hh-entry hh-panel">
          <p className="hh-kicker">Holistic House · {c.portrait}</p>
          <h1>{state === 'unavailable' ? c.unavailable : c.welcome}</h1>
          <p>{state === 'unavailable' ? c.unavailableText : c.intro}</p>
          <p className="hh-muted">{c.private}</p>
          {state !== 'unavailable' && (
            <button className="hh-primary" onClick={signin} disabled={busy}>
              {c.signin}
            </button>
          )}
          {state === 'error' && <button onClick={load}>{c.retry}</button>}
          {error && state !== 'signed-out' && state !== 'unavailable' && (
            <p role="alert">{message(error, c)}</p>
          )}
          <a className="hh-text-link" href={`/${locale}/client`}>
            {c.legacy}
          </a>
          <p className="hh-fine">{c.nonDiagnostic}</p>
        </section>
      </main>
    )
  const nav = [
    ['portrait', c.portrait, ''],
    ['tests', c.tests, '/tests'],
    ['history', c.history, '/history'],
    ['consultations', c.consultations, '/consultations'],
  ]
  return (
    <main className="hh-app">
      <header className="hh-header">
        <Link href={root} prefetch={false} className="hh-brand">
          Holistic House<span>{c.portrait}</span>
        </Link>
        <details className="hh-account-menu">
          <summary>{data.account.displayName || c.account}</summary>
          <div>
            <Link href={`${root}/settings`} prefetch={false}>
              {c.settings}
            </Link>
            <Link
              href={`/${locale === 'en' ? 'ru' : 'en'}/app${page === 'portrait' ? '' : `/${page}`}${recordId ? `/${recordId}` : ''}`}
              prefetch={false}
            >
              {locale === 'en' ? 'Русский' : 'English'}
            </Link>
            <button onClick={() => logout()} disabled={busy}>
              {c.signout}
            </button>
          </div>
        </details>
      </header>
      {page !== 'runs' && (
        <nav className="hh-nav" aria-label={c.account}>
          {nav.map(([id, label, url]) => (
            <Link
              key={id}
              href={root + url}
              prefetch={false}
              aria-current={page === id ? 'page' : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
      {data.account.onboardingState !== 'active' ? (
        <Preferences data={data} locale={locale} onboarding onDone={load} />
      ) : (
        <>
          {page === 'continue' && (
            <SaveContinuation data={data} locale={locale} reload={load} />
          )}
          {page === 'portrait' && (
            <Portrait
              data={data}
              locale={locale}
              onOpenHistory={() => router.push(root + '/history')}
            />
          )}
          {page === 'tests' && (
            <TestCatalog
              data={data}
              locale={locale}
              onStarted={(run) => router.push(`${root}/runs/${run.id}`)}
            />
          )}
          {page === 'runs' && (
            <Runner
              key={recordId}
              id={recordId}
              locale={locale}
              onExit={async () => {
                await load()
                router.push(root + '/tests')
              }}
              onComplete={async (result) => {
                await load()
                router.push(root + '/results/' + result.id)
              }}
            />
          )}
          {page === 'results' && (
            <ResultPage key={recordId} id={recordId} locale={locale} data={data} />
          )}
          {page === 'reports' && (
            recordId ? (
              <SavedReportPage key={recordId} id={recordId} locale={locale} reload={load} />
            ) : (
              <ReportsIndex data={data} locale={locale} />
            )
          )}
          {page === 'history' && <HistoryView data={data} locale={locale} reload={load} />}
          {page === 'consultations' && <Consultations data={data} locale={locale} reload={load} />}
          {page === 'settings' && (
            <>
              <Preferences data={data} locale={locale} onDone={load} />
              <Privacy
                locale={locale}
                logout={logout}
                onDeleted={() => {
                  goSignedOut(setData)
                  setDeleted(true)
                }}
              />
            </>
          )}
        </>
      )}
      <footer className="hh-footer">
        <p>{c.nonDiagnostic}</p>
        <a href={`/${locale}/client`}>{c.legacy}</a>
      </footer>
    </main>
  )
}

function SaveContinuation({ data, locale, reload }) {
  const params = useSearchParams()
  const router = useRouter()
  const intentId = params.get('intent') || ''
  const [intent, setIntent] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const ru = locale === 'ru'

  useEffect(() => {
    let live = true
    if (!intentId) {
      setError(ru ? 'Не найден результат для сохранения.' : 'No result was selected for saving.')
      return
    }
    appFetch('save-intents/' + intentId)
      .then((value) => {
        if (!live) return
        setIntent(value)
        if (value.expired)
          setError(ru ? 'Время подтверждения истекло. Вернитесь к результату и нажмите «Сохранить» ещё раз.' : 'This confirmation expired. Return to the result and choose Save again.')
      })
      .catch(() => {
        if (live) setError(ru ? 'Не удалось открыть подтверждение сохранения.' : 'This save confirmation is unavailable.')
      })
    return () => {
      live = false
    }
  }, [intentId, ru])

  async function commit() {
    if (!intentId || busy) return
    setBusy(true)
    setError('')
    try {
      const saved = await appFetch('save-intents/' + intentId + '/commit', { confirmed: true })
      await reload()
      router.replace(
        saved.sourceKind === 'delivered_report'
          ? `/${locale}/app/reports/${saved.resource.id}`
          : `/${locale}/app/results/${saved.resource.id}`,
      )
    } catch (e) {
      setError(
        e?.code === 'SAVE_INTENT_EXPIRED'
          ? ru
            ? 'Время подтверждения истекло. Вернитесь к исходному результату и повторите сохранение.'
            : 'This confirmation expired. Return to the original result and save again.'
          : ru
            ? 'Не удалось сохранить результат. Исходный гостевой результат не удалён.'
            : 'The result could not be saved. Your guest result has not been deleted.',
      )
    } finally {
      setBusy(false)
    }
  }

  const sourceTitle =
    intent?.sourceKind === 'delivered_report'
      ? ru
        ? 'Полученный отчёт'
        : 'Received report'
      : intent?.source?.definitionKey === 'hh-current-state'
        ? ru
          ? 'Моё состояние сейчас'
          : 'How I feel now'
        : ru
          ? 'Личностные особенности'
          : 'Personality tendencies'
  return (
    <section className="hh-panel hh-entry">
      <p className="hh-kicker">{ru ? 'Подтверждение' : 'Confirmation'}</p>
      <h1>{ru ? 'Сохранить в личном кабинете' : 'Save to your Cabinet'}</h1>
      {intent && !intent.expired && (
        <>
          <p><strong>{sourceTitle}</strong></p>
          {intent?.source?.title && <p>{ru ? 'Название отчёта' : 'Report title'}: <strong>{intent.source.title}</strong></p>}
          {intent?.source?.occurredOn && <p>{ru ? 'Дата отчёта' : 'Report date'}: {formatReportDate(intent.source.occurredOn, locale)}</p>}
          {intent.source?.measurementAt && (
            <p>{ru ? 'Пройдено' : 'Measured'}: {dateLabel(intent.source.measurementAt, locale)}</p>
          )}
          <p>
            {ru ? 'Получающий Google-аккаунт' : 'Receiving Google Account'}: {data.email || data.account.displayName || (ru ? 'текущий Google-аккаунт' : 'current Google account')}
          </p>
          <p className="hh-muted">
            {ru
              ? 'Будет сохранён только этот выбранный отчёт. Другие гостевые данные и старый Client Cabinet не импортируются.'
              : 'Only this report will be saved. Other guest data and the legacy Client Cabinet are not imported.'}
          </p>
          {intent.status === 'committed' && intent.resourceId ? (
            <Link className="hh-primary" href={`/${locale}/app/results/${intent.resourceId}`} prefetch={false}>
              {ru ? 'Открыть сохранённый результат' : 'Open saved result'}
            </Link>
          ) : (
            <button className="hh-primary" type="button" disabled={busy} onClick={commit}>
              {busy ? (ru ? 'Сохраняем…' : 'Saving…') : (ru ? 'Сохранить' : 'Save')}
            </button>
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <p className="hh-fine">
        {ru
          ? 'Если вы выбрали не тот Google-аккаунт, вернитесь к исходному результату и начните сохранение заново.'
          : 'If this is not the Google account you intended, return to the original result and start Save again.'}
      </p>
    </section>
  )
}

function Preferences({ data, locale, onboarding = false, onDone }) {
  const c = COPY[locale],
    [values, setValues] = useState({
      displayName: data.account.displayName,
      uiLocale: onboarding ? locale : data.account.uiLocale,
      timezone: onboarding ? localZone() : data.account.timezone,
      goal: data.account.goal || 'explore',
      adult: false,
      necessary: false,
      marketing:
        [...(data.consents || [])].reverse().find((x) => x.purpose === 'marketing')?.accepted ||
        false,
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null),
    [saved, setSaved] = useState(false)
  const change = (key, value) => {
    setSaved(false)
    setValues((v) => ({ ...v, [key]: value }))
  }
  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const body = onboarding
        ? {
            adult: values.adult,
            necessary: values.necessary,
            marketing: false,
            uiLocale: locale,
            timezone: localZone(),
          }
        : Object.fromEntries(
            Object.entries(values).filter(([k]) => !['adult', 'necessary'].includes(k)),
          )
      await appFetch(onboarding ? 'onboarding' : 'preferences', body)
      setSaved(true)
      await onDone()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="hh-panel">
      <h1>{onboarding ? c.continue : c.settings}</h1>
      <p>{c.privacy}</p>
      <form className="hh-form" onSubmit={submit}>
        {!onboarding && (
          <>
            <label>
              {c.name}
              <input
                value={values.displayName}
                maxLength={120}
                onChange={(e) => change('displayName', e.target.value)}
                autoComplete="name"
              />
            </label>
            <label>
              {c.timezone}
              <input
                value={values.timezone}
                required
                maxLength={100}
                onChange={(e) => change('timezone', e.target.value)}
              />
            </label>
            <label>
              Language / Язык
              <select value={values.uiLocale} onChange={(e) => change('uiLocale', e.target.value)}>
                <option value="en">English</option>
                <option value="ru">Русский</option>
              </select>
            </label>
            <label>
              {c.goal}
              <select value={values.goal} onChange={(e) => change('goal', e.target.value)}>
                {['explore', 'body', 'relationships', 'resource', 'business'].map((key) => (
                  <option value={key} key={key}>
                    {c[key]}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {onboarding && (
          <>
            <label className="hh-check">
              <input
                type="checkbox"
                checked={values.adult}
                onChange={(e) => change('adult', e.target.checked)}
                required
              />
              {c.adult}
            </label>
            <label className="hh-check">
              <input
                type="checkbox"
                checked={values.necessary}
                onChange={(e) => change('necessary', e.target.checked)}
                required
              />
              {c.necessary}
            </label>
          </>
        )}
        {!onboarding && (
          <label className="hh-check">
            <input
              type="checkbox"
              checked={values.marketing}
              onChange={(e) => change('marketing', e.target.checked)}
            />
            {c.marketing}
          </label>
        )}
        <button className="hh-primary" disabled={busy}>
          {busy ? c.saving : onboarding ? c.continue : c.save}
        </button>
        {saved && <p role="status">{c.saved}</p>}
        {error && <p role="alert">{message(error, c)}</p>}
      </form>
    </section>
  )
}
function TestCatalog({ data, locale, onStarted }) {
  const c = COPY[locale],
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null)
  const definitions = [
    getAssessmentDefinition('hh-current-state', 'v2', locale),
    getAssessmentDefinition('mini-ipip-20', 'v1', 'en'),
  ]
  async function start(def) {
    setBusy(true)
    setError(null)
    try {
      onStarted(
        await appFetch('runs', {
          definitionKey: def.key,
          definitionVersion: def.version,
          instrumentLocale: def.instrumentLocale,
          operationId: crypto.randomUUID(),
        }),
      )
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section>
      <div className="hh-heading">
        <p className="hh-kicker">Holistic House</p>
        <h1>{c.tests}</h1>
        <p>{c.continueLater}</p>
      </div>
      <div className="hh-grid">
        {definitions.map((def) => {
          const isState = def.key === 'hh-current-state',
            draft = data.runs.find((x) => x.definitionId === def.id),
            completed = data.results.filter((x) => x.definitionId === def.id).at(-1)
          return (
            <article className="hh-panel" key={def.id}>
              <p className="hh-kicker">
                {isState ? '5' : '20'} {locale === 'ru' ? 'вопросов' : 'questions'} ·{' '}
                {def.instrumentLocale.toUpperCase()}
              </p>
              <h2>{isState ? c.state : c.personality}</h2>
              <p>{isState ? c.stateDescription : c.traitDescription}</p>
              {!isState && <p className="hh-notice">{c.traitNotice}</p>}
              {completed && (
                <p className="hh-fine">
                  {c.latest}: {dateLabel(completed.measurementAt, locale)}
                </p>
              )}
              <div className="hh-actions">
                <button
                  className="hh-primary"
                  disabled={busy}
                  onClick={() => (draft ? onStarted(draft) : start(def))}
                >
                  {draft ? c.resume : completed ? c.repeat : c.start}
                </button>
                {completed && (
                  <Link href={`/${locale}/app/results/${completed.id}`} prefetch={false}>
                    {c.view}
                  </Link>
                )}
              </div>
            </article>
          )
        })}
      </div>
      {error && <p role="alert">{message(error, c)}</p>}
    </section>
  )
}
function Runner({ id, locale, onExit, onComplete }) {
  const c = COPY[locale],
    [run, setRun] = useState(null),
    [error, setError] = useState(null),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(''),
    [context, setContext] = useState({}),
    [showDiscard, setShowDiscard] = useState(false)
  const operation = useRef(null),
    inflight = useRef(false)
  async function load() {
    setError(null)
    try {
      const value = await appFetch('runs/' + id)
      setRun(value)
      setContext(value.context || {})
      setStatus(c.saved)
    } catch (e) {
      setError(e)
    }
  }
  useEffect(() => {
    load()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  const def = run ? getDefinitionById(run.definitionId) : null,
    index = run?.progress || 0,
    question = def?.questions[index],
    isContext = def && index >= def.questions.length
  async function save(answers = {}, progress = index) {
    if (inflight.current) return null
    inflight.current = true
    setBusy(true)
    setError(null)
    setStatus(c.saving)
    const body = {
        answers,
        context,
        progress,
        expectedRevision: run.revision,
        operationId: operation.current?.id || crypto.randomUUID(),
      },
      payload = operation.current?.body || body
    operation.current = { id: payload.operationId, body: payload }
    try {
      const next = await appFetch(`runs/${id}/save`, payload)
      operation.current = null
      setRun(next)
      setContext(next.context || {})
      setStatus(c.saved)
      return next
    } catch (e) {
      setError(e)
      setStatus(c.saveError)
      return null
    } finally {
      inflight.current = false
      setBusy(false)
    }
  }
  async function next() {
    if (!question || run.answers[question.id] === undefined) return
    await save({}, index + 1)
  }
  async function finish() {
    const saved = await save({}, def.questions.length)
    if (!saved) return
    setBusy(true)
    try {
      const result = await appFetch(`runs/${id}/submit`, { expectedRevision: saved.revision })
      await onComplete(result)
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }
  async function exit() {
    if (await save()) await onExit()
  }
  async function discard() {
    setBusy(true)
    try {
      await appFetch(`runs/${id}/discard`, { expectedRevision: run.revision })
      await onExit()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }
  if (!run)
    return (
      <section className="hh-panel">
        <h1>{c.loading}</h1>
        {error && (
          <>
            <p role="alert">{message(error, c)}</p>
            <button onClick={load}>{c.retry}</button>
          </>
        )}
      </section>
    )
  if (!['draft', 'in_progress'].includes(run.status))
    return (
      <section className="hh-panel">
        <p>{c.result}</p>
        <Link href={`/${locale}/app/history`} prefetch={false}>
          {c.history}
        </Link>
      </section>
    )
  const min = question?.min ?? def.answerScale?.min,
    max = question?.max ?? def.answerScale?.max
  return (
    <section className="hh-runner hh-panel">
      <header>
        <p className="hh-kicker">
          {def.key === 'hh-current-state' ? c.state : c.personality} ·{' '}
          {def.instrumentLocale.toUpperCase()}
        </p>
        <progress
          max={def.questions.length + 1}
          value={Math.min(index, def.questions.length) + 1}
          aria-label={c.tests}
        />
        <p className="hh-fine">
          {Math.min(index + 1, def.questions.length + 1)} / {def.questions.length + 1}
        </p>
      </header>
      <p className="hh-muted">{def.key === 'hh-current-state' ? c.rightNow : c.general}</p>
      {question ? (
        <fieldset disabled={busy || Boolean(operation.current)}>
          <legend>
            <h1>{question.text}</h1>
          </legend>
          <div className={def.answerScale ? 'hh-scale hh-scale-words' : 'hh-scale'}>
            {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={run.answers[question.id] === value}
                onClick={() => save({ [question.id]: value }, index)}
              >
                <strong>{value}</strong>
                {def.responseAnchors && <span>{def.responseAnchors[value - min]}</span>}
              </button>
            ))}
          </div>
          {question.anchors && (
            <div className="hh-anchors">
              <span>{question.anchors[0]}</span>
              <span>{question.anchors[1]}</span>
            </div>
          )}
        </fieldset>
      ) : (
        <div>
          <h1>{def.optionalContext.length ? c.optional : c.result}</h1>
          <p>{def.optionalContext.length ? c.skip : c.nonDiagnostic}</p>
          {def.optionalContext.length > 0 && (
            <details className="hh-secondary">
              <summary>{locale === 'ru' ? 'Добавить необязательный контекст' : 'Add optional context'}</summary>
            <div className="hh-form">
              {[
                ['current_focus', c.focus],
                ['trigger', c.trigger],
                ['what_helps', c.helps],
                ['desired_change', c.desiredChange],
                ['note', c.note],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <textarea
                    maxLength={1000}
                    value={context[key] || ''}
                    disabled={busy}
                    onChange={(e) => {
                      setContext((v) => ({ ...v, [key]: e.target.value }))
                      setStatus(c.unsaved)
                    }}
                  />
                </label>
              ))}
            </div>
            </details>
          )}
        </div>
      )}
      <p role="status" aria-live="polite" className="hh-fine">
        {status}
      </p>
      {error && (
        <div role="alert" className="hh-notice">
          <p>{message(error, c)}</p>
          {['REVISION_CONFLICT', 'CONFLICT', 'IMMUTABLE_RUN'].includes(error.code) ? (
            <button
              onClick={() => {
                operation.current = null
                load()
              }}
            >
              {c.reload}
            </button>
          ) : (
            <button disabled={busy} onClick={() => save()}>
              {c.retry}
            </button>
          )}
        </div>
      )}
      <div className="hh-actions">
        <button
          disabled={busy || index === 0 || Boolean(operation.current)}
          onClick={() => save({}, index - 1)}
        >
          {c.back}
        </button>
        {!isContext ? (
          <button
            className="hh-primary"
            disabled={busy || run.answers[question.id] === undefined || Boolean(operation.current)}
            onClick={next}
          >
            {c.next}
          </button>
        ) : (
          <button
            className="hh-primary"
            disabled={busy || Boolean(operation.current)}
            onClick={finish}
          >
            {c.finish}
          </button>
        )}
        <button disabled={busy || Boolean(operation.current)} onClick={exit}>
          {c.saveExit}
        </button>
      </div>
      <details className="hh-secondary">
        <summary>{c.decline}</summary>
        {showDiscard ? (
          <div>
            <p>{c.decline}?</p>
            <button disabled={busy} onClick={discard}>
              {c.delete}
            </button>
            <button onClick={() => setShowDiscard(false)}>{c.cancel}</button>
          </div>
        ) : (
          <button onClick={() => setShowDiscard(true)}>{c.decline}</button>
        )}
      </details>
    </section>
  )
}
function MetricCard({ dimension, locale, onSelect }) {
  const c = COPY[locale],
    def = getDefinitionById(dimension.sourceDefinitionId)
  return (
    <button className="hh-metric" onClick={() => onSelect(dimension)}>
      <span>{labelFor(dimension.key, locale)}</span>
      <strong>
        {dimension.value}
        <small> / {dimension.max}</small>
      </strong>
      <span className="hh-meter" aria-hidden="true">
        <i
          style={{
            width: `${(100 * (dimension.value - dimension.min)) / (dimension.max - dimension.min)}%`,
          }}
        />
      </span>
      <small>
        {dateLabel(dimension.measurementAt, locale)} · {def.instrumentLocale.toUpperCase()}
      </small>
      {!dimension.remeasured && <small>{c.oldMeasure}</small>}
      <em>{c.details} →</em>
    </button>
  )
}
function Portrait({ data, locale, onOpenHistory }) {
  const c = COPY[locale],
    [selected, setSelected] = useState(null),
    dimensions = data.snapshot?.dimensions || [],
    nextStep = getPortraitNextStep({
      ...data,
      dimensions: dimensions.map((dimension) => {
        const result = data.results.find((candidate) => candidate.id === dimension.sourceResultId)
        return result
          ? { ...dimension, measurementAt: result.measurementAt, suggestedRepeatDays: getDefinitionById(result.definitionId)?.suggestedRepeatDays }
          : dimension
      }),
    })
  return (
    <section>
      <div className="hh-heading">
        <p className="hh-kicker">
          {data.account.displayName
            ? `${locale === 'ru' ? 'Здравствуйте' : 'Hello'}, ${data.account.displayName}`
            : 'Holistic House'}
        </p>
        <h1>{c.portrait}</h1>
        <p>{c.private}</p>
      </div>
      <MoodCheckIn
        locale={locale}
        compact
        onQuickCheckin={() => window.location.assign('/' + locale + '/app/tests')}
      />
      <NextStep locale={locale} step={nextStep} />
      {!dimensions.length ? (
        <article className="hh-panel hh-empty">
          <h2>{c.empty}</h2>
          <p>{c.emptyText}</p>
          <Link className="hh-primary" href={`/${locale}/app/tests`} prefetch={false}>
            {c.start}
          </Link>
          <PortraitGuide locale={locale} dimensions={dimensions} />
        </article>
      ) : (
        <>
          {[
            ['state', c.state],
            ['trait', c.personality],
          ].map(([kind, title]) => {
            const found = dimensions.filter((d) => d.dimensionClass === kind)
            return found.length ? (
              <section key={kind} className="hh-section">
                <h2>{title}</h2>
                <div className="hh-metrics">
                  {found.map((d) => (
                    <MetricCard key={d.key} dimension={d} locale={locale} onSelect={setSelected} />
                  ))}
                </div>
              </section>
            ) : null
          })}
          <PortraitGuide locale={locale} dimensions={dimensions} />
          <LatestChange locale={locale} results={data.results} />
          <div className="hh-actions">
            <Link className="hh-primary" href={`/${locale}/app/tests`} prefetch={false}>
              {c.repeat}
            </Link>
            <button onClick={onOpenHistory}>{c.history}</button>
          </div>
        </>
      )}
      <ReportsFromAndy data={data} locale={locale} />
      {selected && (
        <section className="hh-panel hh-detail" aria-live="polite">
          <button className="hh-close" onClick={() => setSelected(null)}>
            {c.close}
          </button>
          <h2>{labelFor(selected.key, locale)}</h2>
          <p>{explanationFor(selected.key, locale)}</p>
          <p>
            {c.measured}: {dateLabel(selected.measurementAt, locale)}
          </p>
          <p>
            {c.source}: {getDefinitionById(selected.sourceDefinitionId).key} ·{' '}
            {getDefinitionById(selected.sourceDefinitionId).version} · {selected.instrumentLocale}
          </p>
          <Link href={`/${locale}/app/results/${selected.sourceResultId}`} prefetch={false}>
            {c.view}
          </Link>
          <button onClick={onOpenHistory}>{c.history}</button>
        </section>
      )}
      <p className="hh-fine">{c.patterns}</p>
    </section>
  )
}
function NextStep({ locale, step }) {
  const c = COPY[locale]
  const content = {
    state: [c.nextStateTitle, c.nextStateText, c.start],
    tendencies: [c.nextTendenciesTitle, c.nextTendenciesText, c.addTendencies],
    history: [c.nextHistoryTitle, c.nextHistoryText, c.viewHistory],
    report: [c.nextReportTitle, c.nextReportText, c.openReport],
    consultation: [c.nextConsultationTitle, c.nextConsultationText, c.viewConsultations],
    checkin: [c.nextCheckinTitle, c.nextCheckinText, c.repeat],
  }[step.kind]
  return (
    <section className="hh-next-step" aria-labelledby="next-step-title">
      <p className="hh-kicker">{c.nextStep}</p>
      <h2 id="next-step-title">{content[0]}</h2>
      <p>{content[1]}</p>
      <Link className="hh-primary" href={`/${locale}/app${step.href}`} prefetch={false}>
        {content[2]}
      </Link>
    </section>
  )
}
function PortraitGuide({ locale, dimensions = [] }) {
  const c = COPY[locale]
  const complete = (kind) => dimensions.some((dimension) => dimension.dimensionClass === kind)
  return (
    <section className="hh-portrait-guide" aria-labelledby="portrait-guide-title">
      <h2 id="portrait-guide-title">{c.guideTitle}</h2>
      <ul>
        <li data-state={complete('state') ? 'complete' : 'current'}><strong>{c.state}</strong> — {c.guideState}</li>
        <li data-state={complete('trait') ? 'complete' : complete('state') ? 'current' : 'future'}><strong>{c.personality}</strong> — {c.guideTendencies}</li>
        <li><strong>{c.history}</strong> — {c.guideHistory}</li>
        <li><strong>{c.reports}</strong> — {c.guideReports}</li>
      </ul>
    </section>
  )
}
function LatestChange({ locale, results }) {
  const changes = latestCompatibleChange(results)
  if (!changes.length) return null
  return <section className="hh-section hh-panel"><h2>{locale === 'ru' ? 'Последнее изменение' : 'Latest change'}</h2><p className="hh-fine">{locale === 'ru' ? 'Последний совместимый замер рядом с предыдущим; это не объяснение причин или тренд.' : 'Latest compatible measurement beside the previous one; this does not state a cause or trend.'}</p><ul className="hh-change-list">{changes.map((change) => <li key={change.key}>{labelFor(change.key, locale)} <strong>{change.previous} → {change.value}</strong></li>)}</ul></section>
}
function ReportsFromAndy({ data, locale }) {
  const reports = reportTimeline(data.savedReports).slice(0, 3)
  const ru = locale === 'ru'
  return <section className="hh-section hh-account-reports"><h2>{ru ? 'Отчёты от Andy' : 'Reports from Andy'}</h2>{!reports.length ? <p className="hh-fine">{ru ? 'Сохранённых отчётов пока нет. Когда вы решите сохранить переданный отчёт, он появится здесь.' : 'No reports have been saved yet. A report you choose to save will appear here.'}</p> : <div className="hh-grid">{reports.map((report) => <article className="hh-panel" key={report.id}><p className="hh-kicker">{ru ? 'Полученный отчёт' : 'Received report'}</p><h3>{formatReportDate(report.occurredOn, locale)}</h3><p>{ru ? 'Дата отчёта' : 'Report date'}: {formatReportDate(report.occurredOn, locale)}</p>{report.available === false ? <p className="hh-fine">{ru ? 'Отчёт больше недоступен.' : 'Report no longer available.'}</p> : <Link href={`/${locale}/app/reports/${report.id}`} prefetch={false}>{ru ? 'Открыть отчёт' : 'Open report'}</Link>}</article>)}</div>}</section>
}
function ResultPage({ id, locale, data }) {
  const c = COPY[locale],
    [result, setResult] = useState(data.results.find((r) => r.id === id) || null),
    [error, setError] = useState(null)
  useEffect(() => {
    let live = true
    appFetch('results/' + id)
      .then((r) => {
        if (live) setResult(r)
      })
      .catch((e) => {
        if (live) setError(e)
      })
    return () => {
      live = false
    }
  }, [id])
  if (error) return <p role="alert">{message(error, c)}</p>
  if (!result) return <p>{c.loading}</p>
  const series = seriesFor(data.results, result),
    previous = series
      .filter(
        (r) =>
          r.id !== result.id && Date.parse(r.measurementAt) <= Date.parse(result.measurementAt),
      )
      .at(-1),
    diff = previous ? compareResults(result, previous) : []
  return (
    <section className="hh-panel">
      <p className="hh-kicker">
        {c.result} · {result.instrumentLocale.toUpperCase()}
      </p>
      <h1>{result.definitionKey === 'hh-current-state' ? c.state : c.personality}</h1>
      <p>{dateLabel(result.measurementAt, locale)}</p>
      {result.definitionKey === 'mini-ipip-20' && <p className="hh-notice">{c.traitNotice}</p>}
      {Object.entries(result.context || {}).length > 0 && (
        <aside className="hh-context-at-checkin">
          <h2>{c.contextAtCheckIn}</h2>
          <dl>
            {[
              ['current_focus', c.focus],
              ['trigger', c.trigger],
              ['what_helps', c.helps],
              ['desired_change', c.desiredChange],
              ['note', c.note],
            ].map(([key, label]) =>
              result.context[key] ? (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>{result.context[key]}</dd>
                </div>
              ) : null,
            )}
          </dl>
        </aside>
      )}
      <table className="hh-table">
        <caption>
          {c.source}: {result.definitionKey} {result.definitionVersion}
        </caption>
        <thead>
          <tr>
            <th>{c.dimension}</th>
            <th>{c.value}</th>
            <th>{c.change}</th>
          </tr>
        </thead>
        <tbody>
          {result.dimensions.map((d) => {
            const delta = diff.find((x) => x.key === d.key)?.delta
            return (
              <tr key={d.key}>
                <th scope="row">
                  {labelFor(d.key, locale)}
                  <small>{explanationFor(d.key, locale)}</small>
                </th>
                <td>
                  {d.value} / {d.max}
                </td>
                <td>{delta === undefined ? '—' : `${delta > 0 ? '+' : ''}${delta}`}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {!previous && <p>{c.noChange}</p>}
      <p className="hh-fine">{c.versionBoundary}</p>
      <Link className="hh-primary" href={`/${locale}/app/history`} prefetch={false}>
        {c.history}
      </Link>
    </section>
  )
}
function SavedReportPage({ id, locale, reload }) {
  const router = useRouter()
  const [value, setValue] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const ru = locale === 'ru'
  useEffect(() => {
    let live = true
    appFetch('reports/' + id)
      .then((result) => {
        if (live) setValue(result)
      })
      .catch((e) => {
        if (live) setError(e)
      })
    return () => {
      live = false
    }
  }, [id])
  async function remove() {
    setBusy(true)
    setError(null)
    try {
      await appFetch('reports/' + id + '/remove', {})
      await reload()
      router.replace('/' + locale + '/app/history')
    } catch (e) {
      setError(e)
      setBusy(false)
    }
  }
  if (error?.code === 'REPORT_UNAVAILABLE' || error?.code === 'NOT_FOUND')
    return (
      <section className="hh-panel">
        <h1>{ru ? 'Отчёт больше недоступен' : 'Report no longer available'}</h1>
        <p>{ru ? 'Ссылка в истории может оставаться как запись, но содержимое было отозвано или исходный отчёт больше недоступен.' : 'The history reference may remain, but the content was withdrawn or the source report is no longer available.'}</p>
        <Link className="hh-primary" href={'/' + locale + '/app/history'} prefetch={false}>
          {ru ? 'Вернуться в историю' : 'Back to History'}
        </Link>
      </section>
    )
  if (error) return <p role="alert">{ru ? 'Не удалось открыть отчёт.' : 'The report could not be opened.'}</p>
  if (!value) return <p>{ru ? 'Загружаем отчёт…' : 'Loading report…'}</p>
  return (
    <section className="hh-panel">
      <p className="hh-kicker">{ru ? 'Сохранённый отчёт' : 'Saved report'}</p>
      <AssessmentReading record={value.report} locale={locale} />
      <p className="hh-fine">
        {ru ? 'Сохранено' : 'Saved'}: {dateLabel(value.savedAt, locale)}
      </p>
      <div className="hh-actions">
        <Link href={'/' + locale + '/app/history'} prefetch={false}>
          {ru ? 'История' : 'History'}
        </Link>
        <button type="button" disabled={busy} onClick={remove}>
          {ru ? 'Убрать из моего кабинета' : 'Remove from my Cabinet'}
        </button>
      </div>
    </section>
  )
}

function ReportsIndex({ data, locale }) {
  const c = COPY[locale]
  const reports = reportTimeline(data.savedReports)
  return (
    <section>
      <div className="hh-heading">
        <p className="hh-kicker">Holistic House</p>
        <h1>{c.reports}</h1>
        <p>{c.reportsIntro}</p>
      </div>
      {!reports.length ? (
        <article className="hh-panel hh-empty">
          <h2>{c.reportsEmpty}</h2>
          <p>{c.reportsEmptyText}</p>
        </article>
      ) : (
        <div className="hh-report-list">
          {reports.map((report) => (
            <article className="hh-panel" key={report.id}>
              <p className="hh-kicker">{c.reportFromAndy}</p>
              <h2>{formatReportDate(report.occurredOn, locale)}</h2>
              <p className="hh-fine">{c.saved}: {dateLabel(report.savedAt, locale)}</p>
              {report.available === false ? <p className="hh-fine">{locale === 'ru' ? 'Отчёт был отозван или больше недоступен.' : 'This report was withdrawn or is no longer available.'}</p> : <Link className="hh-primary" href={`/${locale}/app/reports/${report.id}`} prefetch={false}>{c.openReport}</Link>}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function HistoryView({ data, locale, reload }) {
  const c = COPY[locale],
    results = chronological(data.results),
    [latestId, setLatestId] = useState(results.at(-1)?.id || ''),
    [priorId, setPriorId] = useState(''),
    [dimensionKey, setDimensionKey] = useState(''),
    [error, setError] = useState(null)
  const latest = results.find((r) => r.id === latestId) || results.at(-1),
    series = latest ? seriesFor(results, latest) : [],
    prior = series.find((r) => r.id === priorId) || series.filter((r) => r.id !== latest?.id)[0]
  const dimension = latest?.dimensions.find((d) => d.key === dimensionKey) || latest?.dimensions[0],
    delta = latest && prior && latest.id !== prior.id ? compareResults(latest, prior) : []
  const points = dimension
    ? series.map((r) => ({
        id: r.id,
        date: r.measurementAt,
        value: r.dimensions.find((d) => d.key === dimension.key).value,
      }))
    : []
  const x = (p) =>
    30 +
    (580 * (Date.parse(p.date) - Date.parse(points[0].date))) /
      Math.max(1, Date.parse(points.at(-1).date) - Date.parse(points[0].date))
  const y = (p) => 170 - (140 * (p.value - dimension.min)) / (dimension.max - dimension.min)
  const timeline = [
    ...results.map((r) => ({
      id: r.id,
      date: r.measurementAt,
      title: r.definitionKey === 'hh-current-state' ? c.state : c.personality,
      href: `/${locale}/app/results/${r.id}`,
    })),
    ...reportTimeline(data.savedReports).map((report) => ({
      id: report.id,
      date: `${report.occurredOn}T00:00:00.000Z`,
      title: c.reportFromAndy,
      href: `/${locale}/app/reports/${report.id}`,
      note: `${c.saved}: ${dateLabel(report.savedAt, locale)}`,
    })),
    ...data.requests.map((r) => ({
      id: r.id,
      date: r.createdAt,
      title: `${c.request}: ${c[r.status]}`,
      href: `/${locale}/app/consultations`,
    })),
    ...data.contextEvents.map((e) => ({
      id: e.id,
      date: e.occurredAt,
      title: e.label,
      note: e.note,
      event: e,
    })),
  ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || a.id.localeCompare(b.id))
  async function deleteEvent(event) {
    try {
      await appFetch('context/' + event.id, { action: 'delete', expectedRevision: event.revision })
      await reload()
    } catch (e) {
      setError(e)
    }
  }
  return (
    <section>
      <div className="hh-heading">
        <h1>{c.history}</h1>
        <p>{c.historyIntro}</p>
        <p className="hh-fine">{c.versionBoundary}</p>
      </div>
      {latest ? (
        <article className="hh-panel">
          <h2>{c.compare}</h2>
          <div className="hh-filter-grid">
            <label>
              {c.to}
              <select
                value={latest.id}
                onChange={(e) => {
                  setLatestId(e.target.value)
                  setPriorId('')
                  setDimensionKey('')
                }}
              >
                {results.map((r) => (
                  <option value={r.id} key={r.id}>
                    {r.definitionKey} · {dateLabel(r.measurementAt, locale)} · {r.instrumentLocale}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {c.from}
              <select
                value={prior?.id || ''}
                onChange={(e) => setPriorId(e.target.value)}
                disabled={series.length < 2}
              >
                {series
                  .filter((r) => r.id !== latest.id)
                  .map((r) => (
                    <option value={r.id} key={r.id}>
                      {dateLabel(r.measurementAt, locale)}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              {c.dimension}
              <select value={dimension.key} onChange={(e) => setDimensionKey(e.target.value)}>
                {latest.dimensions.map((d) => (
                  <option key={d.key} value={d.key}>
                    {labelFor(d.key, locale)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="hh-actions">
            <button
              disabled={series.length < 2 || series[0]?.id === latest.id}
              onClick={() => setPriorId(series[0].id)}
            >
              {c.baseline}
            </button>
            <button
              disabled={series.indexOf(latest) < 1}
              onClick={() => setPriorId(series[Math.max(0, series.indexOf(latest) - 1)].id)}
            >
              {c.previous}
            </button>
          </div>
          {delta.length ? (
            <p className="hh-change">
              {c.since} {dateLabel(prior.measurementAt, locale)}: {labelFor(dimension.key, locale)}{' '}
              {delta.find((d) => d.key === dimension.key)?.prior} → {dimension.value}{' '}
              <span>
                ({delta.find((d) => d.key === dimension.key)?.delta > 0 ? '+' : ''}
                {delta.find((d) => d.key === dimension.key)?.delta} {c.points})
              </span>
            </p>
          ) : (
            <p>{c.noChange}</p>
          )}
          {points.length >= 3 && (
            <svg
              className="hh-chart"
              viewBox="0 0 640 200"
              role="img"
              aria-label={`${labelFor(dimension.key, locale)} — ${c.history}`}
            >
              <line x1="30" y1="170" x2="610" y2="170" />
              <polyline points={points.map((p) => `${x(p)},${y(p)}`).join(' ')} />
              {points.map((p) => (
                <circle key={p.id} cx={x(p)} cy={y(p)} r="5">
                  <title>
                    {dateLabel(p.date, locale)}: {p.value}
                  </title>
                </circle>
              ))}
            </svg>
          )}
          <table className="hh-table">
            <caption>
              {labelFor(dimension.key, locale)} · {c.scale} {dimension.min}–{dimension.max}
            </caption>
            <thead>
              <tr>
                <th>{c.date}</th>
                <th>{c.value}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.id}>
                  <th scope="row">{dateLabel(p.date, locale)}</th>
                  <td>{p.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      ) : (
        <p>{c.noResults}</p>
      )}
      <ContextForm locale={locale} reload={reload} />
      <div className="hh-timeline">
        {timeline.map((item) => (
          <article key={item.id}>
            <time>{dateLabel(item.date, locale)}</time>
            <h3>
              {item.href ? (
                <Link href={item.href} prefetch={false}>
                  {item.title}
                </Link>
              ) : (
                item.title
              )}
            </h3>
            {item.note && <p>{item.note}</p>}
            {item.event && (
              <details>
                <summary>{c.editJournal}</summary>
                <ContextForm locale={locale} reload={reload} event={item.event} />
                <button onClick={() => deleteEvent(item.event)}>{c.delete}</button>
              </details>
            )}
          </article>
        ))}
      </div>
      {error && <p role="alert">{message(error, c)}</p>}
    </section>
  )
}
function ContextForm({ locale, reload, event }) {
  const c = COPY[locale],
    [show, setShow] = useState(Boolean(event)),
    [label, setLabel] = useState(event?.label || ''),
    [note, setNote] = useState(event?.note || ''),
    [date, setDate] = useState(
      event
        ? new Date(
            new Date(event.occurredAt).getTime() -
              new Date(event.occurredAt).getTimezoneOffset() * 60000,
          )
            .toISOString()
            .slice(0, 16)
        : '',
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null)
  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await appFetch(event ? 'context/' + event.id : 'context', {
        action: 'save',
        label,
        note,
        occurredAt: new Date(date).toISOString(),
        timezone: localZone(),
        ...(event ? { expectedRevision: event.revision } : {}),
      })
      if (!event) {
        setLabel('')
        setNote('')
        setShow(false)
      }
      await reload()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="hh-context">
      {!show ? (
        <button onClick={() => setShow(true)}>＋ {c.addEvent}</button>
      ) : (
        <form onSubmit={submit} className="hh-form hh-panel">
          <h2>{c.context}</h2>
          <p>{c.contextNote}</p>
          <label>
            {c.label}
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              maxLength={200}
            />
          </label>
          <label>
            {c.date}
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <label>
            {c.note}
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
          </label>
          <button className="hh-primary" disabled={busy}>
            {c.save}
          </button>
          {!event && (
            <button type="button" onClick={() => setShow(false)}>
              {c.cancel}
            </button>
          )}
          {error && <p role="alert">{message(error, c)}</p>}
        </form>
      )}
    </section>
  )
}
function Consultations({ data, locale, reload }) {
  const c = COPY[locale],
    [selected, setSelected] = useState(null),
    [error, setError] = useState(null)
  async function updateRequest(request, action) {
    try {
      await appFetch('requests/' + request.id, { action, expectedRevision: request.revision })
      await reload()
    } catch (e) {
      setError(e)
    }
  }
  return (
    <section>
      <div className="hh-heading">
        <h1>{c.consultations}</h1>
        <p>{c.consultationsIntro}</p>
      </div>
      <div className="hh-grid hh-services">
        {APP_SERVICES.map((service) => (
          <article className="hh-panel" key={service.id}>
            <p className="hh-kicker">Andy · Andrii Litvinov</p>
            <h2>{service.copy[locale].title}</h2>
            <p>{service.copy[locale].description}</p>
            <p className="hh-fine">{c.price}</p>
            <button className="hh-primary" onClick={() => setSelected(service)}>
              {c.request}
            </button>
          </article>
        ))}
      </div>
      {selected && (
        <RequestForm
          key={selected.id}
          service={selected}
          locale={locale}
          data={data}
          close={() => setSelected(null)}
          onDone={async () => {
            setSelected(null)
            await reload()
          }}
        />
      )}
      <section className="hh-section">
        <h2>{c.requests}</h2>
        {!data.requests.length && <p>{c.emptyRequests}</p>}
        {data.requests.map((request) => (
          <article className="hh-panel" key={request.id}>
            <span className="hh-badge">{c[request.status]}</span>
            <h3>
              {APP_SERVICES.find((s) => s.id === request.serviceId)?.copy[locale].title ||
                c.request}
            </h3>
            <p>
              {dateLabel(request.createdAt, locale)} · {request.contact}
            </p>
            {request.message && <p>{request.message}</p>}
            {request.sharedExcerpt && (
              <>
                <p>{c.sharingNote}</p>
                <button onClick={() => updateRequest(request, 'unshare')}>{c.unshare}</button>
              </>
            )}
            {['requested', 'contacted'].includes(request.status) && (
              <button onClick={() => updateRequest(request, 'cancel')}>{c.withdraw}</button>
            )}
            <p className="hh-fine">{c.requestNote}</p>
          </article>
        ))}
      </section>
      {error && <p role="alert">{message(error, c)}</p>}
    </section>
  )
}
function RequestForm({ service, locale, data, close, onDone }) {
  const c = COPY[locale],
    [contact, setContact] = useState(data.email || ''),
    [note, setNote] = useState(''),
    [shareId, setShareId] = useState(''),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null),
    operation = useRef(null)
  const shared = data.results.find((r) => r.id === shareId)
  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const body = operation.current || {
      serviceId: service.id,
      operationId: crypto.randomUUID(),
      contact,
      message: note,
      shareResultId: shareId || null,
      shareConfirmed: confirmed,
    }
    operation.current = body
    try {
      await appFetch('requests', body)
      operation.current = null
      await onDone()
    } catch (e) {
      setError(e)
      if (e.status && e.status < 500) operation.current = null
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="hh-panel hh-detail">
      <button className="hh-close" onClick={close} disabled={busy}>
        {c.close}
      </button>
      <h2>{service.copy[locale].title}</h2>
      <p>{c.requestNote}</p>
      <form className="hh-form" onSubmit={submit}>
        <label>
          {c.contact}
          <input
            required
            maxLength={500}
            value={contact}
            disabled={busy || Boolean(operation.current)}
            onChange={(e) => setContact(e.target.value)}
          />
        </label>
        <label>
          {c.message}
          <textarea
            maxLength={2000}
            value={note}
            disabled={busy || Boolean(operation.current)}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <label>
          {c.share}
          <select
            value={shareId}
            disabled={busy || Boolean(operation.current)}
            onChange={(e) => {
              setShareId(e.target.value)
              setConfirmed(false)
            }}
          >
            <option value="">{c.shareNone}</option>
            {data.results.map((result) => (
              <option key={result.id} value={result.id}>
                {result.definitionKey} · {dateLabel(result.measurementAt, locale)}
              </option>
            ))}
          </select>
        </label>
        {shared && (
          <>
            <div className="hh-notice">
              <p>
                {shared.definitionKey} · {shared.instrumentLocale} ·{' '}
                {dateLabel(shared.measurementAt, locale)}
              </p>
              {shared.dimensions.map((d) => (
                <p key={d.key}>
                  {labelFor(d.key, locale)}: {d.value} / {d.max}
                </p>
              ))}
            </div>
            <label className="hh-check">
              <input
                type="checkbox"
                required
                checked={confirmed}
                disabled={busy || Boolean(operation.current)}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              {c.shareConfirm}
            </label>
          </>
        )}
        <p className="hh-fine">{c.sharingNote}</p>
        <button className="hh-primary" disabled={busy}>
          {busy ? c.saving : c.submitRequest}
        </button>
        {error && <p role="alert">{message(error, c)}</p>}
      </form>
    </section>
  )
}
function Privacy({ locale, logout, onDeleted }) {
  const c = COPY[locale],
    [error, setError] = useState(null),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(''),
    [opened, setOpened] = useState(false)
  async function exportData() {
    setBusy(true)
    try {
      const data = await appFetch('export'),
        url = URL.createObjectURL(
          new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
        ),
        a = document.createElement('a')
      a.href = url
      a.download = 'holistic-house-data.json'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }
  async function requestDeletion(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await appFetch('deletion', { confirmation: confirm })
      onDeleted()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="hh-panel hh-section">
      <h2>{c.settings}</h2>
      <p>{c.privacy}</p>
      <div className="hh-actions">
        <button disabled={busy} onClick={exportData}>
          {c.export}
        </button>
        <button disabled={busy} onClick={() => logout(true)}>
          {c.allDevices}
        </button>
      </div>
      <details open={opened} onToggle={(e) => setOpened(e.currentTarget.open)}>
        <summary>{c.deletion}</summary>
        <p>{c.deletionNote}</p>
        <form onSubmit={requestDeletion} className="hh-form">
          <label>
            {c.deletionConfirm}
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              maxLength={6}
            />
          </label>
          <button className="hh-danger" disabled={busy || confirm !== 'DELETE'}>
            {c.deletion}
          </button>
        </form>
      </details>
      {error && <p role="alert">{message(error, c)}</p>}
    </section>
  )
}
