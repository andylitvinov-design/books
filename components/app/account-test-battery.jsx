'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TestExplorer } from './test-explorer'
import { TestExplorerVisual } from './test-explorer-visual'
import { MyTestsDashboard } from './my-tests-dashboard'
import { coverageForFocus } from '@/lib/assessments/test-explorer'
import { buildPsychPortrait } from '@/lib/assessments/psych-portrait'
import { getDefinitionById } from '@/lib/assessments/definitions'
import { monitoringCatalogItem } from '@/data/assessments/catalog'
import { buildExplorerEntries, filterExplorerEntries, rankExplorerEntries, TEST_EXPLORER_AXIS_LABELS } from '@/lib/assessments/test-explorer'
import { TEST_RECOMMENDATION_FOCUS } from '@/lib/assessments/test-recommendations'
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
    retry: 'Try again', account: 'My tests', history: 'Results history', privacy: 'Your responses and results stay private in your personal Cabinet. These self-checks are not a diagnosis.',
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
    retry: 'Повторить', account: 'Мои тесты', history: 'История результатов', privacy: 'Ваши ответы и результаты приватны и хранятся в личном кабинете. Эти тесты не являются диагнозом.',
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
  const completedRuns = new Set(plan?.completedRunIds || [])
  return (plan?.definitionIds || []).map((id) => {
    const definition = safeDefinition(id)
    if (!definition) return null
    const latest = latestFor(data.results, id)
    const completedInPlan = (data.results || []).some((result) => result.definitionId === id && completedRuns.has(result.runId))
    const run = (data.runs || []).find((candidate) => candidate.definitionId === id && ['draft', 'in_progress'].includes(candidate.status))
    const answered = run ? definition.questions.filter((question) => Object.prototype.hasOwnProperty.call(run.answers || {}, question.id)).length : 0
    const progress = run ? Math.min(99, Math.round(100 * answered / Math.max(1, definition.questions.length))) : completedInPlan ? 100 : 0
    const item = definition.key
    const catalog = monitoringCatalogItem(item)
    return {
      definition, run, result: latest, completedInPlan, progress, key: item,
      title: catalog?.title?.[locale] || catalog?.title?.en || definition.title,
      description: catalog?.description?.[locale] || catalog?.description?.en || '',
      minutes: catalog?.durationMinutes || Math.max(1, Math.round(definition.questions.length / 6)),
      photo: photoForTest(item, catalog),
    }
  }).filter(Boolean)
}
export function AccountTestBattery({ data, locale, requestedPlanId, recommendedKey = null, initialStatusFilter = null, reload }) {
  const c = COPY[locale] || COPY.en
  const router = useRouter()
  const once = useRef(false)
  const [plan, setPlan] = useState(null)
  const [busy, setBusy] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [exploring, setExploring] = useState(false)
  const allowedFilters = ['all', 'notStarted', 'inProgress', 'completed', 'remaining']
  const requestedFilter = allowedFilters.includes(initialStatusFilter) ? initialStatusFilter : null
  const [showList, setShowList] = useState(Boolean(requestedPlanId || requestedFilter))
  const [statusFilter, setStatusFilter] = useState(requestedFilter || 'all')
  useEffect(() => {
    // The public Google handoff can replace ?selection=pending with ?plan=... without remounting.
    if (requestedPlanId) setShowList(true)
  }, [requestedPlanId])
  useEffect(() => {
    if (!requestedFilter) return
    setStatusFilter(requestedFilter)
    setShowList(true)
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      document.getElementById('my-tests-list')?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }))
  }, [requestedFilter])
  const [conflict, setConflict] = useState(null)
  const [error, setError] = useState('')
  const entries = useMemo(() => buildExplorerEntries({ locale, audience: 'account' }), [locale])
  const currentPlan = plan || data.activeTestPlan || data.latestTestPlan || null
  const rows = useMemo(() => planRows(currentPlan, data, locale), [currentPlan, data, locale])
  const completed = rows.filter((row) => row.completedInPlan).length
  const pastRows = useMemo(() => {
    const ids = [...new Set((data.results || []).map((result) => result.definitionId).filter(Boolean))]
    return planRows({ definitionIds: ids, completedRunIds: [] }, data, locale)
  }, [data, locale])
  const root = '/' + locale + '/app'
  const selectionPreferences = currentPlan?.selectionPreferences || data.latestTestPlan?.selectionPreferences || {}
  const priorityLabels = (selectionPreferences.focus || []).map((key) => TEST_RECOMMENDATION_FOCUS.find((item) => item.key === key)?.label?.[locale] || key)
  const axisLabels = (selectionPreferences.axes || []).map((key) => TEST_EXPLORER_AXIS_LABELS[key]?.[locale] || TEST_EXPLORER_AXIS_LABELS[key]?.en || key)
  const savedPriorities = [...priorityLabels, ...axisLabels]
  const suggestions = useMemo(() => {
    if (!savedPriorities.length && !(selectionPreferences.details || []).length) return []
    const filtered = filterExplorerEntries(entries, { availability: 'available', ...selectionPreferences })
      .filter((item) => item.selectable && !rows.some((row) => row.key === item.key) &&
        !(data.results || []).some((result) => result.definitionKey === item.key))
    return rankExplorerEntries(filtered, selectionPreferences).slice(0, 3)
  }, [entries, currentPlan, data.latestTestPlan, data.results, rows, locale])

  async function create(keys, replaceActive = false, selectionPreferences = undefined) {
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
        ...(selectionPreferences === undefined ? {} : { selectionPreferences }),
      })
      try { window.sessionStorage.removeItem(PENDING_TEST_SELECTION_KEY) } catch { /* Storage may be blocked. */ }
      setConflict(null)
      setPlan(created)
      setExploring(false)
      // Reconcile the saved account state before replacing the handoff URL.
      // Otherwise a concurrent bootstrap render can leave ?selection=pending visible.
      await reload()
      router.replace(root + '/tests?plan=' + encodeURIComponent(created.id))
    } catch (cause) {
      if (cause.code === 'ACTIVE_PLAN_EXISTS') setConflict(valid)
      else setError(c.error + ' (' + (cause.code || 'SERVICE_UNAVAILABLE') + ')')
    } finally {
      setBusy(false)
      setInitializing(false)
    }
  }

  useEffect(() => {
    // React development StrictMode replays effect setup/cleanup without replacing
    // the component. Keep this one-time guard across that replay: otherwise two
    // OAuth handoff requests can create conflicting active plans.
    if (once.current) return
    once.current = true
    async function restore() {
      if (requestedPlanId) {
        try {
          const loaded = await api('test-plans/' + encodeURIComponent(requestedPlanId))
          setPlan(loaded)
        } catch { /* Use the last account plan, never a foreign plan. */ }
      }
      let pending = null
      try {
        pending = readTestSelectionIntent(window.sessionStorage.getItem(PENDING_TEST_SELECTION_KEY))
        if (!pending) window.sessionStorage.removeItem(PENDING_TEST_SELECTION_KEY)
      } catch { /* Browser may disable tab storage. */ }
      if (!pending) return
      if (data.activeTestPlan) {
        const ids = pending.keys.map((key) => entries.find((entry) => entry.key === key)?.definition?.id)
        if (JSON.stringify(ids) === JSON.stringify(data.activeTestPlan.definitionIds)) {
          // Same tests, new priorities: persist preferences without discarding progress.
          await create(pending.keys, false, pending.preferences)
        } else setConflict({ keys: pending.keys, preferences: pending.preferences })
        return
      }
      await create(pending.keys, false, pending.preferences)
    }
    // Do not reset the guard in cleanup: a StrictMode replay is not a new
    // selection, and the first in-flight request must have a single owner.
    void restore().catch(() => setError(c.error)).finally(() => setInitializing(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- one handoff per mounted selection, including StrictMode.

  async function choose(entriesToStart, selectionPreferences) {
    const keys = entriesToStart.map((entry) => entry.key)
    if (data.activeTestPlan) {
      const ids = entriesToStart.map((entry) => entry.definition?.id)
      if (JSON.stringify(ids) !== JSON.stringify(data.activeTestPlan.definitionIds)) {
        setConflict({ keys, preferences: selectionPreferences })
        setExploring(false)
        return
      }
      await create(keys, false, selectionPreferences)
      return
    }
    await create(keys, false, selectionPreferences)
  }
  function openList() {
    setShowList(true)
    if (!rows.length) setExploring(true)
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      document.getElementById('my-tests-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }))
  }
  useEffect(() => {
    if (conflict || error) setShowList(true)
  }, [conflict, error])

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
      <MyTestsDashboard
        locale={locale}
        rows={rows}
        completed={completed}
        results={data.results}
        snapshot={data.snapshot}
        data={data}
        onStart={openList}
        onViewAll={openList}
      />
      {showList && <div className={styles.listArea} id="my-tests-list">
      <div className={styles.header}>
        <div><p className="hh-kicker">{c.account} · Mind–Body Monitor</p><h1>{statusFilter === 'completed' ? (locale === 'ru' ? 'Пройденные тесты · повторить' : 'Completed tests · retake') : statusFilter === 'remaining' ? (locale === 'ru' ? 'Оставшиеся тесты' : 'Tests still to complete') : c.title}</h1>
          <p>{c.intro}</p></div>
        <Link href={root + '/history'} prefetch={false}>{c.history} →</Link>
      </div>
      {initializing && <p role="status">{c.preparing}</p>}
      {!!savedPriorities.length && <section className={styles.savedPriorities} aria-label={locale === 'ru' ? 'Мои сохранённые приоритеты' : 'My saved test priorities'}>
        <strong>{locale === 'ru' ? 'Мои сохранённые темы и шкалы' : 'Your saved areas and scales'}</strong>
        <div>{savedPriorities.map((label, index) => <span key={index}>{label}</span>)}</div>
        <p>{locale === 'ru'
          ? 'Они перенесены из публичного подбора и учитываются при поиске следующих тестов.'
          : 'These came from your public selection and refine your next test recommendations.'}</p>
        {suggestions.length > 0 && <div className={styles.nextSuggestions}>
          <small>{locale === 'ru' ? 'По вашим темам также подходят:' : 'Also matching your interests:'}</small>
          {suggestions.map((entry) => <span key={entry.key}>{entry.title}</span>)}
          <button type="button" onClick={() => setExploring(true)}>{locale === 'ru' ? 'Изменить или дополнить подбор' : 'Refine my test selection'} →</button>
        </div>}
      </section>}
      {conflict && <div className={styles.notice} role="group" aria-label={c.conflictTitle}>
        <h2>{c.conflictTitle}</h2><p>{c.conflict}</p>
        <div>
          <button type="button" onClick={() => {
            try { window.sessionStorage.removeItem(PENDING_TEST_SELECTION_KEY) } catch { /* Browser storage may be disabled. */ }
            setConflict(null)
            setPlan(data.activeTestPlan)
            if (data.activeTestPlan?.id) router.replace(root + '/tests?plan=' + encodeURIComponent(data.activeTestPlan.id))
          }}>{c.keep}</button>
          <button type="button" className="hh-primary" disabled={busy} onClick={() => create(conflict.keys, true, conflict.preferences)}>{c.replace}</button>
        </div>
      </div>}
      {error && <p role="alert">{error} <button type="button" onClick={() => setError('')}>{c.retry}</button></p>}
      {(rows.length > 0 || (statusFilter === 'completed' && pastRows.length > 0)) ? <>
        <div className={styles.overview} aria-label={statusFilter === 'completed' ? String(pastRows.length) + ' ' + c.finished : String(completed) + ' / ' + rows.length + ' ' + c.done}>
          <span className={styles.counter}><strong>{statusFilter === 'completed' ? pastRows.length : completed + '/' + rows.length}</strong> {statusFilter === 'completed' ? c.finished : c.done}</span>
          {statusFilter !== 'completed' && <progress max={rows.length} value={completed} />}
        </div>
        <div className={styles.testFilters} role="group" aria-label={locale === 'ru' ? 'Фильтр по статусу' : 'Filter by status'}>
          {[
            ['all', locale === 'ru' ? 'Все' : 'All'],
            ['notStarted', c.pending],
            ['inProgress', c.underway],
            ['completed', c.finished],
            ['remaining', locale === 'ru' ? 'Оставшиеся' : 'Remaining'],
          ].map(([key, label]) => (
            <button key={key} type="button" aria-pressed={statusFilter === key}
              onClick={() => setStatusFilter(key)}>{label}</button>
          ))}
        </div>
        <div className={styles.group}>
          {(statusFilter === 'completed' ? pastRows : rows).map((row) => {
            const done = statusFilter === 'completed' ? Boolean(row.result) : row.completedInPlan
            const state = done ? 'completed' : row.run ? 'inProgress' : 'notStarted'
            const status = row.run ? c.underway : done ? c.finished : c.pending
            if (statusFilter === 'remaining' && done) return null
            if (!['all', 'remaining'].includes(statusFilter) && state !== statusFilter) return null
            return <article key={row.definition.id} className={styles.row}>
              <span className={styles.image}><Image src={row.photo} alt="" fill sizes="(max-width: 720px) 92px, 140px" /></span>
              <div className={styles.info}>
                <h2>{row.title}</h2>
                <p className={styles.description}>{row.description}</p>
                <div className={styles.meta}><span>{row.definition.questions.length} {c.questions}</span>
                  <span>~{row.minutes} {c.mins}</span></div>
                <div className={styles.status}>
                  <strong className={state === 'inProgress' ? styles.inProgress : state === 'completed' ? styles.completed : ''}>{status}</strong>
                  {row.run
                    ? <><progress max="100" value={row.progress} aria-label={status} /><span>{row.progress}% {c.percent}</span>
                        {row.result && <span>{c.date}: {formatDate(row.result.measurementAt, locale)}</span>}</>
                    : done
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
        <Link href={root} prefetch={false}>{locale === 'ru' ? 'К обзору' : 'Back to overview'} →</Link>
      </div>
      <p className={styles.muted}>{c.privacy}</p>
      </div>}
    </section>
    <details className={styles.portraitDetails}>
      <summary>{locale === 'ru' ? 'Мой психологический портрет · открыть подробности' : 'My psychological portrait · view details'}</summary>
      <TestExplorerVisual locale={locale} coverage={coverageForFocus([])} portrait={buildPsychPortrait(data.results)} />
    </details>
    </div>
    {(exploring || (!rows.length && !initializing && !conflict)) &&
      <TestExplorer key={currentPlan?.id || 'new'} locale={locale} audience="account" onStart={choose} initialPreferences={selectionPreferences}
        pastResults={data.results} draftRuns={data.runs} profileSnapshot={data.snapshot}
        recommendedKey={recommendedKey}
        onResumeRun={(run) => router.push(root + '/runs/' + encodeURIComponent(run.id))} />}
  </>
}
