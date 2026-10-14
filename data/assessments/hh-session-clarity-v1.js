import { deepFreeze } from '../../lib/assessments/contracts.js'
import { buildFunDefinitions } from './expanded-battery-v2-helper.js'

// Independent Holistic House self-reflection; not WAI-SR, PCOMS/SRS, an
// adapted proprietary therapy measure, or a validated clinical instrument.
// The questions are only relevant after a real support conversation.
const CONFIGS = [{
  key: 'hh-session-clarity',
  titles: { en: 'Session Clarity Pulse', ru: 'Ясность после консультации' },
  descriptions: {
    en: 'An optional reflection about your most recent support conversation: being heard, clarity and choosing a next step. Use only if you have had such a conversation. Not a clinical measure of therapeutic alliance or outcome.',
    ru: 'Необязательная рефлексия о последнем разговоре о поддержке: возможность высказаться, понятность и следующий шаг. Подходит только после такой беседы. Не является клинической шкалой терапевтического альянса или эффективности.',
  },
  axis: 'state',
  topics: ['relationships', 'communication', 'self-support', 'clarity'],
  categoryAffinities: ['relationships', 'emotions'],
  analysisAxes: [
    { key: 'relationships', weight: 0.7 },
    { key: 'clarity', weight: 0.78 },
    { key: 'self_support', weight: 0.55 },
  ],
  testLength: 'short',
  en: [
    'During the most recent support conversation, I could bring up what mattered most to me.',
    'I had space to say when something needed a clearer explanation.',
    'I can name one idea I want to remember from that conversation.',
    'I felt free to ask for a slower pace when I needed it.',
    'I know one small step I might choose before my next conversation.',
    'I know how to share feedback if that conversation did not feel helpful.',
  ],
  ru: [
    'Во время последнего разговора о поддержке я смог(ла) поднять самый важный для меня вопрос.',
    'У меня была возможность сказать, когда требовалось более понятное объяснение.',
    'Я могу назвать одну мысль, которую хочу сохранить после разговора.',
    'Я чувствовал(а), что могу попросить замедлиться, когда это необходимо.',
    'Я понимаю, какой небольшой шаг мог(ла) бы выбрать до следующего разговора.',
    'Я знаю, как дать обратную связь, если разговор не показался полезным.',
  ],
  negative: false,
  timeframe: 'right-now',
  reviewedAt: '2026-10-14',
  ids: {
    en: '7ad3d3db-fc97-5f17-8da3-88785f2be68c',
    ru: '5a03a1de-3aa9-5998-8b1d-42ad234681df',
  },
  hashes: {
    en: 'sha256:3f40f3b8d7626a0b3017cd40e2db4776d78eb7b690b3734f8117affb84ff2b1c',
    ru: 'sha256:bcee3805d26b2d98838f26a2e54f1da94af6d7c0b8ca257d47d881bdf32b376a',
  },
}]

export const HH_SESSION_CLARITY_DEFINITIONS = buildFunDefinitions(CONFIGS)
export const HH_SESSION_CLARITY_CATALOG = deepFreeze(CONFIGS.map((config) => ({
  key: config.key, version: 'v1', instrumentLocale: 'dynamic',
  axis: config.axis, resultAxes: [config.axis], topics: config.topics,
  moodAffinities: ['sad', 'neutral', 'happy'], categoryAffinities: config.categoryAffinities,
  questionCount: config.en.length, durationMinutes: 2,
  testStyle: 'engaging', testLength: config.testLength, suggestedRepeatDays: 7,
  cooldownDays: 0, startable: true, starterEligible: false,
  access: 'account', rightsStatus: 'cleared', guestEligible: false, free: true,
  analysisAxes: config.analysisAxes, title: config.titles, description: config.descriptions,
})))
