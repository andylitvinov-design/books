import { isCoreCheckinResult, savedCheckinProfile, checkinComparisonRows } from './checkin-result-analysis.js'
import { interpretationBandModel } from './interpretation-registry.js'
import { descriptiveScoreLevels } from './descriptive-score-levels.js'
import { assessmentRangeReading } from './assessment-range-reading.js'
import { authorScoreClusters } from './author-score-clusters.js'
import { legacyMixedScoreAudit } from './legacy-mixed-score-audit.js'
import { SITUATION_OBSERVATION } from './situational-score-context.js'

// Presentation only: never manufacture clinical thresholds or a cross-test "health percentage".
const comparableResultFields = [
  'accountId', 'definitionId', 'definitionKey', 'definitionVersion', 'contentHash',
  'instrumentLocale', 'translationVersion', 'scoringKey', 'scoringVersion', 'resultVersion', 'timeframe',
]
const comparableDimensionFields = [
  'key', 'min', 'max', 'unit', 'timeframe', 'direction', 'dimensionClass', 'sourceConstruct', 'displayKind',
]

export function gaugeModel(dimension, result = null, locale = 'en') {
  if (isCoreCheckinResult(result)) {
    const facet = savedCheckinProfile(result)?.facets.find(item => item.key === dimension?.key)
    if (!facet) return null
    const original = result.dimensions.find(item => item.key === dimension?.key)
    if (!facet || !original || comparableDimensionFields.some(key => dimension?.[key] !== original[key]) || dimension.value !== facet.value) return null
    return { displayKind: 'checkin-observation', label: facet.label, anchors: facet.anchors, responseLabel: facet.responseAnchors?.[facet.value] || null, fraction: null, rawFraction: null, orientation: 'neutral', bands: [], answerBands: [], currentBand: null, verified: true, bandBasis: 'authored-response', continuous: false, source: null }
  }
  if (!dimension || !Number.isFinite(dimension.value) || !Number.isFinite(dimension.min) ||
      !Number.isFinite(dimension.max) || dimension.max <= dimension.min ||
      dimension.value < dimension.min || dimension.value > dimension.max) return null
  const interpretation = result ? interpretationBandModel(result, dimension, locale) : null
  if (interpretation?.basis === 'unavailable') return null
  const published = interpretation?.verified === true &&
    ['screening', 'published-reference'].includes(interpretation.basis) && interpretation.bands.length > 0
  if (dimension.key === 'symptoms.asrs6.shaded_count') {
    if (dimension.displayKind !== 'screening-count' || dimension.min !== 0 || dimension.max !== 6 || !Number.isInteger(dimension.value)) return null
    return {
      displayKind: 'screening-count', orientation: 'screening',
      screenPositive: published ? interpretation.recommendedReview : null,
      fraction: null, rawFraction: null, bands: published ? interpretation.bands : [],
      currentBand: published ? interpretation.currentBand : null, verified: published,
      bandBasis: interpretation?.basis || 'descriptive', source: published ? interpretation.source : null,
      rangeReading: assessmentRangeReading({
        result, dimension, interpretation,
        bands: published ? interpretation.bands.map(b => ({
          ...b, current: b.code === interpretation.currentBand?.code,
        })) : [], locale,
      }),
    }
  }
  const trait = dimension.dimensionClass === 'trait' || dimension.direction === 'non-normative'
  const higherResource = typeof dimension.direction === 'string' && dimension.direction.startsWith('higher-reported-')
  const lowerDifficulty = typeof dimension.direction === 'string' && dimension.direction.startsWith('lower-reported-')
  const orientation = trait ? 'neutral' : interpretation?.presentationDirection ||
    (higherResource ? 'resource' : lowerDifficulty ? 'difficulty' : 'neutral')
  const rawFraction = (dimension.value - dimension.min) / (dimension.max - dimension.min)
  const orient = fraction => orientation === 'difficulty' ? 1 - fraction : fraction
  const fraction = orient(rawFraction)
  // Published sum-score intervals retain their exact integer endpoints in the
  // legend. The next admissible band's first value is its visual boundary.
  // All other scores use one neutral continuous arc, never invented sectors.
  const bands = published ? interpretation.bands.map((band, index, all) => {
    const from = (band.from - dimension.min) / (dimension.max - dimension.min)
    const to = ((all[index + 1]?.from ?? dimension.max) - dimension.min) / (dimension.max - dimension.min)
    return { ...band, startFraction: Math.min(orient(from), orient(to)),
      endFraction: Math.max(orient(from), orient(to)), current: band.code === interpretation.currentBand?.code }
  }) : []
  const answerBands = interpretation?.verified === true && interpretation.basis === 'descriptive'
    ? (interpretation.answerBands || []).map(band => {
      const from = (band.from - dimension.min) / (dimension.max - dimension.min)
      const to = (band.to - dimension.min) / (dimension.max - dimension.min)
      return {
        ...band, startFraction: Math.min(orient(from), orient(to)),
        endFraction: Math.max(orient(from), orient(to)),
        current: band.code === interpretation.currentAnswerBand?.code,
      }
    }) : []
  const scoreLevelGuide = descriptiveScoreLevels({
    result, locale,
    section: {
      key: dimension.key, value: dimension.value, min: dimension.min, max: dimension.max,
      construct: interpretation?.construct || dimension.sourceConstruct,
      bandBasis: interpretation?.basis,
    },
    model: { verified: interpretation?.verified === true,
      bandBasis: interpretation?.basis, bands, answerBands,
      reliableDirection: interpretation?.reliableDirection,
      orientation },
  })
  // Presentation only: exact attainable author-score clusters sit above the
  // existing source-preserved v3 description without mutating historical rules.
  const authorClusters = authorScoreClusters({result, dimension, interpretation, locale})
  const legacyMixed = !authorClusters
    ? legacyMixedScoreAudit({result, dimension, interpretation, locale}) : null
  const rangeReading = assessmentRangeReading({
    result, dimension, interpretation, bands, answerBands, scoreLevelGuide, authorClusters, legacyMixed, locale,
  })
  const lang = locale === 'ru' ? 'ru' : 'en'
  const observation = result?.definitionKey?.startsWith('hh-')
    ? SITUATION_OBSERVATION[dimension.key]?.[lang] ||
      SITUATION_OBSERVATION[result.definitionKey]?.[lang] || null
    : null
  return {
    fraction: Math.max(0, Math.min(1, fraction)), rawFraction, orientation,
    observation,
    bands, currentBand: bands.find(band => band.current) || null,
    scoreLevelGuide, rangeReading,
    // Kept separate: answer options are not published screening cutoffs.
    answerBands, currentAnswerBand: answerBands.find(band => band.current) || null,
    continuous: !bands.length, verified: interpretation?.verified === true,
    bandBasis: interpretation?.basis || 'descriptive', source: published ? interpretation.source : null,
  }
}

export function gaugeChange(current, previous, dimensionKey) {
  if (isCoreCheckinResult(current) || isCoreCheckinResult(previous)) {
    const row = checkinComparisonRows(current, previous).find(item => item.key === dimensionKey)
    return row ? { state: row.delta === 0 ? 'unchanged' : 'changed', delta: row.delta } : { state: 'baseline', delta: null }
  }
  if (!Array.isArray(current?.dimensions) || !Array.isArray(previous?.dimensions))
    return { state: 'baseline', delta: null }
  const currentDimension = current?.dimensions?.find(item => item.key === dimensionKey)
  const former = previous?.dimensions?.find(item => item.key === dimensionKey)
  const presentation = gaugeModel(currentDimension, current)
  const previousPresentation = gaugeModel(former, previous)
  if (!presentation || !previousPresentation || !former || !previous || !current ||
      comparableResultFields.some(key => !current[key] || !previous[key] || current[key] !== previous[key]) ||
      comparableDimensionFields.some(key => currentDimension[key] !== former[key]) ||
      !Number.isFinite(former.value) || former.value < former.min || former.value > former.max ||
      !(Date.parse(previous.measurementAt) < Date.parse(current.measurementAt))) {
    return { state: 'baseline', delta: null }
  }
  const delta = Number((currentDimension.value - former.value).toFixed(4))
  if (delta === 0) return { state: 'unchanged', delta: 0 }
  // Even a provenance-compatible raw difference does not establish reliable
  // or clinically meaningful change. RCI/SDC/MIC depend on independently
  // supported measurement error and population evidence, not gauge direction.
  // Use the descriptive difference for every instrument, including resources,
  // screening tools and author-created monitoring scales.
  return { state: 'changed', delta }
}

export function validCalendarDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T12:00:00Z')
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function periodWindow(period = 'all', start = '', end = '', now = new Date()) {
  if (period === 'all') return { valid: true, from: -Infinity, to: Infinity }
  if (period === 'custom') {
    if (!validCalendarDay(start) || !validCalendarDay(end) || start > end)
      return { valid: false, from: 0, to: 0 }
    const from = new Date(start + 'T00:00:00').getTime()
    const to = new Date(end + 'T23:59:59.999').getTime()
    return { valid: Number.isFinite(from) && Number.isFinite(to), from, to }
  }
  const days = { week: 7, month: 30, quarter: 90 }[period]
  if (!days || !Number.isFinite(now?.getTime?.())) return { valid: false, from: 0, to: 0 }
  return { valid: true, from: now.getTime() - days * 86400000, to: now.getTime() }
}

export function resultsForPeriod(results = [], period = 'all', start = '', end = '', now = new Date()) {
  const window = periodWindow(period, start, end, now)
  if (!window.valid) return []
  return (Array.isArray(results) ? results : []).filter(result => {
    const at = Date.parse(result?.measurementAt)
    return Number.isFinite(at) && at >= window.from && at <= window.to
  })
}

// The most recent result is the current measurement. Baseline is the earliest
// *compatible* measurement within the selected time period, never a different test/version.
export function periodComparison(results = []) {
  const ordered = [...results].filter(result => Number.isFinite(Date.parse(result?.measurementAt)))
    .sort((a, b) => Date.parse(a.measurementAt) - Date.parse(b.measurementAt) || String(a.id).localeCompare(String(b.id)))
  const current = ordered.at(-1) || null
  if (!current) return { current: null, previous: null }
  const prior = ordered.find(candidate =>
    candidate.id !== current.id &&
    Array.isArray(candidate.dimensions) && Array.isArray(current.dimensions) &&
    candidate.dimensions.length === current.dimensions.length && current.dimensions.length > 0 &&
    current.dimensions.every(dimension => gaugeChange(current, candidate, dimension.key).state !== 'baseline')
  ) || null
  return { current, previous: prior }
}
