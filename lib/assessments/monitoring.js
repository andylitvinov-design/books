import { isCoreCheckinResult, checkinComparisonRows } from './checkin-result-analysis.js'
import { getDefinitionById } from './definitions.js'
import { verifiedHistoryResult } from './verified-history.js'
import { chronological, compareResults, seriesFor } from '../profile/history.js'
import { MONITORING_CATALOG, MONITORING_AXES } from '../../data/assessments/catalog.js'

const DAY = 24 * 60 * 60 * 1000

function instrumentLocale(item, locale) {
  return item.instrumentLocale === 'dynamic' ? locale : item.instrumentLocale
}

function resultMatches(item, result, locale) {
  if (!result || typeof result !== 'object' || result.definitionKey !== item.key) return false
  if (item.startable && result.definitionVersion !== item.version) return false
  const expected = instrumentLocale(item, locale)
  return expected === 'source-controlled' || result.instrumentLocale === expected
}

function runMatches(item, run, locale) {
  try {
    const def = getDefinitionById(run.definitionId)
    return (
      def.key === item.key &&
      (!item.startable || def.version === item.version) &&
      def.instrumentLocale === instrumentLocale(item, locale)
    )
  } catch {
    return false
  }
}

function daysBetween(a, b) {
  const start = Date.parse(a), finish = Date.parse(b)
  return Number.isFinite(start) && Number.isFinite(finish)
    ? Math.max(0, (finish - start) / DAY) : null
}

// An in-range number or a matching test key is NOT enough to certify a
// measurement. Reuse the version/hash/scorer/attainable-value gate used by
// client reports and historical comparison before making plans from a result.
function usableMeasurement(result) {
  return Boolean(result?.id && Number.isFinite(Date.parse(result.measurementAt)) &&
    verifiedHistoryResult(result))
}

export function dueState(
  item,
  { results = [], runs = [], locale = 'en', now = new Date().toISOString() } = {},
) {
  const matching = chronological(results.filter((result) => resultMatches(item, result, locale)))
  const latestRaw = matching.at(-1) || null
  // Do not promote an older good score if the latest stored attempt is
  // unverifiable. Preserve that attempt in raw History; monitoring cannot
  // call it a completed or up-to-date psychological measurement.
  const latest = usableMeasurement(latestRaw) ? latestRaw : null
  const verificationRequired = Boolean(latestRaw && !latest)
  const activeRun = runs.find((run) => runMatches(item, run, locale)) || null

  if (activeRun) return { state: 'in_progress', latest, activeRun, daysSince: null, verificationRequired }
  if (!item.startable) return { state: 'planned', latest, activeRun: null, daysSince: null, verificationRequired }
  if (!latest) return { state: 'not_completed', latest: null, activeRun: null, daysSince: null, verificationRequired }
  if (!item.suggestedRepeatDays)
    return { state: 'completed', latest, activeRun: null, daysSince: null, verificationRequired }

  const daysSince = daysBetween(latest.measurementAt, now)
  if (daysSince === null) return { state: 'not_completed', latest: null, activeRun: null,
    daysSince: null, verificationRequired: true }
  if (daysSince >= item.suggestedRepeatDays)
    return { state: 'due_now', latest, activeRun: null, daysSince, verificationRequired }

  const soonWindow = Math.max(2, Math.ceil(item.suggestedRepeatDays * 0.2))
  if (daysSince >= item.suggestedRepeatDays - soonWindow)
    return { state: 'due_soon', latest, activeRun: null, daysSince, verificationRequired }

  return { state: 'up_to_date', latest, activeRun: null, daysSince, verificationRequired }
}

export function monitoringPlan({ results = [], runs = [], locale = 'en', now } = {}) {
  return MONITORING_CATALOG.map((item) => ({
    item,
    ...dueState(item, { results, runs, locale, now }),
  }))
}

const statusScore = {
  in_progress: 110,
  due_now: 100,
  not_completed: 80,
  due_soon: 60,
  up_to_date: 20,
  completed: 10,
  planned: -1000,
}

export function recommendMonitoring({
  results = [],
  runs = [],
  locale = 'en',
  now,
  mood = null,
  category = null,
} = {}) {
  const plan = monitoringPlan({ results, runs, locale, now })
    .filter(({ item, state }) =>
      item.startable && item.explicitOptIn !== true && ['in_progress', 'due_now', 'not_completed', 'due_soon'].includes(state),
    )
    .map((entry) => {
      let score = statusScore[entry.state] ?? 0
      if (mood && entry.item.moodAffinities.includes(mood)) score += 20
      if (category && entry.item.categoryAffinities.includes(category)) score += 15
      if (entry.item.axis === 'resources' && mood === 'happy') score += 12
      if (entry.item.axis === 'baseline') score -= 20
      return { ...entry, score }
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.item.durationMinutes ?? 99) - (b.item.durationMinutes ?? 99) ||
        a.item.key.localeCompare(b.item.key),
    )
  return plan[0] || null
}

export function compatibleSeries(item, results = [], locale = 'en') {
  const matching = chronological(results.filter((result) => resultMatches(item, result, locale)))
  const latest = matching.at(-1)
  // An invalid newest attempt blocks a supposed "current trend". If only
  // an earlier attempt is invalid, omit that one without losing genuine
  // compatible comparisons. Never return an unverifiable latest as fallback.
  if (!usableMeasurement(latest)) return []
  try {
    return seriesFor(matching.filter(usableMeasurement), latest)
  } catch {
    return []
  }
}

export function latestCompatibleChange(item, results = [], locale = 'en') {
  const series = compatibleSeries(item, results, locale)
  if (series.length < 2) return []
  return compareResults(series.at(-1), series.at(-2))
}

function directionState(dimension, delta) {
  // A raw endpoint difference is not a validated change threshold or evidence
  // of improvement. In particular, traits and regulation strategies are not
  // universally better when higher, and small nonzero changes are not zero.
  if (delta === 0)
    return dimension.key === 'symptoms.asrs6.shaded_count' || dimension.displayKind === 'screening-count'
      ? 'unchanged' : 'stable'
  return delta > 0 ? 'higher' : 'lower'
}

const LEGACY_V1_HISTORY_KEYS = new Set(['hh-money-pressure', 'hh-overthinking-loop', 'hh-screen-saturation', 'hh-bach-flower-profile'])

export function deterministicPatterns({ results = [], locale = 'en', limit = 4 } = {}) {
  const patterns = []
  for (const item of MONITORING_CATALOG.filter((candidate) => candidate.startable)) {
    let series = compatibleSeries(item, results, locale)
    // These instruments have explicitly preserved v1 result histories.
    // Keep historical v1 observations when there is no current-version result;
    // Never join versions or reinterpret historical scores using v2 scoring.
    if (!series.length && item.version === 'v2' && LEGACY_V1_HISTORY_KEYS.has(item.key) &&
        !results.some(result => resultMatches(item, result, locale)))
      series = compatibleSeries({ ...item, version: 'v1' }, results, locale)
    if (series.length < 3) continue
    const window = series.slice(-4)
    const first = window[0]
    const latest = window.at(-1)
    for (const dimension of latest.dimensions) {
      const before = first.dimensions.find((part) => part.key === dimension.key)
      if (!before) continue
      const safe = isCoreCheckinResult(latest) ? checkinComparisonRows(latest, first).find(row => row.key === dimension.key) : null
      if (isCoreCheckinResult(latest) && !safe) continue
      const delta = safe ? safe.delta : dimension.value - before.value
      patterns.push({
        instrumentKey: item.key,
        dimensionKey: dimension.key,
        state: directionState(dimension, delta),
        delta,
        count: window.length,
        from: first.measurementAt,
        to: latest.measurementAt,
      })
    }
  }
  return patterns.slice(0, Math.max(0, limit))
}

export function dailyMoodSeries(checkins = [], limit = 14) {
  const byDay = new Map()
  for (const checkin of [...checkins].sort(
    (a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || a.id.localeCompare(b.id),
  )) {
    if (!checkin?.occurredAt || !['sad', 'neutral', 'happy'].includes(checkin.mood)) continue
    let day
    try {
      day = new Intl.DateTimeFormat('en-CA', {
        timeZone: checkin.timezone || 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(checkin.occurredAt))
    } catch {
      day = new Date(checkin.occurredAt).toISOString().slice(0, 10)
    }
    byDay.set(day, checkin)
  }
  return [...byDay.values()].slice(-Math.max(1, limit))
}

export function axisOverview({ results = [], runs = [], locale = 'en', now } = {}) {
  const plan = monitoringPlan({ results, runs, locale, now })
  return MONITORING_AXES.map((axis) => ({
    axis,
    items: plan.filter(({ item }) => (item.resultAxes || [item.axis]).includes(axis)),
  }))
}
