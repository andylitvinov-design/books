import { MONITORING_CATALOG } from '../../data/assessments/catalog.js'
import { verifiedHistoryView, verifiedPreviousResult, verifiedSnapshotRows } from '../assessments/verified-history.js'

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
  if (dimension?.key === 'symptoms.asrs6.shaded_count' || dimension?.displayKind === 'screening-count') return null
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

export function buildProfileSummary({ snapshot = null, results = [] } = {}) {
  const view = verifiedHistoryView(results)
  const dimensions = verifiedSnapshotRows(snapshot, view.current)
  const rows = dimensions.map((dimension) => {
    const currentResult = view.current.find((result) => result.id === dimension.sourceResultId) || null
    const previousResult = verifiedPreviousResult(currentResult, view.eligible)
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
    withheldRows: Math.max(0, (Array.isArray(snapshot?.dimensions) ? snapshot.dimensions.length : 0) - rows.length),
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
  // Missing source evidence is unknown coverage, not proof that another test is needed.
  if (summary.withheldRows) return { ...summary, recommendations: [], complete: false, verificationRequired: true }
  const uncovered = new Set(summary.missingAxes)
  // Never recommend retaking an already completed, verified instrument just
  // because a different profile layer is still unmeasured.
  const completed = new Set(verifiedHistoryView(results).current.map(result => result.definitionKey))
  const available = MONITORING_CATALOG.filter((item) =>
    item.startable && item.explicitOptIn !== true && !completed.has(item.key))
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
          Number(a.item.starterEligible === false) - Number(b.item.starterEligible === false) ||
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
