import { MONITORING_CATALOG } from '../../data/assessments/catalog.js'
import { seriesFor } from './history.js'

export const PROFILE_AXES = Object.freeze(['state', 'symptoms', 'function', 'resources', 'trait'])

const AXIS_COPY = {
  en: {
    state: 'state',
    symptoms: 'symptoms & load',
    function: 'functioning',
    resources: 'resources',
    trait: 'personality tendencies',
  },
  ru: {
    state: 'состояние',
    symptoms: 'симптомы и нагрузку',
    function: 'функционирование',
    resources: 'ресурсы',
    trait: 'личностные особенности',
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
  return Math.round((1000 * (clamp(value, min, max) - min)) / (max - min)) / 10
}

function normalizedValue(value, dimension) {
  if (value === null || value === undefined) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? normalizeDimension({ ...dimension, value: numeric }) : null
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
    const previousResult = previousCompatibleResult(results, currentResult)
    const previousDimension =
      previousResult?.dimensions?.find((item) => item.key === dimension.key) || null
    const currentPercent = normalizeDimension(dimension)
    const priorPercent = normalizedValue(previousDimension?.value, dimension)
    return {
      ...dimension,
      currentPercent,
      priorValue: previousDimension?.value ?? null,
      priorPercent,
      delta: previousDimension ? dimension.value - previousDimension.value : null,
      priorMeasurementAt: previousResult?.measurementAt || null,
    }
  })
  const coveredAxes = PROFILE_AXES.filter((axis) =>
    rows.some((row) => row.dimensionClass === axis),
  )
  return {
    rows,
    coveredAxes,
    missingAxes: PROFILE_AXES.filter((axis) => !coveredAxes.includes(axis)),
    coveragePercent: Math.round((100 * coveredAxes.length) / PROFILE_AXES.length),
  }
}

function itemProfileAxes(item) {
  return [...new Set((item.resultAxes || [item.axis]).map((axis) => (axis === 'baseline' ? 'trait' : axis)))]
    .filter((axis) => PROFILE_AXES.includes(axis))
}

function reasonFor(axes, locale) {
  const copy = AXIS_COPY[locale] || AXIS_COPY.en
  const labels = axes.map((axis) => copy[axis])
  if (locale === 'ru') return 'Поможет добавить в профиль: ' + labels.join(', ') + '.'
  return 'Adds missing profile layers: ' + labels.join(', ') + '.'
}

export function profileCompletionRecommendations({
  snapshot = null,
  results = [],
  locale = 'en',
  limit = 4,
} = {}) {
  const summary = buildProfileSummary({ snapshot, results })
  const uncovered = new Set(summary.missingAxes)
  const available = MONITORING_CATALOG.filter((item) => item.startable)
  const recommendations = []
  const used = new Set()

  while (uncovered.size && recommendations.length < limit) {
    const candidates = available
      .filter((item) => !used.has(item.key))
      .map((item) => {
        const covers = itemProfileAxes(item).filter((axis) => uncovered.has(axis))
        return { item, covers }
      })
      .filter((candidate) => candidate.covers.length)
      .sort(
        (a, b) =>
          b.covers.length - a.covers.length ||
          (a.item.durationMinutes ?? 99) - (b.item.durationMinutes ?? 99) ||
          a.item.key.localeCompare(b.item.key),
      )
    const best = candidates[0]
    if (!best) break
    used.add(best.item.key)
    best.covers.forEach((axis) => uncovered.delete(axis))
    recommendations.push({
      key: best.item.key,
      item: best.item,
      covers: best.covers,
      reason: reasonFor(best.covers, locale),
    })
  }

  return {
    ...summary,
    recommendations,
    complete: summary.missingAxes.length === 0,
  }
}
