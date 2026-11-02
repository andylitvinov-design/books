// Four evidence-aware layers of ONE owner-scoped profile, never four diagnostic scores.
// Inputs are the authenticated /api/app/bootstrap data already used by My Profile.
// No writes, no inference from protected free text, no cross-instrument averages.
import { buildPsychPortrait } from '../assessments/psych-portrait.js'
import { verifiedHistoryView } from '../assessments/verified-history.js'
import { TEST_EXPLORER_AXIS_LABELS } from '../assessments/test-explorer.js'
import { monitoringCatalogItem } from '../../data/assessments/catalog.js'
import { isProfessionalProfileTest } from './profile-assessment-view.js'

export const UNIFIED_PROFILE_LAYER_IDS = Object.freeze(['foundation', 'state', 'life', 'development'])
export const UNIFIED_STATE_AXES = Object.freeze([
  'stress', 'anxiety', 'mood', 'sleep', 'energy', 'resource',
  'self_support', 'emotional_regulation', 'embodiment',
])
export const UNIFIED_LIFE_AXES = Object.freeze([
  'clarity', 'focus', 'functioning', 'relationships', 'meaning',
])
const localeKey = locale => locale === 'ru' ? 'ru' : 'en'
const dateMs = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
  ? Date.parse(value) : null
const credibleScore = item => item && typeof item === 'object' &&
  [item.rawValue, item.min, item.max].every(Number.isFinite) &&
  item.max > item.min && item.rawValue >= item.min && item.rawValue <= item.max
const axisLabel = (axis, locale) => TEST_EXPLORER_AXIS_LABELS[axis]?.[localeKey(locale)] ||
  TEST_EXPLORER_AXIS_LABELS[axis]?.en || axis.replaceAll('_', ' ')

// Only the source-validated, freshness-filtered portrait can color a state/life
// reading. A stale source is not quietly replaced with a different test.
export function unifiedPortraitEvidence(portrait, axes, locale = 'en') {
  const requested = Array.isArray(axes) ? [...new Set(axes)] : []
  const rows = requested.flatMap(axis => {
    const entry = portrait?.axes?.[axis]
    if (!credibleScore(entry) || !['directional', 'descriptive'].includes(entry.mode) ||
        typeof entry.resultId !== 'string' || !entry.resultId ||
        dateMs(entry.measuredAt) === null ||
        !entry.definitionKey || !entry.definitionVersion || !entry.instrumentLocale) return []
    return [{
      axis, label: axisLabel(axis, locale), value: entry.rawValue,
      min: entry.min, max: entry.max, unit: entry.unit || 'points',
      mode: entry.mode, resultId: entry.resultId,
      sourceTitle: entry.sourceTitle || entry.definitionKey,
      definitionKey: entry.definitionKey,
      version: entry.definitionVersion, instrumentLocale: entry.instrumentLocale,
      measuredAt: entry.measuredAt, timeframe: entry.timeframe || null,
      sourceStatus: entry.sourceStatus || null,
    }]
  })
  const staleCount = requested.filter(axis => portrait?.staleAxes?.[axis] &&
    !portrait?.axes?.[axis]).length
  return { rows, staleCount, notAssessedCount: Math.max(0, requested.length - rows.length - staleCount) }
}

// Personality traits are descriptive; never invert introversion, motivation or
// lifestyle preferences into a deficit. Every displayed trait must be present
// in a currently verified, source-cleared professional result.
export function unifiedFoundationEvidence(results = [], locale = 'en', { now = Date.now() } = {}) {
  const clock = Number.isFinite(now) ? now : Date.now()
  const current = verifiedHistoryView(results).current
  return current.flatMap(result => {
    if (!isProfessionalProfileTest(result) || !result.definitionKey ||
        monitoringCatalogItem(result.definitionKey)?.rightsStatus !== 'cleared' ||
        dateMs(result.measurementAt) === null || dateMs(result.measurementAt) > clock + 86400000) return []
    const item = monitoringCatalogItem(result.definitionKey)
    const title = item?.title?.[localeKey(locale)] || item?.title?.en || result.definitionKey
    return (Array.isArray(result.dimensions) ? result.dimensions : []).flatMap(dimension => {
      // A scoring key alone is NOT proof of a trait construct.
      if (dimension?.dimensionClass !== 'trait' || !Number.isFinite(dimension.value) ||
          !Number.isFinite(dimension.min) || !Number.isFinite(dimension.max) ||
          dimension.max <= dimension.min || dimension.value < dimension.min ||
          dimension.value > dimension.max || typeof dimension.key !== 'string') return []
      return [{
        axis: 'trait', label: String(dimension.sourceConstruct || dimension.key)
          .replace(/^trait\./, '').replaceAll('_', ' ').replaceAll('.', ' · '),
        value: dimension.value, min: dimension.min, max: dimension.max,
        unit: dimension.unit || 'points',
        mode: 'descriptive', resultId: result.id,
        sourceTitle: title, definitionKey: result.definitionKey,
        version: result.definitionVersion,
        instrumentLocale: result.instrumentLocale,
        measuredAt: result.measurementAt,
        timeframe: result.timeframe || null, sourceStatus: null,
      }]
    })
  }).sort((a,b) => (dateMs(b.measuredAt) || 0) - (dateMs(a.measuredAt) || 0))
}

export function buildUnifiedProfileLayers(data = {}, locale = 'en', { now = Date.now() } = {}) {
  const results = Array.isArray(data?.results) ? data.results : []
  const portrait = buildPsychPortrait(results, { now })
  const foundation = unifiedFoundationEvidence(results, locale, { now })
  const state = unifiedPortraitEvidence(portrait, UNIFIED_STATE_AXES, locale)
  const life = unifiedPortraitEvidence(portrait, UNIFIED_LIFE_AXES, locale)
  return {
    layers: [
      { id: 'foundation', rows: foundation, staleCount: 0, notAssessedCount: foundation.length ? 0 : 1 },
      { id: 'state', ...state },
      { id: 'life', ...life },
      // Only an explicit owner action through existing development-goals/course APIs
      // may fill this layer. The UI reads saved revision separately, never guesses.
      { id: 'development', rows: [], staleCount: 0, notAssessedCount: 1 },
    ],
    // Not a clinical coverage percentage; counts reflect only actual source records.
    totalEvidenceCount: foundation.length + state.rows.length + life.rows.length,
  }
}
