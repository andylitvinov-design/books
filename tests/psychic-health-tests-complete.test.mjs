import test from 'node:test'
import assert from 'node:assert/strict'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { EXPANDED_BATTERY_V3_KEYS } from '../data/assessments/expanded-battery-v3.js'
import { EXPANDED_BATTERY_V4_KEYS } from '../data/assessments/expanded-battery-v4.js'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { safetySignal } from '../lib/assessments/safety.js'

const startable = () => MONITORING_CATALOG.filter((item) => item.startable)
const answers = (definition, value) =>
  Object.fromEntries(definition.questions.map((q) => [q.id, value ?? q.min ?? definition.answerScale?.min ?? 0]))

test('all active published monitoring tests resolve to executable definitions', () => {
  const items = startable()
  assert.equal(items.length, 42 + EXPANDED_BATTERY_V3_KEYS.length + EXPANDED_BATTERY_V4_KEYS.length)
  assert.deepEqual(
    items.map((item) => item.key).sort(),
    [
    'brcs',
    'erq',
    'gad-2',
    'gad-7',
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
    const result = scoreAssessment(definition, answers(definition))
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
  assert.ok(planned.every((item) => item.rightsStatus !== 'cleared'))
})
