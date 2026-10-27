// Goal Profile is a voluntary three-question observation of ONE chosen goal.
// It is separate from the 17 questionnaire portrait rays and 4 scored sectors.
export const GOAL_RATING_KEYS = Object.freeze(['clarity', 'motivation', 'confidence'])
export const GOAL_RATING_LABELS = Object.freeze({
  clarity: Object.freeze({ en:'Goal clarity', ru:'Ясность цели', es:'Claridad de la meta' }),
  motivation: Object.freeze({ en:'Motivation for this goal', ru:'Мотивация к цели', es:'Motivación para la meta' }),
  confidence: Object.freeze({ en:'Confidence in reaching this goal', ru:'Уверенность в достижении цели', es:'Confianza en alcanzar la meta' }),
})
// Supporting sources, NOT instruments validating goal clarity / goal motivation
// / goal-specific self-efficacy. An entry is eligible only when its ACTUAL scored
// source axis and canonical key match; licences/startability are checked by caller.
export const GOAL_SUPPORT_RULES = Object.freeze([
  Object.freeze({ testKey:'hh-weekly-pulse', axis:'clarity', facet:'clarity' }),
  Object.freeze({ testKey:'hh-decision-fog', axis:'clarity', facet:'clarity' }),
  Object.freeze({ testKey:'hh-values-direction', axis:'meaning', facet:'clarity' }),
  Object.freeze({ testKey:'hh-meaning-compass', axis:'meaning', facet:'clarity' }),
  Object.freeze({ testKey:'hh-motivation-spark', axis:'energy', facet:'motivation' }),
  Object.freeze({ testKey:'hh-change-readiness', axis:'resource', facet:'motivation' }),
  Object.freeze({ testKey:'hh-start-button', axis:'focus', facet:'motivation' }),
  Object.freeze({ testKey:'hh-goal-obstacles', axis:'functioning', facet:'motivation' }),
  Object.freeze({ testKey:'hh-confidence-pulse', axis:'self_support', facet:'confidence' }),
  Object.freeze({ testKey:'hh-resource-pulse', axis:'self_support', facet:'confidence' }),
  Object.freeze({ testKey:'hh-inner-ally', axis:'self_support', facet:'confidence' }),
])
export const goalSupportFacetForScale = (testKey, axis) =>
  GOAL_SUPPORT_RULES.find(item => item.testKey === testKey && item.axis === axis)?.facet || null

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
