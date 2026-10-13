'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Activity, ArrowRight, Brain, ClipboardList, Heart, Moon, Shield, Sparkles, Trash2, Zap } from 'lucide-react'
import { TestExplorer } from './test-explorer'
import { TestExplorerVisual } from './test-explorer-visual'
import { MyTestsDashboard } from './my-tests-dashboard'
import { coverageForFocus } from '@/lib/assessments/test-explorer'
import { buildPsychPortrait } from '@/lib/assessments/psych-portrait'
import { getDefinitionById } from '@/lib/assessments/definitions'
import { monitoringCatalogItem } from '@/data/assessments/catalog'
import { assessmentMethodology } from '@/lib/assessments/assessment-methodology'
import { buildExplorerEntries, filterExplorerEntries, rankExplorerEntries, TEST_EXPLORER_AXIS_LABELS } from '@/lib/assessments/test-explorer'
import { TEST_RECOMMENDATION_FOCUS } from '@/lib/assessments/test-recommendations'
import { INSIGHTS_TEST_CATEGORIES } from '@/lib/assessments/insights-categories'
import { PENDING_TEST_SELECTION_KEY, readTestSelectionIntent, validTestKeys } from '@/lib/app/test-selection-intent'
import { courseTestKeys, coursePendingKeys, groupCourseTestRows, isCourseTest, startOrResumeCourseTest } from '@/lib/app/course-test-flow'
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

async function request(path, body, { signal, accountId } = {}) {
  const response = await fetch('/api/app/' + path, {
    signal,
    method: body ? 'POST' : 'GET', cache: 'no-store', credentials: 'same-origin',
    headers: { ...(accountId ? { 'X-HH-Account-ID': accountId } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await response.json()
  if (!response.ok || json?.error || !json || typeof json !== 'object' || Array.isArray(json)) {
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
      methodology: assessmentMethodology({key: item, catalog, definition, locale}).text,
      minutes: catalog?.durationMinutes || Math.max(1, Math.round(definition.questions.length / 6)),
      topics: catalog?.topics || [],
    }
  }).filter(Boolean)
}
export function AccountTestBattery({ data, locale, requestedPlanId, recommendedKey = null, initialStatusFilter = null, reload }) {
  const c = COPY[locale] || COPY.en
  const router = useRouter()
  const searchParams = useSearchParams()
  const openFromInsights = searchParams.get('explore') === '1'
  const fromCourse = searchParams.get('course') === '1'
  const requestedCourseId = searchParams.get('courseId') || null
  const accountId = data.account?.id
  const scopeKey = JSON.stringify([accountId, requestedCourseId])
  const scope = useRef({ key: scopeKey, revision: 0 }), mounted = useRef(false)
  if (scope.current.key !== scopeKey) scope.current = { key: scopeKey, revision: scope.current.revision + 1 }
  const scopeRevision = scope.current.revision
  const isCurrent = () => mounted.current && scope.current.key === scopeKey && scope.current.revision === scopeRevision
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const requestedCategory = searchParams.get('category')
  const insightsCategory = INSIGHTS_TEST_CATEGORIES.some((item) => item.key === requestedCategory) ? requestedCategory : null
  const once = useRef(false)
  const [plan, setPlan] = useState(null)
  const [courseState, setCourseState] = useState(null)
  const selectedCourseId = requestedCourseId || courseState?.course?.id || null
  const courseHref = (params = {}, id = selectedCourseId) => {
    const query = new URLSearchParams(params)
    if (id) query.set('courseId', id)
    return '/' + locale + '/app/course' + (query.size ? '?' + query.toString() : '')
  }
  async function api(path, body, options = {}) {
    if (!isCurrent()) throw new Error('COURSE_SELECTION_CHANGED')
    const isCourse = path === 'course'
    const target = isCourse ? body?.courseId || selectedCourseId : null
    const result = await request(isCourse && target ? path + '?courseId=' + encodeURIComponent(target) : path,
      isCourse && body ? { ...body, courseId: target } : body, { ...options, accountId })
    if (!isCurrent() || (isCourse && target && result.course?.id !== target)) throw new Error('COURSE_SELECTION_CHANGED')
    return result
  }
  const [busy, setBusy] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [exploring, setExploring] = useState(openFromInsights)
  useEffect(() => {
    if (!openFromInsights) return
    setExploring(true)
    // The existing in-account explorer opens at its actual filters, not the top
    // of the saved-test dashboard. A new URL requires no extra click.
    let childFrame
    const frame = window.requestAnimationFrame(() => {
      childFrame = window.requestAnimationFrame(() => {
        document.getElementById('hh-test-customizer')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    })
    return () => {
      window.cancelAnimationFrame(frame)
      if (childFrame !== undefined) window.cancelAnimationFrame(childFrame)
    }
  }, [openFromInsights, insightsCategory])
  const allowedFilters = ['all', 'notStarted', 'inProgress', 'completed', 'remaining']
  const requestedFilter = allowedFilters.includes(initialStatusFilter) ? initialStatusFilter : null
  const [statusFiltersOpen, setStatusFiltersOpen] = useState(Boolean(requestedFilter))
  const [showList, setShowList] = useState(true)
  const [statusFilter, setStatusFilter] = useState(requestedFilter || 'all')
  useEffect(() => {
    // The public Google handoff can replace ?selection=pending with ?plan=... without remounting.
    if (requestedPlanId) setShowList(true)
  }, [requestedPlanId])
  useEffect(() => {
    if (!requestedFilter) return
    setStatusFiltersOpen(true)
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
  useEffect(() => {
    let active = true
    setCourseState(null)
    const controller = new AbortController()
    api('course', undefined, { signal: controller.signal }).then(course => {
      if (active) setCourseState(course)
    }).catch(error => {
      if (active && error.name !== 'AbortError') setCourseState(null)
    })
    // Safari/WebKit can treat an unfinished course fetch as a cross-origin
    // navigation rejection when a user immediately opens a test. Cancel it.
    return () => { active = false; controller.abort() }
  }, [data.account?.id, data.results?.length, requestedCourseId]) // eslint-disable-line react-hooks/exhaustive-deps
  const courseKeys = courseTestKeys(courseState)
  const courseStatusByKey = new Map((courseState?.assessments?.selectedTests || [])
    .map(item => [item.key, item]))
  const rows = useMemo(() => {
    const regular = planRows(currentPlan, data, locale)
    const selected = new Set(regular.map(row => row.key))
    // A course is a named subset in My Tests even if another account plan
    // was opened later. It must not change or replace the saved battery.
    const catalogue = buildExplorerEntries({ locale, audience: 'account' })
    const missingIds = courseTestKeys(courseState).filter(key => !selected.has(key))
      .map(key => catalogue.find(entry => entry.key === key && entry.selectable)?.definition?.id)
      .filter(Boolean)
    const missing = missingIds.length
      ? planRows({ definitionIds: missingIds, completedRunIds: [] }, data, locale)
      : []
    const completedKeys = new Set((courseState?.assessments?.selectedTests || [])
      .filter(item => item.completed).map(item => item.key))
    return [...regular, ...missing].map(row => completedKeys.has(row.key)
      ? { ...row, completedInPlan: true } : row)
  }, [currentPlan, data, locale, courseState])
  const completed = rows.filter((row) => row.completedInPlan).length
  const pastRows = useMemo(() => {
    const ids = [...new Set((data.results || []).map((result) => result.definitionId).filter(Boolean))]
    return planRows({ definitionIds: ids, completedRunIds: [] }, data, locale)
  }, [data, locale])
  const root = '/' + locale + '/app'
  const selectionPreferences = currentPlan?.selectionPreferences || data.latestTestPlan?.selectionPreferences || {}
  // A category-scoped invitation starts a fresh *filter view*, never modifies
  // stored selections. Saving uses the existing appendActive flow.
  const categoryFocus = TEST_RECOMMENDATION_FOCUS.some((item) => item.key === insightsCategory) ? [insightsCategory] : []
  const explorerPreferences = openFromInsights
    ? { focus: categoryFocus, areas: insightsCategory === 'wu-xing' ? ['wu-xing'] : [] }
    : selectionPreferences
  const initialFilterGroup = !openFromInsights || !insightsCategory ? null
    : insightsCategory === 'wu-xing' ? 'areas' : categoryFocus.length ? 'topics' : null
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
      // When the person came from My Course, these are the EXACT tests they
      // deliberately checked in the full Explorer. Explicitly bind them to
      // that private course, not the default five or the account's entire
      // (possibly much larger) historical test-plan selection.
      let returnCourseId = selectedCourseId
      if (fromCourse) {
        const current = await api('course')
        if (current.course?.stage !== 2) {
          throw Object.assign(new Error('COURSE_STAGE_CHANGED'), { code: 'COURSE_STAGE_CHANGED' })
        }
        returnCourseId = current.course.id
        await api('course', {
          action: 'confirm-tests', courseId: current.course.id,
          expectedRevision: current.course.revision,
          testKeys: valid,
        })
      }
      // Reconcile the saved account state before replacing the handoff URL.
      // Otherwise a concurrent bootstrap render can leave ?selection=pending visible.
      await reload()
      if (!isCurrent()) return
      router.replace(fromCourse ? courseHref({}, returnCourseId) : root + '/tests?plan=' + encodeURIComponent(created.id))
    } catch (cause) {
      if (!isCurrent()) return
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
      if (requestedPlanId && isCurrent()) router.replace(root + '/tests')
    } catch (cause) {
      if (!isCurrent()) return
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

  async function openNextCourseTest() {
    if (busy) return
    setBusy(true); setError('')
    try {
      const fresh = await api('course')
      const key = coursePendingKeys(fresh)[0]
      if (!key) {
        router.push(courseHref({ tests: 'complete' }, fresh.course?.id))
        return
      }
      const run = await startOrResumeCourseTest({
        courseState: fresh, key, locale, request: api,
      })
      if (!isCurrent()) return
      router.push(root + '/runs/' + encodeURIComponent(run.id) + '?mode=quick&course=1&courseId=' + encodeURIComponent(fresh.course.id))
    } catch (cause) {
      if (!isCurrent()) return
      setError(c.error + ' (' + (cause.code || cause.message || 'COURSE_UNAVAILABLE') + ')')
      setBusy(false)
    }
  }

  const listRows = statusFilter === 'completed' ? pastRows : rows
  const visibleRows = listRows.filter(row => {
    const done = statusFilter === 'completed' ? Boolean(row.result) : row.completedInPlan
    const status = done ? 'completed' : row.run ? 'inProgress' : 'notStarted'
    return (statusFilter === 'all') ||
      (statusFilter === 'remaining' && !done) ||
      (statusFilter === status)
  })
  const groupedRows = groupCourseTestRows(visibleRows, courseState)
  const groups = courseKeys.length
    ? [
      { id: 'course', rows: groupedRows.course },
      { id: 'other', rows: groupedRows.other },
    ].filter(group => group.rows.length)
    : [{ id: 'all', rows: groupedRows.other }]
  const coursePending = coursePendingKeys(courseState)

  async function openTest(row) {
    setBusy(true)
    setError('')
    try {
      if (isCourseTest(courseState, row.key) && !courseStatusByKey.get(row.key)?.completed) {
        const fresh = await api('course')
        if (isCourseTest(fresh, row.key) &&
            coursePendingKeys(fresh).includes(row.key)) {
          const run = await startOrResumeCourseTest({
            courseState: fresh, key: row.key, locale, request: api,
          })
          if (!isCurrent()) return
      router.push(root + '/runs/' + encodeURIComponent(run.id) + '?mode=quick&course=1&courseId=' + encodeURIComponent(fresh.course.id))
          return
        }
      }
      const run = row.run || await api('runs', {
        definitionKey: row.definition.key,
        definitionVersion: row.definition.version,
        instrumentLocale: row.definition.instrumentLocale,
        operationId: crypto.randomUUID(),
      })
      const isPlanStep = currentPlan?.status === 'active' &&
        currentPlan.definitionIds.includes(row.definition.id)
      if (!isCurrent()) return
      router.push(root + '/runs/' + encodeURIComponent(run.id) +
        '?mode=quick' + (isPlanStep ? '&plan=' + encodeURIComponent(currentPlan.id) : ''))
    } catch (cause) {
      if (!isCurrent()) return
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
              {groups.map(group => <section key={group.id}
                className={group.id === 'course' ? styles.courseGroup : styles.otherGroup}
                data-course-test-group={group.id === 'course' ? 'true' : undefined}>
                {group.id !== 'all' && <header className={styles.courseGroupHeader}>
                  <div className={styles.groupHeading}>
                    <h3>{group.id === 'course'
                      ? (locale === 'ru' ? 'Тесты моего курса' : 'My course tests')
                      : (locale === 'ru' ? 'Остальные выбранные тесты' : 'Other selected tests')}</h3>
                    {group.id === 'course' && <p>{locale === 'ru'
                      ? 'Идут в отдельном порядке. Завершённые тесты засчитываются автоматически.'
                      : 'A separate sequence. Previously completed tests count automatically.'}</p>}
                  </div>
                  {group.id === 'course' && <div className={styles.groupActions}>
                    <strong>{courseStatusByKey.size ? [...courseStatusByKey.values()].filter(item => item.completed).length : 0}/{courseKeys.length}</strong>
                    {coursePending.length
                      ? <button type="button" className={styles.courseNextButton}
                          disabled={busy} onClick={openNextCourseTest}>
                          {locale === 'ru' ? 'Продолжить курс' : 'Continue course'} <ArrowRight size={15}/>
                        </button>
                      : <Link href={courseHref()}>{locale === 'ru' ? 'Открыть курс' : 'Open my course'} <ArrowRight size={15}/></Link>}
                  </div>}
                </header>}
                <div className={styles.group}>
                {group.rows.map((row) => {
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
                      <details className={styles.aboutTest}>
                         <summary>{locale === 'ru' ? 'О тесте и научном статусе' : 'About this test & evidence'}</summary>
                         <p>{row.description}</p>
                         <p>{row.methodology}</p>
                       </details>
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
                    {group.id !== 'course' && currentPlan?.status === 'active' &&
                      currentPlan.definitionIds.includes(row.definition.id) && statusFilter !== 'completed' &&
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
              </section>)}
              <details className={styles.filterDetails} open={statusFiltersOpen}
                onToggle={(event) => setStatusFiltersOpen(event.currentTarget.open)}>
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
        <TestExplorer key={(currentPlan?.id || 'new') + ':' + (openFromInsights ? insightsCategory || 'all' : 'saved')} locale={locale}
          audience="account" onStart={choose} explicitSelectionOnly={fromCourse} initialPreferences={explorerPreferences}
          openFiltersInitially={openFromInsights} initialFilterGroup={initialFilterGroup}
          pastResults={data.results} draftRuns={data.runs} profileSnapshot={data.snapshot}
          recommendedKey={recommendedKey}
          onResumeRun={(run)=>router.push(root+'/runs/'+encodeURIComponent(run.id))}/>
      </section>}
  </>
}
