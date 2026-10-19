// A small, server-readable registry of approved slide IDs and answer contracts.
// The bilingual editorial content lives in data/academy/energywork-ai-curriculum.ts.
// Keep this registry aligned with that file; tests enforce exact ID parity.
export const ENERGYWORK_KEY = 'academy-energywork-principles'
export const ENERGYWORK_VERSION = '2026-10-18.p1'
export const ENERGYWORK_LEGACY_VERSION = '2026-10-17.p0'
export const ENERGYWORK_PATHS = Object.freeze(['yggdrasil','tantra','kundalini'])
export const ENERGYWORK_COMMON = Object.freeze([
  'welcome-01','welcome-02',
  'flight-01','flight-02','flight-03','flight-voices','flight-04','flight-05','flight-done',
  'presence-01','presence-02','presence-03','presence-04','tan-done',
  'intention-01','intention-02','intention-03','intention-04',
  'boundaries-01','boundaries-02','boundaries-03','boundaries-04',
  'paths-01','paths-02','paths-03','paths-04',
])
export const ENERGYWORK_BRANCH = Object.freeze({
  yggdrasil: ['ygg-01','ygg-02','ygg-03','ygg-voices','ygg-04','ygg-05','ygg-06','ygg-done'],
  tantra: ['tan-01','tan-02','tan-03','tan-voices','tan-04','tan-05','tan-06'],
  kundalini: ['kun-01','kun-02','kun-03','kun-voices','kun-04','kun-05','kun-06','kun-done'],
})
export const ENERGYWORK_INITIATION = Object.freeze(['init-01','init-02'])
export const ENERGYWORK_FINISH = Object.freeze(['end-01','end-02'])
export const ENERGYWORK_LESSON_STARTS = Object.freeze(['flight-01','tan-01','kun-01','ygg-01','paths-01'])
export const ENERGYWORK_REPORT_IDS = Object.freeze(['flight-04','tan-04','kun-04','ygg-04','end-01'])
// These four reviews gate the next teaching screen; the final journal remains optional during learning.
export const ENERGYWORK_MEDITATION_REPORT_IDS = Object.freeze(['flight-04','tan-04','kun-04','ygg-04'])
export const ENERGYWORK_REVIEW_MIN_CHARS = 15
export function energyworkMeditationFeedbackComplete(answer) {
  if (typeof answer !== 'string' || answer.length > 1600) return false
  // Keep old encrypted journal responses readable without requiring scores in new reviews.
  if (answer.startsWith('Feeling:')) {
    const legacy = /^Feeling:(?:10|[0-9])\/10\n([\s\S]*)$/.exec(answer)
    return Boolean(legacy && Array.from(legacy[1].trim()).length >= ENERGYWORK_REVIEW_MIN_CHARS)
  }
  return Array.from(answer.trim()).length >= ENERGYWORK_REVIEW_MIN_CHARS
}
export const ENERGYWORK_LESSON_ANSWER_IDS = Object.freeze(['flight-05','tan-06','kun-06','ygg-06','init-01'])
export const ENERGYWORK_QUESTIONS = Object.freeze({
  'welcome-02': 'choice',
  'flight-04': 'text', 'flight-05': 'text',
  'flight-03': 'choice',
  'presence-03': 'scale',
  'presence-02': 'choice',
  'intention-03': 'text',
  'intention-04': 'choice',
  'boundaries-02': 'choice',
  'boundaries-03': 'choice',
  'boundaries-04': 'text',
  'ygg-04': 'text', 'ygg-06': 'text',
  'ygg-03': 'choice',
  'tan-04': 'text', 'tan-06': 'text',
  'tan-03': 'choice',
  'kun-04': 'text', 'kun-06': 'text',
  'kun-03': 'choice',
  'init-01': 'text', 'init-02': 'text', 'end-01': 'text',
})
export const ENERGYWORK_EXPERIENCE_VALUES = Object.freeze(['beginner','energywork','reiki-1-2','master'])
export const ENERGYWORK_CHOICE_VALUES = Object.freeze(['pause','adapt','ask'])
export const ENERGYWORK_PRACTICE_VALUES = Object.freeze(['tried','skipped'])
export const energyworkPathValid = (id) => ENERGYWORK_PATHS.includes(id)
// Legacy path argument is accepted for old snapshots but never changes the curriculum.
export function energyworkSequence(_legacyPath = null) {
  return [
    'welcome-01','welcome-02',
    'flight-01','flight-02','flight-03','flight-voices','flight-04','flight-05','flight-done',
    ...ENERGYWORK_BRANCH.tantra,
    'presence-01','presence-02','presence-03','presence-04','tan-done',
    ...ENERGYWORK_BRANCH.kundalini,
    ...ENERGYWORK_BRANCH.yggdrasil,
    'intention-01','intention-02','intention-03','intention-04',
    'boundaries-01','boundaries-02','boundaries-03','boundaries-04',
    'paths-01','paths-02','paths-03',
    ...ENERGYWORK_INITIATION,
    'end-01','paths-04','end-02',
  ]
}
// Keep encrypted private answers. Legacy progress returns to the introductory
// lesson when the three previously exclusive systems become sequential.
export function energyworkLegacyResumeId(slideId) {
  return ['welcome-01','welcome-02','flight-01','flight-02','flight-03','flight-04'].includes(slideId)
    ? slideId : 'flight-01'
}
export function energyworkInitiationReady(answers) {
  return Boolean(answers && typeof answers === 'object' && !Array.isArray(answers) &&
    [...ENERGYWORK_REPORT_IDS,...ENERGYWORK_LESSON_ANSWER_IDS]
      .every((id) => typeof answers[id] === 'string' && answers[id].trim().length > 0))
}
export function energyworkAnswerValid(id, answer) {
  const kind = ENERGYWORK_QUESTIONS[id]
  if (!kind || typeof answer !== 'string') return false
  if (kind === 'text') return answer.length <= 1600 && !answer.includes('\\u0000')
  if (kind === 'scale') return /^(?:[0-9]|10)$/.test(answer)
  if (kind === 'choice') return id === 'welcome-02'
    ? ENERGYWORK_EXPERIENCE_VALUES.includes(answer)
    : id === 'boundaries-02'
      ? ENERGYWORK_CHOICE_VALUES.includes(answer)
      : ENERGYWORK_PRACTICE_VALUES.includes(answer)
  return false
}
