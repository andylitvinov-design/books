// My Course R3: deterministic, bilingual account-owned assessment recommendations.
// This module does NOT diagnose, infer a clinical health percentage, or store answers.
import { buildExplorerEntries, rankPublicTestMatches } from '../assessments/test-explorer.js'
import { getTestScaleGuide, getChosenScaleGuide } from '../assessments/scale-guides.js'
import { validateProvenance } from '../assessments/definitions.js'
import { isMixedDirectionResultDimension, exactInterpretationDefinition } from '../assessments/interpretation-context.js'
import { portraitSourceRule } from '../assessments/portrait-constructs.js'
import { COURSE_CONTENT_V3, v3FocusChoiceIndex } from './course-v3.js'
import { COURSE_CONTENT_V4 } from './course-v4.js'
import { COURSE_ANTISTRESS_OUTCOME_V3 } from './anti-stress-outcomes-v3.js'
import { COURSE_ANTISTRESS_SKILLS_V5 } from './anti-stress-skills-v5.js'
import { COURSE_ANTISTRESS_SKILLS_V6 } from './anti-stress-skills-v6.js'
import { COURSE_ANTISTRESS_SKILLS_V7 } from './anti-stress-skills-v7.js'

const FOCUS = Object.freeze({
  stress: 'stress', mood: 'mood', energy: 'body',
  attention: 'attention', relationships: 'relationships', resources: 'resources',
})
const GOAL_BY_AXIS = Object.freeze({
  stress: 'calm_regulation', anxiety: 'calm_regulation', sleep: 'energy_agency',
  mood: 'emotional_flexibility', emotional_regulation: 'emotional_flexibility',
  energy: 'energy_agency', resource: 'energy_agency', functioning: 'energy_agency',
  clarity: 'attention_clarity', focus: 'attention_clarity',
  relationships: 'connection_boundaries', boundaries: 'connection_boundaries',
  embodiment: 'calm_regulation', self_support: 'inner_support', meaning: 'inner_support',
})

// Clinical symptom screen scores are interpreted in their individual reports,
// not converted into prescribed self-treatment goals. They remain visible in
// the profile but are not ranked as daily practice deficiencies.
const SCREENING_ONLY = new Set(['asrs-6','phq-2','phq-4','phq-8','phq-9','phq-15','gad-2','gad-7','k6','k10'])

const ownResults = results => Array.isArray(results) ? results.filter(r => {
  if (!Number.isFinite(Date.parse(r?.measurementAt || '')) || !Array.isArray(r?.dimensions)) return false
  // Resolve the run's pinned version/locale, not the current display language
  // or catalogue version. Registered historical results remain unchanged.
  try { validateProvenance(r); return true } catch { return false }
}) : []

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
    .filter(entry => entry.selectable && entry.explicitOptIn !== true && entry.rightsStatus === 'cleared' && entry.scaleGuide)
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
    let guide = getTestScaleGuide(testKey, lang)
    if (!guide) continue // Never invent dimensions for unsupported/unlicensed tests.
    let result = currentResults.filter(r => r.definitionKey === testKey &&
      r.definitionVersion === guide.version)
      .sort((a, b) => Date.parse(b.measurementAt) - Date.parse(a.measurementAt))[0]
    // Keep the old neutralized total visible until this person has a v2 result.
    // No historical score is recast as a new dimension or used for auto-priority.
    if (!result) {
      const historical=getTestScaleGuide(testKey, lang, 'v1')
      if (historical) {
        result=currentResults.filter(r => r.definitionKey===testKey && r.definitionVersion==='v1')
          .sort((a,b) => Date.parse(b.measurementAt)-Date.parse(a.measurementAt))[0]
        if (result) guide=historical
      }
    }
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
      const sourceRule = portraitSourceRule(result.definitionKey,dimension.key,result.definitionVersion)
      const sourceVerified = Boolean(sourceRule && sourceRule.mode === 'directional' &&
        sourceRule.goalEligible && exactInterpretationDefinition(result, dimension))
      // Preserve the historical raw total, but do not infer a new practice
      // deficit from a v1 aggregate that mixes difficulty and coping/context.
      const mixedDirection = isMixedDirectionResultDimension(result, dimension)
      const ineligibilityReason = mixedDirection ? (lang === 'ru'
        ? 'Этот итог объединяет трудности и способы совладания или облегчение. Он сохранён для просмотра, но не используется для автоматического выбора приоритетов.'
        : 'This total combines difficulties with coping or relief. It remains visible, but is not used to automatically select practice priorities.') : null
      const suitableAge = sourceRule && Date.parse(result.measurementAt) >= now - sourceRule.freshnessDays*86400000
      const usable = Boolean(sourceVerified && !mixedDirection && recent && suitableAge && !SCREENING_ONLY.has(testKey) && guideScale.canChooseSkill && goal &&
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
        ineligibilityCode: mixedDirection ? 'mixed-direction-v1-total' : null, ineligibilityReason,
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
  const guide = getChosenScaleGuide(testKey, dimensionKey, locale)
  const scale = guide?.scales.find(item => item.key === dimensionKey &&
    item.canChooseSkill && ['reported_difficulty', 'reported_resource'].includes(item.type))
  return scale ? GOAL_BY_AXIS[scale.axis] || null : null
}

// A new cycle may reorder an explicitly approved scale, never invent a new
// measured direction or silently discard the client's confirmed choices.
export function courseContinuationGoals(scaleKeys) {
  // Only called for an existing, explicitly enrolled course's stored choices.
  // Use its already-approved focus instead of silently dropping old scale keys.
  return [...new Set((Array.isArray(scaleKeys) ? scaleKeys : [])
    .map(key => goalForExistingCourseScale(key)).filter(Boolean))]
}

// A legacy enrolled course has already obtained explicit user consent for its
// original scale focus. Keep that persisted choice usable during continuation,
// without making its single-item social-connection score a *new* automatic
// developmental deficit or a recommended goal for new users.
const LEGACY_CONTINUATION_GOALS = Object.freeze({
  // Historical v1 totals mixed stress with coping/context; never use for new
  // recommendations, but preserve an owner's already-consented course focus.
  'hh-money-pressure::state.money_pressure.overall':'calm_regulation',
  'hh-overthinking-loop::state.overthinking_loop.overall':'calm_regulation',
  'hh-screen-saturation::state.screen_saturation.overall':'attention_clarity',
  // Original HH course selections already confirmed by the client.
  // Do not turn any of these into new automatic goals after the portrait audit.
  'hh-weekly-pulse::weekly.mood':'emotional_flexibility',
  'hh-weekly-pulse::weekly.connection':'connection_boundaries',
  'hh-current-state::state.problem_intensity':'calm_regulation',
  'hh-current-state::state.fatigue':'energy_agency',
  'hh-resource-pulse::resource.energy':'energy_agency',
  'hh-resource-pulse::resource.support':'energy_agency',
  'hh-resource-pulse::resource.connection':'connection_boundaries',
  'hh-resource-pulse::resource.agency':'energy_agency',
  'hh-resource-pulse::resource.meaning':'inner_support',
  'hh-resource-pulse::resources.overall':'energy_agency',
  'hh-monthly-profile::resources.monthly.self':'inner_support',
  'hh-monthly-profile::resources.monthly.relationships':'connection_boundaries',
  'hh-monthly-profile::resources.monthly.body':'energy_agency',
  'hh-monthly-profile::resources.monthly.work':'energy_agency',
  'hh-monthly-profile::resources.monthly.meaning':'inner_support',
  'hh-monthly-profile::resources.monthly.support':'energy_agency',
  'hh-monthly-profile::resources.monthly.overall':'energy_agency',
})
function goalForExistingCourseScale(key,locale='en') {
  const approved=goalForChosenScale(key,locale)
  if(approved) return approved
  if(typeof key!=='string' || !key.includes('::')) return null
  if(LEGACY_CONTINUATION_GOALS[key]) return LEGACY_CONTINUATION_GOALS[key]
  // Historical selected scales may come from many earlier cleared inventories.
  // Interpret ONLY the already-saved skill choice. This helper is never used
  // by courseMeasuredProfile or the new enrolment eligibility validator.
  const cut=key.indexOf('::')
  const guide=getChosenScaleGuide(key.slice(0,cut),key.slice(cut+2),locale)
  const scale=guide?.scales.find(item=>item.key===key.slice(cut+2) &&
    ['reported_difficulty','reported_resource'].includes(item.type))
  return scale ? GOAL_BY_AXIS[scale.axis] || null : null
}

export function courseNextCycleScaleKeys(scaleKeys, goal) {
  const keys = Array.isArray(scaleKeys) ? [...scaleKeys] : []
  if (!keys.length) return keys // Legacy courses have no measured selection.
  const index = keys.findIndex(key => goalForExistingCourseScale(key) === goal)
  return index < 0 ? null : [keys[index], ...keys.filter((_, i) => i !== index)]
}

// One selection rule for the displayed lesson and its completion validation.
// Courses without measured choices retain their original primary-domain track.
export function coursePracticeFocus(scaleKeys, primaryGoal, day, locale = 'en', contentVersion = null) {
  const choices = (Array.isArray(scaleKeys) ? scaleKeys : []).flatMap(id => {
    const goal = goalForExistingCourseScale(id, locale)
    if (!goal) return []
    const split = id.indexOf('::'), guide = getChosenScaleGuide(id.slice(0, split), id.slice(split + 2), locale)
    const scale = guide?.scales.find(item => item.key === id.slice(split + 2))
    return [{ goal, scaleId: id, label: scale?.label || id }]
  })
  if ([COURSE_CONTENT_V3, COURSE_CONTENT_V4, COURSE_ANTISTRESS_OUTCOME_V3, COURSE_ANTISTRESS_SKILLS_V5, COURSE_ANTISTRESS_SKILLS_V6, COURSE_ANTISTRESS_SKILLS_V7].includes(contentVersion)) {
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
