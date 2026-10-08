'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TestExplorer } from './test-explorer'
import { TestExplorerVisual } from './test-explorer-visual'
import { coverageForFocus } from '@/lib/assessments/test-explorer'
import { buildPsychPortrait } from '@/lib/assessments/psych-portrait'
import { getDefinitionById } from '@/lib/assessments/definitions'
import { monitoringCatalogItem } from '@/data/assessments/catalog'
import { buildExplorerEntries } from '@/lib/assessments/test-explorer'
import { PENDING_TEST_SELECTION_KEY, readTestSelectionIntent, validTestKeys } from '@/lib/app/test-selection-intent'
import styles from './account-test-battery.module.css'

const COPY = {
  en: {
    title: 'Your selected tests', intro: 'Your personal test battery is ready. Start any test, save your progress and return whenever you need.',
    done: 'completed', pending: 'Not started', underway: 'In progress', finished: 'Completed',
    begin: 'Start testing', resume: 'Continue test', repeat: 'Retake test', see: 'View result',
    choose: 'Choose or change tests', hide: 'Hide test explorer', questions: 'questions', mins: 'min',
    percent: 'complete', date: 'Completed on', preparing: 'Preparing your personal selection…',
    empty: 'Choose tests from the explorer below to build your personal battery.',
    conflictTitle: 'You already have an active test set', conflict: 'Keep that set, or replace it with your newly selected tests. Your completed results will remain in your history.',
    keep: 'Keep existing set', replace: 'Use new selection', error: 'Could not save your test selection. Please try again.',
    retry: 'Try again', account: 'My Cabinet', history: 'Results history', privacy: 'Your responses and results stay private in your personal Cabinet. These self-checks are not a diagnosis.',
    signInFailed: 'Google sign-in was not completed. You can retry when you are ready.',
  },
  ru: {
    title: 'Мои выбранные тесты', intro: 'Ваш личный набор тестов готов. Можно начать любой тест, сохранить прогресс и вернуться к нему позже.',
    done: 'пройдено', pending: 'Не начат', underway: 'В процессе', finished: 'Пройден',
    begin: 'Пройти тест', resume: 'Продолжить', repeat: 'Пройти повторно', see: 'Посмотреть результат',
    choose: 'Изменить подборку тестов', hide: 'Скрыть подбор тестов', questions: 'вопросов', mins: 'мин',
    percent: 'пройдено', date: 'Пройден', preparing: 'Подготавливаем вашу подборку…',
    empty: 'Выберите тесты ниже, чтобы создать свой личный набор.',
    conflictTitle: 'У вас уже есть активный набор тестов', conflict: 'Можно оставить его или заменить новым набором. Результаты уже пройденных тестов сохранятся в истории.',
    keep: 'Оставить текущий', replace: 'Использовать новый', error: 'Не удалось сохранить подборку. Повторите попытку.',
    retry: 'Повторить', account: 'Мой кабинет', history: 'История результатов', privacy: 'Ваши ответы и результаты приватны и хранятся в личном кабинете. Эти тесты не являются диагнозом.',
    signInFailed: 'Вход через Google не завершён. При необходимости повторите вход.',
  },
}
const PHOTO = {
  'hh-current-state': '/images/holistic-house/video-posters/home-en-v2.webp',
  'mini-ipip-20': '/images/holistic-house/video-posters/services-en-v2.webp',
  'hh-weekly-pulse': '/images/holistic-house/video-posters/homeopathy-en-v2.webp',
  'phq-4': '/images/holistic-house/video-posters/hypnotherapy-en-v1.webp',
  'k6': '/images/holistic-house/video-posters/constellations-en-v1.webp',
  'phq-9': '/images/holistic-house/video-posters/hypnotherapy-en-v1.webp',
  'gad-7': '/images/holistic-house/video-posters/home-en-v2.webp',
  'hh-resource-pulse': '/images/holistic-house/video-posters/homeopathy-en-v2.webp',
  'hh-monthly-profile': '/images/holistic-house/video-posters/services-en-v2.webp',
  'mspss': '/images/holistic-house/video-posters/constellations-en-v1.webp',
  'scs-sf': '/images/holistic-house/video-posters/home-en-v2.webp',
}
const THEMED_PHOTOS = {
  state: [
    '/images/holistic-house/video-posters/home-en-v2.webp',
    '/images/holistic-house/video-posters/hypnotherapy-en-v1.webp',
    '/images/holistic-house/video-posters/services-en-v2.webp',
  ],
  symptoms: [
    '/images/holistic-house/video-posters/hypnotherapy-en-v1.webp',
    '/images/holistic-house/video-posters/homeopathy-en-v2.webp',
    '/images/holistic-house/video-posters/home-en-v2.webp',
  ],
  resources: [
    '/images/holistic-house/video-posters/constellations-en-v1.webp',
    '/images/holistic-house/video-posters/home-en-v2.webp',
    '/images/holistic-house/video-posters/homeopathy-en-v2.webp',
  ],
  function: [
    '/images/holistic-house/video-posters/services-en-v2.webp',
    '/images/holistic-house/video-posters/home-en-v2.webp',
    '/images/holistic-house/video-posters/constellations-en-v1.webp',
  ],
  baseline: [
    '/images/holistic-house/video-posters/services-en-v2.webp',
    '/images/holistic-house/video-posters/home-en-v2.webp',
  ],
}
// All photos are existing, approved local source assets. Never invent a patient photo.
function photoForTest(item, catalog) {
  if (PHOTO[item]) return PHOTO[item]
  const topics = catalog?.topics || []
  const themed = topics.includes('relationships')
    ? THEMED_PHOTOS.resources
    : topics.includes('body') || topics.includes('sleep')
      ? THEMED_PHOTOS.symptoms
      : THEMED_PHOTOS[catalog?.axis] || THEMED_PHOTOS.state
  const fingerprint = [...item].reduce((sum, char) => sum * 31 + char.charCodeAt(0), 0) >>> 0
  return themed[fingerprint % themed.length]
}

async function api(path, body) {
  const response = await fetch('/api/app/' + path, {
    method: body ? 'POST' : 'GET', cache: 'no-store', credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(json.error || 'SERVICE_UNAVAILABLE')
    error.code = json.error
    throw error
  }
  return json
}
function safeDefinition(id) {
  try { return getDefinitionById(id) } catch { return null }
}
function latestFor(rows, id) {
  return [...(rows || [])].filter((row) => row.definitionId === id)
    .sort((a, b) => Date.parse(b.measurementAt || '') - Date.parse(a.measurementAt || ''))[0] || null
}
function formatDate(value, locale) {
  if (!value || Number.isNaN(Date.parse(value))) return ''
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-CA', { dateStyle: 'medium' }).format(new Date(value))
}
function planRows(plan, data, locale) {
  return (plan?.definitionIds || []).map((id) => {
    const definition = safeDefinition(id)
    if (!definition) return null
    const latest = latestFor(data.results, id)
    const run = (data.runs || []).find((candidate) => candidate.definitionId === id && ['draft', 'in_progress'].includes(candidate.status))
    const answered = run ? definition.questions.filter((question) => Object.prototype.hasOwnProperty.call(run.answers || {}, question.id)).length : 0
    const progress = run ? Math.min(99, Math.round(100 * answered / Math.max(1, definition.questions.length))) : latest ? 100 : 0
    const item = definition.key
    const catalog = monitoringCatalogItem(item)
    return {
      definition, run, result: latest, progress, key: item,
      title: catalog?.title?.[locale] || catalog?.title?.en || definition.title,
      description: catalog?.description?.[locale] || catalog?.description?.en || '',
      minutes: catalog?.durationMinutes || Math.max(1, Math.round(definition.questions.length / 6)),
      photo: photoForTest(item, catalog),
    }
  }).filter(Boolean)
}
export function AccountTestBattery({ data, locale, requestedPlanId, recommendedKey = null, reload }) {
  const c = COPY[locale] || COPY.en
  const router = useRouter()
  const once = useRef(false)
  const [plan, setPlan] = useState(null)
  const [busy, setBusy] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [exploring, setExploring] = useState(false)
  const [conflict, setConflict] = useState(null)
  const [error, setError] = useState('')
  const entries = useMemo(() => buildExplorerEntries({ locale, audience: 'account' }), [locale])
  const currentPlan = plan || data.activeTestPlan || data.latestTestPlan || null
  const rows = useMemo(() => planRows(currentPlan, data, locale), [currentPlan, data, locale])
  const completed = rows.filter((row) => Boolean(row.result)).length
  const root = '/' + locale + '/app'

  async function create(keys, replaceActive = false) {
    const valid = validTestKeys(keys)
    const selected = valid?.map((key) => entries.find((entry) => entry.key === key && entry.selectable))
    if (!selected || selected.some((entry) => !entry?.definition)) {
      setError(c.error)
      return
    }
    setBusy(true)
    setError('')
    try {
      const created = await api('test-plans', {
        items: selected.map((entry) => ({
          definitionKey: entry.definition.key,
          definitionVersion: entry.definition.version,
          instrumentLocale: entry.definition.instrumentLocale,
        })),
        operationId: crypto.randomUUID(),
        replaceActive,
      })
      try { window.sessionStorage.removeItem(PENDING_TEST_SELECTION_KEY) } catch { /* Storage may be blocked. */ }
      setConflict(null)
      setPlan(created)
      setExploring(false)
      router.replace(root + '/tests?plan=' + encodeURIComponent(created.id))
      await reload()
    } catch (cause) {
      if (cause.code === 'ACTIVE_PLAN_EXISTS') setConflict(valid)
      else setError(c.error + ' (' + (cause.code || 'SERVICE_UNAVAILABLE') + ')')
    } finally {
      setBusy(false)
      setInitializing(false)
    }
  }

  useEffect(() => {
    if (once.current) return
    once.current = true
    let alive = true
    async function restore() {
      if (requestedPlanId) {
        try {
          const loaded = await api('test-plans/' + encodeURIComponent(requestedPlanId))
          if (alive) setPlan(loaded)
        } catch { /* Use the last account plan, never a foreign plan. */ }
      }
      let pending = null
      try {
        pending = readTestSelectionIntent(window.sessionStorage.getItem(PENDING_TEST_SELECTION_KEY))
        if (!pending) window.sessionStorage.removeItem(PENDING_TEST_SELECTION_KEY)
      } catch { /* Browser may disable tab storage. */ }
      if (!alive) return
      if (!pending) { setInitializing(false); return }
      if (data.activeTestPlan) {
        const ids = pending.keys.map((key) => entries.find((entry) => entry.key === key)?.definition?.id)
        if (JSON.stringify(ids) === JSON.stringify(data.activeTestPlan.definitionIds)) {
          setPlan(data.activeTestPlan)
          try { window.sessionStorage.removeItem(PENDING_TEST_SELECTION_KEY) } catch { /* Private session. */ }
        } else setConflict(pending.keys)
        setInitializing(false)
        return
      }
      await create(pending.keys)
      if (alive) setInitializing(false)
    }
    restore()
    return () => { alive = false; once.current = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- one handoff per mount, after onboarding.

  async function choose(entriesToStart) {
    const keys = entriesToStart.map((entry) => entry.key)
    if (data.activeTestPlan) {
      const ids = entriesToStart.map((entry) => entry.definition?.id)
      if (JSON.stringify(ids) !== JSON.stringify(data.activeTestPlan.definitionIds)) {
        setConflict(keys)
        setExploring(false)
        return
      }
      setPlan(data.activeTestPlan)
      setExploring(false)
      return
    }
    await create(keys)
  }
  async function openTest(row) {
    setBusy(true)
    setError('')
    try {
      const run = row.run || await api('runs', {
        definitionKey: row.definition.key,
        definitionVersion: row.definition.version,
        instrumentLocale: row.definition.instrumentLocale,
        operationId: crypto.randomUUID(),
      })
      const isPlanStep = currentPlan?.status === 'active' &&
        currentPlan.definitionIds.includes(row.definition.id)
      router.push(root + '/runs/' + encodeURIComponent(run.id) +
        (isPlanStep ? '?plan=' + encodeURIComponent(currentPlan.id) : ''))
    } catch (cause) {
      setError(c.error + ' (' + (cause.code || 'SERVICE_UNAVAILABLE') + ')')
      setBusy(false)
    }
  }
  return <>
    <div className={styles.batteryLayout}>
    <section className={'hh-panel ' + styles.shell} aria-label={c.title}>
      <div className={styles.header}>
        <div><p className="hh-kicker">{c.account} · Mind–Body Monitor</p><h1>{c.title}</h1>
          <p>{c.intro}</p></div>
        <Link href={root + '/history'} prefetch={false}>{c.history} →</Link>
      </div>
      {initializing && <p role="status">{c.preparing}</p>}
      {conflict && <div className={styles.notice} role="group" aria-label={c.conflictTitle}>
        <h2>{c.conflictTitle}</h2><p>{c.conflict}</p>
        <div>
          <button type="button" onClick={() => {
            try { window.sessionStorage.removeItem(PENDING_TEST_SELECTION_KEY) } catch { /* Browser storage may be disabled. */ }
            setConflict(null)
            setPlan(data.activeTestPlan)
          }}>{c.keep}</button>
          <button type="button" className="hh-primary" disabled={busy} onClick={() => create(conflict, true)}>{c.replace}</button>
        </div>
      </div>}
      {error && <p role="alert">{error} <button type="button" onClick={() => setError('')}>{c.retry}</button></p>}
      {rows.length > 0 ? <>
        <div className={styles.overview} aria-label={String(completed) + ' / ' + rows.length + ' ' + c.done}>
          <span className={styles.counter}><strong>{completed}/{rows.length}</strong> {c.done}</span>
          <progress max={rows.length} value={completed} />
        </div>
        <div className={styles.group}>
          {rows.map((row) => {
            const status = row.run ? c.underway : row.result ? c.finished : c.pending
            return <article key={row.definition.id} className={styles.row}>
              <span className={styles.image}><Image src={row.photo} alt="" fill sizes="(max-width: 720px) 92px, 140px" /></span>
              <div className={styles.info}>
                <h2>{row.title}</h2>
                <p className={styles.description}>{row.description}</p>
                <div className={styles.meta}><span>{row.definition.questions.length} {c.questions}</span>
                  <span>~{row.minutes} {c.mins}</span></div>
                <div className={styles.status}>
                  <strong className={row.run ? styles.inProgress : row.result ? styles.completed : ''}>{status}</strong>
                  {row.run
                    ? <><progress max="100" value={row.progress} aria-label={status} /><span>{row.progress}% {c.percent}</span>
                        {row.result && <span>{c.date}: {formatDate(row.result.measurementAt, locale)}</span>}</>
                    : row.result
                      ? <><span>100% {c.percent}</span><span>{c.date}: {formatDate(row.result.measurementAt, locale)}</span></>
                      : <><progress max="100" value="0" aria-label={status} /><span>0% {c.percent}</span></>}
                </div>
              </div>
              <div className={styles.rowActions}>
                <button className="hh-primary" type="button" disabled={busy} onClick={() => openTest(row)}>
                  {row.run ? c.resume : row.result ? c.repeat : c.begin} →
                </button>
                {row.result && <Link prefetch={false} href={root + '/results/' + encodeURIComponent(row.result.id)}>{c.see}</Link>}
              </div>
            </article>
          })}
        </div>
      </> : !initializing && <p className={styles.empty}>{c.empty}</p>}
      <div className={styles.actions}>
        <button type="button" disabled={busy} onClick={() => setExploring((value) => !value)}>
          {exploring ? c.hide : c.choose}
        </button>
        <Link href={root} prefetch={false}>{c.account} →</Link>
      </div>
      <p className={styles.muted}>{c.privacy}</p>
    </section>
    <TestExplorerVisual locale={locale} coverage={coverageForFocus([])} portrait={buildPsychPortrait(data.results)} />
    </div>
    {(exploring || (!rows.length && !initializing && !conflict)) &&
      <TestExplorer locale={locale} audience="account" onStart={choose}
        pastResults={data.results} draftRuns={data.runs} profileSnapshot={data.snapshot}
        recommendedKey={recommendedKey}
        onResumeRun={(run) => router.push(root + '/runs/' + encodeURIComponent(run.id))} />}
  </>
}
