import { normalizeJourneyFocus } from '../assessments/topic-journeys.js'
import { normalizeProblemsForTopics, PUBLIC_TEST_PROBLEMS } from '../assessments/test-problems.js'
import { COURSE_TOPICS } from './course-model.js'

// Only editorial focus/concern IDs and rights-cleared questionnaire IDs cross
// the Google redirect. No responses, profile, free-text or account data.
export const COURSE_ENTRY_INTENT_KEY = 'hh-personal-course-entry-v1'
const MAX_AGE_MS = 60 * 60 * 1000
const topicToCourse = Object.freeze({
  stress:'stress', anxiety:'stress', mood:'mood',
  sleep:'energy', body:'energy', resources:'resources',
  relationships:'relationships', intimacy:'relationships', sexuality:'relationships', tantra:'relationships',
  attention:'attention', clarity:'attention', function:'attention',
  meaning:'resources', personality:'resources',
})
const validCourseTopics = new Set(COURSE_TOPICS.map(topic => topic.id))
const cleanTestKeys = keys => [...new Set((Array.isArray(keys) ? keys : [])
  .filter(key => typeof key === 'string' && /^[a-z0-9][a-z0-9_-]{1,79}$/.test(key)))].slice(0,12)

export function courseTagsForExplorerFocus(focus) {
  const normalized = normalizeJourneyFocus((Array.isArray(focus) ? focus : []).join(','))
  return [...new Set(normalized.map(key => topicToCourse[key]).filter(key => validCourseTopics.has(key)))]
}

export function makeCourseEntryIntent(entries, preferences, at = Date.now()) {
  const focus = normalizeJourneyFocus((preferences?.focus || []).join(','))
  const problems = normalizeProblemsForTopics(preferences?.problems || [], focus)
  const testKeys = cleanTestKeys((entries || []).map(entry => entry.key))
  return JSON.stringify({ v:1, at, focus, problems, testKeys })
}

export function parseCourseEntryIntent(value, now = Date.now()) {
  if (typeof value !== 'string' || value.length > 2500) return null
  try {
    const data = JSON.parse(value)
    if (data?.v !== 1 || !Number.isFinite(data.at) || data.at > now || now-data.at > MAX_AGE_MS) return null
    const focus = normalizeJourneyFocus((Array.isArray(data.focus) ? data.focus : []).join(','))
    if (!focus.length) return null
    return {
      focus,
      problems: normalizeProblemsForTopics(data.problems, focus),
      testKeys: cleanTestKeys(data.testKeys),
    }
  } catch { return null }
}

export function courseConcernsFromIntent(intent, locale = 'en') {
  if (!intent) return ''
  const byKey = new Map(PUBLIC_TEST_PROBLEMS.map(problem => [problem.key, problem]))
  const language = locale === 'ru' ? 'ru' : 'en'
  return intent.problems.map(key => byKey.get(key)?.label?.[language]).filter(Boolean).join('; ').slice(0,900)
}
