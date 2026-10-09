'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { COPY, labelFor, explanationFor } from './copy'
import { getAssessmentDefinition, getDefinitionById } from '@/lib/assessments/definitions'
import { compareResults, seriesFor, chronological } from '@/lib/profile/history'
import { assessmentHistoryGroups, nextPersonalRecommendation, resultChangeSummary } from '@/lib/assessments/personal-guidance'
import { profileCompletionRecommendations } from '@/lib/profile/summary'
import { AssessmentReading } from '@/components/assessment-reading'
import { MoodCheckIn } from '@/components/app/mood-checkin'
import PsiMonitoring from '@/components/app/psi-monitoring'
import { AccountTestBattery } from '@/components/app/account-test-battery'
import { TestExplorerVisual } from '@/components/app/test-explorer-visual'
import { PortraitReportActions } from '@/components/app/portrait-report-actions'
import { coverageForFocus } from '@/lib/assessments/test-explorer'
import { buildPsychPortrait } from '@/lib/assessments/psych-portrait'
import { MONITORING_CATALOG, monitoringCatalogItem } from '@/data/assessments/catalog'
import {
  TEST_LENGTH_FILTERS,
  TEST_RECOMMENDATION_FOCUS,
  TEST_STYLE_FILTERS,
  rankAssessmentDefinitions,
} from '@/lib/assessments/test-recommendations'
import { SAFETY_COPY } from '@/lib/assessments/safety'
import PracticeWorkspace, { PracticeEntry } from '@/components/app/practice-workspace'
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
    searchParams = useSearchParams(),
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
      const result = await appFetch('auth/start', {
        locale,
        serviceId: searchParams.get('service') || null,
        ...(page === 'tests' && searchParams.get('selection') === 'pending' ? { continueTo: 'tests' } : {}),
      })
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
  async function completePlan(result) {
    const planId = searchParams.get('plan')
    if (!planId) {
      await load()
      router.push(root + '/results/' + result.id)
      return
    }
    const plan = await appFetch('test-plans/' + encodeURIComponent(planId))
    await appFetch(`test-plans/${encodeURIComponent(planId)}/advance`, {
      completedRunId: result.runId,
      expectedRevision: plan.revision,
    })
    await load()
    // Return to the complete battery after each result; no forced next test.
    router.push(`${root}/tests?plan=${encodeURIComponent(planId)}`)
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
  if (state === 'ready' && !data)
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
    ['tests', locale === 'ru' ? 'Мои тесты' : 'My tests', '/tests'],
    ['monitoring', c.monitoring, '/monitoring'],
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
            <Link href={`${root}/practice`} prefetch={false}>
              {data.practice ? (locale === 'ru' ? 'Моя практика' : 'My Practice') : (locale === 'ru' ? 'Стать мастером' : 'Become a Master')}
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
              aria-current={page === id || (id === 'portrait' && page === 'portfolio') ? 'page' : undefined}
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
            <>
              <Portrait data={data} locale={locale} />
              <PracticeEntry data={data} locale={locale} />
            </>
          )}
          {page === 'portfolio' && <PortfolioPage data={data} locale={locale} />}
          {page === 'practice' && <PracticeWorkspace locale={locale} />}
          {page === 'monitoring' && (
            <PsiMonitoring
              data={data}
              locale={locale}
              instrumentKey={recordId}
              onStarted={(run) => router.push(root + '/runs/' + run.id)}
            />
          )}
          {page === 'tests' && (
            searchParams.get('summary')
              ? <TestPlanSummary locale={locale} planId={searchParams.get('plan')} results={data.results} onBack={() => router.push(root + '/tests')} />
              : <AccountTestBattery data={data} locale={locale}
                  requestedPlanId={searchParams.get('plan')}
                  recommendedKey={searchParams.get('suggest')}
                  reload={load} />
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
                await completePlan(result)
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
          {page === 'documents' && recordId && (
            <SavedDocumentPage key={recordId} id={recordId} locale={locale} reload={load} />
          )}
          {page === 'history' && <HistoryView data={data} locale={locale} reload={load} />}
          {page === 'consultations' && <Consultations data={data} locale={locale} reload={load} initialServiceId={searchParams.get('service') || ''} requestRecommendations={searchParams.get('intent') === 'recommendations'} />}
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
          : saved.sourceKind === 'legacy_document'
            ? `/${locale}/app/documents/${saved.resource.id}`
            : `/${locale}/app/results/${saved.resource.id}`,
      )
    } catch (e) {
      setError(
        e?.code === 'SAVE_INTENT_EXPIRED'
          ? ru
            ? 'Время подтверждения истекло. Вернитесь к исходному документу и повторите сохранение.'
            : 'This confirmation expired. Return to the original item and save again.'
          : e?.code === 'CLIENT_ACCOUNT_ALREADY_LINKED'
            ? ru
              ? 'Эта карточка клиента уже связана с другим Google-аккаунтом. Свяжитесь с Andy, чтобы проверить привязку.'
              : 'This client profile is already linked to another Google Account. Contact Andy to review the link.'
            : ru
              ? 'Не удалось сохранить выбранный материал.'
              : 'The selected item could not be saved.',
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
      : intent?.sourceKind === 'legacy_document'
        ? intent?.source?.documentKind === 'receipt'
          ? ru ? 'Квитанция' : 'Receipt'
          : intent?.source?.documentKind === 'invoice'
            ? ru ? 'Счёт' : 'Invoice'
            : ru ? 'Рекомендация' : 'Recommendation'
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
            {intent?.sourceKind === 'guest_result'
              ? (ru
                  ? 'Будет сохранён только этот выбранный результат.'
                  : 'Only this selected result will be saved.')
              : (ru
                  ? 'Будет сохранён только этот выбранный материал. Ваша карточка клиента у Andy будет связана с этим Google-аккаунтом; остальные старые документы автоматически не открываются.'
                  : 'Only this selected item will be saved. Your client profile with Andy will be linked to this Google Account; other legacy documents are not opened automatically.')}
          </p>
          {intent.status === 'committed' && intent.resourceId ? (
            <Link
              className="hh-primary"
              href={
                intent.sourceKind === 'delivered_report'
                  ? `/${locale}/app/reports/${intent.resourceId}`
                  : intent.sourceKind === 'legacy_document'
                    ? `/${locale}/app/documents/${intent.resourceId}`
                    : `/${locale}/app/results/${intent.resourceId}`
              }
              prefetch={false}
            >
              {ru ? 'Открыть сохранённый материал' : 'Open saved item'}
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
  const c = COPY[locale]
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [view, setView] = useState(mode === 'all' ? 'all' : 'recommended')
  const [showRecommender, setShowRecommender] = useState(mode === 'recommendations')
  const [selectedFocus, setSelectedFocus] = useState([])
  const [testStyles, setTestStyles] = useState(() => TEST_STYLE_FILTERS.map((item) => item.key))
  const [testLengths, setTestLengths] = useState(() => TEST_LENGTH_FILTERS.map((item) => item.key))
  const [personalized, setPersonalized] = useState(null)
  const ru = locale === 'ru'
  const entries = MONITORING_CATALOG.filter((item) => item.startable).map((item) => ({
    item,
    def: getAssessmentDefinition(
      item.key,
      item.version,
      item.instrumentLocale === 'dynamic' ? locale : item.instrumentLocale,
    ),
  }))
  const definitions = entries.map(({ def }) => def)
  const monitoringIntro = ru
    ? 'Начните с одного полезного замера. Более глубокие тесты проходите только когда они действительно нужны.'
    : 'Start with one useful measurement. Take deeper checks only when they are actually useful.'
  const recommendationCopy = ru
    ? {
        action: 'Подобрать тесты',
        title: 'Какие темы сейчас важнее?',
        text: 'Выберите одну или несколько зон, тип теста и длину. Доступные тесты будут расставлены по приоритету.',
        style: 'Тип теста',
        engaging: 'Лёгкие / игровые',
        professional: 'Профессиональные',
        length: 'Длина',
        short: 'Короткие',
        medium: 'Средние',
        comprehensive: 'Комплексные',
        build: 'Показать рекомендации',
        ranked: 'Ваш рекомендуемый порядок',
        rankedText: 'Порядок основан только на выбранных темах и глубине. Это навигация по тестам, а не диагноз.',
        rank: 'Приоритет',
        choose: 'Выберите хотя бы одну тему.',
        privacy: 'Выбранные зоны используются только для этой сортировки и не сохраняются в профиле.',
        forMe: 'Для меня',
      }
    : {
        action: 'Get test recommendations',
        title: 'What matters most right now?',
        text: 'Choose one or more areas, the test style and length. Available tests will be ranked for you.',
        style: 'Test style',
        engaging: 'Fun / engaging',
        professional: 'Professional',
        length: 'Length',
        short: 'Short',
        medium: 'Medium',
        comprehensive: 'Comprehensive',
        build: 'Show my recommendations',
        ranked: 'Your recommended order',
        rankedText: 'The order is based only on the themes and depth you selected. It helps navigate tests; it is not a diagnosis.',
        rank: 'Priority',
        choose: 'Choose at least one area.',
        privacy: 'Your selected areas are used only for this ranking and are not saved to your profile.',
        forMe: 'For me',
      }
  const tabs = [
    ...(personalized ? [['personalized', recommendationCopy.forMe]] : []),
    ...(ru
      ? [['recommended', 'Рекомендуем'], ['all', 'Все доступные'], ['areas', 'По областям'], ['completed', 'Пройденные']]
      : [['recommended', 'Recommended'], ['all', 'All available'], ['areas', 'By area'], ['completed', 'Completed']]),
  ]
  const recommended = entries
    .filter(({ item }) => ['state', 'symptoms', 'resources'].includes(item.axis))
    .slice(0, 3)
  const completedDefinitions = definitions.filter((def) =>
    data.results.some((result) => result.definitionId === def.id),
  )
  const axisGroups = [
    ['state', ru ? 'Состояние' : 'State'],
    ['symptoms', ru ? 'Симптомы и нагрузка' : 'Symptoms & load'],
    ['function', ru ? 'Функционирование' : 'Functioning'],
    ['resources', ru ? 'Ресурсы и восстановление' : 'Resources & recovery'],
    ['baseline', 'Baseline'],
  ]

  async function start(def) {
    setBusy(true)
    setError(null)
    try {
      onStarted(await appFetch('runs', {
        definitionKey: def.key,
        definitionVersion: def.version,
        instrumentLocale: def.instrumentLocale,
        operationId: crypto.randomUUID(),
      }))
    } catch (e) {
      setError(e)
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

  function toggleFacet(setter, key) {
    setter((current) => {
      if (!current.includes(key)) return [...current, key]
      return current.length > 1 ? current.filter((item) => item !== key) : current
    })
    setPersonalized(null)
  }

  function buildRecommendations() {
    if (!selectedFocus.length) return
    setPersonalized(rankAssessmentDefinitions(definitions, {
      focus: selectedFocus,
      styles: testStyles,
      lengths: testLengths,
    }))
    setView('personalized')
  }

  function cardFor(def, { recommendedNow = false, rank = null } = {}) {
    const item = monitoringCatalogItem(def.key)
    const draft = data.runs.find((x) => x.definitionId === def.id)
    const completed = data.results.filter((x) => x.definitionId === def.id).at(-1)
    const title = item?.title?.[locale] || item?.title?.en || def.title
    const description = item?.description?.[locale] || item?.description?.en || ''
    const image =
      item?.axis === 'baseline'
        ? (ru ? '/images/holistic-house/video-posters/services-ru-v1.webp' : '/images/holistic-house/video-posters/services-en-v2.webp')
        : (ru ? '/images/holistic-house/video-posters/home-ru-v1.webp' : '/images/holistic-house/video-posters/home-en-v2.webp')

    return (
      <article className={`hh-monitoring-card${recommendedNow ? ' hh-monitoring-card--recommended' : ''}`} key={def.id}>
        <div className="hh-monitoring-photo" aria-hidden="true">
          <Image alt="" fill sizes="(max-width: 600px) 76px, 128px" src={image} />
        </div>
        <div className="hh-monitoring-card-body">
          {rank && <p className="hh-monitoring-rank">{recommendationCopy.rank} #{rank}</p>}
          {recommendedNow && <p className="hh-monitoring-recommended">{ru ? 'Рекомендуем сейчас' : 'Recommended now'}</p>}
          <p className="hh-monitoring-meta">
            {item?.questionCount || def.questions.length} {ru ? 'вопросов' : 'questions'} · ~{item?.durationMinutes || 2} {ru ? 'мин' : 'min'}
            {def.instrumentLocale !== locale ? ` · ${def.instrumentLocale.toUpperCase()}` : ''}
          </p>
          <h2>{title}</h2>
          <p>{description}</p>
          {def.source?.copyright && <p className="hh-fine">{def.source.copyright}</p>}
          {completed && <p className="hh-fine">{c.latest}: {dateLabel(completed.measurementAt, locale)}</p>}
          <div className="hh-actions">
            <button className="hh-primary" disabled={busy} onClick={() => (draft ? onStarted(draft) : start(def))}>
              {draft ? c.resume : completed ? c.repeat : c.start}
            </button>
            {completed && <Link href={`/${locale}/app/results/${completed.id}`} prefetch={false}>{c.view}</Link>}
          </div>
        </div>
      </article>
    )
  }

  return (
    <section className="hh-monitoring">
      <div className="hh-heading hh-monitoring-heading">
        <p className="hh-kicker">{ru ? 'Монитор состояния' : 'Mind–Body Monitor'}</p>
        <h1>{ru ? 'Тесты и самонаблюдение' : 'Tests & self-checks'}</h1>
        <p>{monitoringIntro}</p>
        <p className="hh-fine">{c.continueLater}</p>
        <button className="hh-secondary hh-recommendation-toggle" type="button" onClick={() => setShowRecommender((value) => !value)}>
          {recommendationCopy.action}
        </button>
      </div>

      {showRecommender && (
        <section className="hh-test-recommender" aria-labelledby="test-recommender-title">
          <div>
            <p className="hh-kicker">{recommendationCopy.action}</p>
            <h2 id="test-recommender-title">{recommendationCopy.title}</h2>
            <p>{recommendationCopy.text}</p>
          </div>
          <div className="hh-test-focus-grid">
            {TEST_RECOMMENDATION_FOCUS.map((item) => (
              <button type="button" key={item.key} aria-pressed={selectedFocus.includes(item.key)} onClick={() => toggleFocus(item.key)}>
                {item.label[locale] || item.label.en}
              </button>
            ))}
          </div>
          <div className="hh-test-facets">
            <fieldset className="hh-test-filter">
              <legend>{recommendationCopy.style}</legend>
              {TEST_STYLE_FILTERS.map((item) => (
                <button
                  type="button"
                  key={item.key}
                  aria-pressed={testStyles.includes(item.key)}
                  onClick={() => toggleFacet(setTestStyles, item.key)}
                >
                  {item.key === 'engaging' ? recommendationCopy.engaging : recommendationCopy.professional}
                </button>
              ))}
            </fieldset>
            <fieldset className="hh-test-filter">
              <legend>{recommendationCopy.length}</legend>
              {TEST_LENGTH_FILTERS.map((item) => (
                <button
                  type="button"
                  key={item.key}
                  aria-pressed={testLengths.includes(item.key)}
                  onClick={() => toggleFacet(setTestLengths, item.key)}
                >
                  {item.key === 'short'
                    ? recommendationCopy.short
                    : item.key === 'medium'
                      ? recommendationCopy.medium
                      : recommendationCopy.comprehensive}
                </button>
              ))}
            </fieldset>
          </div>
          <div className="hh-test-recommender-footer">
            <button className="hh-primary" type="button" disabled={!selectedFocus.length} onClick={buildRecommendations}>
              {recommendationCopy.build}
            </button>
            {!selectedFocus.length && <span>{recommendationCopy.choose}</span>}
            <small>{recommendationCopy.privacy}</small>
          </div>
        </section>
      )}

      <nav className="hh-monitoring-tabs" aria-label={ru ? 'Фильтр тестов' : 'Test filters'}>
        {tabs.map(([id, label]) => (
          <button type="button" key={id} aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>
        ))}
      </nav>

      {view === 'personalized' && personalized && (
        <section className="hh-ranked-tests" aria-labelledby="ranked-tests-title">
          <header>
            <h2 id="ranked-tests-title">{recommendationCopy.ranked}</h2>
            <p>{recommendationCopy.rankedText}</p>
          </header>
          <div className="hh-monitoring-grid">
            {personalized.map((item, index) => cardFor(item.definition, { recommendedNow: index === 0, rank: index + 1 }))}
          </div>
        </section>
      )}

      {view === 'recommended' && <div className="hh-monitoring-grid">{recommended.map(({ def }, index) => cardFor(def, { recommendedNow: index === 0 }))}</div>}
      {view === 'all' && <div className="hh-monitoring-grid">{definitions.map((def) => cardFor(def))}</div>}

      {view === 'areas' && (
        <div className="hh-monitoring-areas">
          {axisGroups.map(([axis, title]) => {
            const group = entries.filter(({ item }) => item.axis === axis || item.resultAxes?.includes(axis))
            return group.length ? (
              <section key={axis}>
                <h2>{title}</h2>
                <div className="hh-monitoring-grid">{group.map(({ def }) => cardFor(def))}</div>
              </section>
            ) : null
          })}
        </div>
      )}

      {view === 'completed' && (
        completedDefinitions.length
          ? <div className="hh-monitoring-grid">{completedDefinitions.map((def) => cardFor(def))}</div>
          : <article className="hh-panel hh-empty"><h2>{ru ? 'Пока нет пройденных тестов' : 'No completed tests yet'}</h2></article>
      )}
      {error && <p role="alert">{message(error, c)}</p>}
    </section>
  )
}

function TestPlanSummary({ locale, planId, results, onBack }) {
  const [plan, setPlan] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    if (!planId) return
    appFetch('test-plans/' + encodeURIComponent(planId)).then(setPlan).catch(setError)
  }, [planId])
  if (!plan) return <section className="hh-panel"><h1>{locale === 'ru' ? 'Загрузка набора…' : 'Loading set…'}</h1>{error && <p role="alert">{message(error, COPY[locale])}</p>}</section>
  const completed = results.filter((result) => plan.completedRunIds?.includes(result.runId))
  return <section className="hh-panel hh-test-plan-summary"><p className="hh-kicker">{locale === 'ru' ? 'Набор завершён' : 'Set complete'}</p><h1>{locale === 'ru' ? 'Ваш общий обзор' : 'Your combined overview'}</h1><p>{locale === 'ru' ? 'Каждый инструмент остаётся отдельным результатом: здесь нет синтетического медицинского балла или диагноза.' : 'Each instrument remains a separate result: this page does not create a synthetic medical score or diagnosis.'}</p><div className="hh-history-list">{completed.map((result) => <Link key={result.id} href={`/${locale}/app/results/${result.id}`} prefetch={false}>{getDefinitionById(result.definitionId).title} · {new Date(result.measurementAt).toLocaleDateString(locale)}</Link>)}</div><button type="button" onClick={onBack}>{locale === 'ru' ? 'К базе тестов' : 'Back to test explorer'}</button></section>
}

function Runner({ id, locale, onExit, onComplete }) {
  const c = COPY[locale],
    [run, setRun] = useState(null),
    [error, setError] = useState(null),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(''),
    [context, setContext] = useState({}),
    [showDiscard, setShowDiscard] = useState(false),
    [mode, setMode] = useState(null),
    [safetyAcknowledged, setSafetyAcknowledged] = useState(false)
  const operation = useRef(null),
    inflight = useRef(false)
  const modeCopy =
    locale === 'ru'
      ? {
          title: 'Как пройти этот тест?',
          intro: 'Выберите темп. Вопросы и расчёт результата в обоих режимах одинаковые.',
          quick: 'Quick',
          quickTitle: 'Быстро',
          quickText: 'Один ответ — и сразу следующий вопрос. Минимум лишних шагов.',
          guided: 'Guided',
          guidedTitle: 'С сопровождением',
          guidedText: 'Спокойный пошаговый формат с подсказками и ручным переходом дальше.',
          same: 'В обоих режимах используются те же вопросы и тот же расчёт результата.',
          tap: 'Нажмите на ответ — он сохранится, и тест продолжится автоматически.',
          guidedPrompt: 'Не спешите. Выберите вариант, который ближе всего к вашему ощущению.',
          part: 'Часть',
          question: 'Вопрос',
          switch: 'Режим прохождения',
        }
      : {
          title: 'How would you like to take this test?',
          intro: 'Choose your pace. Both modes use the same questions and the same scoring.',
          quick: 'Quick',
          quickTitle: 'Fast & simple',
          quickText: 'One tap saves your answer and moves straight to the next question.',
          guided: 'Guided',
          guidedTitle: 'Calm & guided',
          guidedText: 'A slower step-by-step flow with gentle prompts and a clear Next action.',
          same: 'Both use the same questions and produce the same result.',
          tap: 'Tap an answer to save it and continue automatically.',
          guidedPrompt: 'Take your time. Choose the answer that feels closest to your experience.',
          part: 'Part',
          question: 'Question',
          switch: 'Test mode',
        }

  async function load() {
    setError(null)
    try {
      const value = await appFetch('runs/' + id)
      setRun(value)
      if (value.safetySignal) setSafetyAcknowledged(false)
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
      if (next.safetySignal) setSafetyAcknowledged(false)
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
  async function chooseAnswer(value) {
    if (!question) return
    const progress =
      mode === 'quick' ? Math.min(index + 1, def.questions.length) : index
    await save({ [question.id]: value }, progress)
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

  if (run.safetySignal && !safetyAcknowledged) {
    const safety = SAFETY_COPY[locale] || SAFETY_COPY.en
    return (
      <section className="hh-panel hh-safety" role="alert" aria-live="assertive">
        <p className="hh-kicker">Holistic House</p>
        <h1>{safety.title}</h1>
        <p>{safety.text}</p>
        <p><strong>{safety.urgent}</strong></p>
        <p>{safety.support}</p>
        <div className="hh-actions">
          <a className="hh-primary" href="tel:988">988</a>
          <a href="sms:988">{locale === 'ru' ? 'Написать 988' : 'Text 988'}</a>
          <button type="button" onClick={() => setSafetyAcknowledged(true)}>{safety.continue}</button>
        </div>
      </section>
    )
  }

  const min = question?.min ?? def.answerScale?.min,
    max = question?.max ?? def.answerScale?.max,
    partCount = Math.min(4, Math.max(1, def.questions.length)),
    partSize = Math.ceil(def.questions.length / partCount),
    currentPart = Math.min(partCount, Math.floor(Math.min(index, def.questions.length - 1) / partSize) + 1)

  if (!mode && !isContext)
    return (
      <section className="hh-runner hh-panel hh-runner-mode-picker">
        <div className="hh-test-mode-intro">
          <p className="hh-kicker">
            {monitoringCatalogItem(def.key)?.title?.[locale] || monitoringCatalogItem(def.key)?.title?.en || def.title}
          </p>
          <h1>{modeCopy.title}</h1>
          <p>{modeCopy.intro}</p>
        </div>
        <div className="hh-test-mode-grid">
          <button className="hh-test-mode-card" type="button" onClick={() => setMode('quick')}>
            <span className="hh-test-mode-icon" aria-hidden="true">⚡</span>
            <span>
              <small>{modeCopy.quick}</small>
              <strong>{modeCopy.quickTitle}</strong>
              <em>{modeCopy.quickText}</em>
            </span>
          </button>
          <button className="hh-test-mode-card" type="button" onClick={() => setMode('guided')}>
            <span className="hh-test-mode-icon" aria-hidden="true">✦</span>
            <span>
              <small>{modeCopy.guided}</small>
              <strong>{modeCopy.guidedTitle}</strong>
              <em>{modeCopy.guidedText}</em>
            </span>
          </button>
        </div>
        <p className="hh-fine hh-test-mode-same">{modeCopy.same}</p>
        <div className="hh-actions hh-test-mode-exit">
          <button disabled={busy || Boolean(operation.current)} onClick={exit}>
            {c.saveExit}
          </button>
        </div>
      </section>
    )

  return (
    <section className={`hh-runner hh-panel hh-runner--${mode || 'guided'}`}>
      <header className="hh-runner-head">
        <div className="hh-runner-topline">
          <p className="hh-kicker">
            {monitoringCatalogItem(def.key)?.title?.[locale] || monitoringCatalogItem(def.key)?.title?.en || def.title} ·{' '}
            {def.instrumentLocale.toUpperCase()}
          </p>
          {!isContext && (
            <div className="hh-test-mode-toggle" role="group" aria-label={modeCopy.switch}>
              <button type="button" aria-pressed={mode === 'quick'} onClick={() => setMode('quick')}>
                ⚡ {modeCopy.quick}
              </button>
              <button type="button" aria-pressed={mode === 'guided'} onClick={() => setMode('guided')}>
                ✦ {modeCopy.guided}
              </button>
            </div>
          )}
        </div>
        <div
          className="hh-runner-segments"
          role="progressbar"
          aria-label={c.tests}
          aria-valuemin="1"
          aria-valuemax={def.questions.length}
          aria-valuenow={Math.min(index + 1, def.questions.length)}
        >
          {def.questions.map((item, step) => (
            <span
              key={item.id}
              className={step < index ? 'is-done' : step === index ? 'is-current' : ''}
              aria-hidden="true"
            />
          ))}
        </div>
        <div className="hh-runner-progress-copy">
          <span>
            {modeCopy.question} {Math.min(index + 1, def.questions.length)} / {def.questions.length}
          </span>
          {mode === 'guided' && !isContext && (
            <span>{modeCopy.part} {currentPart} / {partCount}</span>
          )}
        </div>
      </header>

      {def.source?.copyright && (
        <aside className="hh-instrument-attribution">
          <small>{def.source.copyright}</small>
          {def.source.citation && <small>{def.source.citation}</small>}
        </aside>
      )}
      <p className="hh-muted">
        {def.timeframe === 'past-7-days' ? c.pastWeek : def.timeframe === 'right-now' ? c.rightNow : c.general}
      </p>

      {question ? (
        <fieldset className="hh-runner-question" disabled={busy || Boolean(operation.current)}>
          {mode === 'guided' && <p className="hh-guided-step">{modeCopy.guidedPrompt}</p>}
          <legend>
            <h1>{question.text}</h1>
          </legend>
          <div className={def.answerScale ? 'hh-scale hh-scale-words' : 'hh-scale'}>
            {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={run.answers[question.id] === value}
                onClick={() => chooseAnswer(value)}
              >
                <strong>{value}</strong>
                {def.responseAnchors && <span>{def.responseAnchors[value - min]}</span>}
              </button>
            ))}
          </div>
          {question.anchors && (
            <div className="hh-anchors">
              <span>{question.anchors[0]}</span>
              <span>{question.anchors.at(-1)}</span>
            </div>
          )}
          {mode === 'quick' && <p className="hh-quick-hint">{modeCopy.tap}</p>}
        </fieldset>
      ) : (
        <div className="hh-runner-complete">
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

      <p role="status" aria-live="polite" className="hh-fine hh-runner-save-state">
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
      <div className="hh-actions hh-runner-actions">
        <button
          disabled={busy || index === 0 || Boolean(operation.current)}
          onClick={() => save({}, index - 1)}
        >
          {c.back}
        </button>
        {!isContext && mode === 'guided' && (
          <button
            className="hh-primary"
            disabled={busy || run.answers[question.id] === undefined || Boolean(operation.current)}
            onClick={next}
          >
            {c.next}
          </button>
        )}
        {isContext && (
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
function profileNumber(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '—'
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1).replace(/\.0$/, '')
}
function profileDelta(value) {
  if (value === null || value === undefined) return '—'
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '—'
  return `${numeric > 0 ? '+' : ''}${profileNumber(numeric)}`
}
function profileDashboardNextStep({ data, locale, nextStep }) {
  const ru = locale === 'ru'
  const root = `/${locale}/app`
  const draft = (data.runs || []).find((run) => ['draft', 'in_progress'].includes(run.status))

  if (draft) {
    const definition = getDefinitionById(draft.definitionId)
    const item = monitoringCatalogItem(definition.key)
    const title = item?.title?.[locale] || item?.title?.en || definition.title
    return {
      eyebrow: ru ? 'Продолжить' : 'Continue',
      title: ru ? `Закончить: ${title}` : `Finish: ${title}`,
      text: ru
        ? 'У вас есть незавершённый тест. Лучше закончить его, прежде чем начинать новый.'
        : 'You have an unfinished assessment. Finish it before starting another one.',
      action: ru ? 'Продолжить тест' : 'Continue test',
      href: `${root}/runs/${draft.id}`,
    }
  }

  const table = {
    state: {
      eyebrow: ru ? 'Рекомендуем сейчас' : 'Recommended now',
      title: ru ? 'Проверить текущее состояние' : 'Check your current state',
      text: ru
        ? 'Начните с короткого замера состояния — он создаст первую точку для дальнейшего сравнения.'
        : 'Start with a short current-state check. It creates a useful baseline for later comparison.',
      action: ru ? 'Начать мониторинг' : 'Start monitoring',
      href: `${root}/monitoring/hh-current-state`,
    },
    tendencies: {
      eyebrow: ru ? 'Рекомендуем дальше' : 'Recommended next',
      title: ru ? 'Добавить базовый профиль' : 'Add your baseline profile',
      text: ru
        ? 'Добавьте более устойчивые личностные показатели, чтобы профиль был не только про состояние сегодня.'
        : 'Add more stable personal measures so your profile is not based only on how you feel today.',
      action: ru ? 'Дополнить профиль' : 'Complete profile',
      href: `${root}/tests?mode=all`,
    },
    history: {
      eyebrow: ru ? 'Следующий полезный шаг' : 'Useful next step',
      title: ru ? 'Посмотреть динамику' : 'Review your changes',
      text: ru
        ? 'У вас уже есть базовые данные. Посмотрите историю и сравните повторные измерения.'
        : 'You already have useful baseline data. Review your history and compare repeat measurements.',
      action: ru ? 'Открыть динамику' : 'Open history',
      href: `${root}/history`,
    },
    report: {
      eyebrow: ru ? 'Новое для вас' : 'New for you',
      title: ru ? 'Открыть новый отчёт' : 'Open your new report',
      text: ru
        ? 'В кабинете есть непрочитанный материал от специалиста.'
        : 'There is an unread practitioner report waiting in your Cabinet.',
      action: ru ? 'Открыть отчёт' : 'Open report',
      href: `${root}${nextStep.href}`,
    },
    consultation: {
      eyebrow: ru ? 'Есть активное обращение' : 'Active request',
      title: ru ? 'Вернуться к консультации' : 'Return to your consultation',
      text: ru
        ? 'У вас уже есть открытый запрос. Можно посмотреть его статус и продолжить отсюда.'
        : 'You already have an open consultation request. Review its status and continue from here.',
      action: ru ? 'Открыть консультации' : 'Open consultations',
      href: `${root}/consultations`,
    },
    checkin: {
      eyebrow: ru ? 'Пора обновить данные' : 'Time for an update',
      title: ru ? 'Повторить текущий замер' : 'Repeat your current check',
      text: ru
        ? 'С момента прошлого измерения прошло достаточно времени — новый замер поможет увидеть динамику.'
        : 'Enough time has passed since your previous measurement. A new check can show meaningful change.',
      action: ru ? 'Повторить мониторинг' : 'Repeat monitoring',
      href: `${root}/monitoring/hh-current-state`,
    },
  }

  return table[nextStep.kind] || table.state
}

function ProfileActionHub({ data, locale, profile, nextStep }) {
  const ru = locale === 'ru'
  const root = `/${locale}/app`
  const resultCount = (data.results || []).length
  const requestCount = (data.requests || []).filter((request) => ['requested', 'contacted'].includes(request.status)).length
  const activeReports = (data.savedReports || []).filter((report) => report.available !== false).length
  const next = profileDashboardNextStep({ data, locale, nextStep })
  const latestResult = [...(data.results || [])].sort(
    (a, b) => Date.parse(b.measurementAt || 0) - Date.parse(a.measurementAt || 0),
  )[0]
  const latestLabel = latestResult
    ? dateLabel(latestResult.measurementAt, locale)
    : (ru ? 'пока нет' : 'none yet')

  const commonActions = ru
    ? [
        {
          id: 'state',
          group: 'monitor',
          title: 'Пройти бесплатный тест-анализ состояния и получить рекомендации',
          description: 'Короткий тест текущего состояния с результатом и понятным следующим шагом.',
          meta: 'Бесплатно · ~1 мин',
          href: `${root}/monitoring/hh-current-state`,
          image: '/images/holistic-house/video-posters/home-ru-v1.webp',
        },
        {
          id: 'recommendations',
          group: 'monitor',
          title: 'Подобрать персональную батарею тестов',
          description: 'Отметьте несколько важных зон и формат — система расставит подходящие тесты по приоритету.',
          meta: 'Персональный подбор',
          href: `${root}/tests?mode=recommendations`,
          image: '/images/holistic-house/video-posters/services-ru-v1.webp',
        },
        {
          id: 'portfolio',
          group: 'data',
          title: 'Портфель результатов',
          description: 'Графики, шкалы, сравнения и все измерения в одном месте.',
          meta: `Заполнено ${profile.coveragePercent}%`,
          href: `${root}/portfolio`,
          image: '/images/holistic-house/video-posters/homeopathy-ru-v1.webp',
        },
        {
          id: 'history',
          group: 'data',
          title: 'Динамика',
          description: 'Сравнить повторные замеры и изменения со временем.',
          meta: resultCount ? `${resultCount} результатов` : 'История появится после тестов',
          href: `${root}/history`,
          image: '/images/holistic-house/hero-olive-incense.webp',
        },
        {
          id: 'complete',
          group: 'grow',
          title: 'Дополнить профиль',
          description: 'Добавить недостающие слои через короткие или глубокие тесты.',
          meta: `${profile.coveredAxes.length} из 5 слоёв`,
          href: `${root}/tests?mode=all`,
          image: '/images/holistic-house/books-library.webp',
        },
        {
          id: 'consultations',
          group: 'support',
          title: 'Консультации',
          description: 'Обсудить результаты или вернуться к уже созданному обращению.',
          meta: requestCount ? `${requestCount} активных` : 'Связаться со специалистом',
          href: `${root}/consultations`,
          image: '/images/holistic-house/video-posters/services-ru-v1.webp',
        },
      ]
    : [
        {
          id: 'state',
          group: 'monitor',
          title: 'Take a free state analysis and get recommendations',
          description: 'A short current-state check with your result and a clear next step.',
          meta: 'Free · ~1 min',
          href: `${root}/monitoring/hh-current-state`,
          image: '/images/holistic-house/video-posters/home-en-v2.webp',
        },
        {
          id: 'recommendations',
          group: 'monitor',
          title: 'Build a personal test battery',
          description: 'Choose several priority areas and format preferences, then see the most relevant tests first.',
          meta: 'Personal selection',
          href: `${root}/tests?mode=recommendations`,
          image: '/images/holistic-house/video-posters/services-en-v2.webp',
        },
        {
          id: 'portfolio',
          group: 'data',
          title: 'Results portfolio',
          description: 'Charts, scales, comparisons and all measurements in one place.',
          meta: `${profile.coveragePercent}% complete`,
          href: `${root}/portfolio`,
          image: '/images/holistic-house/video-posters/homeopathy-en-v2.webp',
        },
        {
          id: 'history',
          group: 'data',
          title: 'Changes over time',
          description: 'Compare repeat measurements and review your history.',
          meta: resultCount ? `${resultCount} results` : 'History appears after tests',
          href: `${root}/history`,
          image: '/images/holistic-house/hero-olive-incense.webp',
        },
        {
          id: 'complete',
          group: 'grow',
          title: 'Complete my profile',
          description: 'Add missing layers with short or in-depth assessments.',
          meta: `${profile.coveredAxes.length} of 5 layers`,
          href: `${root}/tests?mode=all`,
          image: '/images/holistic-house/books-library.webp',
        },
        {
          id: 'consultations',
          group: 'support',
          title: 'Consultations',
          description: 'Discuss results or return to an existing request.',
          meta: requestCount ? `${requestCount} active` : 'Talk to a practitioner',
          href: `${root}/consultations`,
          image: '/images/holistic-house/video-posters/services-en-v2.webp',
        },
      ]

  const actions = activeReports
    ? [
        ...commonActions,
        {
          id: 'reports',
          group: 'support',
          title: ru ? 'Мои отчёты' : 'My reports',
          description: ru
            ? 'Материалы и отчёты, которые вы сохранили от специалиста.'
            : 'Reports and materials you saved from your practitioner.',
          meta: ru ? `${activeReports} сохранено` : `${activeReports} saved`,
          href: `${root}/reports`,
          image: ru
            ? '/images/holistic-house/video-posters/homeopathy-ru-v1.webp'
            : '/images/holistic-house/video-posters/homeopathy-en-v2.webp',
        },
      ]
    : commonActions

  const groups = ru
    ? [
        ['monitor', 'Сейчас'],
        ['data', 'Мои данные'],
        ['grow', 'Развивать профиль'],
        ['support', 'Поддержка'],
      ]
    : [
        ['monitor', 'Now'],
        ['data', 'My data'],
        ['grow', 'Build my profile'],
        ['support', 'Support'],
      ]

  return (
    <section className="hh-profile-dashboard" aria-labelledby="profile-dashboard-title">
      <div className="hh-profile-summary">
        <div>
          <span>{ru ? 'Профиль' : 'Profile'}</span>
          <strong>{profile.coveragePercent}%</strong>
          <small>{profile.coveredAxes.length} / 5 {ru ? 'слоёв' : 'layers'}</small>
        </div>
        <div>
          <span>{ru ? 'Результаты' : 'Results'}</span>
          <strong>{resultCount}</strong>
          <small>{ru ? 'сохранено' : 'saved'}</small>
        </div>
        <div>
          <span>{ru ? 'Последний замер' : 'Last check'}</span>
          <strong className="hh-profile-summary-date">{latestLabel}</strong>
          <small>{ru ? 'обновляется после теста' : 'updates after a test'}</small>
        </div>
      </div>

      <article className="hh-profile-next" aria-labelledby="profile-dashboard-title">
        <div className="hh-profile-next-copy">
          <p className="hh-kicker">{next.eyebrow}</p>
          <h2 id="profile-dashboard-title">{next.title}</h2>
          <p>{next.text}</p>
        </div>
        <Link className="hh-primary hh-profile-next-action" href={next.href} prefetch={false}>
          {next.action}
        </Link>
      </article>

      <div className="hh-profile-action-groups">
        {groups.map(([group, title]) => {
          const groupActions = actions.filter((action) => action.group === group)
          if (!groupActions.length) return null
          return (
            <section className="hh-profile-action-group" key={group}>
              <h3>{title}</h3>
              <div className="hh-profile-actions-grid">
                {groupActions.map((action) => (
                  <Link className="hh-profile-action-card" href={action.href} prefetch={false} key={action.id}>
                    <span className="hh-profile-action-photo" aria-hidden="true">
                      <Image alt="" fill sizes="(max-width: 760px) 76px, 96px" src={action.image} />
                    </span>
                    <span className="hh-profile-action-copy">
                      <strong>{action.title}</strong>
                      <span>{action.description}</span>
                      <small>{action.meta}</small>
                    </span>
                    <b aria-hidden="true">›</b>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </section>
  )
}

function PortfolioPage({ data, locale }) {
  const c = COPY[locale]
  const [selected, setSelected] = useState(null)
  const dimensions = data.snapshot?.dimensions || []
  const profile = profileCompletionRecommendations({
    snapshot: data.snapshot,
    results: data.results,
    locale,
  })

  return (
    <section>
      <div className="hh-heading hh-portfolio-heading">
        <p className="hh-kicker">{locale === 'ru' ? 'Мой профиль' : 'My profile'}</p>
        <h1>{locale === 'ru' ? 'Портфель результатов' : 'Results portfolio'}</h1>
        <p>
          {locale === 'ru'
            ? 'Подробные результаты, графики, сравнение замеров и рекомендации по тому, какие данные стоит добавить дальше.'
            : 'Detailed results, charts, measurement comparisons and recommendations for what to add next.'}
        </p>
      </div>

      <ProfileOverview profile={profile} locale={locale} />

      {dimensions.length > 0 && (
        <>
          {[
            ['state', c.state],
            ['symptoms', c.symptoms],
            ['function', c.functioning],
            ['resources', c.resources],
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
        </>
      )}

      {selected && (
        <section className="hh-panel hh-detail" aria-live="polite">
          <button className="hh-close" onClick={() => setSelected(null)}>
            {c.close}
          </button>
          <h2>{labelFor(selected.key, locale)}</h2>
          <p>{explanationFor(selected.key, locale)}</p>
          <p>{c.measured}: {dateLabel(selected.measurementAt, locale)}</p>
          <p>
            {c.source}: {getDefinitionById(selected.sourceDefinitionId).key} ·{' '}
            {getDefinitionById(selected.sourceDefinitionId).version} · {selected.instrumentLocale}
          </p>
          <div className="hh-actions">
            <Link href={`/${locale}/app/results/${selected.sourceResultId}`} prefetch={false}>{c.view}</Link>
            <Link href={`/${locale}/app/history`} prefetch={false}>{c.history}</Link>
          </div>
        </section>
      )}
    </section>
  )
}

function ProfileOverview({ profile, locale }) {
  const ru = locale === 'ru'
  const axisCopy = {
    state: ru ? 'Состояние' : 'State',
    symptoms: ru ? 'Симптомы и нагрузка' : 'Symptoms & load',
    function: ru ? 'Функционирование' : 'Functioning',
    resources: ru ? 'Ресурсы' : 'Resources',
    trait: ru ? 'Личностные особенности' : 'Personality',
  }
  const axisOrder = new Map(Object.keys(axisCopy).map((key, index) => [key, index]))
  const rows = [...profile.rows].sort(
    (a, b) =>
      (axisOrder.get(a.dimensionClass) ?? 99) - (axisOrder.get(b.dimensionClass) ?? 99) ||
      String(a.sourceConstruct || a.key).localeCompare(String(b.sourceConstruct || b.key)),
  )

  return (
    <section className="hh-profile-overview" aria-labelledby="profile-overview-title">
      <header className="hh-profile-overview-head">
        <div>
          <p className="hh-kicker">{ru ? 'Портфель результатов' : 'Results portfolio'}</p>
          <h2 id="profile-overview-title">
            {ru ? 'Все результаты в одной схеме' : 'All your results in one view'}
          </h2>
          <p>
            {ru
              ? 'Последние результаты по всем доступным шкалам собраны вместе. Предыдущее значение появляется только тогда, когда версия теста и сама шкала совместимы.'
              : 'Your latest measurements across available scales are brought together here. A previous value appears only when the test version and scale are compatible.'}
          </p>
        </div>
        <div className="hh-profile-coverage" aria-label={ru ? 'Заполненность профиля' : 'Profile coverage'}>
          <strong>{profile.coveragePercent}%</strong>
          <span>{profile.coveredAxes.length} / 5 {ru ? 'слоёв' : 'layers'}</span>
        </div>
      </header>

      <div className="hh-profile-progress" aria-hidden="true">
        <i style={{ width: `${profile.coveragePercent}%` }} />
      </div>

      <section className="hh-profile-map" aria-labelledby="profile-map-title">
        <div className="hh-profile-section-heading">
          <div>
            <p className="hh-kicker">{ru ? 'График' : 'Profile map'}</p>
            <h3 id="profile-map-title">{ru ? 'Последнее и предыдущее' : 'Latest vs previous'}</h3>
          </div>
          <p>
            {ru
              ? 'Каждая шкала показана на собственной позиции 0–100 для удобства графика. Это не общий балл здоровья: у разных шкал разный смысл направления.'
              : 'Each scale is mapped to its own 0–100 position for visualization only. This is not a combined health score; different scales have different directions.'}
          </p>
        </div>
        {rows.length ? (
          <div className="hh-profile-chart-list">
            {rows.map((row) => (
              <div className="hh-profile-chart-row" key={row.key}>
                <div className="hh-profile-chart-label">
                  <small>{axisCopy[row.dimensionClass] || row.dimensionClass}</small>
                  <strong>{row.sourceConstruct || labelFor(row.key, locale)}</strong>
                </div>
                <div
                  className="hh-profile-chart-track"
                  role="img"
                  aria-label={
                    `${row.sourceConstruct || labelFor(row.key, locale)}: ${profileNumber(row.value)} / ${row.max}`
                  }
                >
                  <i style={{ width: `${row.currentPercent || 0}%` }} />
                  {Number.isFinite(row.priorPercent) && (
                    <b
                      style={{ left: `${row.priorPercent}%` }}
                      title={
                        ru
                          ? `Предыдущее: ${profileNumber(row.priorValue)} / ${row.max}`
                          : `Previous: ${profileNumber(row.priorValue)} / ${row.max}`
                      }
                    />
                  )}
                </div>
                <div className="hh-profile-chart-values">
                  <strong>{profileNumber(row.value)} / {row.max}</strong>
                  <span>
                    {row.priorValue !== null
                      ? `${ru ? 'было' : 'was'} ${profileNumber(row.priorValue)} · ${profileDelta(row.delta)}`
                      : ru
                        ? 'первый замер'
                        : 'first measurement'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="hh-fine">
            {ru ? 'После первого теста здесь появится сводный график.' : 'Your combined chart will appear after the first completed check.'}
          </p>
        )}
      </section>

      <section className="hh-profile-table-section" aria-labelledby="profile-table-title">
        <div className="hh-profile-section-heading">
          <div>
            <p className="hh-kicker">{ru ? 'Таблица' : 'Table'}</p>
            <h3 id="profile-table-title">{ru ? 'Все шкалы' : 'All measurements'}</h3>
          </div>
          <p>
            {ru
              ? 'В таблице остаются исходные баллы каждой шкалы, дата последнего замера и корректное сравнение с предыдущим.'
              : 'The table keeps each scale’s original score, latest date and a compatible comparison with the previous measurement.'}
          </p>
        </div>
        {rows.length ? (
          <div className="hh-profile-table-wrap">
            <table className="hh-profile-table">
              <thead>
                <tr>
                  <th>{ru ? 'Показатель' : 'Measure'}</th>
                  <th>{ru ? 'Последнее' : 'Latest'}</th>
                  <th>{ru ? 'Предыдущее' : 'Previous'}</th>
                  <th>{ru ? 'Разница' : 'Difference'}</th>
                  <th>{ru ? 'Дата' : 'Date'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const definition = getDefinitionById(row.sourceDefinitionId)
                  return (
                    <tr key={row.key}>
                      <th scope="row">
                        <small>{axisCopy[row.dimensionClass] || row.dimensionClass}</small>
                        <strong>{row.sourceConstruct || labelFor(row.key, locale)}</strong>
                        <span>{definition.title || definition.key}</span>
                      </th>
                      <td><strong>{profileNumber(row.value)}</strong><small>{row.min}–{row.max}</small></td>
                      <td>
                        {row.priorValue !== null ? (
                          <>
                            <strong>{profileNumber(row.priorValue)}</strong>
                            <small>{row.priorMeasurementAt ? dateLabel(row.priorMeasurementAt, locale) : ''}</small>
                          </>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                      <td>{row.delta !== null ? <strong>{profileDelta(row.delta)}</strong> : <span>—</span>}</td>
                      <td><time dateTime={row.measurementAt}>{dateLabel(row.measurementAt, locale)}</time></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="hh-fine">{ru ? 'Пока нет завершённых тестов.' : 'No completed tests yet.'}</p>
        )}
      </section>

      <section className="hh-profile-recommendations" aria-labelledby="profile-recommendations-title">
        <div className="hh-profile-section-heading">
          <div>
            <p className="hh-kicker">{ru ? 'Что ещё пройти' : 'What to add next'}</p>
            <h3 id="profile-recommendations-title">
              {profile.complete
                ? ru ? 'Основные слои профиля собраны' : 'Core profile layers are covered'
                : ru ? 'Тесты, которые лучше всего достроят профиль' : 'Tests that best complete your profile'}
            </h3>
          </div>
          <p>
            {profile.complete
              ? ru
                ? 'Обязательных следующих тестов нет. Повторные замеры нужны только для наблюдения динамики.'
                : 'There is no required next test. Repeat measurements are useful only when you want to track change.'
              : ru
                ? 'Приоритет учитывает, сколько недостающих слоёв добавит тест. Не нужно проходить все тесты подряд.'
                : 'Priority reflects how many missing layers a test adds. You do not need to take every test.'}
          </p>
        </div>
        {profile.recommendations.length ? (
          <div className="hh-profile-recommendation-grid">
            {profile.recommendations.map((recommendation, index) => (
              <article key={recommendation.key}>
                <div>
                  <small>{ru ? `Приоритет ${index + 1}` : `Priority ${index + 1}`}</small>
                  <h4>{recommendation.item.title[locale] || recommendation.item.title.en}</h4>
                  <p>{recommendation.reason}</p>
                  <span>
                    {recommendation.item.questionCount} {ru ? 'вопросов' : 'questions'} · ~{recommendation.item.durationMinutes} {ru ? 'мин' : 'min'}
                    {recommendation.item.instrumentLocale === 'en' && locale === 'ru' ? ' · EN' : ''}
                  </span>
                </div>
                <Link
                  className="hh-primary"
                  href={`/${locale}/app/monitoring/${recommendation.key}`}
                  prefetch={false}
                >
                  {ru ? 'Открыть тест' : 'Open test'}
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="hh-profile-complete">
            <span aria-hidden="true">✓</span>
            <div>
              <strong>{ru ? 'Профиль можно развивать через динамику' : 'Your profile can now grow through history'}</strong>
              <p>
                {ru
                  ? 'Следующий полезный шаг — повторять совместимые шкалы со временем и смотреть изменения.'
                  : 'The next useful step is to repeat compatible scales over time and compare changes.'}
              </p>
            </div>
          </div>
        )}
      </section>
    </section>
  )
}

function MetricCard({ dimension, locale, onSelect }) {
  const c = COPY[locale],
    def = getDefinitionById(dimension.sourceDefinitionId)
  return (
    <button className="hh-metric" onClick={() => onSelect(dimension)}>
      <span>{dimension.sourceConstruct || labelFor(dimension.key, locale)}</span>
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
function Portrait({ data, locale }) {
  const c = COPY[locale]
  const dimensions = data.snapshot?.dimensions || []
  const nextStep = getPortraitNextStep({
    ...data,
    dimensions: dimensions.map((dimension) => {
      const result = data.results.find((candidate) => candidate.id === dimension.sourceResultId)
      return result
        ? { ...dimension, measurementAt: result.measurementAt, suggestedRepeatDays: getDefinitionById(result.definitionId)?.suggestedRepeatDays }
        : dimension
    }),
  })
  const profile = profileCompletionRecommendations({ snapshot: data.snapshot, results: data.results, locale })

  return (
    <section>
      <div className="hh-heading hh-profile-heading">
        <p className="hh-kicker">
          {data.account.displayName
            ? `${locale === 'ru' ? 'Здравствуйте' : 'Hello'}, ${data.account.displayName}`
            : 'Holistic House'}
        </p>
        <h1>{c.portrait}</h1>
        <p>
          {locale === 'ru'
            ? 'Здесь не нужно разбираться в таблицах. Выберите следующий шаг: проверить состояние, посмотреть результаты, получить рекомендации или дополнить профиль.'
            : 'You do not need to interpret a dashboard full of tables. Choose your next step: check in, review results, get recommendations or build your profile.'}
        </p>
        <p className="hh-fine">{c.private}</p>
      </div>

      <div className="hh-portrait-with-metrics">
        <ProfileActionHub data={data} locale={locale} profile={profile} nextStep={nextStep} />
        <TestExplorerVisual locale={locale} coverage={coverageForFocus([])} portrait={buildPsychPortrait(data.results)} compactPortrait portraitActions={<PortraitReportActions data={data} locale={locale} />} />
      </div>

      <div className="hh-profile-mood">
        <MoodCheckIn
          locale={locale}
          compact
          latestMood={data.moodCheckins?.[0] || null}
          onMoodChange={(payload) =>
            appFetch('mood', {
              ...payload,
              timezone: localZone(),
              sourceSurface: 'portrait',
            })
          }
          onQuickCheckin={async () => {
            try {
              const def = getAssessmentDefinition('hh-current-state', 'v2', locale)
              const run = await appFetch('runs', {
                definitionKey: def.key,
                definitionVersion: def.version,
                instrumentLocale: def.instrumentLocale,
                operationId: crypto.randomUUID(),
              })
              window.location.assign('/' + locale + '/app/runs/' + run.id)
            } catch {
              window.location.assign('/' + locale + '/app/monitoring/hh-current-state')
            }
          }}
        />
      </div>

      {data.practitioner && <OwnerTools locale={locale} />}
      <ReportsFromAndy data={data} locale={locale} />
    </section>
  )
}
function OwnerTools({ locale }) {
  const ru = locale === 'ru'
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const actions = [
    ['clients', ru ? 'Клиенты' : 'Clients', ru ? 'База клиентов, история и документы.' : 'Client database, history and documents.'],
    ['consultation', ru ? 'Новая консультация' : 'New consultation', ru ? 'Клиент → назначение → квитанция или счёт.' : 'Client → recommendation → receipt or invoice.'],
    ['recommendation', ru ? 'Рекомендация / рецепт' : 'Recommendation / prescription', ru ? 'Создать отдельный документ назначения.' : 'Create a standalone recommendation document.'],
    ['payment', ru ? 'Квитанция / счёт' : 'Receipt / Invoice', ru ? 'Создать отдельный платёжный документ.' : 'Create a standalone payment document.'],
  ]

  async function open(destination) {
    if (busy) return
    setBusy(destination)
    setError('')
    try {
      const result = await appFetch('practitioner/open', { destination })
      window.location.assign(result.redirectUrl)
    } catch {
      setBusy('')
      setError(ru ? 'Не удалось открыть рабочий кабинет. Попробуйте ещё раз.' : 'Practitioner tools could not be opened. Please retry.')
    }
  }

  return (
    <section className="hh-panel hh-owner-tools" aria-labelledby="owner-tools-title">
      <div className="hh-owner-tools-heading">
        <div>
          <p className="hh-kicker">{ru ? 'Практика' : 'Practice'}</p>
          <h2 id="owner-tools-title">{ru ? 'Кабинет практика' : 'Practitioner tools'}</h2>
          <p>{ru ? 'Клиенты, назначения, квитанции и счета из вашей существующей базы.' : 'Clients, recommendations, receipts and invoices from your existing practice database.'}</p>
        </div>
        <button className="hh-owner-cabinet-link" type="button" disabled={Boolean(busy)} onClick={() => open('cabinet')}>
          {ru ? 'Весь кабинет' : 'Open cabinet'}
        </button>
      </div>
      <div className="hh-owner-tools-grid">
        {actions.map(([id, title, description]) => (
          <button type="button" key={id} disabled={Boolean(busy)} onClick={() => open(id)}>
            <span>
              <strong>{title}</strong>
              <small>{description}</small>
            </span>
            <b aria-hidden="true">›</b>
          </button>
        ))}
      </div>
      {error && <p className="hh-owner-tools-error" role="alert">{error}</p>}
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
  const reports = reportTimeline(data.savedReports).filter((report) => report.available !== false).slice(0, 3)
  const ru = locale === 'ru'
  if (!reports.length) return null
  return <section className="hh-section hh-account-reports"><h2>{ru ? 'Отчёты от Andy' : 'Reports from Andy'}</h2><div className="hh-grid">{reports.map((report) => <article className="hh-panel" key={report.id}><p className="hh-kicker">{ru ? 'Полученный отчёт' : 'Received report'}</p><h3>{formatReportDate(report.occurredOn, locale)}</h3><p>{ru ? 'Дата отчёта' : 'Report date'}: {formatReportDate(report.occurredOn, locale)}</p><Link href={`/${locale}/app/reports/${report.id}`} prefetch={false}>{ru ? 'Открыть отчёт' : 'Open report'}</Link></article>)}</div></section>
}
function ResultConsultationCta({ locale }) {
  const copy =
    locale === 'ru'
      ? {
          kicker: 'Если хочется обсудить результат',
          title: 'Заказать консультацию специалиста',
          text: 'Можно выбрать подходящего специалиста и спокойно разобрать результат вместе. Ваш результат остаётся приватным и не передаётся автоматически.',
          action: 'Выбрать специалиста',
        }
      : {
          kicker: 'If you would like to discuss your result',
          title: 'Book a consultation with a specialist',
          text: 'Choose a practitioner and review the result together. Your result stays private and is not shared automatically.',
          action: 'Choose a specialist',
        }

  return (
    <aside className="hh-result-consultation" aria-label={copy.title}>
      <div>
        <p className="hh-kicker">{copy.kicker}</p>
        <h2>{copy.title}</h2>
        <p>{copy.text}</p>
      </div>
      <Link className="hh-primary hh-result-consultation-action" href={`/${locale}/services`} prefetch={false}>
        {copy.action}
      </Link>
    </aside>
  )
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
  const guidance = nextPersonalRecommendation({ results: data.results, snapshot: data.snapshot, locale })
  const changeSummary = resultChangeSummary(result, data.results, locale)
  const series = seriesFor(data.results, result),
    previous = series
      .filter(
        (r) =>
          r.id !== result.id && Date.parse(r.measurementAt) <= Date.parse(result.measurementAt),
      )
      .at(-1),
    diff = previous ? compareResults(result, previous) : [],
    title =
      monitoringCatalogItem(result.definitionKey)?.title?.[locale] ||
      monitoringCatalogItem(result.definitionKey)?.title?.en ||
      result.definitionKey
  return (
    <article className="hh-result-page">
      <header className="hh-result-hero">
        <div>
          <p className="hh-kicker">{c.result}</p>
          <h1>{title}</h1>
          <p className="hh-result-intro">
            {locale === 'ru'
              ? 'Ваш личный замер состояния — спокойно, без ярлыков и автоматических выводов.'
              : 'Your personal measurement — calm, private and without automatic labels.'}
          </p>
        </div>
        <div className="hh-result-meta">
          <span>{dateLabel(result.measurementAt, locale)}</span>
          <span>{result.instrumentLocale.toUpperCase()}</span>
        </div>
      </header>

      {result.definitionKey === 'mini-ipip-20' && <p className="hh-notice">{c.traitNotice}</p>}

      <section className="hh-result-section" aria-labelledby="result-values-title">
        <div className="hh-result-section-heading">
          <div>
            <p className="hh-kicker">{locale === 'ru' ? 'Результаты' : 'Results'}</p>
            <h2 id="result-values-title">{locale === 'ru' ? 'Ваши показатели' : 'Your measurements'}</h2>
          </div>
          <p className="hh-result-section-note">
            {previous
              ? locale === 'ru'
                ? 'Изменение показано только относительно совместимого предыдущего замера.'
                : 'Change is shown only against a compatible previous measurement.'
              : locale === 'ru'
                ? 'Это первый совместимый замер — он станет вашей личной точкой отсчёта.'
                : 'This is your first compatible measurement and becomes your personal baseline.'}
          </p>
        </div>

        <div className="hh-result-metrics" data-count={Math.min(result.dimensions.length, 3)}>
          {result.dimensions.map((d) => {
            const delta = diff.find((x) => x.key === d.key)?.delta
            return (
              <section className="hh-result-metric" key={d.key}>
                <div className="hh-result-metric-copy">
                  <h3>{d.sourceConstruct || labelFor(d.key, locale)}</h3>
                  {explanationFor(d.key, locale) && <p>{explanationFor(d.key, locale)}</p>}
                </div>
                <div className="hh-result-score">
                  <strong>{d.value}</strong>
                  <span>/ {d.max}</span>
                </div>
                <div className="hh-result-metric-foot">
                  <span>{c.scale} {d.min}–{d.max}</span>
                  <span className="hh-result-delta">
                    {delta === undefined ? c.baseline : `${c.change}: ${delta > 0 ? '+' : ''}${delta}`}
                  </span>
                </div>
              </section>
            )
          })}
        </div>
      </section>

      <aside className="hh-result-guidance"><p className="hh-kicker">{locale === 'ru' ? 'Что означает этот замер' : 'What this check-in tells you'}</p>
        <h2>{locale === 'ru' ? 'Ваша личная динамика и следующий шаг' : 'Your progress and next step'}</h2>
        {changeSummary.previous ? <p>{locale === 'ru' ? 'Есть совместимый предыдущий замер' : 'Compatible previous result'}: {dateLabel(changeSummary.previous.measurementAt, locale)}. {locale === 'ru' ? 'Изменения показателей не доказывают причину или диагноз.' : 'Score changes alone do not establish a cause or diagnosis.'}</p> : <p>{locale === 'ru' ? 'Это первая совместимая точка отсчёта. В дальнейшем можно сравнить результат с повторным прохождением.' : 'This is your first comparable baseline. Future check-ins can be compared with it.'}</p>}
        {!!changeSummary.changes.length && <ul>{changeSummary.changes.slice(0, 5).map((change) => <li key={change.key}>{change.label}: {change.from} → {change.to} ({change.delta > 0 ? '+' : ''}{change.delta})</li>)}</ul>}
        <h3>{guidance.title}</h3><p>{guidance.reason}</p>{guidance.observation && <p className="hh-fine">{guidance.observation}</p>}{guidance.reflection && <p><strong>{locale === 'ru' ? 'Что попробовать: ' : 'Something to try: '}</strong>{guidance.reflection}</p>}<div className="hh-actions"><Link href={guidance.key ? `/${locale}/app/tests?suggest=${encodeURIComponent(guidance.key)}` : `/${locale}/app/history`}>{guidance.key ? (locale === 'ru' ? 'Выбрать рекомендуемый тест' : 'Choose suggested test') : (locale === 'ru' ? 'Посмотреть историю' : 'Review history')}</Link><Link href={`/${locale}/app/history`}>{locale === 'ru' ? 'Все прошлые результаты' : 'All past results'}</Link></div>
        <small>{locale === 'ru' ? 'Автоматическая подсказка не является диагнозом или индивидуальным назначением лечения.' : 'This automatic suggestion is not a diagnosis or personalized treatment.'}</small>
      </aside>
      {Object.entries(result.context || {}).length > 0 && (
        <aside className="hh-context-at-checkin hh-result-context">
          <p className="hh-kicker">{locale === 'ru' ? 'Ваш контекст' : 'Your context'}</p>
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

      <ResultConsultationCta locale={locale} />

      <footer className="hh-result-footer">
        <p className="hh-result-source">
          {c.source}: {result.definitionKey} · {result.definitionVersion} · {result.instrumentLocale.toUpperCase()}
        </p>
        <p className="hh-fine">{c.versionBoundary}</p>
        <div className="hh-result-footer-actions">
          <Link className="hh-primary" href={'/' + locale + '/app/monitoring/' + result.definitionKey} prefetch={false}>
            {c.viewTrend}
          </Link>
          <Link href={'/' + locale + '/app/history'} prefetch={false}>{c.history}</Link>
          <Link href={'/' + locale + '/app/tests'} prefetch={false}>{locale === 'ru' ? 'Все тесты' : 'All tests'}</Link>
        </div>
      </footer>
    </article>
  )
}
function SavedPaymentDocument({ document, locale }) {
  const ru = locale === 'ru'
  const received = document.paymentStatus === 'received'
  const amount = (Number(document.amount || 0) / 100)
    .toFixed(2)
    .replace('.', ru ? ',' : '.')
  return (
    <article className="hh-panel hh-saved-client-document">
      <p className="hh-kicker">Holistic House</p>
      <h1>{received ? (ru ? 'Квитанция' : 'Receipt') : (ru ? 'Счёт' : 'Invoice')}</h1>
      <dl className="hh-saved-document-details">
        <div><dt>{ru ? 'Клиент' : 'Client'}</dt><dd>{document.patientName}</dd></div>
        <div><dt>{ru ? 'Дата документа' : 'Date issued'}</dt><dd>{document.dateIssued}</dd></div>
        <div><dt>{ru ? 'Услуга' : 'Service'}</dt><dd>{document.service}</dd></div>
        {document.consultations && <div><dt>{ru ? 'Количество консультаций' : 'Consultations'}</dt><dd>{document.consultations}</dd></div>}
        <div><dt>{received ? (ru ? 'Получено' : 'Amount received') : (ru ? 'К оплате' : 'Amount due')}</dt><dd>{document.currency} {amount}</dd></div>
        {document.dateOfService && <div><dt>{ru ? 'Дата услуги' : 'Date of service'}</dt><dd>{document.dateOfService}</dd></div>}
        {document.paymentMethod && <div><dt>{ru ? 'Способ оплаты' : 'Payment method'}</dt><dd>{document.paymentMethod}</dd></div>}
        {document.documentNumber && <div><dt>{ru ? 'Номер' : 'Number'}</dt><dd>{document.documentNumber}</dd></div>}
      </dl>
    </article>
  )
}

function SavedRecommendationDocument({ document, locale }) {
  const ru = locale === 'ru'
  return (
    <article className="hh-panel hh-saved-client-document">
      <p className="hh-kicker">Holistic House</p>
      <h1>{ru ? 'Рекомендация' : 'Recommendation'}</h1>
      <dl className="hh-saved-document-details">
        <div><dt>{ru ? 'Клиент' : 'Client'}</dt><dd>{document.patientName}</dd></div>
        <div><dt>{ru ? 'Дата' : 'Date'}</dt><dd>{document.dateIssued}</dd></div>
        {document.patientDob && <div><dt>{ru ? 'Дата рождения' : 'Date of birth'}</dt><dd>{document.patientDob}</dd></div>}
        {document.recommendationNumber && <div><dt>{ru ? 'Номер' : 'Number'}</dt><dd>{document.recommendationNumber}</dd></div>}
        {document.practitionerName && <div><dt>{ru ? 'Специалист' : 'Practitioner'}</dt><dd>{document.practitionerName}{document.practitionerRole ? ' · ' + document.practitionerRole : ''}</dd></div>}
        {document.practitionerContact && <div><dt>{ru ? 'Контакт' : 'Contact'}</dt><dd>{document.practitionerContact}</dd></div>}
      </dl>
      <div className="hh-saved-recommendation-list">
        {(document.items || []).map((item, index) => (
          <section key={index}>
            <h2>{index + 1}. {item.displayName}</h2>
            <dl className="hh-saved-document-details">
              {item.potency && <div><dt>{ru ? 'Потенция' : 'Potency'}</dt><dd>{item.potency}</dd></div>}
              {item.granules && <div><dt>{ru ? 'Гранулы' : 'Granules'}</dt><dd>{item.granules}</dd></div>}
              {item.timesPerDay && <div><dt>{ru ? 'Раз в день' : 'Times per day'}</dt><dd>{item.timesPerDay}</dd></div>}
              {item.dosage && <div><dt>{ru ? 'Дозировка' : 'Dosage'}</dt><dd>{item.dosage}</dd></div>}
              {item.frequency && <div><dt>{ru ? 'Частота' : 'Frequency'}</dt><dd>{item.frequency}</dd></div>}
              {item.duration && <div><dt>{ru ? 'Длительность' : 'Duration'}</dt><dd>{item.duration}</dd></div>}
              {item.sequence && <div><dt>{ru ? 'Последовательность' : 'Sequence'}</dt><dd>{item.sequence}</dd></div>}
              {item.instructions && <div><dt>{ru ? 'Инструкция' : 'Instructions'}</dt><dd>{item.instructions}</dd></div>}
              {item.purpose && <div><dt>{ru ? 'Назначение' : 'Purpose'}</dt><dd>{item.purpose}</dd></div>}
            </dl>
          </section>
        ))}
      </div>
      {document.generalInstructions && <section className="hh-saved-document-note"><h2>{ru ? 'Общие рекомендации' : 'General guidance'}</h2><p>{document.generalInstructions}</p></section>}
      {document.followUp && <p className="hh-fine">{ru ? 'Контроль' : 'Follow-up'}: {document.followUp}</p>}
    </article>
  )
}

function SavedDocumentPage({ id, locale, reload }) {
  const router = useRouter()
  const [value, setValue] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const ru = locale === 'ru'
  useEffect(() => {
    let live = true
    appFetch('documents/' + id + '?locale=' + locale)
      .then((result) => {
        if (live) setValue(result)
      })
      .catch((e) => {
        if (live) setError(e)
      })
    return () => {
      live = false
    }
  }, [id, locale])
  async function remove() {
    setBusy(true)
    setError(null)
    try {
      await appFetch('documents/' + id + '/remove', {})
      await reload()
      router.replace('/' + locale + '/app/history')
    } catch (e) {
      setError(e)
      setBusy(false)
    }
  }
  if (error?.code === 'DOCUMENT_UNAVAILABLE' || error?.code === 'NOT_FOUND')
    return (
      <section className="hh-panel">
        <h1>{ru ? 'Документ больше недоступен' : 'Document no longer available'}</h1>
        <p>{ru ? 'Запись может оставаться в истории, но исходный документ был отозван или больше недоступен.' : 'The history reference may remain, but the source document was revoked or is no longer available.'}</p>
        <Link className="hh-primary" href={'/' + locale + '/app/history'} prefetch={false}>
          {ru ? 'Вернуться в историю' : 'Back to History'}
        </Link>
      </section>
    )
  if (error) return <p role="alert">{ru ? 'Не удалось открыть документ.' : 'The document could not be opened.'}</p>
  if (!value) return <p>{ru ? 'Загружаем документ…' : 'Loading document…'}</p>
  return (
    <section>
      <div className="hh-panel">
        <p className="hh-kicker">{ru ? 'Сохранённый документ' : 'Saved document'}</p>
        <p className="hh-fine">{ru ? 'Сохранено' : 'Saved'}: {dateLabel(value.savedAt, locale)}</p>
      </div>
      {value.kind === 'receipt' || value.kind === 'invoice'
        ? <SavedPaymentDocument document={value.document} locale={locale} />
        : <SavedRecommendationDocument document={value.document} locale={locale} />}
      <div className="hh-panel hh-actions">
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
    prior = series.find((r) => r.id === priorId) || series.filter((r) => r.id !== latest?.id && Date.parse(r.measurementAt) <= Date.parse(latest.measurementAt)).at(-1)
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
  const testGroups = assessmentHistoryGroups(data.results, data.runs, locale)
  const personalNext = nextPersonalRecommendation({ results: data.results, snapshot: data.snapshot, locale })
  const timeline = [
    ...results.map((r) => ({
      id: r.id,
      date: r.measurementAt,
      title: r.definitionKey === 'hh-current-state' ? c.state : r.definitionKey === 'hh-weekly-pulse' ? c.weekly : c.personality,
      href: `/${locale}/app/results/${r.id}`,
    })),
    ...(data.moodCheckins || []).map((mood) => ({
      id: 'mood:' + mood.id,
      date: mood.occurredAt,
      title:
        (mood.mood === 'sad' ? '😔 ' : mood.mood === 'neutral' ? '😐 ' : '🙂 ') +
        (locale === 'ru' ? 'Настроение' : 'Mood'),
      note: mood.category
        ? (locale === 'ru' ? 'Контекст: ' : 'Context: ') + mood.category
        : undefined,
    })),
    ...reportTimeline(data.savedReports).map((report) => ({
      id: report.id,
      date: `${report.occurredOn}T00:00:00.000Z`,
      title: c.reportFromAndy,
      href: `/${locale}/app/reports/${report.id}`,
      note: `${c.saved}: ${dateLabel(report.savedAt, locale)}`,
    })),
    ...(data.savedDocuments || []).map((document) => ({
      id: document.id,
      date: `${document.occurredOn}T00:00:00.000Z`,
      title:
        document.kind === 'receipt'
          ? (locale === 'ru' ? 'Квитанция от Andy' : 'Receipt from Andy')
          : document.kind === 'invoice'
            ? (locale === 'ru' ? 'Счёт от Andy' : 'Invoice from Andy')
            : (locale === 'ru' ? 'Рекомендация от Andy' : 'Recommendation from Andy'),
      href: `/${locale}/app/documents/${document.id}`,
      note: `${c.saved}: ${dateLabel(document.savedAt, locale)}`,
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
      <section className="hh-assessment-history" aria-labelledby="hh-past-tests-title">
        <div className="hh-assessment-history-heading">
          <div><p className="hh-kicker">{locale === 'ru' ? 'Мои сохранённые замеры' : 'My saved measurements'}</p>
          <h2 id="hh-past-tests-title">{locale === 'ru' ? 'Результаты прошлых тестов' : 'Past test results'}</h2>
          <p>{locale === 'ru' ? 'Вся история сохраняется по датам. Каждый тест можно открыть, сравнить с совместимым предыдущим результатом или пройти повторно.' : 'Your results are kept by date. Open any result, compare compatible measurements, or take the test again.'}</p></div>
          <Link className="hh-primary" href={`/${locale}/app/tests`}>{locale === 'ru' ? 'Подобрать тесты' : 'Find tests'}</Link>
        </div>
        {testGroups.length ? <div className="hh-assessment-history-list">{testGroups.map((group) => (
          <article className="hh-assessment-history-item" key={group.key}>
            <div className="hh-assessment-history-item-head"><div><h3>{group.title}</h3>
              <p>{locale === 'ru' ? 'Прохождений' : 'Completed'}: <strong>{group.count}</strong>{group.latest && <> · {locale === 'ru' ? 'Последний' : 'Most recent'}: <time>{dateLabel(group.latest.measurementAt, locale)}</time></>}</p></div>
              {group.latest && <Link href={`/${locale}/app/results/${group.latest.id}`}>{locale === 'ru' ? 'Последний результат →' : 'Latest result →'}</Link>}</div>
            {group.latest && <div className="hh-assessment-history-dimensions">{group.latest.dimensions.map((d) => (
              <div key={d.key}><span>{d.sourceConstruct || labelFor(d.key, locale)}</span><strong>{d.value} <small>/ {d.max}</small></strong></div>
            ))}</div>}
            {group.count > 1 && <details className="hh-assessment-history-previous"><summary>{locale === 'ru' ? `Все прохождения (${group.count})` : `All attempts (${group.count})`}</summary><ul>{group.history.map((result) => <li key={result.id}><time>{dateLabel(result.measurementAt, locale)}</time> <Link href={`/${locale}/app/results/${result.id}`}>{locale === 'ru' ? 'Открыть результат' : 'Open result'}</Link></li>)}</ul></details>}
            <div className="hh-actions">{group.draft && <Link href={`/${locale}/app/runs/${group.draft.id}`}>{locale === 'ru' ? 'Продолжить начатый тест' : 'Resume unfinished test'}</Link>}
              <Link href={`/${locale}/app/tests?suggest=${encodeURIComponent(group.key)}`}>{group.count ? (locale === 'ru' ? 'Пройти ещё раз' : 'Retake test') : (locale === 'ru' ? 'Начать тест' : 'Start test')}</Link></div>
          </article>
        ))}</div> : <p className="hh-panel">{locale === 'ru' ? 'Пока нет завершённых тестов. Начните с короткого замера: он станет вашей личной точкой отсчёта.' : 'No completed tests yet. Start with a short check-in to create your personal baseline.'}</p>}
        <aside className="hh-assessment-history-next"><div><p className="hh-kicker">{locale === 'ru' ? 'Персональная подсказка' : 'Personal next step'}</p><h3>{personalNext.title}</h3><p>{personalNext.reason}</p>{personalNext.observation && <p className="hh-fine">{personalNext.observation}</p>}{personalNext.reflection && <p><strong>{locale === 'ru' ? 'Практическая подсказка: ' : 'Something to try: '}</strong>{personalNext.reflection}</p>}<small>{locale === 'ru' ? 'Это навигация по самонаблюдению, а не медицинская оценка. Ваши результаты не отправляются специалисту автоматически.' : 'Guidance for self-monitoring, not a medical judgement. Your results are not automatically sent to a practitioner.'}</small></div><Link href={personalNext.key ? `/${locale}/app/tests?suggest=${encodeURIComponent(personalNext.key)}` : `/${locale}/app/history`}>{personalNext.key ? (locale === 'ru' ? 'Выбрать тест' : 'Choose test') : (locale === 'ru' ? 'Моя история' : 'My history')}</Link></aside>
      </section>
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
                    {d.sourceConstruct || labelFor(d.key, locale)}
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
              {c.since} {dateLabel(prior.measurementAt, locale)}: {dimension.sourceConstruct || labelFor(dimension.key, locale)}{' '}
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
              aria-label={`${dimension.sourceConstruct || labelFor(dimension.key, locale)} — ${c.history}`}
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
              {dimension.sourceConstruct || labelFor(dimension.key, locale)} · {c.scale} {dimension.min}–{dimension.max}
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
function Consultations({ data, locale, reload, initialServiceId = '', requestRecommendations = false }) {
  const c = COPY[locale],
    [selected, setSelected] = useState(null),
    [error, setError] = useState(null),
    [recommendationOpened, setRecommendationOpened] = useState(false)
  useEffect(() => {
    if (!requestRecommendations || recommendationOpened || initialServiceId) return
    setRecommendationOpened(true)
    const services = data.services || []
    const suitable = services.find((service) => /consult|consultation|diagnos|review|psych|консульт|диагност|психо/i.test([service.copy?.en?.title, service.copy?.ru?.title].filter(Boolean).join(' ')))
    if (suitable || services.length === 1) setSelected(suitable || services[0])
  }, [requestRecommendations, recommendationOpened, initialServiceId, data.services])
  useEffect(() => {
    if (!initialServiceId || selected) return
    const service = (data.services || []).find((item) => item.id === initialServiceId)
    if (service) setSelected(service)
  }, [data.services, initialServiceId, selected])
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
      {requestRecommendations && <div className="hh-cabinet-recommendations-intro" role="status">
        <strong>{locale === 'ru' ? 'Запрос рекомендаций специалиста' : 'Request specialist recommendations'}</strong>
        <p>{locale === 'ru' ? 'Выберите подходящий вид консультации и отправьте запрос. Ваши результаты остаются личными: в форме можно отдельно выбрать один результат и дать согласие поделиться им.' : 'Choose the appropriate consultation and send your request. Your saved tests stay private: the form lets you select one result and explicitly consent to share it.'}</p>
      </div>}
      <div className="hh-grid hh-services">
        {!(data.services || []).length && <p>{c.emptyServices || c.emptyRequests}</p>}
        {(data.services || []).map((service) => (
          <article className="hh-panel" key={service.id}>
            <p className="hh-kicker">{service.practitionerName}{service.professionalTitle ? ` · ${service.professionalTitle}` : ''}</p>
            <h2>{service.copy[locale].title}</h2>
            <p>{service.copy[locale].description}</p>
            <p className="hh-fine">{service.pricingMode !== 'contact' && service.confirmedPrice != null ? `${service.pricingMode === 'from' ? (locale === 'ru' ? 'от ' : 'from ') : ''}${service.currency || ''} ${service.confirmedPrice}` : c.price}{service.durationMinutes ? ` · ${service.durationMinutes} min` : ''}</p>
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
          requestRecommendations={requestRecommendations}
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
              {(data.services || []).find((s) => s.id === request.serviceId)?.copy?.[locale]?.title ||
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
function RequestForm({ service, locale, data, close, onDone, requestRecommendations = false }) {
  const c = COPY[locale],
    [contact, setContact] = useState(data.email || ''),
    [note, setNote] = useState(requestRecommendations ? (locale === 'ru' ? 'Здравствуйте! Хочу получить индивидуальные рекомендации специалиста по результатам моих тестов.' : 'Hello! I would like specialist recommendations informed by my completed assessments.') : ''),
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
                  {d.sourceConstruct || labelFor(d.key, locale)}: {d.value} / {d.max}
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
