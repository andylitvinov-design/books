import { isPcPtsd5Definition, validatePcPtsd5Answers } from './pc-ptsd5-runtime.js'
import { BACH_V2_DEFINITIONS } from '../../data/assessments/bach-flower-v2.js'
import { HH_SPLIT_V2_DEFINITIONS } from '../../data/assessments/hh-split-reflections-v2.js'
import { IPIP_FIVE_DEFINITIONS } from '../../data/assessments/ipip-five-2026.js'
import { IPIP_THREE_DEFINITIONS } from '../../data/assessments/ipip-three-2026.js'
import { ASRS6_DEFINITIONS } from '../../data/assessments/asrs-v1-6-nyu.js'
import {
  CURRENT_STATE_EN_V1,
  CURRENT_STATE_RU_V1,
} from '../../data/assessments/current-state-v1.js'
import {
  CURRENT_STATE_EN_V2,
  CURRENT_STATE_RU_V2,
} from '../../data/assessments/current-state-v2.js'
import { MINI_IPIP_20_EN_V1 } from '../../data/assessments/mini-ipip-20-en-v1.js'
import { HH_WEEKLY_PULSE_EN_V1, HH_WEEKLY_PULSE_RU_V1 } from '../../data/assessments/weekly-pulse-v1.js'
import { GAD7_RU_V1 } from '../../data/assessments/gad7-ru-v1.js'
import {
  PHQ4_EN_V1,
  K6_EN_V1,
  PHQ9_EN_V1,
  GAD7_EN_V1,
  HH_RESOURCE_EN_V1,
  HH_RESOURCE_RU_V1,
  HH_MONTHLY_EN_V1,
  HH_MONTHLY_RU_V1,
} from '../../data/assessments/psychic-monitoring-v1.js'
import { EXPANDED_BATTERY_DEFINITIONS } from '../../data/assessments/expanded-battery-v1.js'
import { EXPANDED_BATTERY_V2_DEFINITIONS } from '../../data/assessments/expanded-battery-v2.js'
import { EXPANDED_BATTERY_V3_DEFINITIONS } from '../../data/assessments/expanded-battery-v3.js'
import { EXPANDED_BATTERY_V4_DEFINITIONS } from '../../data/assessments/expanded-battery-v4.js'
import { RELATIONSHIPS_INTIMACY_DEFINITIONS } from '../../data/assessments/relationships-intimacy-v1.js'
import { TANTRIC_REFLECTION_DEFINITIONS } from '../../data/assessments/tantric-reflections-v1.js'
import { PROFESSIONAL_BATTERY_2026_DEFINITIONS } from '../../data/assessments/professional-battery-2026.js'
import { CDC_HEALTHY_DAYS_DEFINITIONS } from '../../data/assessments/cdc-healthy-days-2026.js'
import { PROFESSIONAL_BATTERY_2026_B_DEFINITIONS } from '../../data/assessments/professional-battery-2026-b.js'
import { IPIP_BIG_FIVE_50_EN_V1 } from '../../data/assessments/ipip-big-five-50-en-v1.js'
import { PERSONALITY_TYPE_DEFINITIONS } from '../../data/assessments/personality-types-original-2026.js'
import { OPEN_PROFESSIONAL_2026_DEFINITIONS } from '../../data/assessments/open-professional-2026.js'
import { IPIP_VIA_R_COMPLETION_DEFINITIONS } from '../../data/assessments/ipip-via-r-completion-2026.js'
import { IPIP_VIA_R_PROFILE_96_DEFINITIONS } from '../../data/assessments/ipip-via-r-profile-96.js'
import { CFPB_FINANCIAL_WELLBEING_SHORT_DEFINITIONS } from '../../data/assessments/cfpb-financial-wellbeing-short-v1.js'
import { ADDITIONAL_PROFESSIONAL_DEFINITIONS } from '../../data/assessments/professional-additions-2026.js'
import { BACH_PROFILE_EN_V1, BACH_PROFILE_RU_V1 } from '../../data/assessments/bach-flower-v1.js'
import { COMPASSION_DEFINITIONS } from '../../data/assessments/compassion-2026.js'
import { MHC_SF_DEFINITIONS } from '../../data/assessments/mhc-sf-adult-dec2011.js'
import { assertObject, onlyKeys, fail, text, deepFreeze } from './contracts.js'
import { TRAUMA_SCREENING_DEFINITIONS } from '../../data/assessments/trauma-screening-2026.js'
import { hasTraumaAdministration, validateTraumaContext } from './trauma-administration.js'
export const ASSESSMENT_DEFINITIONS = deepFreeze([
  ...HH_SPLIT_V2_DEFINITIONS,
  ...IPIP_FIVE_DEFINITIONS,
  ...IPIP_THREE_DEFINITIONS,
  ...TRAUMA_SCREENING_DEFINITIONS,
  ...ASRS6_DEFINITIONS,
  CURRENT_STATE_EN_V1,
  CURRENT_STATE_RU_V1,
  CURRENT_STATE_EN_V2,
  CURRENT_STATE_RU_V2,
  MINI_IPIP_20_EN_V1,
  HH_WEEKLY_PULSE_EN_V1,
  HH_WEEKLY_PULSE_RU_V1,
  PHQ4_EN_V1,
  K6_EN_V1,
  PHQ9_EN_V1,
  GAD7_EN_V1,
  GAD7_RU_V1,
  HH_RESOURCE_EN_V1,
  HH_RESOURCE_RU_V1,
  HH_MONTHLY_EN_V1,
  HH_MONTHLY_RU_V1,
  ...EXPANDED_BATTERY_DEFINITIONS,
  ...EXPANDED_BATTERY_V2_DEFINITIONS,
  ...EXPANDED_BATTERY_V3_DEFINITIONS,
  ...EXPANDED_BATTERY_V4_DEFINITIONS,
  ...RELATIONSHIPS_INTIMACY_DEFINITIONS,
  ...TANTRIC_REFLECTION_DEFINITIONS,
  ...PROFESSIONAL_BATTERY_2026_DEFINITIONS,
  ...CDC_HEALTHY_DAYS_DEFINITIONS,
  ...PROFESSIONAL_BATTERY_2026_B_DEFINITIONS,
  IPIP_BIG_FIVE_50_EN_V1,
  ...PERSONALITY_TYPE_DEFINITIONS,
  ...OPEN_PROFESSIONAL_2026_DEFINITIONS,
  ...IPIP_VIA_R_COMPLETION_DEFINITIONS,
  ...IPIP_VIA_R_PROFILE_96_DEFINITIONS,
  ...CFPB_FINANCIAL_WELLBEING_SHORT_DEFINITIONS,
  ...ADDITIONAL_PROFESSIONAL_DEFINITIONS,
  ...COMPASSION_DEFINITIONS,
  ...MHC_SF_DEFINITIONS,
  ...BACH_V2_DEFINITIONS,
  BACH_PROFILE_EN_V1,
  BACH_PROFILE_RU_V1,
])
const definitions = new Map(
  ASSESSMENT_DEFINITIONS.map((d) => [`${d.key}:${d.version}:${d.instrumentLocale}`, d]),
)
export function getAssessmentDefinition(key, version = 'v1', locale = 'en') {
  const d = definitions.get(`${key}:${version}:${locale}`)
  if (!d) fail('UNKNOWN_INSTRUMENT')
  return d
}
export function getDefinitionById(id) {
  const d = ASSESSMENT_DEFINITIONS.find((d) => d.id === id)
  if (!d) fail('UNKNOWN_INSTRUMENT')
  return d
}
export function validateAnswers(definition, answers, { requireComplete = true } = {}) {
  if (isPcPtsd5Definition(definition)) return validatePcPtsd5Answers(definition, answers, { requireComplete })
  assertObject(answers)
  onlyKeys(
    answers,
    definition.questions.map((q) => q.id),
  )
  const result = {}
  for (const question of definition.questions) {
    const value = answers[question.id]
    if (value === undefined || value === null) {
      if (requireComplete && question.required !== false) fail('REQUIRED_ANSWER')
      continue
    }
    const min = question.min ?? definition.answerScale?.min,
      max = question.max ?? definition.answerScale?.max
    if (
      !Number.isInteger(value) ||
      !Number.isInteger(min) ||
      !Number.isInteger(max) ||
      value < min ||
      value > max
    )
      fail('INVALID_ANSWER')
    result[question.id] = value
  }
  // The original CDC HRQOL-4 skips activity limitation when both physical and mental unhealthy days are zero.
  // This runner asks all four questions, but rejects an internally inconsistent nonzero response.
  if (requireComplete && definition.key === 'cdc-hrqol-4' &&
      result['hrqol4.02'] === 0 && result['hrqol4.03'] === 0 &&
      result['hrqol4.04'] !== 0)
    fail('INVALID_ANSWER')
  return result
}
export function validateContext(definition, context = {}, options = {}) {
  if (hasTraumaAdministration(definition)) return validateTraumaContext(definition, context, options)
  onlyKeys(
    context,
    definition.optionalContext.map((q) => q.id),
  )
  return Object.fromEntries(Object.entries(context).map(([key, value]) => [key, text(value, 1000)]))
}
export function provenance(definition) {
  return {
    definitionId: definition.id,
    definitionKey: definition.key,
    definitionVersion: definition.version,
    instrumentLocale: definition.instrumentLocale,
    translationVersion: definition.translationVersion,
    contentHash: definition.contentHash,
    scoringKey: definition.scoringKey,
    scoringVersion: definition.scoringVersion,
    resultVersion: definition.resultVersion,
    timeframe: definition.timeframe,
  }
}
export function validateProvenance(value) {
  assertObject(value)
  const def = getAssessmentDefinition(
    value.definitionKey,
    value.definitionVersion,
    value.instrumentLocale,
  )
  if (Object.entries(provenance(def)).some(([key, part]) => value[key] !== part))
    fail('INVALID_PROVENANCE')
  return def
}
