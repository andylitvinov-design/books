// Personal development goals use the four existing portrait sectors.
// Targets are voluntary directional positions, not clinical reference values.
import { PORTRAIT_SECTORS, PORTRAIT_AXIS_ORDER } from '../assessments/portrait-sectors.js'
import { courseMeasuredProfile } from '../inner-growth/course-strategy.js'
import { COURSE_PROGRAMS, isPublicCourseProgramAvailable } from '../inner-growth/course-programs.js'

export const DEVELOPMENT_GOALS_VERSION = 1
export const DEFAULT_DEVELOPMENT_TARGETS = Object.freeze(
  // Neutral, editable starting position only. No goal or prescription exists until saved.
  Object.fromEntries(PORTRAIT_SECTORS.map(sector => [sector.key, 50]))
)
const SECTOR_KEYS = new Set(PORTRAIT_SECTORS.map(sector => sector.key))
const AXIS_KEYS = new Set(PORTRAIT_AXIS_ORDER)

// Do not silently accept arbitrary scales, diagnoses, answers or free text.
export function normalizeDevelopmentGoals(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      value.version !== DEVELOPMENT_GOALS_VERSION ||
      !value.targets || typeof value.targets !== 'object' || Array.isArray(value.targets) ||
      !value.details || typeof value.details !== 'object' || Array.isArray(value.details)) return null
  if (Object.keys(value.targets).length !== SECTOR_KEYS.size ||
      Object.keys(value.targets).some(key => !SECTOR_KEYS.has(key)) ||
      Object.entries(value.targets).some(([, n]) => !Number.isInteger(n) || n < 0 || n > 100) ||
      Object.keys(value.details).length > AXIS_KEYS.size ||
      Object.entries(value.details).some(([key, n]) =>
        !AXIS_KEYS.has(key) || !Number.isInteger(n) || n < 0 || n > 100)) return null
  return {
    version: DEVELOPMENT_GOALS_VERSION,
    targets: Object.fromEntries(PORTRAIT_SECTORS.map(sector => [sector.key, value.targets[sector.key]])),
    details: Object.fromEntries(PORTRAIT_AXIS_ORDER.filter(axis => axis in value.details)
      .map(axis => [axis, value.details[axis]])),
  }
}

export function targetForDevelopmentAxis(goals, axis) {
  const sector = PORTRAIT_SECTORS.find(item => item.axes.includes(axis))
  if (!sector) return null
  return goals?.details?.[axis] ?? goals?.targets?.[sector.key] ?? null
}

const COURSE_AXES = Object.freeze({
  stress: ['stress', 'anxiety', 'sleep', 'energy', 'embodiment', 'mood', 'emotional_regulation', 'resource'],
  confidence: ['relationships', 'intimacy', 'boundaries', 'sexual_wellbeing', 'self_support', 'resource', 'mood'],
  focus: ['clarity', 'focus', 'functioning', 'energy', 'meaning'],
})

// Receives only authenticated, exact-version, recent, directional, non-screening,
// skill-eligible measurements produced by courseMeasuredProfile.
export function rankDevelopmentGaps(scales = [], goals) {
  const normalized = normalizeDevelopmentGoals(goals)
  if (!normalized) return { sectors: [], rows: [], priorities: [], missingAxes: [...PORTRAIT_AXIS_ORDER], courses: [] }
  const rows = (Array.isArray(scales) ? scales : [])
    .filter(scale => scale?.eligible === true && AXIS_KEYS.has(scale.axis) &&
      typeof scale.id === 'string' && typeof scale.resultId === 'string' &&
      Number.isFinite(scale.score) && Number.isFinite(scale.priorityPercent) &&
      scale.priorityPercent >= 0 && scale.priorityPercent <= 100)
    .map(scale => {
      const target = targetForDevelopmentAxis(normalized, scale.axis)
      const current = Math.round((100 - scale.priorityPercent) * 10) / 10
      return {
        id: scale.id, axis: scale.axis, label: scale.label, testTitle: scale.testTitle,
        resultId: scale.resultId, testKey: scale.testKey, measuredAt: scale.measuredAt,
        rawValue: scale.score, min: scale.min, max: scale.max,
        current, target, gap: Math.max(0, Math.round((target - current) * 10) / 10),
      }
    })
    .sort((a,b) => b.gap - a.gap ||
      (Date.parse(b.measuredAt || '') || 0) - (Date.parse(a.measuredAt || '') || 0) ||
      a.id.localeCompare(b.id))
    .filter((scale,index,array) => array.findIndex(item => item.id === scale.id) === index)
  const measuredAxes = new Set(rows.map(row => row.axis))
  const missingAxes = PORTRAIT_AXIS_ORDER.filter(axis => !measuredAxes.has(axis))
  const sectors = PORTRAIT_SECTORS.map(sector => {
    // Latest representative per axis; do not imply multiple distinct instruments
    // measure exactly the same construct or represent a clinical sector score.
    const perAxis = sector.axes.flatMap(axis => {
      const candidates = rows.filter(row => row.axis === axis)
      return candidates.sort((a,b) =>
        (Date.parse(b.measuredAt || '') || 0) - (Date.parse(a.measuredAt || '') || 0))[0] || []
    })
    return {
      key: sector.key, target: normalized.targets[sector.key],
      measuredAxes: perAxis.length, totalAxes: sector.axes.length,
      // Heterogeneous instruments cannot produce a validated four-domain mean.
      current: null,
      largestGap: perAxis.length ? Math.max(...perAxis.map(scale => scale.gap)) : null,
    }
  })
  // Present distinct learning themes first, avoiding a single repeated subscale
  // crowding out other user-chosen areas.
  const positive = rows.filter(row => row.gap > 0)
  const firstAxes = new Set()
  const featuredIds = new Set()
  const featured = positive.filter(row => {
    if (firstAxes.has(row.axis)) return false
    firstAxes.add(row.axis)
    featuredIds.add(row.id)
    return true
  })
  const priorities = [...featured, ...positive.filter(row => !featuredIds.has(row.id))]
  const courses = COURSE_PROGRAMS.map(course => {
    const matches = priorities.slice(0, 8).filter(row => COURSE_AXES[course.id]?.includes(row.axis))
    const matchedAxes = [...new Set(matches.map(row => row.axis))]
    return {
      id: course.id,
      available: isPublicCourseProgramAvailable(course.id),
      matchedAxes,
      matches: matchedAxes.length,
      // A deterministic relevance order, not a diagnostic or treatment score.
      relevance: matches.reduce((sum,row) => sum + row.gap, 0),
    }
  }).filter(course => course.matches > 0)
    .sort((a,b) => b.relevance - a.relevance || Number(b.available) - Number(a.available) || a.id.localeCompare(b.id))
  return { sectors, rows, priorities, missingAxes, courses }
}

export function buildDevelopmentPlan({ results = [], goals, locale = 'en', now = Date.now() } = {}) {
  const testKeys = [...new Set((Array.isArray(results) ? results : [])
    .map(result => result?.definitionKey).filter(key => typeof key === 'string'))]
  const profile = courseMeasuredProfile({ results, testKeys, locale, now })
  return rankDevelopmentGaps(profile.eligible, goals)
}
