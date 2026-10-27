// Goal Profile is a voluntary three-question observation of ONE chosen goal.
// It is separate from the 17 questionnaire portrait rays and 4 scored sectors.
export const GOAL_RATING_KEYS = Object.freeze(['clarity', 'motivation', 'confidence'])
export const GOAL_RATING_LABELS = Object.freeze({
  clarity: Object.freeze({ en:'Goal clarity', ru:'Ясность цели', es:'Claridad de la meta' }),
  motivation: Object.freeze({ en:'Motivation for this goal', ru:'Мотивация к цели', es:'Motivación para la meta' }),
  confidence: Object.freeze({ en:'Confidence in reaching this goal', ru:'Уверенность в достижении цели', es:'Confianza en alcanzar la meta' }),
})
// Expert-reviewed source-only crosswalk: these are ADJACENT constructs that
// inform reflection, NOT validated scales of a person's chosen goal. A test's
// generic "resource", "focus" or "personality" axis is never enough to assert
// motivation, confidence or goal clarity. Pin the exact scorer dimension AND
// edition to prevent remapping after a future questionnaire revision.
const supportingSource = (facet, testKey, dimensionKey, axis) => Object.freeze({
  facet, testKey, dimensionKey, axis, version: 'v1',
})
export const GOAL_SUPPORT_RULES = Object.freeze([
  supportingSource('clarity', 'hh-weekly-pulse', 'weekly.clarity', 'clarity'),
  supportingSource('clarity', 'hh-decision-fog', 'function.decision_fog.overall', 'clarity'),
  supportingSource('clarity', 'hh-values-direction', 'resources.values_direction.overall', 'meaning'),
  supportingSource('clarity', 'hh-meaning-compass', 'resources.meaning_compass.overall', 'meaning'),
  supportingSource('motivation', 'hh-motivation-spark', 'resources.motivation_spark.overall', 'energy'),
  supportingSource('motivation', 'hh-change-readiness', 'resources.change_readiness.overall', 'resource'),
  supportingSource('motivation', 'hh-start-button', 'function.start_button.overall', 'focus'),
  supportingSource('motivation', 'hh-goal-obstacles', 'function.goal_obstacles.overall', 'functioning'),
  supportingSource('confidence', 'hh-confidence-pulse', 'resources.confidence_pulse.overall', 'self_support'),
  supportingSource('confidence', 'hh-resource-pulse', 'resource.self_support', 'self_support'),
  supportingSource('confidence', 'hh-inner-ally', 'resources.inner_ally.overall', 'self_support'),
])

// Demand the *scored* original dimension, not any unrelated subscale with the
// same broad axis, even if it belongs to the same questionnaire.
export function goalSupportRuleForScale(testKey, scale, version = null) {
  if (!scale || typeof scale.key !== 'string' || typeof scale.axis !== 'string') return null
  return GOAL_SUPPORT_RULES.find(rule =>
    rule.testKey === testKey && rule.dimensionKey === scale.key &&
    rule.axis === scale.axis && (version == null || rule.version === version)) || null
}
export const goalSupportFacetForScale = (testKey, scale, version = null) =>
  goalSupportRuleForScale(testKey, scale, version)?.facet || null

// One shared eligibility gate for the private account panel and catalogue QA.
// The public wizard applies its stronger guest filter *before* providing source
// metadata; this helper must never loosen guest rights or skip the source score.
export function eligibleGoalSupportEntry(entry, rule, audience = 'account') {
  if (!rule || !entry || entry.key !== rule.testKey ||
    entry.selectable !== true || entry.startable !== true ||
    entry.free !== true || entry.rightsStatus !== 'cleared' ||
    entry.explicitOptIn === true || !entry.definition ||
    entry.definition.version !== rule.version ||
    !['professional','monitoring'].includes(entry.testKind)) return false
  if (audience === 'guest' && (entry.guestEligible !== true ||
      entry.starterEligible === false)) return false
  return Array.isArray(entry.scaleGuide?.scales) &&
    entry.scaleGuide.scales.some(scale =>
      goalSupportRuleForScale(entry.key, scale, entry.definition.version) === rule)
}

export function normalizeGoalCheckin(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
    !input.values || typeof input.values !== 'object' || Array.isArray(input.values) ||
    Object.keys(input).sort().join(',') !== 'measuredAt,values' ||
    Object.keys(input.values).sort().join(',') !== [...GOAL_RATING_KEYS].sort().join(',') ||
    GOAL_RATING_KEYS.some(key => !Number.isInteger(input.values[key]) ||
      input.values[key] < 0 || input.values[key] > 10) ||
    typeof input.measuredAt !== 'string') return null
  const epoch = Date.parse(input.measuredAt)
  if (!Number.isFinite(epoch) || new Date(epoch).toISOString() !== input.measuredAt ||
    epoch < Date.UTC(2020, 0, 1) || epoch > Date.now() + 86400000) return null
  return { values: Object.fromEntries(GOAL_RATING_KEYS.map(key => [key, input.values[key]])),
    measuredAt: input.measuredAt }
}
