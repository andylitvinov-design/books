import { TEST_EXPLORER_AXES } from './test-explorer.js'

// Only map constructs actually measured by an assessment. Metadata about
// which topics a test covers must never be mistaken for an individual's score.
const DIMENSION_AXES = Object.freeze({
  'state.resource': 'resource',
  'state.tension': 'stress',
  'state.fatigue': 'energy',
  'state.life_impact': 'functioning',
  'weekly.mood': 'mood',
  'weekly.tension': 'anxiety',
  'weekly.load': 'stress',
  'weekly.recovery': 'sleep',
  'weekly.energy': 'energy',
  'weekly.clarity': 'clarity',
  'weekly.connection': 'relationships',
  'weekly.functioning': 'functioning',
  'weekly.function': 'functioning',
  'resource.energy': 'energy',
  'resource.self_support': 'self_support',
  'resource.support': 'self_support',
  'resource.connection': 'relationships',
  'resource.agency': 'functioning',
  'resource.meaning': 'meaning',
  'resources.overall': 'resource',
  'resources.monthly.self': 'self_support',
  'resources.monthly.relationships': 'relationships',
  'resources.monthly.body': 'energy',
  'resources.monthly.work': 'functioning',
  'resources.monthly.meaning': 'meaning',
  'resources.monthly.support': 'self_support',
  'resources.monthly.overall': 'resource',
  'symptoms.phq4.depression': 'mood',
  'symptoms.phq4.anxiety': 'anxiety',
  'symptoms.gad7.total': 'anxiety',
  'symptoms.phq9.total': 'mood',
  'symptoms.k6.total': 'stress',
})

// These validated symptom screeners have lower-reported-symptom direction;
// their raw scale proportions are NOT clinical norms or diagnostic probabilities.
const SCREENING_DIRECTION = Object.freeze({
  'symptoms.phq4.depression': 'lower',
  'symptoms.phq4.anxiety': 'lower',
  'symptoms.gad7.total': 'lower',
  'symptoms.phq9.total': 'lower',
  'symptoms.k6.total': 'lower',
})

// A coordinate is a within-instrument scale position, NOT a clinical percentile,
// validated cut-off, health percentage or comparison with other people.
export function scorePortraitDimension(dimension) {
  if (!dimension || typeof dimension !== 'object' || dimension.value === null || dimension.value === undefined) return null
  const min = Number(dimension.min)
  const max = Number(dimension.max)
  const value = Number(dimension.value)
  if (![min, max, value].every(Number.isFinite) || max <= min || value < min || value > max) return null

  const key = String(dimension.key || '')
  const axis = DIMENSION_AXES[key]
  if (!axis || !TEST_EXPLORER_AXES.includes(axis)) return null
  const reportedDirection = typeof dimension.direction === 'string' ? dimension.direction : ''
  const direction = SCREENING_DIRECTION[key] ||
    (reportedDirection.startsWith('higher-reported') ? 'higher' : reportedDirection.startsWith('lower-reported') ? 'lower' : null)
  if (!direction) return null // Never rank non-normative personality traits.
  const proportional = (value - min) / (max - min)
  return {
    axis,
    percent: Math.round(100 * (direction === 'lower' ? 1 - proportional : proportional)),
    rawValue: value,
    min, max, direction, dimensionKey: key,
  }
}

function dateOf(result) {
  const value = result?.measurementAt || result?.createdAt || null
  return value && Number.isFinite(Date.parse(value)) ? value : null
}

function compatibleKey(result, measured) {
  // A change is meaningful only for the SAME construct, scale, scored version
  // and language, never between different tests which happen to share an axis.
  return [
    result.definitionId || result.definitionKey || '',
    result.definitionVersion || '',
    result.instrumentLocale || '',
    measured.dimensionKey, measured.min, measured.max, measured.direction,
  ].join('|')
}

export function buildPsychPortrait(results = []) {
  const byAxis = new Map()
  const lastCompatible = new Map()
  const sorted = (Array.isArray(results) ? results : [])
    .filter((result) => result && Array.isArray(result.dimensions) && result.dimensions.length)
    .map((result, index) => ({ result, index, timestamp: Date.parse(dateOf(result) || '') || 0 }))
    .sort((a, b) => a.timestamp - b.timestamp || a.index - b.index)

  for (const { result } of sorted) {
    for (const dimension of result.dimensions) {
      const measured = scorePortraitDimension(dimension)
      if (!measured) continue
      const key = compatibleKey(result, measured)
      const previous = lastCompatible.get(key) || null
      const measuredAt = dateOf(result)
      const entry = {
        ...measured,
        resultId: result.id || null,
        definitionKey: result.definitionKey || null,
        measuredAt,
        source: dimension.sourceConstruct || dimension.key,
        previousPercent: previous?.percent ?? null,
        previousAt: previous?.measuredAt ?? null,
        previousResultId: previous?.resultId ?? null,
        change: previous ? measured.percent - previous.percent : null,
      }
      lastCompatible.set(key, entry)
      byAxis.set(measured.axis, entry)
    }
  }

  const axes = Object.fromEntries(TEST_EXPLORER_AXES.map((axis) => [axis, byAxis.get(axis) || null]))
  return {
    axes,
    measuredCount: byAxis.size,
    totalCount: TEST_EXPLORER_AXES.length,
    latestAt: [...byAxis.values()].map((entry) => entry.measuredAt).filter(Boolean).sort().at(-1) || null,
  }
}
