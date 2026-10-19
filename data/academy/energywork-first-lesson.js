// Minimal, explicitly consented same-tab OAuth handoff for the first Reiki lesson.
// The backend re-validates every answer before storing it in the existing
// account-owned, encrypted academy progress row.
import {
  ENERGYWORK_VERSION, energyworkAnswerValid, energyworkMeditationFeedbackComplete,
} from './energywork-ai-schema.js'

export const ENERGYWORK_FIRST_LESSON_NEXT = 'tan-01'
export const ENERGYWORK_FIRST_LESSON_STORAGE_KEY = 'hh-reiki-first-lesson-oauth-v1'
const HANDOFF_KIND = 'reiki-first-lesson'
const MAX_AGE_MS = 15 * 60 * 1000
const IDS = Object.freeze(['welcome-02', 'flight-03', 'flight-05', 'flight-04'])

/** @param {unknown} value */
export function energyworkFirstLessonAnswers(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_FIRST_LESSON')
  const input = /** @type {Record<string, unknown>} */ (value)
  if (Object.keys(input).length > IDS.length ||
      Object.keys(input).some(id => !IDS.includes(id))) throw new Error('INVALID_FIRST_LESSON')
  if (!energyworkAnswerValid('welcome-02', input['welcome-02']) ||
      typeof input['flight-04'] !== 'string' || input['flight-04'].length > 5000 ||
      !energyworkMeditationFeedbackComplete(input['flight-04'])) throw new Error('INVALID_FIRST_LESSON')
  /** @type {Record<string, string>} */
  const answers = {}
  for (const id of IDS) {
    const answer = input[id]
    if (answer === undefined) continue
    if (typeof answer !== 'string' || answer.includes('\\u0000') ||
        answer.length > (id === 'flight-04' ? 5000 : 1600) ||
        !energyworkAnswerValid(id, answer)) throw new Error('INVALID_FIRST_LESSON')
    if (answer) answers[id] = answer
  }
  return answers
}

/**
 * Temporary only: this serialized data is held in sessionStorage in the
 * current browser tab until the Google OAuth return and successful API save.
 * @param {Record<string, string>} values
 * @param {'en' | 'ru'} locale
 * @param {number} [now]
 */
export function energyworkCreateFirstLessonHandoff(values, locale, now = Date.now()) {
  if (!['en', 'ru'].includes(locale)) throw new Error('INVALID_LOCALE')
  const subset = Object.fromEntries(IDS.filter(id => values[id] !== undefined).map(id => [id, values[id]]))
  return JSON.stringify({
    kind: HANDOFF_KIND,
    version: ENERGYWORK_VERSION,
    locale,
    expiresAt: now + MAX_AGE_MS,
    answers: energyworkFirstLessonAnswers(subset),
  })
}

/** @param {string | null} raw @param {'en' | 'ru'} locale @param {number} [now] */
export function energyworkReadFirstLessonHandoff(raw, locale, now = Date.now()) {
  if (!raw || raw.length > 9000) return null
  try {
    const value = JSON.parse(raw)
    if (!value || value.kind !== HANDOFF_KIND || value.version !== ENERGYWORK_VERSION ||
        value.locale !== locale || !Number.isSafeInteger(value.expiresAt) ||
        value.expiresAt <= now || value.expiresAt > now + MAX_AGE_MS) return null
    return { answers: energyworkFirstLessonAnswers(value.answers) }
  } catch {
    return null
  }
}
