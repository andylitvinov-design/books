import { seriesFor } from './history.js'
import {
  catalogTitle,
  definitionLocaleFor,
  getAssessmentCatalogEntry,
  startableCatalog,
} from '../../data/assessments/catalog.js'

export const PROFILE_AXES = Object.freeze(['state', 'symptoms', 'function', 'resources', 'trait'])

const COMPLETION_PLAN = Object.freeze({
  state: ['hh-current-state', 'hh-weekly-pulse'],
  symptoms: ['phq-4', 'k6'],
  function: ['hh-weekly-pulse', 'hh-monthly-profile'],
  resources: ['hh-resource-pulse', 'hh-monthly-profile'],
  trait: ['mini-ipip-20'],
})

const COMPLETION_REASON = {
  en: {
    state: 'Adds a current-state layer to the profile.',
    symptoms: 'Adds a separate symptom/load layer without turning the profile into a diagnosis.',
    function: 'Adds how daily functioning and effectiveness are going.',
    resources: 'Adds energy, support, connection and inner-resource measures.',
    trait: 'Adds a more stable personality-tendencies layer beyond today’s state.',
    refresh: 'Refreshes an existing profile layer because its suggested repeat window has arrived.',
  },
  ru: {
    state: 'Добавит слой текущего состояния.',
    symptoms: 'Добавит отдельный слой симптомов и нагрузки, не превращая профиль в диагноз.',
    function: 'Добавит слой повседневного функционирования и эффективности.',
    resources: 'Добавит показатели энергии, поддержки, связи и внутреннего ресурса.',
    trait: 'Добавит более устойчивый слой личностных тенденций помимо текущего состояния.',
    refresh: 'Обновит уже существующий слой профиля: подошёл рекомендуемый срок повторного замера.',
  },
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function normalizeDimension(dimension) {
  const min = Number(dimension?.min)
  const max = Number(dimension?.max)
  const value = Number(dimension?.value)
  if (![min, max, value].every(Number.isFinite) || max <= min) return null
  return Math.round((1000 * clamp(value, min, max) / 1 - 1000 * min) / (max - min)) / 10
}

function normalizeValue(value, dimension) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  return normalizeDimension({ ...dimension, value: numeric })
}

function average(values) {
  const usable = values.filter(Number.isFinite)
  if (!usable.length) return null
  return Math.round((usable.reduce((sum, value) => sum + value, 0) / usable.length) * 10) / 10
}

function previousCompatibleResult(results, current) {
  if (!current) return null
  const series = seriesFor(results, current)
  const index = series.findIndex((item) => item.id === current.id)
  return index > 0 ? series[index - 1] : null
}

export function buildProfileSummary({ snapshot = null, results = [] } = {}) {
  const dimensions = snapshot?.dimensions || []
  const rows = dimensions.map((dimension) => {
    const currentResult = results.find((result) => result.id === dimension.sourceResultId) || null
    const priorResult = previousCompatibleResult(results, currentResult)
    const priorDimension = priorResult?.dimensions?.find((item) => item.key === dimension.key) || null
    const currentPercent = normalizeDimension(dimension)
    const priorPercent = priorDimension ? normalizeValue(priorDimension.value, dimension) : null
    return {
      ...dimension,
      currentPercent,
      priorValue: priorDimension?.value ?? null,
      priorPercent,
      delta: priorDimension ? dimension.value - priorDimension.value : null,
      normalizedDelta:
        Number.isFinite(currentPercent) && Number.isFinite(priorPercent)
          ? Math.round((currentPercent - priorPercent) * 10) / 10
          : null,
      priorMeasurementAt: priorResult?.measurementAt || null,
    }
  })

  const groups = PROFILE_AXES.map((axis) => {
    const axisRows = rows.filter((row) => row.dimensionClass === axis)
    return {
      axis,
      count: axisRows.length,
      currentPercent: average(axisRows.map((row) => row.currentPercent)),
      priorPercent: average(axisRows.map((row) => row.priorPercent)),
      comparableCount: axisRows.filter((row) => Number.isFinite(row.priorPercent)).length,
    }
  })
  const coveredAxes = groups.filter((group) => group.count > 0).map((group) => group.axis)

  return {
    rows,
    groups,
    coveredAxes,
    missingAxes: PROFILE_AXES.filter((axis) => !coveredAxes.includes(axis)),
    coveragePercent: Math.round((100 * coveredAxes.length) / PROFILE_AXES.length),
  }
}

function latestResultFor(results, key) {
  return [...results]
    .filter((result) => result.definitionKey === key)
    .sort((a, b) => Date.parse(a.measurementAt) - Date.parse(b.measurementAt))
    .at(-1)
}

function isDue(entry, results, now) {
  const prior = latestResultFor(results, entry.key)
  if (!prior || !entry.cooldownDays) return true
  return now >= Date.parse(prior.measurementAt) + entry.cooldownDays * 86400000
}

export function profileCompletionRecommendations({
  snapshot = null,
  results = [],
  locale = 'en',
  now = Date.now(),
  limit = 4,
} = {}) {
  const summary = buildProfileSummary({ snapshot, results })
  const reasonCopy = COMPLETION_REASON[locale] || COMPLETION_REASON.en
  const used = new Set()
  const recommendations = []

  for (const axis of summary.missingAxes) {
    const keys = COMPLETION_PLAN[axis] || []
    const entry = keys
      .map((key) => getAssessmentCatalogEntry(key))
      .find(
        (candidate) =>
          candidate?.startable &&
          candidate.access !== 'clinician' &&
          candidate.access !== 'practitioner' &&
          definitionLocaleFor(candidate, locale),
      )
    if (!entry || used.has(entry.key)) continue
    used.add(entry.key)
    recommendations.push({
      key: entry.key,
      entry,
      axis,
      reason: reasonCopy[axis],
      definitionLocale: definitionLocaleFor(entry, locale),
      mode: 'complete',
    })
  }

  if (!summary.missingAxes.length) {
    for (const entry of startableCatalog({ guest: false })) {
      if (recommendations.length >= limit) break
      if (
        used.has(entry.key) ||
        !definitionLocaleFor(entry, locale) ||
        !latestResultFor(results, entry.key) ||
        !isDue(entry, results, now)
      )
        continue
      used.add(entry.key)
      recommendations.push({
        key: entry.key,
        entry,
        axis: entry.axis,
        reason: reasonCopy.refresh,
        definitionLocale: definitionLocaleFor(entry, locale),
        mode: 'refresh',
      })
    }
  }

  return {
    ...summary,
    recommendations: recommendations.slice(0, limit),
    complete: summary.missingAxes.length === 0,
  }
}

export function profileRecommendationTitle(item, locale = 'en') {
  return catalogTitle(item?.entry, locale)
}
