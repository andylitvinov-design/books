// A small, server-readable registry of approved slide IDs and answer contracts.
// The bilingual editorial content lives in data/academy/energywork-ai-curriculum.ts.
// Keep this registry aligned with that file; tests enforce exact ID parity.
export const ENERGYWORK_KEY = 'academy-energywork-principles'
export const ENERGYWORK_VERSION = '2026-10-19.p8'
export const ENERGYWORK_P7_VERSION = '2026-10-19.p7'
export const ENERGYWORK_P6_VERSION = '2026-10-19.p6'
export const ENERGYWORK_P5_VERSION = '2026-10-19.p5'
export const ENERGYWORK_P4_VERSION = '2026-10-19.p4'
export const ENERGYWORK_P3_VERSION = '2026-10-19.p3'
export const ENERGYWORK_P2_VERSION = '2026-10-19.p2'
export const ENERGYWORK_PREVIOUS_VERSION = '2026-10-18.p1'
export const ENERGYWORK_LEGACY_VERSION = '2026-10-17.p0'
export const ENERGYWORK_PATHS = Object.freeze(['yggdrasil','tantra','kundalini'])
export const ENERGYWORK_COMMON = Object.freeze([
  'welcome-01','welcome-02',
  'flight-01','flight-02','flight-03','flight-voices','flight-05','flight-04','flight-done',
  'presence-01','presence-04','tan-done',
  'intention-01','intention-02','intention-03','intention-04',
  'boundaries-01','boundaries-02','boundaries-03','boundaries-04',
  'paths-01','paths-02','paths-03','paths-04',
])
export const ENERGYWORK_BRANCH = Object.freeze({
  yggdrasil: ['ygg-01','ygg-02','ygg-03','ygg-voices','ygg-04','ygg-05','ygg-study-v2-01','ygg-study-v2-02','ygg-study-v2-03','ygg-study-v2-04','ygg-study-v2-05','ygg-study-v2-06','ygg-study-v2-07','ygg-done'],
  tantra: ['tan-01','tan-02','tan-03','tan-voices','tan-04','tan-05','tan-study-04','tan-06','tan-study-05','tan-study-06','tan-study-07','tan-study-02'],
  kundalini: ['kun-01','kun-02','kun-03','kun-voices','kun-04','kun-05','kun-study-v2-01','kun-study-v2-02','kun-study-v2-03','kun-study-v2-04','kun-study-v2-05','kun-study-v2-06','kun-study-v2-07','kun-study-v2-08','kun-study-v2-09','kun-done'],
})
export const ENERGYWORK_INITIATION = Object.freeze(['init-01','init-02'])
export const ENERGYWORK_FINISH = Object.freeze(['end-01','end-02'])
export const ENERGYWORK_LESSON_STARTS = Object.freeze(['flight-01','tan-01','kun-01','ygg-01','paths-01'])
export const ENERGYWORK_REPORT_IDS = Object.freeze(['flight-04','tan-04','kun-04','ygg-04','end-01'])
// These four reviews gate the next teaching screen; the final journal remains optional during learning.
export const ENERGYWORK_MEDITATION_REPORT_IDS = Object.freeze(['flight-04','tan-04','kun-04','ygg-04'])
export const ENERGYWORK_REVIEW_MIN_CHARS = 50
export function energyworkMeditationFeedbackComplete(answer) {
  if (typeof answer !== 'string') return false
  // Keep old encrypted journal responses readable without requiring scores in new reviews.
  if (answer.startsWith('Feeling:')) {
    const legacy = /^Feeling:(?:10|[0-9])\/10\n([\s\S]*)$/.exec(answer)
    return Boolean(legacy && Array.from(legacy[1].trim()).length >= ENERGYWORK_REVIEW_MIN_CHARS)
  }
  return Array.from(answer.trim()).length >= ENERGYWORK_REVIEW_MIN_CHARS
}
export const ENERGYWORK_LESSON_ANSWER_IDS = Object.freeze(['flight-05','tan-study-04','tan-06','tan-study-05','tan-study-06','tan-study-07','tan-study-02','tan-study-03','kun-study-v2-01','kun-study-v2-02','kun-study-v2-03','kun-study-v2-04','kun-study-v2-05','kun-study-v2-06','kun-study-v2-07','kun-study-v2-08','kun-study-v2-09','ygg-study-v2-01','ygg-study-v2-02','ygg-study-v2-03','ygg-study-v2-04','ygg-study-v2-05','ygg-study-v2-06','ygg-study-v2-07','init-01'])
// Each of the seven Tantra Reiki study answers is required to move forward.
// Drafts may still be saved blank, but a whitespace-only answer is not complete.
export const ENERGYWORK_TANTRA_STUDY_QUESTION_IDS = Object.freeze([
  'tan-study-04','tan-06','tan-study-05','tan-study-06','tan-study-07','tan-study-02','tan-study-03',
])
export const ENERGYWORK_KUNDALINI_STUDY_QUESTION_IDS = Object.freeze(['kun-study-v2-01', 'kun-study-v2-02', 'kun-study-v2-03', 'kun-study-v2-04', 'kun-study-v2-05', 'kun-study-v2-06', 'kun-study-v2-07', 'kun-study-v2-08', 'kun-study-v2-09'])
export const ENERGYWORK_YGGDRASIL_STUDY_QUESTION_IDS = Object.freeze(['ygg-study-v2-01', 'ygg-study-v2-02', 'ygg-study-v2-03', 'ygg-study-v2-04', 'ygg-study-v2-05', 'ygg-study-v2-06', 'ygg-study-v2-07'])
// Preserve historic p6/p7 encrypted answers under their original IDs; they must
// not satisfy the corrected questions on the Level 1 preparation page.
export const ENERGYWORK_PREVIOUS_YGGDRASIL_STUDY_QUESTION_IDS = Object.freeze(['ygg-06', 'ygg-study-02', 'ygg-study-03', 'ygg-study-04', 'ygg-study-05', 'ygg-study-06', 'ygg-study-07'])
export function energyworkReikiStudyAnswerComplete(answer) {
  return typeof answer === 'string' && answer.trim().length > 0
}
export function energyworkTantraStudyAnswerComplete(answer) {
  return typeof answer === 'string' && answer.trim().length > 0
}
// One written response can cover both prompts on the last Tantra study screen.
// Keep both historic question IDs, and show distinct older responses together
// without discarding either private answer.
export function energyworkCombinedTantraAnswer(primary, secondary) {
  const first = typeof primary === 'string' ? primary : ''
  const second = typeof secondary === 'string' ? secondary : ''
  if (!first.trim()) return second
  if (!second.trim() || first.trim() === second.trim()) return first
  return first.trimEnd() + '\n\n' + second.trimStart()
}
export const ENERGYWORK_QUESTIONS = Object.freeze({
  'welcome-02': 'choice',
  'flight-04': 'text', 'flight-05': 'text',
  'flight-03': 'choice',
  'intention-03': 'text',
  'intention-04': 'choice',
  'boundaries-02': 'choice',
  'boundaries-03': 'choice',
  'boundaries-04': 'text',
  'ygg-04': 'text', 'ygg-06': 'text',
  'ygg-study-02': 'text', 'ygg-study-03': 'text', 'ygg-study-04': 'text', 'ygg-study-05': 'text', 'ygg-study-06': 'text', 'ygg-study-07': 'text', // historic Yggdrasil p6/p7 questions remain readable
  'ygg-study-v2-01': 'text', 'ygg-study-v2-02': 'text', 'ygg-study-v2-03': 'text', 'ygg-study-v2-04': 'text', 'ygg-study-v2-05': 'text', 'ygg-study-v2-06': 'text', 'ygg-study-v2-07': 'text',
  'ygg-03': 'choice',
  'tan-04': 'text', 'tan-06': 'text',
  'tan-study-02': 'text', 'tan-study-03': 'text', 'tan-study-04': 'text',
  'tan-study-05': 'text', 'tan-study-06': 'text', 'tan-study-07': 'text',
  'tan-03': 'choice',
  'kun-04': 'text', 'kun-06': 'text',
  'kun-study-02': 'text', 'kun-study-03': 'text', 'kun-study-04': 'text', 'kun-study-05': 'text', 'kun-study-06': 'text', 'kun-study-07': 'text', // Archived p6 answers remain readable
  'kun-study-v2-01': 'text', 'kun-study-v2-02': 'text', 'kun-study-v2-03': 'text', 'kun-study-v2-04': 'text', 'kun-study-v2-05': 'text', 'kun-study-v2-06': 'text', 'kun-study-v2-07': 'text', 'kun-study-v2-08': 'text', 'kun-study-v2-09': 'text',
  'kun-03': 'choice',
  'init-01': 'text', 'init-02': 'text', 'end-01': 'text',
})
export const ENERGYWORK_EXPERIENCE_VALUES = Object.freeze(['beginner','energywork','reiki-1-2','master'])
export const ENERGYWORK_CHOICE_VALUES = Object.freeze(['pause','adapt','ask'])
export const ENERGYWORK_PRACTICE_VALUES = Object.freeze(['tried','skipped'])
export const ENERGYWORK_SUN_PRACTICE_VALUES = Object.freeze(['felt-light','more-practice'])
export const ENERGYWORK_TANTRA_PRACTICE_VALUES = Object.freeze(['connected','more-practice'])
export const energyworkPathValid = (id) => ENERGYWORK_PATHS.includes(id)
// Legacy path argument is accepted for old snapshots but never changes the curriculum.
export function energyworkSequence(_legacyPath = null) {
  return [
    'welcome-01','welcome-02',
    'flight-01','flight-02','flight-03','flight-voices','flight-05','flight-04','flight-done',
    ...ENERGYWORK_BRANCH.tantra,
    'presence-01','presence-04','tan-done',
    ...ENERGYWORK_BRANCH.kundalini,
    ...ENERGYWORK_BRANCH.yggdrasil,
    'intention-01','intention-02','intention-03','intention-04',
    'boundaries-01','boundaries-02','boundaries-03','boundaries-04',
    'paths-01','paths-02','paths-03',
    ...ENERGYWORK_INITIATION,
    'end-01','paths-04','end-02',
  ]
}
// Derive lesson lengths from the canonical sequence, not hard-coded totals.
// end is exclusive; the two welcome slides are an introduction before lesson 1.
export function energyworkLessonRanges(sequence = energyworkSequence()) {
  const starts = ENERGYWORK_LESSON_STARTS.map(id => sequence.indexOf(id))
  if (starts.some((value, index) => value < 0 || (index > 0 && value <= starts[index - 1])))
    throw new Error('ENERGYWORK_LESSON_SEQUENCE_INVALID')
  return starts.map((start, index) => {
    const end = starts[index + 1] ?? sequence.length
    return { lesson: index + 1, firstSlideId: ENERGYWORK_LESSON_STARTS[index], start, end, count: end - start }
  })
}
// Keep encrypted private answers. Legacy progress returns to the introductory
// lesson when the three previously exclusive systems become sequential.
export function energyworkLegacyResumeId(slideId) {
  return ['welcome-01','welcome-02','flight-01','flight-02','flight-03','flight-04'].includes(slideId)
    ? slideId : 'flight-01'
}

// Migrate a saved p1 position by its original step number within the two
// edited lessons. This also recovers IDs removed from the new course.
// Later lessons keep their saved ID: their progress is never reset.
const PREVIOUS_FLIGHT = Object.freeze(['flight-01','flight-02','flight-03','flight-voices','flight-05','flight-04','flight-done'])
const PREVIOUS_TANTRA = Object.freeze([
  'tan-01','tan-02','tan-03','tan-voices','tan-04','tan-05','tan-06',
  'presence-01','presence-02','presence-03','presence-04','tan-done',
])
// Keep p3's on-screen order for stable p0/p1/p2 step mappings.
const P3_TANTRA = Object.freeze([
  'tan-01','tan-02','tan-03','tan-voices','tan-04','tan-05','tan-06',
  'tan-study-02','tan-study-03','tan-study-04','tan-study-05',
  'tan-study-06','tan-study-07','presence-01','presence-04','tan-done',
])
// Resume on the first unanswered original question in the NEW order.
// The last shared screen retains both historic answer keys privately.
export function energyworkP4ResumeId(slideId, answers = {}) {
  if (['tan-06','tan-study-02','tan-study-03','tan-study-04',
    'tan-study-05','tan-study-06','tan-study-07'].includes(slideId)) {
    const missing = ENERGYWORK_TANTRA_STUDY_QUESTION_IDS.find(id =>
      !energyworkTantraStudyAnswerComplete(answers[id]))
    return missing === 'tan-study-03' ? 'tan-study-02' : missing ?? 'tan-study-02'
  }
  if (['kun-06','kun-study-02','kun-study-03','kun-study-04','kun-study-05','kun-study-06','kun-study-07'].includes(slideId))
    return 'kun-study-v2-01'
  return energyworkP7ResumeId(slideId)
}
// p6 saved quiz positions pointed to different questions: restart only the new
// quiz, without deleting the encrypted original written responses.
export function energyworkP6ResumeId(slideId) {
  if (['kun-06','kun-study-02','kun-study-03','kun-study-04','kun-study-05','kun-study-06','kun-study-07'].includes(slideId)) return 'kun-study-v2-01'
  return energyworkP7ResumeId(slideId)
}
// p7 and older positions used different Yggdrasil questions. Restart ONLY
// the updated seven-question section, retaining all old answers in the journal.
export function energyworkP7ResumeId(slideId) {
  if (ENERGYWORK_PREVIOUS_YGGDRASIL_STUDY_QUESTION_IDS.includes(slideId) || slideId === 'ygg-done')
    return ENERGYWORK_YGGDRASIL_STUDY_QUESTION_IDS[0]
  return energyworkSequence().includes(slideId) ? slideId : 'flight-01'
}
export function energyworkPreviousResumeId(slideId, answers = {}) {
  const flightStep = PREVIOUS_FLIGHT.indexOf(slideId)
  if (flightStep >= 0) return energyworkP3ResumeId(PREVIOUS_FLIGHT[flightStep], answers)
  const tantraStep = PREVIOUS_TANTRA.indexOf(slideId)
  if (tantraStep >= 0) return energyworkP4ResumeId(P3_TANTRA[tantraStep], answers)
  return energyworkP3ResumeId(slideId, answers)
}
// p2/p1 retained screen number within their reordered meditation lessons.
const P2_FLIGHT = Object.freeze(['flight-01','flight-02','flight-05','flight-voices','flight-04','flight-03','flight-done'])
const P2_TANTRA = Object.freeze([
  'tan-01','tan-02','presence-01','tan-voices','tan-04','tan-05',
  'tan-06','tan-study-02','tan-study-03','tan-study-04','tan-study-05',
  'tan-study-06','tan-study-07','tan-03','presence-04','tan-done',
])
export function energyworkP2ResumeId(slideId, answers = {}) {
  const flightStep = P2_FLIGHT.indexOf(slideId)
  if (flightStep >= 0) return energyworkP3ResumeId(PREVIOUS_FLIGHT[flightStep], answers)
  const tantraStep = P2_TANTRA.indexOf(slideId)
  if (tantraStep >= 0) return energyworkP4ResumeId(P3_TANTRA[tantraStep], answers)
  return energyworkP3ResumeId(slideId, answers)
}
// P3 lesson-one positions preceded the p4 swap. P4 quiz positions preceded p5.
const P3_FLIGHT = Object.freeze(['flight-01','flight-02','flight-03','flight-voices','flight-04','flight-05','flight-done'])
export function energyworkP3ResumeId(slideId, answers = {}) {
  const flightStep = P3_FLIGHT.indexOf(slideId)
  if (flightStep >= 0) return energyworkSequence()[2 + flightStep]
  return energyworkP4ResumeId(slideId, answers)
}
export function energyworkInitiationReady(answers) {
  return Boolean(answers && typeof answers === 'object' && !Array.isArray(answers) &&
    [...ENERGYWORK_REPORT_IDS,...ENERGYWORK_LESSON_ANSWER_IDS]
      .every((id) => typeof answers[id] === 'string' && answers[id].trim().length > 0))
}
export function energyworkAnswerValid(id, answer) {
  const kind = ENERGYWORK_QUESTIONS[id]
  if (!kind || typeof answer !== 'string') return false
  if (kind === 'text') return !answer.includes('\\u0000') &&
    (ENERGYWORK_MEDITATION_REPORT_IDS.includes(id) || answer.length <= 1600)
  if (kind === 'scale') return /^(?:[0-9]|10)$/.test(answer)
  if (kind === 'choice') return id === 'welcome-02'
    ? ENERGYWORK_EXPERIENCE_VALUES.includes(answer)
    : id === 'flight-03'
      ? ENERGYWORK_SUN_PRACTICE_VALUES.includes(answer)
      : id === 'tan-03'
        ? ENERGYWORK_TANTRA_PRACTICE_VALUES.includes(answer)
        : id === 'boundaries-02'
          ? ENERGYWORK_CHOICE_VALUES.includes(answer)
          : ENERGYWORK_PRACTICE_VALUES.includes(answer)
  return false
}
