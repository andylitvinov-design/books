// Suggested questionnaires for currently unmeasured psychological portrait axes.
// Suggestions are informational, never deficits, diagnoses or clinical targets.
import { PORTRAIT_AXIS_ORDER } from '../assessments/portrait-sectors.js'

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
  entries = [], results = [], category = 'all', missingAxes = [], limit = 24,
} = {}) {
  const rule = PROFILE_TOPIC_RULES[category]
  if (!rule && category !== 'all') return []
  const missing = new Set((Array.isArray(missingAxes) ? missingAxes : []).filter(axis => PORTRAIT_AXES.has(axis)))
  const completed = new Set((Array.isArray(results) ? results : [])
    .map(result => result?.definitionKey).filter(Boolean))
  const cap = Number.isFinite(limit) ? Math.max(0, Math.min(50, Math.floor(limit))) : 0

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
      if (!axes.length) return null
      const topicMatches = rule ? (entry.topics || []).filter(topic => rule.topics.includes(topic)) : []
      const axisMatches = rule ? axes.filter(axis => rule.axes.includes(axis)) : axes
      if (rule && !topicMatches.length && !axisMatches.length) return null
      const covers = axisMatches.length ? axisMatches : axes.slice(0, 2)
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
