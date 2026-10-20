import { monitoringCatalogItem } from '../../data/assessments/catalog.js'
import { gaugeChange, gaugeModel, periodWindow, resultsForPeriod } from './dashboard-gauges.js'
import { verifiedHistoryResult } from './verified-history.js'
import { assessmentHistoryTitle } from './personal-guidance.js'

// One current interval per gauge: published source bands take precedence,
// then original answer anchors, then explicitly descriptive reading aids.
// No category is invented for measures without a verified interpretation.
export function visibleTestDynamicsBand(dimension, result, locale = 'en') {
  const model = gaugeModel(dimension, result, locale)
  if (!model) return null
  // Use the same exact, scorer-attainable HH intervals as the full report.
  // The previously cached answerBands/scoreLevelGuide can contain editorial
  // boundaries and must not override the source-audited cluster matrix.
  if (model.rangeReading?.clusterBasis && model.rangeReading.rows?.length > 1) {
    const reading = model.rangeReading
    return {
      kind: reading.clusterBasis === 'historical-mixed-mean-v1' ? 'historical-mixed' :
        reading.clusterBasis === 'source-answer-anchors' ? 'answers' : 'descriptive',
      current: reading.current,
      others: reading.rows.filter(band => !band.current),
      caveat: reading.caution,
    }
  }
  const kind = model.bands?.length ? 'published'
    : model.answerBands?.length ? 'answers'
      : model.scoreLevelGuide?.bands?.length ? 'descriptive' : null
  if (!kind) return null
  const bands = kind === 'published' ? model.bands
    : kind === 'answers' ? model.answerBands : model.scoreLevelGuide.bands
  const current = bands.find(band => band.current)
  if (!current) return null
  return {
    kind, current, others: bands.filter(band => band !== current),
    caveat: kind === 'descriptive' ? model.scoreLevelGuide.caveat : null,
  }
}

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
    // A historical attempt can remain in the raw history even when its
    // source/version or score fails verification. Never reuse it as a baseline.
    // Stored IDs can repeat in malformed history; validity belongs to each record.
    const verified = new Map(history.map(result => [result, verifiedHistoryResult(result)]))
    const unverifiedCount = history.filter(result => !verified.get(result)).length
    const catalog = monitoringCatalogItem(key)
    const title = catalog?.title?.[locale] || catalog?.title?.en ||
      assessmentHistoryTitle(latest, locale)
    const scales = latest.dimensions.flatMap(dimension => {
      if (dimension.value === null || dimension.value === undefined || !Number.isFinite(Number(dimension.value))) return []
      // Retest lines and side-by-side numbers must come from the *same*
      // version, scoring key, instrument locale, construct and verified source.
      // In particular, an archived mixed-polarity v1 mean cannot be shown
      // beside its v2 replacement as if both measured the same thing.
      const track = history.filter(candidate =>
        verified.get(latest) && verified.get(candidate) &&
        (candidate === latest || gaugeChange(latest, candidate, dimension.key).state !== 'baseline'))
        .map(candidate => ({
          id: candidate.id,
          at: candidate.measurementAt,
          value: Number(candidate.dimensions.find(entry => entry.key === dimension.key)?.value),
        }))
        .filter(point => Number.isFinite(point.value))
      const firstValue = track.length ? track[0].value : null
      // One verified measurement is a baseline even if there are earlier,
      // incompatible or unverifiable attempts recorded under this test key.
      const lastValue = track.length > 1 ? track.at(-1).value : null
      return [{
        key: dimension.key,
        label: String(dimension.sourceConstruct || dimension.key).replaceAll('_', ' ').replaceAll('.', ' · '),
        firstValue,
        lastValue,
        delta: lastValue !== null && firstValue !== null
          ? Number((lastValue - firstValue).toFixed(3)) : null,
        min: dimension.min,
        max: dimension.max,
        unit: dimension.unit || '',
        // Reuse the validated, instrument-specific score-gauge presentation.
        // The dial shows the most recent *available* score, even for a baseline.
        gaugeDimension: dimension,
        track,
      }]
    })
    return { key, title, first, latest, count: history.length, scales, unverifiedCount }
  }).sort((a, b) => timestamp(b.latest.measurementAt) - timestamp(a.latest.measurementAt) ||
    a.title.localeCompare(b.title))
  return {
    valid: true,
    groups,
    attempts: visible.length,
    repeated: groups.filter(group => group.scales.some(scale => scale.track.length > 1)).length,
  }
}
