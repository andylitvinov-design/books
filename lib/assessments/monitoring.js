import { getDefinitionById } from './definitions.js'
import { chronological, compareResults, seriesFor } from '../profile/history.js'
import { MONITORING_CATALOG, MONITORING_AXES } from '../../data/assessments/catalog.js'

const DAY = 24 * 60 * 60 * 1000

function instrumentLocale(item, locale) {
  return item.instrumentLocale === 'dynamic' ? locale : item.instrumentLocale
}

function resultMatches(item, result, locale) {
  if (result.definitionKey !== item.key) return false
  const expected = instrumentLocale(item, locale)
  return expected === 'source-controlled' || result.instrumentLocale === expected
}

function runMatches(item, run, locale) {
  try {
    const def = getDefinitionById(run.definitionId)
    return def.key === item.key && def.instrumentLocale === instrumentLocale(item, locale)
  } catch {
    return false
  }
}

function daysBetween(a, b) {
  return Math.max(0, (Date.parse(b) - Date.parse(a)) / DAY)
}

export function dueState(
  item,
  { results = [], runs = [], locale = 'en', now = new Date().toISOString() } = {},
) {
  const matching = chronological(results.filter((result) => resultMatches(item, result, locale)))
  const latest = matching.at(-1) || null
  const activeRun = runs.find((run) => runMatches(item, run, locale)) || null

  if (activeRun) return { state: 'in_progress', latest, activeRun, daysSince: null }
  if (!item.startable) return { state: 'planned', latest, activeRun: null, daysSince: null }
  if (!latest) return { state: 'not_completed', latest: null, activeRun: null, daysSince: null }
  if (!item.suggestedRepeatDays)
    return { state: 'completed', latest, activeRun: null, daysSince: null }

  const daysSince = daysBetween(latest.measurementAt, now)
  if (daysSince >= item.suggestedRepeatDays)
    return { state: 'due_now', latest, activeRun: null, daysSince }

  const soonWindow = Math.max(2, Math.ceil(item.suggestedRepeatDays * 0.2))
  if (daysSince >= item.suggestedRepeatDays - soonWindow)
    return { state: 'due_soon', latest, activeRun: null, daysSince }

  return { state: 'up_to_date', latest, activeRun: null, daysSince }
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
      item.startable && ['in_progress', 'due_now', 'not_completed', 'due_soon'].includes(state),
    )
    .map((entry) => {
      let score = statusScore[entry.state] ?? 0
      if (mood && entry.item.moodAffinities.includes(mood)) score += 20
      if (category && entry.item.categoryAffinities.includes(category)) score += 15
      if (entry.item.axis === 'resources' && mood === 'happy') score += 12
      if (entry.item.axis === 'baseline' && entry.state === 'not_completed') score += 4
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
  if (!latest) return []
  try {
    return seriesFor(matching, latest)
  } catch {
    return [latest]
  }
}

export function latestCompatibleChange(item, results = [], locale = 'en') {
  const series = compatibleSeries(item, results, locale)
  if (series.length < 2) return []
  return compareResults(series.at(-1), series.at(-2))
}

function directionState(dimension, delta) {
  const tolerance = Math.max(1, (dimension.max - dimension.min) * 0.1)
  if (Math.abs(delta) < tolerance) return 'stable'
  if (dimension.direction?.startsWith('higher-reported'))
    return delta > 0 ? 'improving' : 'declining'
  if (dimension.direction?.startsWith('lower-reported'))
    return delta < 0 ? 'improving' : 'declining'
  return delta > 0 ? 'higher' : 'lower'
}

export function deterministicPatterns({ results = [], locale = 'en', limit = 4 } = {}) {
  const patterns = []
  for (const item of MONITORING_CATALOG.filter((candidate) => candidate.startable)) {
    const series = compatibleSeries(item, results, locale)
    if (series.length < 3) continue
    const window = series.slice(-4)
    const first = window[0]
    const latest = window.at(-1)
    for (const dimension of latest.dimensions) {
      const before = first.dimensions.find((part) => part.key === dimension.key)
      if (!before) continue
      const delta = dimension.value - before.value
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

export function axisOverview({ results = [], runs = [], locale = 'en', now } = {}) {
  const plan = monitoringPlan({ results, runs, locale, now })
  return MONITORING_AXES.map((axis) => ({
    axis,
    items: plan.filter(({ item }) => item.axis === axis),
  }))
}
