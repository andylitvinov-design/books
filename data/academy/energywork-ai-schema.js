// A small, server-readable registry of approved slide IDs and answer contracts.
// The bilingual editorial content lives in data/academy/energywork-ai-curriculum.ts.
// Keep this registry aligned with that file; tests enforce exact ID parity.
export const ENERGYWORK_KEY = 'academy-energywork-principles'
export const ENERGYWORK_VERSION = '2026-10-17.p0'
export const ENERGYWORK_PATHS = Object.freeze(['yggdrasil','tantra','kundalini'])
export const ENERGYWORK_COMMON = Object.freeze([
  'welcome-01','welcome-02',
  'flight-01','flight-02','flight-03','flight-04',
  'presence-01','presence-02','presence-03','presence-04',
  'intention-01','intention-02','intention-03','intention-04',
  'boundaries-01','boundaries-02','boundaries-03','boundaries-04',
  'paths-01','paths-02','paths-03','paths-04',
])
export const ENERGYWORK_BRANCH = Object.freeze({
  yggdrasil: ['ygg-01','ygg-02','ygg-03','ygg-04','ygg-05'],
  tantra: ['tan-01','tan-02','tan-03','tan-04','tan-05'],
  kundalini: ['kun-01','kun-02','kun-03','kun-04','kun-05'],
})
export const ENERGYWORK_FINISH = Object.freeze(['end-01','end-02'])
export const ENERGYWORK_QUESTIONS = Object.freeze({
  'welcome-02': 'text',
  'flight-04': 'text',
  'flight-03': 'choice',
  'presence-03': 'scale',
  'presence-02': 'choice',
  'intention-03': 'text',
  'intention-04': 'choice',
  'boundaries-02': 'choice',
  'boundaries-03': 'choice',
  'boundaries-04': 'text',
  'ygg-04': 'text',
  'ygg-03': 'choice',
  'tan-04': 'text',
  'tan-03': 'choice',
  'kun-04': 'text',
  'kun-03': 'choice',
  'end-01': 'text',
})
export const ENERGYWORK_CHOICE_VALUES = Object.freeze(['pause','adapt','ask'])
export const ENERGYWORK_PRACTICE_VALUES = Object.freeze(['tried','skipped'])
export const ENERGYWORK_CHOICE_INDEX = ENERGYWORK_COMMON.indexOf('paths-04')
export const energyworkPathValid = (id) => ENERGYWORK_PATHS.includes(id)
export function energyworkSequence(path) {
  return [
    ...ENERGYWORK_COMMON,
    ...(energyworkPathValid(path) ? ENERGYWORK_BRANCH[path] : []),
    ...(energyworkPathValid(path) ? ENERGYWORK_FINISH : []),
  ]
}
export function energyworkAnswerValid(id, answer) {
  const kind = ENERGYWORK_QUESTIONS[id]
  if (!kind || typeof answer !== 'string') return false
  if (kind === 'text') return answer.length <= 1600
  if (kind === 'scale') return /^(?:[0-9]|10)$/.test(answer)
  if (kind === 'choice') return id === 'boundaries-02'
    ? ENERGYWORK_CHOICE_VALUES.includes(answer)
    : ENERGYWORK_PRACTICE_VALUES.includes(answer)
  return false
}
