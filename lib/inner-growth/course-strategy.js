// My Course R3: deterministic, bilingual account-owned assessment recommendations.
// This module does NOT diagnose, infer a clinical health percentage, or store answers.
import { buildExplorerEntries, rankPublicTestMatches } from '../assessments/test-explorer.js'
import { getTestScaleGuide } from '../assessments/scale-guides.js'
import { COURSE_CONTENT_V3, v3FocusChoiceIndex } from './course-v3.js'
import { COURSE_CONTENT_V4 } from './course-v4.js'

const FOCUS = Object.freeze({
  stress: 'stress', mood: 'mood', energy: 'body',
  attention: 'attention', relationships: 'relationships', resources: 'resources',
})
const GOAL_BY_AXIS = Object.freeze({
  stress: 'calm_regulation', anxiety: 'calm_regulation', sleep: 'energy_agency',
  mood: 'emotional_flexibility', emotional_regulation: 'emotional_flexibility',
  energy: 'energy_agency', resource: 'energy_agency', functioning: 'energy_agency',
  clarity: 'attention_clarity', focus: 'attention_clarity',
  relationships: 'connection_boundaries', intimacy: 'connection_boundaries',
  boundaries: 'connection_boundaries', sexual_wellbeing: 'connection_boundaries',
  embodiment: 'calm_regulation', self_support: 'inner_support', meaning: 'inner_support',
})

// Clinical symptom screen scores are interpreted in their individual reports,
// not converted into prescribed self-treatment goals. They remain visible in
// the profile but are not ranked as daily practice deficiencies.
const SCREENING_ONLY = new Set(['phq-2','phq-4','phq-8','phq-9','phq-15','gad-2','gad-7','k6','k10'])

const ownResults = results => Array.isArray(results) ? results.filter(
  r => typeof r?.definitionKey === 'string' && typeof r?.definitionVersion === 'string' &&
    Number.isFinite(Date.parse(r?.measurementAt || '')) && Array.isArray(r?.dimensions)
) : []

function newestResult(results, entry) {
  return ownResults(results)
    .filter(r => r.definitionKey === entry.key && r.definitionVersion === entry.definition?.version &&
      (!r.scoringKey || r.scoringKey === entry.definition.scoringKey) &&
      (!r.scoringVersion || r.scoringVersion === entry.definition.scoringVersion))
    .sort((a, b) => Date.parse(b.measurementAt) - Date.parse(a.measurementAt))[0] || null
}

export function courseRecommendedTests({ focusTags = [], results = [], locale = 'en', count = 5 } = {}) {
  const lang = locale === 'ru' ? 'ru' : 'en'
  const focus = [...new Set(focusTags.map(key => FOCUS[key]).filter(Boolean))]
  const choices = buildExplorerEntries({ locale: lang, audience: 'account' })
    .filter(entry => entry.selectable && entry.rightsStatus === 'cleared' && entry.scaleGuide)
  const ranked = rankPublicTestMatches(choices, { focus, depth: 'balanced' })
  // Keep long, deliberate-choice questionnaires in the optional catalog, but
  // prefer five suitable starter tests when deciding the initial shortlist.
  const initial = ranked.filter(entry => entry.starterEligible !== false)
  const extended = ranked.filter(entry => entry.starterEligible === false)
  return [...initial, ...extended].map(entry => {
    const result = newestResult(results, entry)
    return {
      key: entry.key, definitionId: entry.definition.id, definitionVersion: entry.definition.version,
      instrumentLocale: entry.definition.instrumentLocale,
      title: entry.title, durationMinutes: entry.durationMinutes, matchPercent: entry.matchPercent,
      completed: Boolean(result), resultId: result?.id || null, completedAt: result?.measurementAt || null,
      measurementAxes: entry.scaleGuide?.scales?.filter(s => s.canChooseSkill).map(s => s.label).slice(0, 5) || [],
      recommended: false,
    }
  }).map((entry, index) => ({ ...entry, recommended: index < count }))
}

export const scaleId = (testKey, dimensionKey) => testKey + '::' + dimensionKey

export function courseMeasuredProfile({ results = [], testKeys = [], locale = 'en', now = Date.now() } = {}) {
  const lang = locale === 'ru' ? 'ru' : 'en'
  const currentResults = ownResults(results)
  const uniqueKeys = [...new Set((Array.isArray(testKeys) ? testKeys : []).filter(key => typeof key === 'string'))]
  const scales = []
  for (const testKey of uniqueKeys) {
    const guide = getTestScaleGuide(testKey, lang)
    if (!guide) continue // Never invent dimensions for unsupported/unlicensed tests.
    const result = currentResults.filter(r => r.definitionKey === testKey &&
      r.definitionVersion === guide.version)
      .sort((a, b) => Date.parse(b.measurementAt) - Date.parse(a.measurementAt))[0]
    if (!result) continue
    const recent = Number.isFinite(now) && now - Date.parse(result.measurementAt) <= 180 * 86400000 &&
      Date.parse(result.measurementAt) <= now + 86400000
    for (const dimension of result.dimensions) {
      const guideScale = guide.scales.find(s => s.key === dimension.key)
      if (!guideScale || !Number.isFinite(dimension.value) || !Number.isFinite(dimension.min) ||
        !Number.isFinite(dimension.max) || dimension.max <= dimension.min ||
        dimension.value < dimension.min || dimension.value > dimension.max ||
        dimension.min !== guideScale.min || dimension.max !== guideScale.max ||
        dimension.direction !== guideScale.direction) continue
      const goal = GOAL_BY_AXIS[guideScale.axis] || null
      const usable = Boolean(recent && !SCREENING_ONLY.has(testKey) && guideScale.canChooseSkill && goal &&
        ['reported_difficulty', 'reported_resource'].includes(guideScale.type))
      const fraction = (dimension.value - dimension.min) / (dimension.max - dimension.min)
      // Only a *within-instrument descriptive position*, NEVER a clinical percentile.
      const priorityPercent = usable
        ? Math.round(100 * (guideScale.type === 'reported_difficulty' ? fraction : 1 - fraction)) : null
      scales.push({
        id: scaleId(testKey, dimension.key), testKey, resultId: result.id,
        definitionVersion: guide.version, testTitle: guide.title,
        label: guideScale.label, axis: guideScale.axis, axisLabel: guideScale.axisLabel,
        type: guideScale.type, direction: dimension.direction, score: dimension.value,
        min: dimension.min, max: dimension.max, unit: dimension.unit || 'points',
        measuredAt: result.measurementAt, recent, goal, eligible: usable, priorityPercent,
        observation: guideScale.watch, practice: guideScale.skill,
      })
    }
  }
  const priority = scales.filter(s => s.eligible)
    .sort((a, b) => b.priorityPercent - a.priorityPercent || a.id.localeCompare(b.id))
  return { scales, priority: priority.slice(0, 7), eligible: priority }
}

/**
 * One transparent suggestion list for the course completion screen and the
 * editable focus picker. Uses only eligible, current, directional measurements
 * from courseMeasuredProfile; no invented scores or clinical percentiles.
 */
export function courseSuggestedFocus(profile, count = 3) {
  if (!Number.isInteger(count) || count < 1 || count > 5) return []
  const eligible = Array.isArray(profile?.eligible) ? profile.eligible : []
  const seen = new Set()
  return eligible
    .filter(item => item?.eligible === true && typeof item.id === 'string' &&
      Number.isFinite(item.priorityPercent) && Number.isFinite(item.score))
    .sort((a, b) => b.priorityPercent - a.priorityPercent || a.id.localeCompare(b.id))
    .filter(item => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    }).slice(0, count)
}

export function goalForChosenScale(scaleKey, locale = 'en') {
  if (typeof scaleKey !== 'string' || !scaleKey.includes('::')) return null
  const sep = scaleKey.indexOf('::')
  const testKey = scaleKey.slice(0, sep), dimensionKey = scaleKey.slice(sep + 2)
  const guide = getTestScaleGuide(testKey, locale)
  const scale = guide?.scales.find(item => item.key === dimensionKey &&
    item.canChooseSkill && ['reported_difficulty', 'reported_resource'].includes(item.type))
  return scale ? GOAL_BY_AXIS[scale.axis] || null : null
}

// A new cycle may reorder an explicitly approved scale, never invent a new
// measured direction or silently discard the client's confirmed choices.
export function courseContinuationGoals(scaleKeys) {
  return [...new Set((Array.isArray(scaleKeys) ? scaleKeys : [])
    .map(key => goalForChosenScale(key)).filter(Boolean))]
}

export function courseNextCycleScaleKeys(scaleKeys, goal) {
  const keys = Array.isArray(scaleKeys) ? [...scaleKeys] : []
  if (!keys.length) return keys // Legacy courses have no measured selection.
  const index = keys.findIndex(key => goalForChosenScale(key) === goal)
  return index < 0 ? null : [keys[index], ...keys.filter((_, i) => i !== index)]
}

// One selection rule for the displayed lesson and its completion validation.
// Courses without measured choices retain their original primary-domain track.
export function coursePracticeFocus(scaleKeys, primaryGoal, day, locale = 'en', contentVersion = null) {
  const choices = (Array.isArray(scaleKeys) ? scaleKeys : []).flatMap(id => {
    const goal = goalForChosenScale(id, locale)
    if (!goal) return []
    const split = id.indexOf('::'), guide = getTestScaleGuide(id.slice(0, split), locale)
    const scale = guide?.scales.find(item => item.key === id.slice(split + 2))
    return [{ goal, scaleId: id, label: scale?.label || id }]
  })
  if ([COURSE_CONTENT_V3, COURSE_CONTENT_V4].includes(contentVersion)) {
    // Respect the client's approved order: the first eligible scale becomes
    // the stable practice spine; other selected scales receive spaced sessions.
    const unique = choices.filter((item,index) => choices.findIndex(c => c.scaleId === item.scaleId) === index).slice(0,5)
    const index = v3FocusChoiceIndex(day, unique.length)
    return index === null
      ? { goal: primaryGoal, scaleId: null, label: null, role: 'primary' }
      : { ...unique[index], role: index === 0 ? 'primary' : 'support' }
  }
  // Historical courses remain bit-for-bit equivalent to R2 selection.
  return choices.length && Number.isInteger(day) && day > 0
    ? choices[(day - 1) % choices.length]
    : { goal: primaryGoal, scaleId: null, label: null }
}
