import { deepFreeze } from '../../lib/assessments/contracts.js'
import { TRAUMA_SCREENING_DEFINITIONS } from './trauma-screening-2026.js'
export const TRAUMA_SCREENING_CATALOG = deepFreeze(TRAUMA_SCREENING_DEFINITIONS.map(definition => ({
  key: definition.key, version: definition.version, instrumentLocale: 'en',
  axis: 'symptoms', resultAxes: ['symptoms'], topics: ['stress'],
  moodAffinities: [], categoryAffinities: [],
  questionCount: definition.questions.length, durationMinutes: definition.key === 'pcl-5' ? 8 : 6,
  testStyle: 'professional', testLength: 'medium', suggestedRepeatDays: null, cooldownDays: null,
  startable: true, starterEligible: false, explicitOptIn: true, guestEligible: true, access: 'account', rightsStatus: 'cleared', free: true,
  analysisAxes: [],
  title: { en: definition.title, ru: `${definition.key === 'pcl-5' ? 'PCL-5 с Criterion A' : 'ITQ для взрослых'} · EN` },
  description: {
    en: 'Optional adult trauma-symptom questionnaire in original English. Includes event context; you may stop at any time. Raw scores for professional discussion, without diagnosis or severity categories.',
    ru: 'Необязательный взрослый опросник симптомов после травматических событий на английском. С контекстом события; можно остановиться в любой момент. Баллы для обсуждения со специалистом, без диагноза и категорий тяжести.',
  },
})))
