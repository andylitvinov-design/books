import test from 'node:test'
import assert from 'node:assert/strict'

import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { ASSESSMENT_DEFINITIONS } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { safetySignal } from '../lib/assessments/safety.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import {
  INTERPRETATION_PLANS,
  interpretationPlan,
  interpretationDimensionPlan,
  interpretationForDimension,
  classificationDirection,
  interpretationRegistryCoverage,
} from '../lib/assessments/interpretation-registry.js'

const enabled = MONITORING_CATALOG.filter(row => row.startable)
const versionIds = new Set(enabled.map(row => row.key + ':' + row.version))
const runnable = ASSESSMENT_DEFINITIONS.filter(def => versionIds.has(def.key + ':' + def.version))
const answersFor = (def, extreme) => Object.fromEntries(def.questions.map(q => [
  q.id, extreme === 'max' ? (q.max ?? def.answerScale?.max) : (q.min ?? def.answerScale?.min),
]))

test('all runnable tests have exact-version plans; unavailable licensed tests remain excluded', () => {
  const coverage = interpretationRegistryCoverage(MONITORING_CATALOG)
  assert.ok(coverage.total >= 84)
  assert.equal(coverage.registered, coverage.total)
  assert.deepEqual(coverage.uncovered, [])
  assert.deepEqual(coverage.obsolete, [])
  assert.equal(new Set(runnable.map(d => d.key)).size, coverage.total)
  assert.equal(interpretationPlan('hh-current-state', 'v2')?.key, 'hh-current-state')
  assert.equal(interpretationPlan('hh-current-state', 'v1')?.key, 'hh-current-state')
  assert.equal(interpretationPlan('hh-current-state', 'v3'), null)
  assert.equal(interpretationPlan('gad-7', 'future'), null)
  for (const row of enabled) {
    const plan = interpretationPlan(row.key, row.version)
    assert.ok(plan, row.key + ' v' + row.version)
    assert.ok(plan.step.en.length > 24 && plan.step.ru.length > 24)
    assert.equal(plan.reviewStatus, 'preauthored-requires-clinical-qa')
  }
  for (const row of MONITORING_CATALOG.filter(row => !row.startable)) {
    assert.equal(interpretationPlan(row.key, row.version), null, 'Unavailable tests must not acquire a plan: ' + row.key)
  }
})

test('every score dimension in each runnable test has a localized report at valid extremes', () => {
  for (const def of runnable) for (const extreme of ['min', 'max']) {
    const result = scoreAssessment(def, answersFor(def, extreme))
    assert.ok(result.dimensions.length, def.key)
    for (const language of ['en','ru']) {
      const report = buildAssessmentResultReport(result, language)
      assert.equal(report.sections.length, result.dimensions.length, def.key + '/' + language)
      assert.ok(report.rulesVersion)
      if (def.key === 'hh-bach-flower-profile') {
        assert.equal(report.sections.length, 38)
        assert.ok(report.sections.every(section => section.domain === 'bach' && section.steps.length >= 2))
        assert.ok(report.sections.every(section => section.meaning.length > 45))
        assert.ok(report.sections.every(section => section.followUp.length > 30))
        assert.ok(report.sections.every(section => section.value >= 0))
        continue
      }
      for (const section of report.sections) {
        assert.ok(section.construct.length > 2, def.key + ':' + section.key)
        assert.ok(section.meaning.length > 45, def.key + ':' + section.key)
        assert.ok(section.steps.length >= 2, def.key + ':' + section.key)
        assert.ok(section.steps.every(step => step.length > 18), def.key + ':' + section.key)
        assert.ok(section.followUp.length > 25, def.key + ':' + section.key)
        assert.ok(['screening','published-reference','descriptive'].includes(section.bandBasis))
        if (language === 'ru') assert.match(section.meaning, /[А-Яа-яЁё]/)
      }
    }
  }
})

test('every single numeric value in all integer-scale score ranges maps to one total, unambiguous interpretation', () => {
  let checked = 0
  for (const def of runnable) {
    const scored = scoreAssessment(def, answersFor(def, 'min'))
    for (const d of scored.dimensions) {
      const min = d.min, max = d.max
      assert.ok(Number.isFinite(min) && Number.isFinite(max) && max > min)
      const values = [min, (min + max) / 2, max]
      if (Number.isInteger(min) && Number.isInteger(max) && max - min <= 100) {
        for (let value = min; value <= max; value++) values.push(value)
      }
      for (const value of new Set(values)) {
        const dimension = { ...d, value }
        for (const locale of ['en','ru']) {
          const info = interpretationForDimension(scored, dimension, locale)
          assert.ok(info.code && info.meaning && info.label, def.key + '/' + d.key + '/' + value)
          assert.ok(['screening','published-reference','descriptive','unavailable'].includes(info.basis))
          // Fractional synthetic values are impossible on official summed
          // instruments; they are rejected rather than mislabeled.
          if (info.basis === 'unavailable') assert.equal(Number.isInteger(value), false)
          else assert.ok(info.meaning.length > 35)
          checked++
        }
      }
      if (def.key !== 'hh-bach-flower-profile' &&
          ['configured','raw-state','raw-dimensions','mini-ipip-20'].includes(def.scoringKey) &&
          scored.dimensions.length > 1) {
        const dimensionPlan = interpretationDimensionPlan(scored, d.key)
        assert.ok(dimensionPlan, def.key + ':' + d.key)
        assert.equal(dimensionPlan.explicit, true, 'Missing explicit multidimensional rule: ' + def.key + '/' + d.key)
        assert.ok(dimensionPlan.label.en.length && dimensionPlan.label.ru.length)
      }
    }
  }
  assert.ok(checked > 1200, 'Coverage must exercise a broad set of score/locale combinations')
})

test('Bach weighted profiles keep 38 separately authored themes instead of converting weighted matches into clinical thresholds', () => {
  const definition = runnable.find(item => item.key === 'hh-bach-flower-profile' && item.instrumentLocale === 'en')
  assert.ok(definition)
  const result = scoreAssessment(definition, answersFor(definition,'max'))
  assert.equal(result.dimensions.length,38)
  const report = buildAssessmentResultReport(result,'en')
  assert.equal(report.sections.length,38)
  assert.ok(report.sections.every(item => item.group && item.steps.length === 2))
  assert.ok(report.sections.every(item => /not clinical|not a diagnosis|not clinical severity/.test(item.meaning)))
  assert.equal(new Set(report.sections.map(item=>item.construct)).size,38)
  assert.equal(report.highlightedCount,7)
})

test('boundary cutoffs follow published values exactly and do not leak to changed test versions', () => {
  const cases = [
    ['phq-2','symptoms.phq2.total',0,6,[[2,'below_screen'],[3,'screen_signal']]],
    ['gad-2','symptoms.gad2.total',0,6,[[2,'below_screen'],[3,'screen_signal']]],
    ['phq-4','symptoms.phq4.total',0,12,[[2,'minimal'],[3,'mild'],[5,'mild'],[6,'moderate'],[8,'moderate'],[9,'severe']]],
    ['phq-4','symptoms.phq4.anxiety',0,6,[[2,'below_screen'],[3,'screen_signal']]],
    ['phq-4','symptoms.phq4.depression',0,6,[[2,'below_screen'],[3,'screen_signal']]],
    ['phq-9','symptoms.phq9.total',0,27,[[4,'minimal'],[5,'mild'],[9,'mild'],[10,'moderate'],[14,'moderate'],[15,'moderately_severe'],[19,'moderately_severe'],[20,'severe']]],
    ['phq-8','symptoms.phq_8.total',0,24,[[4,'minimal'],[5,'mild'],[10,'moderate'],[15,'moderately_severe'],[20,'severe']]],
    ['gad-7','symptoms.gad7.total',0,21,[[4,'minimal'],[5,'mild'],[9,'mild'],[10,'moderate'],[14,'moderate'],[15,'severe']]],
    ['k6','symptoms.k6.total',0,24,[[12,'below_screen'],[13,'screen_signal']]],
    ['phq-15','symptoms.phq15.total',0,30,[[4,'minimal'],[5,'low'],[9,'low'],[10,'medium'],[14,'medium'],[15,'high']]],
    ['brcs','resources.brcs.total',4,20,[[13,'low_coping'],[14,'mid_coping'],[16,'mid_coping'],[17,'high_coping']]],
  ]
  for (const [key,scale,min,max,boundaries] of cases) {
    for (const [value,code] of boundaries) {
      const result = {definitionKey:key,definitionVersion:'v1'}
      const d = {key:scale,value,min,max,direction:key==='brcs'?'higher-reported-resource':'lower-reported-difficulty'}
      const info = interpretationForDimension(result, d, 'en')
      assert.equal(info.code, code, key + '/' + scale + '/' + value)
      assert.notEqual(info.basis, 'descriptive')
      assert.ok(info.source?.startsWith('https://'))
      assert.match(info.meaning, /not diagnose|do not diagnose/)
      assert.equal(interpretationForDimension({...result,definitionVersion:'v9'},d,'en').basis,'descriptive')
    }
  }
})

test('new IPIP-50 uses five separate descriptive non-diagnostic trait profiles', () => {
  const def = runnable.find(item => item.key === 'ipip-big-five-50')
  assert.ok(def)
  const scored = scoreAssessment(def, answersFor(def,'max'))
  assert.equal(scored.dimensions.length, 5)
  const report = buildAssessmentResultReport(scored,'ru')
  assert.equal(report.sections.length, 5)
  assert.ok(report.sections.every(section => section.bandBasis === 'descriptive'))
  assert.ok(report.sections.every(section => section.domain === 'personality'))
  assert.ok(report.sections.every(section => section.steps.length >= 2))
  assert.equal(new Set(report.sections.map(section => section.construct)).size, 5)
  for (const item of scored.dimensions)
    assert.equal(interpretationDimensionPlan(scored,item.key)?.explicit, true)
})

test('resource/symptom direction handling recognizes all original HH direction variants', () => {
  assert.equal(classificationDirection({direction:'higher-reported-wellbeing'}),'resource')
  assert.equal(classificationDirection({direction:'higher-reported-recovery'}),'resource')
  assert.equal(classificationDirection({direction:'lower-reported-tension'}),'difficulty')
  assert.equal(classificationDirection({direction:'lower-reported-interference'}),'difficulty')
  assert.equal(classificationDirection({direction:'non-normative'}),'neutral')
  const r = {definitionKey:'hh-weekly-pulse',definitionVersion:'v1'}
  const tension = interpretationForDimension(r,{key:'weekly.tension',value:10,min:0,max:10,direction:'lower-reported-tension'},'ru')
  const recovery = interpretationForDimension(r,{key:'weekly.recovery',value:10,min:0,max:10,direction:'higher-reported-recovery'},'ru')
  assert.match(tension.meaning,/трудностей/)
  assert.match(recovery.meaning,/ресурсов/)
  for (const code of ['trait.extraversion','trait.neuroticism']) {
    const info = interpretationForDimension({definitionKey:'mini-ipip-20',definitionVersion:'v1'},
      {key:code,value:20,min:4,max:20,direction:'non-normative'},'en')
    assert.equal(info.basis,'descriptive')
    assert.match(info.meaning,/descriptive/)
  }
})

test('invalid and impossible scores never trigger interpretation or safety reassurance', () => {
  const r = { definitionKey:'phq-4', definitionVersion:'v1' }
  const valid = { key:'symptoms.phq4.total', value:4, min:0, max:12 }
  for (const value of [undefined, null, NaN, Infinity, -1, 13, '4', 4.5]) {
    assert.equal(interpretationForDimension(r,{...valid,value},'en').basis,'unavailable',String(value))
  }
  assert.equal(interpretationForDimension(r,{...valid,min:10,max:0},'en').basis,'unavailable')
  assert.equal(interpretationForDimension(r,{...valid,max:24},'en').basis,'descriptive')
  const report = buildAssessmentResultReport({...r,dimensions:[{...valid,value:null}]},'en')
  assert.deepEqual(report.sections[0].steps,[])
  assert.equal(report.sections[0].recommendedReview,false)
})

test('item-level PHQ-9 safety remains independent from total-score interpretation', () => {
  const def = ASSESSMENT_DEFINITIONS.find(d => d.key === 'phq-9')
  assert.ok(def)
  const answers = answersFor(def, 'min')
  const item = def.questions.find(q => q.safety?.type === 'self_harm')
  assert.ok(item)
  assert.equal(safetySignal(def, answers), null)
  answers[item.id] = 1
  const signal = safetySignal(def, answers)
  assert.equal(signal?.type, 'self_harm')
  assert.equal(signal?.questionId, item.id)
})
