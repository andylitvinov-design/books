import { ADDITIONAL_PROFESSIONAL_CATALOG, ADDITIONAL_PROFESSIONAL_DEFINITIONS } from '../data/assessments/professional-additions-2026.js'
import { createHash } from 'node:crypto'
import { IPIP_FIVE_CATALOG } from '../data/assessments/ipip-five-2026.js'
import { IPIP_THREE_CATALOG } from '../data/assessments/ipip-three-2026.js'
import { TRAUMA_SCREENING_CATALOG } from '../data/assessments/trauma-screening-catalog-2026.js'
import { syntheticTraumaContext } from './helpers/trauma-context-fixtures.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { EXPANDED_BATTERY_V3_KEYS } from '../data/assessments/expanded-battery-v3.js'
import { EXPANDED_BATTERY_V4_KEYS } from '../data/assessments/expanded-battery-v4.js'
import { PROFESSIONAL_BATTERY_2026_CATALOG } from '../data/assessments/professional-battery-2026.js'
import { PROFESSIONAL_BATTERY_2026_B_CATALOG } from '../data/assessments/professional-battery-2026-b.js'
import { CDC_HEALTHY_DAYS_CATALOG } from '../data/assessments/cdc-healthy-days-2026.js'
import { IPIP_BIG_FIVE_50_CATALOG } from '../data/assessments/ipip-big-five-50-en-v1.js'
import { PERSONALITY_TYPE_CATALOG } from '../data/assessments/personality-types-original-2026.js'
import { RELATIONSHIPS_INTIMACY_KEYS } from '../data/assessments/relationships-intimacy-v1.js'
import { TANTRIC_REFLECTION_KEYS } from '../data/assessments/tantric-reflections-v1.js'
import { OPEN_PROFESSIONAL_2026_CATALOG } from '../data/assessments/open-professional-2026.js'
import { IPIP_VIA_R_COMPLETION_CATALOG } from '../data/assessments/ipip-via-r-completion-2026.js'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { safetySignal } from '../lib/assessments/safety.js'

const startable = () => MONITORING_CATALOG.filter((item) => item.startable)
const answers = (definition, value) =>
  Object.fromEntries(definition.questions.map((q) => [q.id, value ?? q.min ?? definition.answerScale?.min ?? 0]))

test('the five later professional additions have exact immutable membership, content and cleared discovery', () => {
  const expected = [
    ['ipip-emotion-decision-making-9', '13deba1e-e350-5593-85c7-30f2c9815cbd', '85ba815ae4a2a57da10a5fbf0136fc0bbfbe0e5a32fc3011fe8ef0a34003d35b', 9, 5],
    ['ipip-responsive-joy-10', '00089afb-3905-5e84-8efb-f0566342aff5', '191b04f9610931d98dab5270fc733c687a8bd05c5cc21cf052ce5e952397538c', 10, 6],
    ['ipip-responsive-distress-10', 'eea5bd21-9620-5fd6-bc2a-9809e590fbd2', '3f6e099c8027c79bc1fe1d8d46910d0f56c63ed08989714e984d04addde8b282', 10, 5],
    ['ipip-empathic-concern-10', '608dce45-8984-51bc-9f1d-5dc8aa9eac8e', 'e8661dad68762e77e466943ab40231675c2447a6872176063c3a74165067558f', 10, 5],
    ['ons-personal-wellbeing-4', '78e257f3-7d2d-5feb-a317-d39f8c2a8e19', '8597bc30247ea6505a7521df9f0dd4d51c13cb86776a5abc6d493fc170df6689', 4, null],
  ]
  const keys = expected.map(([key]) => key).sort()
  assert.deepEqual(ADDITIONAL_PROFESSIONAL_CATALOG.map(item => item.key).sort(), keys)
  assert.deepEqual(ADDITIONAL_PROFESSIONAL_DEFINITIONS.map(item => item.key).sort(), keys)
  for (const [key, id, hash, questionCount, positiveCount] of expected) {
    const rows = startable().filter(item => item.key === key)
    assert.equal(rows.length, 1, key)
    const item = rows[0]
    const definition = getAssessmentDefinition(key, 'v1', 'en')
    assert.equal(definition, ADDITIONAL_PROFESSIONAL_DEFINITIONS.find(row => row.key === key), key)
    assert.deepEqual([definition.id, definition.version, definition.instrumentLocale, definition.contentHash],
      [id, 'v1', 'en', 'sha256:' + hash], key)
    assert.deepEqual([item.version, item.instrumentLocale, item.questionCount, item.testStyle, item.rightsStatus],
      ['v1', 'en', questionCount, 'professional', 'cleared'], key)
    assert.equal(definition.questions.length, questionCount, key)
    assert.equal(definition.source.nonDiagnostic, true, key)
    const items = definition.questions.map(question => question.text)
    const fingerprint = positiveCount === null ? {key, items} : {key, items, positiveCount}
    assert.equal(createHash('sha256').update(JSON.stringify(fingerprint)).digest('hex'), hash, key)
    if (positiveCount !== null) {
      assert.equal(definition.source.url, 'https://ipip.ori.org/newEmotionalIntelligenceKey.htm')
      assert.equal(definition.source.permissionUrl, 'https://ipip.ori.org/newPermission.htm')
      assert.deepEqual(definition.scoring.dimensions.map(row => [row.method, row.dimensionClass, row.direction]),
        [['sum', 'trait', 'non-normative']], key)
      assert.deepEqual(definition.scoring.dimensions[0].reverseItems,
        definition.questions.slice(positiveCount).map(question => question.id), key)
    } else {
      assert.equal(definition.source.permissionUrl,
        'https://www.ons.gov.uk/peoplepopulationandcommunity/wellbeing/methodologies/surveysusingthe4officefornationalstatisticspersonalwellbeingquestions')
      assert.deepEqual(definition.scoring.dimensions.map(row => [row.method, row.items.length, row.min, row.max]),
        Array.from({length: 4}, () => ['value', 1, 0, 10]), 'ONS4 retains four separate answers, never a total')
    }
  }
})

test('all active published monitoring tests resolve to executable definitions', () => {
  const items = startable()
  assert.equal(items.length, 47 + TRAUMA_SCREENING_CATALOG.length + IPIP_THREE_CATALOG.length + IPIP_FIVE_CATALOG.length + RELATIONSHIPS_INTIMACY_KEYS.length + TANTRIC_REFLECTION_KEYS.length + EXPANDED_BATTERY_V3_KEYS.length + EXPANDED_BATTERY_V4_KEYS.length + PROFESSIONAL_BATTERY_2026_CATALOG.length + PROFESSIONAL_BATTERY_2026_B_CATALOG.length + CDC_HEALTHY_DAYS_CATALOG.length + IPIP_BIG_FIVE_50_CATALOG.length + OPEN_PROFESSIONAL_2026_CATALOG.length + PERSONALITY_TYPE_CATALOG.length + IPIP_VIA_R_COMPLETION_CATALOG.length + ADDITIONAL_PROFESSIONAL_CATALOG.length + 2)
  assert.deepEqual(
    items.filter(item=>!TRAUMA_SCREENING_CATALOG.some(candidate=>candidate.key===item.key)&&!IPIP_VIA_R_COMPLETION_CATALOG.some(candidate=>candidate.key===item.key)).map((item) => item.key).sort(),
    [
    'asrs-6',
    'ipip-via-r-strengths-96',
    'cfpb-financial-wellbeing-5',
    'mhc-sf',
    'scs-sf',
    'compassion-scale',
    'brcs',
    'erq',
    'gad-2',
    'gad-7',
    'hh-bach-flower-profile',
    'hh-body-signals',
    'hh-boundary-radar',
    'hh-change-readiness',
    'hh-closeness-compass',
    'hh-confidence-pulse',
    'hh-current-state',
    'hh-daily-rhythm',
    'hh-decision-fog',
    'hh-evening-landing',
    'hh-focus-mode',
    'hh-inner-ally',
    'hh-inner-critic',
    'hh-meaning-compass',
    'hh-money-pressure',
    'hh-monthly-profile',
    'hh-morning-battery',
    'hh-motivation-spark',
    'hh-overthinking-loop',
    'hh-playfulness-pulse',
    'hh-recharge-decoder',
    'hh-resource-pulse',
    'hh-rest-permission',
    'hh-screen-saturation',
    'hh-sleep-reset',
    'hh-social-battery',
    'hh-start-button',
    'hh-stress-weather',
    'hh-tiny-joys',
    'hh-weekly-pulse',
    'hh-workload-weather',
    'k10',
    'k6',
    'mini-ipip-20',
    'mspss',
    'phq-15',
    'phq-2',
    'phq-4',
    'phq-9',
    ...EXPANDED_BATTERY_V3_KEYS,
    ...EXPANDED_BATTERY_V4_KEYS,
    ...PROFESSIONAL_BATTERY_2026_CATALOG.map((item) => item.key),
    ...PROFESSIONAL_BATTERY_2026_B_CATALOG.map((item) => item.key),
    ...CDC_HEALTHY_DAYS_CATALOG.map((item) => item.key),
    ...IPIP_BIG_FIVE_50_CATALOG.map((item) => item.key),
    ...PERSONALITY_TYPE_CATALOG.map((item) => item.key),
    ...RELATIONSHIPS_INTIMACY_KEYS,
    ...TANTRIC_REFLECTION_KEYS,
    ...IPIP_THREE_CATALOG.map((item) => item.key),
    ...IPIP_FIVE_CATALOG.map((item) => item.key),
    ...OPEN_PROFESSIONAL_2026_CATALOG.map((item) => item.key),
    ...ADDITIONAL_PROFESSIONAL_CATALOG.map((item) => item.key),
  ].sort(),
  )
  for (const item of items) {
    const locale = item.instrumentLocale === 'dynamic' ? 'en' : item.instrumentLocale
    const definition = getAssessmentDefinition(item.key, item.version, locale)
    assert.equal(definition.questions.length, item.questionCount, item.key)
  }
})

test('configured clinical and resource measures return valid scored dimensions', () => {
  for (const [key, version, locale] of [
    ['phq-4','v1','en'],
    ['k6','v1','en'],
    ['phq-9','v1','en'],
    ['gad-7','v1','en'],
    ['hh-resource-pulse','v1','en'],
    ['hh-monthly-profile','v1','en'],
  ]) {
    const definition = getAssessmentDefinition(key, version, locale)
    const result = scoreAssessment(definition, answers(definition), syntheticTraumaContext(definition))
    assert.equal(result.definitionKey, key)
    assert.ok(result.dimensions.length > 0, key)
    assert.ok(result.dimensions.every((dimension) => Number.isFinite(dimension.value)), key)
  }
})

test('PHQ-9 explicit risk answer triggers safety but zero does not', () => {
  const definition = getAssessmentDefinition('phq-9','v1','en')
  const safe = answers(definition, 0)
  assert.equal(safetySignal(definition, safe), null)
  assert.equal(safetySignal(definition, { ...safe, 'phq9.09': 1 })?.type, 'self_harm')
})

test('licensed and uncleared professional references remain non-startable', () => {
  const planned = MONITORING_CATALOG.filter((item) => !item.startable)
  assert.ok(planned.length > 0)
  assert.ok(planned.every((item) => item.rightsStatus !== 'cleared' || item.registrationRequired === true))
  assert.ok(planned.filter(item => item.registrationRequired).every(item => item.startable === false))
})
