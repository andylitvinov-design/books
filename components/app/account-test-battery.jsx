'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Activity, ArrowRight, Brain, ClipboardList, Heart, Moon, Shield, Sparkles, Trash2, Zap } from 'lucide-react'
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
    begin: 'Start test', resume: 'Continue test', repeat: 'Retake test', see: 'View result',
    choose: 'Choose or change tests', hide: 'Hide test explorer', questions: 'questions', mins: 'min',
    percent: 'complete', date: 'Completed on', preparing: 'Preparing your personal selection…',
    empty: 'Choose tests from the explorer below to build your personal battery.',
    conflictTitle: 'You already have an active test set', conflict: 'Keep that set, or replace it with your newly selected tests. Your completed results will remain in your history.',
    keep: 'Keep existing set', replace: 'Use new selection', error: 'Could not save your test selection. Please try again.',
    retry: 'Try again', account: 'My tests', history: 'Results history', privacy: 'Your responses and results stay private in your personal Cabinet. These self-checks are not a diagnosis.',
    signInFailed: 'Google sign-in was not completed. You can retry when you are ready.',
    added: 'New tests were added to My tests. Your earlier tests and progress are safe.',
    capacity: 'Your saved test list has reached 100 tests. Remove an unused test to add more.',
    remove: 'Remove from my tests', removed: 'Removed from selection. Saved results and answers are unchanged.',
    stale: 'Your selection was updated elsewhere. Refreshed the current list; please try again.',
    filters: 'Edit test filters', closeFilters: 'Close filters', pendingReview: 'Review your proposed test selection',
    pendingDescription: 'The filters returned another set of tests. Choose whether to keep your saved set or apply that set. Your completed assessments remain in history.',
  },
  ru: {
    title: 'Мои выбранные тесты', intro: 'Ваш личный набор тестов готов. Можно начать любой тест, сохранить прогресс и вернуться к нему позже.',
    done: 'пройдено', pending: 'Не начат', underway: 'В процессе', finished: 'Пройден',
    begin: 'Начать тестирование', resume: 'Продолжить тест', repeat: 'Пройти повторно', see: 'Посмотреть результат',
    choose: 'Изменить подборку тестов', hide: 'Скрыть подбор тестов', questions: 'вопросов', mins: 'мин',
    percent: 'пройдено', date: 'Пройден', preparing: 'Подготавливаем вашу подборку…',
    empty: 'Выберите тесты ниже, чтобы создать свой личный набор.',
    conflictTitle: 'У вас уже есть активный набор тестов', conflict: 'Можно оставить его или заменить новым набором. Результаты уже пройденных тестов сохранятся в истории.',
    keep: 'Оставить текущий', replace: 'Использовать новый', error: 'Не удалось сохранить подборку. Повторите попытку.',
    retry: 'Повторить', account: 'Мои тесты', history: 'История результатов', privacy: 'Ваши ответы и результаты приватны и хранятся в личном кабинете. Эти тесты не являются диагнозом.',
    signInFailed: 'Вход через Google не завершён. При необходимости повторите вход.',
    added: 'Новые тесты добавлены в «Мои тесты». Предыдущие тесты и прогресс сохранены.',
    capacity: 'В списке уже 100 тестов. Уберите ненужный тест, чтобы добавить новый.',
    remove: 'Убрать из набора', removed: 'Тест убран из подборки. Ответы и результаты сохранены.',
    stale: 'Подборка уже изменилась. Список обновлён; попробуйте ещё раз.',
    filters: 'Изменить фильтры тестов', closeFilters: 'Закрыть фильтры', pendingReview: 'Проверить новую подборку тестов',
    pendingDescription: 'Вы выбрали другой набор по фильтрам. Можно сохранить текущий или применить новую подборку. Пройденные результаты сохранятся.',
  },
}
// Questionnaires have abstract topic icons, never unrelated practitioner/client photos.
const TOPIC_ICONS = {stress:Zap,anxiety:Brain,mood:Heart,sleep:Moon,energy:Zap,
  recovery:Shield,relationships:Heart,support:Heart,work:Activity,
  function:Activity,attention:Brain,focus:Brain,personality:Sparkles,resources:Shield}
function TestSymbol({topics}) {
  const key = (topics || []).find((topic) => TOPIC_ICONS[topic]) || 'default'
  const Icon = TOPIC_ICONS[key] || ClipboardList
  return <span className={styles.iconTile} data-theme={key} aria-hidden="true"><Icon size={23} strokeWidth={1.8}/></span>
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
      topics: catalog?.topics || [],
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
  const [showList, setShowList] = useState(true)
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
  const [notice, setNotice] = useState('')
  const entries = useMemo(() => buildExplorerEntries({ locale, audience: 'account' }), [locale])
  // A cancelled plan is historical data, not a selection to render as active.
  const currentPlan = plan === null
    ? (data.activeTestPlan || (data.latestTestPlan?.status === 'cancelled' ? null : data.latestTestPlan) || null)
    : (plan.status === 'cancelled' ? null : plan)
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
        appendActive: !replaceActive,
        ...(selectionPreferences === undefined ? {} : { selectionPreferences }),
      })
      try { window.sessionStorage.removeItem(PENDING_TEST_SELECTION_KEY) } catch { /* Storage may be blocked. */ }
      setConflict(null)
      setPlan(created)
      setNotice(c.added)
      setExploring(false)
      setShowList(true)
      // Reconcile the saved account state before replacing the handoff URL.
      // Otherwise a concurrent bootstrap render can leave ?selection=pending visible.
      await reload()
      router.replace(root + '/tests?plan=' + encodeURIComponent(created.id))
    } catch (cause) {
      if (cause.code === 'TEST_PLAN_CAPACITY') setError(c.capacity)
      else if (cause.code === 'ACTIVE_PLAN_EXISTS') setConflict({ keys: valid, preferences: selectionPreferences })
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
      // Add all new tests after Google OAuth, regardless of any existing plan.
      // The server merges under the account lock and preserves draft/completion.
      await create(pending.keys, false, pending.preferences)
    }
    // Do not reset the guard in cleanup: a StrictMode replay is not a new
    // selection, and the first in-flight request must have a single owner.
    void restore().catch(() => setError(c.error)).finally(() => setInitializing(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- one handoff per mounted selection, including StrictMode.

  async function choose(entriesToStart, selectionPreferences) {
    await create(entriesToStart.map((entry) => entry.key), false, selectionPreferences)
  }
  function openFilters() {
    setExploring((open) => !open)
    if (!exploring) window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      document.getElementById('my-test-explorer')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }))
  }
  function openList() {
    if (!rows.length) return openFilters()
    document.getElementById('my-tests-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  async function removeSelectedTest(row) {
    if (!currentPlan || currentPlan.status !== 'active' || busy) return
    setBusy(true);setError('');setNotice('')
    try {
      const updated = await api('test-plans/' + encodeURIComponent(currentPlan.id) + '/remove', {
        definitionId: row.definition.id, expectedRevision: currentPlan.revision,
      })
      // A zero-item set is represented by a cancelled plan, not a deleted row.
      setPlan(updated)
      setConflict(null)
      try { window.sessionStorage.removeItem(PENDING_TEST_SELECTION_KEY) } catch { /* storage optional */ }
      await reload()
      setNotice(c.removed)
      if (updated.status === 'cancelled') setExploring(false)
      // Avoid keeping stale plan IDs in the URL after editing the current set.
      if (requestedPlanId) router.replace(root + '/tests')
    } catch (cause) {
      if (cause.code === 'REVISION_CONFLICT') {
        setPlan(null)
        await reload()
        setError(c.stale)
      } else {
        setError(c.error + ' (' + (cause.code || 'SERVICE_UNAVAILABLE') + ')')
      }
    } finally { setBusy(false) }
  }
  useEffect(() => {
    // A pending new selection should not automatically hide the current tests
    // behind a large conflict panel. Its compact choice stays on the overview.
    if (error) setShowList(true)
  }, [error])
  useEffect(() => {
    // Only surface the difference inside the open filters, not as an
    // intrusive warning above the saved test list.
    if (!conflict || !exploring) return
    const frame = window.requestAnimationFrame(() => {
      document.querySelector('[data-pending-selection]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [conflict, exploring])

  function keepSavedSet() {
    try { window.sessionStorage.removeItem(PENDING_TEST_SELECTION_KEY) } catch { /* Browsers may block storage. */ }
    setConflict(null)
    setPlan(data.activeTestPlan || data.latestTestPlan || null)
    setExploring(false)
    router.replace(root)
  }

  function applyNewSelection() {
    if (!Array.isArray(conflict?.keys) || !conflict.keys.length || busy) return
    void create(conflict.keys, true, conflict.preferences)
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
        '?mode=quick' + (isPlanStep ? '&plan=' + encodeURIComponent(currentPlan.id) : ''))
    } catch (cause) {
      setError(c.error + ' (' + (cause.code || 'SERVICE_UNAVAILABLE') + ')')
      setBusy(false)
    }
  }
  return <>
    <div className={styles.batteryLayout}>
      <section className={'hh-panel ' + styles.shell} aria-label={c.title}>
        <MyTestsDashboard
          locale={locale} rows={rows} completed={completed}
          results={data.results} snapshot={data.snapshot} data={data}
          onOpenFilters={openFilters} filtersOpen={exploring}
          hasNewSelection={Boolean(conflict)}
          hasList={Boolean(rows.length || (statusFilter === 'completed' && pastRows.length))}
        >
          {(rows.length > 0 || (statusFilter === 'completed' && pastRows.length > 0)) && (
            <section className={styles.listArea} id="my-tests-list"
              aria-label={locale === 'ru' ? 'Выбранные тесты' : 'Your selected tests'}
              data-inline-selected-tests>
              <div className={styles.listHeading}>
                <h2 data-test-list-heading tabIndex={-1}>
                  {statusFilter === 'completed'
                    ? (locale === 'ru' ? 'Пройденные тесты' : 'Completed tests')
                    : (locale === 'ru' ? 'Ваши выбранные тесты' : 'Your selected tests')}
                </h2>
                <span className={styles.listCount}>
                  {statusFilter === 'completed' ? pastRows.length : rows.length}
                </span>
              </div>
              <div className={styles.group}>
                {(statusFilter === 'completed' ? pastRows : rows).map((row) => {
                  const done = statusFilter === 'completed' ? Boolean(row.result) : row.completedInPlan
                  const state = done ? 'completed' : row.run ? 'inProgress' : 'notStarted'
                  const status = row.run ? c.underway : done ? c.finished : c.pending
                  if (statusFilter === 'remaining' && done) return null
                  if (!['all', 'remaining'].includes(statusFilter) && state !== statusFilter) return null
                  return <article key={row.definition.id} className={styles.row}
                    data-saved-test={row.key} data-state={state}>
                    <TestSymbol topics={row.topics} />
                    <div className={styles.info}>
                      <h3>{row.title}</h3>
                      <div className={styles.meta}>
                        <span>~{row.minutes} {c.mins}</span>
                        <strong className={state === 'inProgress' ? styles.inProgress
                          : state === 'completed' ? styles.completed : styles.notStarted}>{status}</strong>
                      </div>
                      {row.run && <div className={styles.draftProgress}>
                        <progress max="100" value={row.progress} aria-label={status}/>
                        <small>{row.progress}% {c.percent}</small>
                      </div>}
                      {done && row.result && <small className={styles.completedDate}>
                        {c.date}: {formatDate(row.result.measurementAt, locale)}
                      </small>}
                    </div>
                    <div className={styles.rowActions}>
                      <button type="button" className="hh-primary" disabled={busy} onClick={() => openTest(row)}>
                        {row.run ? c.resume : done ? c.repeat : c.begin}
                        <ArrowRight aria-hidden="true" size={16}/>
                      </button>
                      {row.result && <Link href={root + '/results/' + encodeURIComponent(row.result.id)}
                        prefetch={false}>{c.see}</Link>}
                    </div>
                    {currentPlan?.status === 'active' && statusFilter !== 'completed' &&
                      <button type="button" className={styles.removeButton} disabled={busy}
                        onClick={() => removeSelectedTest(row)}
                        title={c.remove + ': ' + row.title}
                        aria-label={c.remove + ': ' + row.title}
                        data-remove-selected-test={row.key}>
                        <Trash2 size={17} aria-hidden="true"/>
                      </button>}
                  </article>
                })}
              </div>
              <details className={styles.filterDetails} defaultOpen={Boolean(requestedFilter)}>
                <summary>{locale === 'ru' ? 'Отфильтровать список по статусу' : 'Filter this list by status'}</summary>
                <div className={styles.testFilters} role="group"
                  aria-label={locale === 'ru' ? 'Фильтр по статусу' : 'Filter by status'}>
                  {[
                    ['all', locale === 'ru' ? 'Все' : 'All'],
                    ['notStarted', c.pending],['inProgress', c.underway],
                    ['completed', c.finished],
                    ['remaining', locale === 'ru' ? 'Оставшиеся' : 'Remaining'],
                  ].map(([key,label]) => <button key={key} type="button"
                    aria-pressed={statusFilter === key} onClick={() => setStatusFilter(key)}>{label}</button>)}
                </div>
              </details>
              {!!savedPriorities.length && <details className={styles.preferencesDetails}>
                <summary>{locale === 'ru' ? 'Мои темы и дополнительные рекомендации' : 'My interests & additional recommendations'}</summary>
                <section className={styles.savedPriorities} aria-label={locale === 'ru' ? 'Мои сохранённые приоритеты' : 'My saved test priorities'}>
                  <strong>{locale === 'ru' ? 'Мои темы и шкалы' : 'My saved areas and scales'}</strong>
                  <div>{savedPriorities.map((label,index)=><span key={index}>{label}</span>)}</div>
                  {suggestions.length > 0 && <div className={styles.nextSuggestions}>
                    <small>{locale === 'ru' ? 'По вашим темам также подходят:' : 'Also matching your interests:'}</small>
                    {suggestions.map(entry=><span key={entry.key}>{entry.title}</span>)}
                    <button type="button" onClick={openFilters}>
                      {locale === 'ru' ? 'Изменить подбор' : 'Refine my test selection'} →
                    </button>
                  </div>}
                </section>
              </details>}
            </section>
          )}
        </MyTestsDashboard>
        {initializing && <p role="status" className={styles.inlineNotice}>{c.preparing}</p>}
        {error && <p role="alert" className={styles.inlineError}>{error}
          <button type="button" onClick={() => {
            let pending = null
            try { pending = readTestSelectionIntent(window.sessionStorage.getItem(PENDING_TEST_SELECTION_KEY)) } catch {}
            if (pending) void create(pending.keys, false, pending.preferences)
            else setError('')
          }}>{c.retry}</button></p>}
        {notice && <p role="status" className={styles.inlineNotice}>{notice}</p>}
      </section>
      <details className={styles.portraitDetails}>
        <summary>{locale === 'ru' ? 'Мой психологический портрет · открыть подробности'
          : 'My psychological portrait · view details'}</summary>
        <TestExplorerVisual locale={locale} coverage={coverageForFocus([])}
          portrait={buildPsychPortrait(data.results)}/>
      </details>
    </div>
    {(exploring || (!rows.length && !initializing && !conflict)) &&
      <section id="my-test-explorer" className={styles.explorerSection} aria-label={c.filters}>
        {conflict && <aside className={styles.reviewSelection} data-pending-selection>
          <div>
            <strong>{c.pendingReview}</strong>
            <p>{c.pendingDescription}</p>
          </div>
          <div className={styles.reviewActions}>
            <button type="button" disabled={busy} onClick={keepSavedSet}>{c.keep}</button>
            <button type="button" disabled={busy} className="hh-primary" onClick={applyNewSelection}>{c.replace}</button>
          </div>
        </aside>}
        <TestExplorer key={currentPlan?.id || 'new'} locale={locale}
          audience="account" onStart={choose} initialPreferences={selectionPreferences}
          pastResults={data.results} draftRuns={data.runs} profileSnapshot={data.snapshot}
          recommendedKey={recommendedKey}
          onResumeRun={(run)=>router.push(root+'/runs/'+encodeURIComponent(run.id))}/>
      </section>}
  </>
}
