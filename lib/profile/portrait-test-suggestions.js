// Suggested questionnaires for currently unmeasured psychological portrait axes.
// Suggestions are informational, never deficits, diagnoses or clinical targets.
import { PORTRAIT_AXIS_ORDER, PORTRAIT_SECTORS } from '../assessments/portrait-sectors.js'

const PORTRAIT_AXES = new Set(PORTRAIT_AXIS_ORDER)

export function recommendUnmeasuredPortraitTests({
  entries = [], results = [], missingAxes = [], limit = PORTRAIT_AXIS_ORDER.length,
} = {}) {
  const uncovered = new Set((Array.isArray(missingAxes) ? missingAxes : [])
    .filter(axis => PORTRAIT_AXES.has(axis)))
  if (!uncovered.size) return []

  // Even an older completed test is not silently prescribed a second time.
  const completed = new Set((Array.isArray(results) ? results : [])
    .map(result => result?.definitionKey).filter(Boolean))

  const options = (Array.isArray(entries) ? entries : [])
    .filter(entry => entry?.selectable === true && entry.startable === true &&
      entry.rightsStatus === 'cleared' && entry.free === true &&
      entry.explicitOptIn !== true && !completed.has(entry.key))
    .map(entry => {
      // An instrument must have an audited portrait source rule. A topic tag
      // alone cannot be used to promise a measurement.
      const axes = [...new Set((entry.scaleGuide?.scales || [])
        .filter(scale => (scale.portraitMode === 'directional' || scale.portraitMode === 'descriptive') &&
          PORTRAIT_AXES.has(scale.axis))
        .map(scale => scale.axis))]
      return { entry, axes }
    })
    .filter(candidate => candidate.axes.some(axis => uncovered.has(axis)))

  const chosen = []
  const used = new Set()
  const cap = Number.isFinite(limit) ? Math.max(0, Math.min(PORTRAIT_AXIS_ORDER.length, Math.floor(limit))) : 0

  while (uncovered.size && chosen.length < cap) {
    const best = options
      .filter(candidate => !used.has(candidate.entry.key))
      .map(candidate => ({
        ...candidate,
        covers: candidate.axes.filter(axis => uncovered.has(axis)),
      }))
      .filter(candidate => candidate.covers.length)
      .sort((a, b) =>
        b.covers.length - a.covers.length ||
        Number(a.entry.starterEligible === false) - Number(b.entry.starterEligible === false) ||
        (a.entry.durationMinutes ?? 999) - (b.entry.durationMinutes ?? 999) ||
        a.entry.key.localeCompare(b.entry.key))[0]

    if (!best) break
    used.add(best.entry.key)
    best.covers.forEach(axis => uncovered.delete(axis))
    chosen.push({
      key: best.entry.key,
      title: best.entry.title,
      questionCount: best.entry.questionCount,
      durationMinutes: best.entry.durationMinutes,
      covers: best.covers,
    })
  }

  return chosen
}


// Browsing facets, not diagnoses or new psychometric constructs.
// The "Business" facet reuses real questionnaires about work, attention and
// personal resources; no instrument is represented as a financial assessment.
export const PROFILE_TEST_DOMAINS = Object.freeze([
  { key: 'all', label: { en: 'All', ru: 'Все' } },
  { key: 'body', label: { en: 'Body', ru: 'Тело' } },
  { key: 'energy', label: { en: 'Energy', ru: 'Энергия' } },
  { key: 'relationships', label: { en: 'Relationships', ru: 'Отношения' } },
  { key: 'work', label: { en: 'Work', ru: 'Дело' } },
  { key: 'business', label: { en: 'Business', ru: 'Бизнес' } },
  { key: 'growth', label: { en: 'Growth', ru: 'Развитие' } },
])

const PROFILE_TOPIC_RULES = Object.freeze({
  body: { topics: ['body', 'sleep', 'tantra'], axes: ['embodiment', 'sleep', 'stress'] },
  energy: { topics: ['energy', 'recovery', 'self-support', 'resources'], axes: ['energy', 'resource', 'self_support'] },
  relationships: { topics: ['relationships', 'intimacy', 'sexuality', 'boundaries', 'support'], axes: ['relationships', 'intimacy', 'boundaries', 'sexual_wellbeing'] },
  work: { topics: ['work', 'function', 'attention', 'clarity'], axes: ['clarity', 'focus', 'functioning'] },
  business: { topics: ['work', 'function', 'meaning'], axes: ['clarity', 'focus', 'functioning', 'resource', 'meaning'] },
  growth: { topics: ['meaning', 'personality', 'resources', 'self-support', 'motivation'], axes: ['meaning', 'resource', 'self_support', 'mood', 'emotional_regulation'] },
})

export function recommendProfileTopicTests({
  entries = [], results = [], category = 'all', missingAxes = [], axisFilter = null, limit = 24,
} = {}) {
  const rule = PROFILE_TOPIC_RULES[category]
  if (!rule && category !== 'all') return []
  const missing = new Set((Array.isArray(missingAxes) ? missingAxes : []).filter(axis => PORTRAIT_AXES.has(axis)))
  const completed = new Set((Array.isArray(results) ? results : [])
    .map(result => result?.definitionKey).filter(Boolean))
  const cap = Number.isFinite(limit) ? Math.max(0, Math.min(50, Math.floor(limit))) : 0
  const permittedAxes = axisFilter === null ? null : new Set(
    (Array.isArray(axisFilter) ? axisFilter : []).filter(axis => PORTRAIT_AXES.has(axis)))

  return (Array.isArray(entries) ? entries : [])
    .filter(entry => entry?.selectable === true && entry.startable === true &&
      entry.rightsStatus === 'cleared' && entry.free === true &&
      entry.explicitOptIn !== true && !completed.has(entry.key))
    .map(entry => {
      // Topics choose the discovery facet; audited source axes describe what
      // the actual questionnaire measures. Never synthesize a business score.
      const axes = [...new Set((entry.scaleGuide?.scales || [])
        .filter(scale => (scale.portraitMode === 'directional' || scale.portraitMode === 'descriptive') &&
          PORTRAIT_AXES.has(scale.axis))
        .map(scale => scale.axis))]
      const filteredAxes = permittedAxes ? axes.filter(axis => permittedAxes.has(axis)) : axes
      if (!filteredAxes.length) return null
      const topicMatches = rule ? (entry.topics || []).filter(topic => rule.topics.includes(topic)) : []
      const axisMatches = rule ? filteredAxes.filter(axis => rule.axes.includes(axis)) : filteredAxes
      if (rule && !topicMatches.length && !axisMatches.length) return null
      const covers = axisMatches.length ? axisMatches : filteredAxes.slice(0, 2)
      return {
        entry, covers,
        notYetMeasured: covers.filter(axis => missing.has(axis)).length,
        relevance: (topicMatches.length * 2) + axisMatches.length,
      }
    })
    .filter(Boolean)
    .sort((a, b) =>
      b.notYetMeasured - a.notYetMeasured ||
      b.relevance - a.relevance ||
      Number(a.entry.starterEligible === false) - Number(b.entry.starterEligible === false) ||
      (a.entry.durationMinutes ?? 999) - (b.entry.durationMinutes ?? 999) ||
      a.entry.key.localeCompare(b.entry.key))
    .slice(0, cap)
    .map(({ entry, covers }) => ({
      key: entry.key,
      title: entry.title,
      questionCount: entry.questionCount,
      durationMinutes: entry.durationMinutes,
      covers,
    }))
}


/**
 * Reports action: only first-party, free, startable questionnaires whose audited
 * instrument scales actually cover axes in the selected portrait category.
 * No topical guesswork, fictional scores, or automatic retest recommendations.
 */
export function recommendPortraitSectorTests({
  entries = [], results = [], sector = 'all', portrait = null, limit = 6,
} = {}) {
  const axes = sector === 'all'
    ? PORTRAIT_AXIS_ORDER
    : PORTRAIT_SECTORS.find(item => item.key === sector)?.axes || []
  if (!axes.length) return []

  return recommendProfileTopicTests({
    entries, results, category: 'all', axisFilter: axes, limit,
    missingAxes: axes.filter(axis => !portrait?.axes?.[axis]),
  })
}


/**
 * Full private Reports catalogue for chosen visible portrait axes.
 * This is a rights-checked discovery view, not a clinical endorsement.
 * Source-compatible scores alone may appear as rays; other cleared questionnaires
 * are exploratory and visibly marked as not yet compatible with the wheel.
 * Completion uses saved test results (not merely clicked/started runs).
 */
export function listPortraitProfileTests({
  entries = [], results = [], sector = 'all', selectedAxes = [],
} = {}) {
  const permitted = sector === 'all' ? PORTRAIT_AXIS_ORDER
    : PORTRAIT_SECTORS.find(item => item.key === sector)?.axes || []
  const chosen = new Set((Array.isArray(selectedAxes) ? selectedAxes : [])
    .filter(axis => permitted.includes(axis)))
  if (!chosen.size) return []
  const completed = new Set((Array.isArray(results) ? results : [])
    .map(result => result?.definitionKey).filter(Boolean))
  return (Array.isArray(entries) ? entries : [])
    .filter(entry => entry?.selectable === true && entry.startable === true &&
      entry.free === true && entry.rightsStatus === 'cleared' &&
      entry.explicitOptIn !== true && entry.definition &&
      ['professional', 'monitoring'].includes(entry.testKind))
    .map(entry => {
      // A questionnaire can explore a selected axis without having an audited
      // comparable wheel measurement. Keep that distinction visible to users.
      const scales = (entry.scaleGuide?.scales || []).filter(scale => chosen.has(scale.axis))
      const covers = [...new Set(scales.map(scale => scale.axis))]
      if (!covers.length) return null
      const chartReady = scales.some(scale => ['directional','descriptive'].includes(scale.portraitMode))
      return {
        key: entry.key, title: entry.title, kind: entry.testKind, covers,
        chartReady, questionCount: entry.questionCount, durationMinutes: entry.durationMinutes,
        completed: completed.has(entry.key),
      }
    })
    .filter(Boolean)
    .sort((a, b) => Number(a.completed) - Number(b.completed) ||
      Number(b.chartReady) - Number(a.chartReady) ||
      b.covers.length - a.covers.length ||
      (a.durationMinutes ?? 999) - (b.durationMinutes ?? 999) ||
      a.title.localeCompare(b.title))
}
