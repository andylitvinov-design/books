import { monitoringCatalogItem } from '../../data/assessments/catalog.js'
import { gaugeChange, periodWindow, resultsForPeriod } from './dashboard-gauges.js'
import { assessmentHistoryTitle } from './personal-guidance.js'

// Presentation-only chronology. Preserve raw values and do not make clinical
// assumptions about whether moving up/down is good or bad.
const timestamp = value => {
  const date = Date.parse(value || '')
  return Number.isFinite(date) ? date : 0
}
const sorted = values => [...values].sort((a, b) =>
  timestamp(a.measurementAt) - timestamp(b.measurementAt) ||
  String(a.id).localeCompare(String(b.id)))

export function buildTestDynamicsGroups(results = [], locale = 'en', period = 'all', start = '', end = '', now = new Date()) {
  const window = periodWindow(period, start, end, now)
  if (!window.valid) return { valid: false, groups: [], attempts: 0, repeated: 0 }
  const visible = resultsForPeriod(results, period, start, end, now)
    .filter(result => result?.id && (result.definitionKey || result.definitionId) && Array.isArray(result.dimensions))
  const buckets = new Map()
  for (const result of visible) {
    const key = result.definitionKey || result.definitionId
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(result)
  }
  const groups = [...buckets.entries()].map(([key, attempts]) => {
    const history = sorted(attempts)
    const first = history[0]
    const latest = history.at(-1)
    const catalog = monitoringCatalogItem(key)
    const title = catalog?.title?.[locale] || catalog?.title?.en ||
      assessmentHistoryTitle(latest, locale)
    const scales = latest.dimensions.flatMap(dimension => {
      const earlier = first.dimensions.find(entry => entry.key === dimension.key)
      if (dimension.value === null || dimension.value === undefined || !Number.isFinite(Number(dimension.value))) return []
      const track = history.filter(candidate =>
        candidate.id === latest.id || gaugeChange(latest, candidate, dimension.key).state !== 'baseline')
        .map(candidate => ({
          id: candidate.id,
          at: candidate.measurementAt,
          value: Number(candidate.dimensions.find(entry => entry.key === dimension.key)?.value),
        }))
        .filter(point => Number.isFinite(point.value))
      const baselineComparable = first.id !== latest.id &&
        gaugeChange(latest, first, dimension.key).state !== 'baseline'
      const firstValue = earlier && Number.isFinite(Number(earlier.value)) ? Number(earlier.value) : null
      const lastValue = Number(dimension.value)
      return [{
        key: dimension.key,
        label: String(dimension.sourceConstruct || dimension.key).replaceAll('_', ' ').replaceAll('.', ' · '),
        firstValue,
        lastValue,
        delta: baselineComparable && firstValue !== null ? Number((lastValue - firstValue).toFixed(3)) : null,
        min: dimension.min,
        max: dimension.max,
        unit: dimension.unit || '',
        track,
      }]
    })
    return { key, title, first, latest, count: history.length, scales }
  }).sort((a, b) => timestamp(b.latest.measurementAt) - timestamp(a.latest.measurementAt) ||
    a.title.localeCompare(b.title))
  return {
    valid: true,
    groups,
    attempts: visible.length,
    repeated: groups.filter(group => group.count > 1).length,
  }
}
