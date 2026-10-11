import test from 'node:test'
import assert from 'node:assert/strict'

import { ASSESSMENT_DEFINITIONS } from '../lib/assessments/definitions.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { safetySignal } from '../lib/assessments/safety.js'
import {
  INTERPRETATION_PLANS,
  INTERPRETATION_RULES_VERSION,
  interpretationPlan,
  dimensionInterpretationPlan,
  interpretationForDimension,
  interpretationRegistryCoverage,
} from '../lib/assessments/interpretation-registry.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'

const active = MONITORING_CATALOG.filter(item => item.startable)
const activeKeys = new Set(active.map(item => item.key))
const runnableDefinitions = ASSESSMENT_DEFINITIONS.filter(
  def => activeKeys.has(def.key) && active.some(item => item.key === def.key && item.version === def.version),
)
const inputsFor = (def, position) =>
  Object.fromEntries(def.questions.map(q => {
    const min = q.min ?? def.answerScale.min
    const max = q.max ?? def.answerScale.max
    const v = position === 'max' ? max : position === 'mid' ? Math.floor((min + max) / 2) : min
    return [q.id, v]
  }))

test('every live assessment key has an explicit, localized interpretation plan; research-only keys stay separate', () => {
  const coverage = interpretationRegistryCoverage(MONITORING_CATALOG)
  assert.equal(coverage.total, 74, 'Update plan registry whenever active catalog changes')
  assert.equal(coverage.registered, 74)
  assert.deepEqual(coverage.uncovered, [])
  assert.deepEqual(coverage.obsolete, [])
  assert.equal(new Set(runnableDefinitions.map(d => d.key)).size, activeKeys.size)
  assert.match(INTERPRETATION_RULES_VERSION, /^\d{4}-\d{2}-\d{2}\.v\d+$/)
  for (const key of activeKeys) {
    const plan = interpretationPlan(key)
    assert.equal(plan.key, key)
    assert.match(plan.step.en, /\w{4,}/)
    assert.match(plan.step.ru, /[А-Яа-яЁё]{3,}/)
    assert.ok(plan.step.en.length > 45, key)
    assert.ok(plan.step.ru.length > 45, key)
  }
  assert.equal(interpretationPlan('mmpi-3'), null)
  assert.equal(interpretationPlan('nonexistent-test'), null)
  assert.ok(Object.keys(INTERPRETATION_PLANS).every(k => activeKeys.has(k)))
})

test('all score dimensions at min/middle/max generate coherent EN/RU reports with actions', () => {
  assert.ok(runnableDefinitions.length > 74, 'Includes bilingual source versions')
  for (const def of runnableDefinitions) {
    for (const position of ['min', 'mid', 'max']) {
      const result = scoreAssessment(def, inputsFor(def, position))
      assert.ok(result.dimensions.length > 0, def.key)
      for (const lang of ['en', 'ru']) {
        const report = buildAssessmentResultReport(result, lang)
        assert.equal(report.sections.length, result.dimensions.length, def.key)
        assert.equal(report.rulesVersion, INTERPRETATION_RULES_VERSION)
        for (const part of report.sections) {
          assert.ok(part.construct.length > 0, def.key)
          assert.equal(typeof part.value, 'number')
          assert.ok(part.min <= part.value && part.value <= part.max, def.key)
          assert.ok(part.meaning.length > 65, def.key + ':' + part.key + ':' + lang)
          assert.ok(part.steps.length >= 2, def.key + ':' + part.key)
          assert.ok(part.steps.every(step => step.length > 35), def.key + ':' + part.key)
          assert.ok(part.followUp.length > 30, def.key)
          assert.notEqual(part.bandBasis, 'unavailable')
          assert.ok(['descriptive', 'screening', 'published-reference'].includes(part.bandBasis))
          if (part.bandBasis === 'descriptive')
            assert.match(part.meaning, lang === 'ru' ? /не клинический порог/ : /not a clinical cutoff/)
        }
        assert.match(report.note, lang === 'ru' ? /не клинический порог/ : /not a clinical cutoff/)
      }
    }
  }
})

test('each valid integer and fractional position in every scored dimension belongs to a defined interpretation', () => {
  for (const def of runnableDefinitions) {
    const result = scoreAssessment(def, inputsFor(def, 'min'))
    for (const scale of result.dimensions) {
      for (let value = scale.min; value <= scale.max; value += 1) {
        const classification = interpretationForDimension(result, { ...scale, value }, 'en')
        assert.ok(['descriptive','screening','published-reference'].includes(classification.basis), def.key + ':' + scale.key + ':' + value)
        assert.ok(classification.label && classification.meaning)
      }
      for (const value of [scale.min + (scale.max - scale.min)/3, scale.min + 0.52*(scale.max - scale.min), scale.max - 0.0001]) {
        const classification = interpretationForDimension(result, { ...scale, value }, 'ru')
        assert.notEqual(classification.basis, 'unavailable')
      }
      for (const value of [-Infinity, NaN, null, scale.min - 1, scale.max + 1]) {
        assert.equal(interpretationForDimension(result, { ...scale, value }, 'en').basis, 'unavailable')
      }
    }
  }
})

const published = [
  ['phq-2','symptoms.phq2.total',0,6, [[0,'below_screen'],[2,'below_screen'],[3,'screen_signal'],[6,'screen_signal']]],
  ['gad-2','symptoms.gad2.total',0,6, [[0,'below_screen'],[2,'below_screen'],[3,'screen_signal'],[6,'screen_signal']]],
  ['phq-4','symptoms.phq4.total',0,12, [[0,'minimal'],[2,'minimal'],[3,'mild'],[5,'mild'],[6,'moderate'],[8,'moderate'],[9,'severe'],[12,'severe']]],
  ['phq-4','symptoms.phq4.depression',0,6, [[2,'below_screen'],[3,'screen_signal']]],
  ['phq-4','symptoms.phq4.anxiety',0,6, [[2,'below_screen'],[3,'screen_signal']]],
  ['phq-9','symptoms.phq9.total',0,27, [[0,'minimal'],[4,'minimal'],[5,'mild'],[9,'mild'],[10,'moderate'],[14,'moderate'],[15,'moderately_severe'],[19,'moderately_severe'],[20,'severe'],[27,'severe']]],
  ['phq-8','symptoms.phq_8.total',0,24, [[4,'minimal'],[5,'mild'],[9,'mild'],[10,'moderate'],[14,'moderate'],[15,'moderately_severe'],[19,'moderately_severe'],[20,'severe'],[24,'severe']]],
  ['gad-7','symptoms.gad7.total',0,21, [[4,'minimal'],[5,'mild'],[9,'mild'],[10,'moderate'],[14,'moderate'],[15,'severe'],[21,'severe']]],
  ['k6','symptoms.k6.total',0,24, [[12,'below_screen'],[13,'screen_signal'],[24,'screen_signal']]],
  ['phq-15','symptoms.phq15.total',0,30, [[4,'minimal'],[5,'low'],[9,'low'],[10,'medium'],[14,'medium'],[15,'high'],[30,'high']]],
  ['brcs','resources.brcs.total',4,20, [[4,'low_coping'],[13,'low_coping'],[14,'mid_coping'],[16,'mid_coping'],[17,'high_coping'],[20,'high_coping']]],
]

test('only instrument-backed score cutoffs apply and every published threshold boundary is exact', () => {
  for (const [key, subkey, min, max, cases] of published) {
    for (const [value, expected] of cases) {
      const reading = interpretationForDimension(
        { definitionKey: key, definitionVersion: 'v1' },
        { key: subkey, min, max, value, direction: 'non-normative' },
        'en',
      )
      assert.equal(reading.code, expected, key + '/' + subkey + '/' + value)
      assert.equal(reading.basis, key === 'brcs' ? 'published-reference' : 'screening')
      assert.ok(reading.source?.startsWith('https://'))
      assert.equal(reading.recommendedReview, key === 'brcs' ? false : ['screen_signal','moderate','moderately_severe','severe','high'].includes(expected))
    }
    const otherVersion = interpretationForDimension(
      { definitionKey:key, definitionVersion:'v2' },
      { key:subkey,min,max,value:max,direction:'non-normative' },
      'en',
    )
    assert.equal(otherVersion.basis, 'descriptive', 'Do not copy validated v1 cutoffs to unknown v2 instruments')
  }
})

test('trait scales do not assert clinical norms and resource scales never become a symptom grade', () => {
  for (const dimension of [
    { key:'trait.extraversion', value:20, min:4, max:20, direction:'non-normative' },
    { key:'resources.mspss.friends', value:7, min:1, max:7, direction:'higher-reported-resource' },
    { key:'weekly.mood', value:0, min:0, max:10, direction:'higher-reported-wellbeing' },
    { key:'weekly.tension', value:10, min:0, max:10, direction:'lower-reported-tension' },
  ]) {
    const part = interpretationForDimension({definitionKey:'mini-ipip-20',definitionVersion:'v1'},dimension,'en')
    assert.equal(part.basis,'descriptive')
    assert.match(part.meaning,/not a clinical cutoff/)
  }
  const hhTrait = interpretationForDimension({definitionKey:'mini-ipip-20',definitionVersion:'v1'}, {key:'trait.extraversion',value:4,min:4,max:20,direction:'non-normative'}, 'ru')
  assert.match(hhTrait.meaning,/не клинический порог/)
  assert.notEqual(dimensionInterpretationPlan('resources.mspss.family').step.en, dimensionInterpretationPlan('resources.mspss.friends').step.en)
  assert.notEqual(dimensionInterpretationPlan('resources.erq.suppression').step.en, dimensionInterpretationPlan('resources.erq.reappraisal').step.en)
})

test('PHQ-9 item 9 can trigger the existing non-automated safety path independently of total score', () => {
  const phq9 = runnableDefinitions.find(d => d.key === 'phq-9')
  assert.ok(phq9)
  assert.equal(safetySignal(phq9, inputsFor(phq9, 'min')), null)
  const withItem9 = { ...inputsFor(phq9, 'min'), 'phq9.09':1 }
  assert.equal(safetySignal(phq9, withItem9)?.type, 'self_harm')
  const scored = scoreAssessment(phq9, withItem9)
  assert.equal(scored.dimensions[0].value,1)
  assert.match(buildAssessmentResultReport(scored,'en').note,/not a clinical cutoff/)
  // A low summed PHQ-9 total never silently cancels an item-level safety signal.
})
