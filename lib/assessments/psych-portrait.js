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

export function scorePortraitDimension(dimension) {
  if (!dimension || typeof dimension !== 'object') return null
  const min = Number(dimension.min), max = Number(dimension.max), value = Number(dimension.value)
  if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(value) || max <= min || value < min || value > max) return null
  const key = String(dimension.key || '')
  const axis = DIMENSION_AXES[key]
  if (!axis || !TEST_EXPLORER_AXES.includes(axis)) return null
  const direction = SCREENING_DIRECTION[key] || (dimension.direction?.startsWith('higher-reported') ? 'higher' : dimension.direction?.startsWith('lower-reported') ? 'lower' : null)
  if (!direction) return null // Personality / other non-normative constructs have no "ideal".
  const raw = (value - min) / (max - min)
  const percent = Math.round(100 * (direction === 'lower' ? 1 - raw : raw))
  return { axis, percent, rawValue: value, min, max, direction, dimensionKey: key }
}

export function buildPsychPortrait(results = []) {
  const byAxis = new Map()
  const sorted = (Array.isArray(results) ? results : [])
    .filter((result) => result && Array.isArray(result.dimensions))
    .sort((a, b) => (Date.parse(a.measurementAt || a.createdAt || '') || 0) - (Date.parse(b.measurementAt || b.createdAt || '') || 0))
  for (const result of sorted) {
    for (const dimension of result.dimensions) {
      const measured = scorePortraitDimension(dimension)
      if (!measured) continue
      byAxis.set(measured.axis, {
        ...measured,
        resultId: result.id,
        definitionKey: result.definitionKey,
        measuredAt: result.measurementAt || result.createdAt || null,
        // Used only as a traceable source, not as a clinical interpretation.
        source: dimension.sourceConstruct || dimension.key,
      })
    }
  }
  const axes = Object.fromEntries(TEST_EXPLORER_AXES.map((axis) => [axis, byAxis.get(axis) || null]))
  return { axes, measuredCount: byAxis.size, totalCount: TEST_EXPLORER_AXES.length }
}
