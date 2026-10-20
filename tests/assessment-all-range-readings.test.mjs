import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ASSESSMENT_DEFINITIONS, getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { gaugeModel } from '../lib/assessments/dashboard-gauges.js'
import { interpretationBandModel } from '../lib/assessments/interpretation-registry.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { syntheticTraumaContext } from './helpers/trauma-context-fixtures.mjs'

const score = (definition, fraction = 0.5) => {
  const responses = Object.fromEntries(definition.questions.map(item => {
    const min = item.min ?? definition.answerScale.min
    const max = item.max ?? definition.answerScale.max
    return [item.id, Math.round(min + (max - min) * fraction)]
  }))
  return scoreAssessment(definition, responses, syntheticTraumaContext(definition))
}

test('every immutable numeric score has one honest readable interval and a selected characterization in both languages', () => {
  assert.ok(ASSESSMENT_DEFINITIONS.length >= 230)
  const count = { published: 0, 'source-options': 0, descriptive: 0, ordinal: 0, continuous: 0, 'historical-mixed': 0 }
  for (const definition of ASSESSMENT_DEFINITIONS) for (const fraction of [0, 0.5, 1]) {
    const scored = score(definition, fraction)
    const saved = JSON.stringify(scored)
    for (const dimension of scored.dimensions) for (const locale of ['ru', 'en']) {
      const context = definition.key + '/' + definition.version + '/' + definition.instrumentLocale +
        '/' + dimension.key + '/' + fraction + '/' + locale
      const interpreted = interpretationBandModel(scored, dimension, locale)
      assert.equal(interpreted.verified, true, context + ' source verified')
      const model = gaugeModel(dimension, scored, locale)
      assert.ok(model, context + ' gauge')
      const reading = model.rangeReading
      assert.ok(reading?.verified, context + ' reading')
      assert.ok(reading.heading.length >= 25, context + ' title')
      assert.ok(reading.narrative.length >= 75, context + ' situation or personality meaning')
      assert.ok(reading.caution.length >= 40, context + ' validity note')
      assert.equal(reading.rows.filter(row => row.current).length, 1, context + ' exact selected range')
      assert.ok(reading.rows.every(row =>
        row.code && row.label && row.displayRange && row.note.length >= 45),
      context + ' every range explained')
      assert.equal(reading.rows.find(row => row.current)?.code, reading.current.code)
      if (reading.clusterBasis === 'historical-mixed-mean-v1') {
        assert.ok(['hh-money-pressure','hh-overthinking-loop','hh-screen-saturation'].includes(definition.key), context)
        assert.equal(definition.version, 'v1', context)
        assert.equal(reading.rows.length, 5, context)
        assert.equal(reading.sourceQuestions?.length, 6, context)
        assert.equal(reading.newerVersion, 'v2')
        assert.equal(model.bands.length, 0, context + ' no invented clinical score bands')
        assert.match(reading.caution, locale === 'ru' ? /не означает уровень тяжести/ : /None of these intervals indicates severity/)
      } else if (reading.clusterBasis) {
        assert.ok(definition.key.startsWith('hh-'), context + ' author-only scoring')
        assert.ok(['source-answer-anchors','attainable-score-positions'].includes(reading.clusterBasis), context)
        assert.ok(reading.sourceQuestions?.length > 0, context + ' subscale source items')
        assert.equal(reading.rows[0].from, dimension.min, context)
        assert.equal(reading.rows.at(-1).to, dimension.max, context)
        assert.ok(reading.scoringNote?.length > 50, context)
        assert.equal(model.bands.length, 0, context + ' no invented clinical sectors')
        assert.ok(reading.rows.length >= 2 && reading.rows.length <= 7, context)
      } else if (reading.kind === 'published') {
        assert.equal(reading.rows.length, model.bands.length, context)
        assert.deepEqual(reading.rows.map(row => row.code), model.bands.map(row => row.code))
      } else if (reading.kind === 'source-options') {
        assert.equal(reading.rows.length, model.answerBands.length, context)
      } else if (reading.kind === 'descriptive') {
        assert.equal(reading.rows.length, 5, context)
        assert.deepEqual(model.bands, [], context + ' editorial sectors are not validated source bands')
        assert.match(reading.caution, locale === 'ru' ? /не проверенные нормы/ : /not validated norms/)
      } else if (reading.kind === 'ordinal') {
        assert.equal(dimension.key, 'function.hrqol4.general_health', context)
        assert.equal(reading.rows.length, 5, context)
      } else {
        assert.equal(reading.kind, 'continuous', context)
        assert.equal(reading.rows.length, 1, context + ' no invented cutoffs')
      }
      count[reading.kind] += 1
    }
    assert.equal(JSON.stringify(scored), saved, 'Report rendering must not alter persisted results')
  }
  assert.ok(count.published > 0)
  assert.ok(count['source-options'] > 0)
  assert.ok(count.descriptive > 0)
  assert.ok(count.ordinal > 0)
  assert.ok(count.continuous > 0)
  assert.ok(count['historical-mixed'] > 0)
})

test('published source categories and borderline transitions use exact interval, meaning and scope', () => {
  const cases = [
    ['phq-9', 'symptoms.phq9.total', [[0,4,'minimal'],[5,9,'mild'],[10,14,'moderate'],[15,19,'moderately_severe'],[20,27,'severe']]],
    ['gad-7', 'symptoms.gad7.total', [[0,4,'minimal'],[5,9,'mild'],[10,14,'moderate'],[15,21,'severe']]],
    ['brcs', 'resources.brcs.total', [[4,13,'low_coping'],[14,16,'mid_coping'],[17,20,'high_coping']]],
  ]
  for (const [key,dimensionKey,intervals] of cases) {
    const definition = getAssessmentDefinition(key,'v1','en')
    const record = score(definition)
    for (const locale of ['ru','en']) {
      const dimension = record.dimensions.find(item => item.key === dimensionKey)
      const model = gaugeModel(dimension, record, locale)
      assert.equal(model.rangeReading.kind,'published')
      assert.deepEqual(model.rangeReading.rows.map(row => row.displayRange),
        intervals.map(row=>row[0]+'–'+row[1]))
      for (const row of model.rangeReading.rows) {
        assert.ok(row.note.length > 70, key+'/'+row.code+'/'+locale)
        assert.ok(!/categorical.*diagnosis|клинический диагноз подтвержден/.test(row.note))
      }
    }
  }
})

test('CBI score 45.83 / 100 shows level 3 of five with an actual exhaustion narrative', () => {
  const definition=getAssessmentDefinition('cbi-personal','v1','en')
  const answers=[3,2,2,2,1,1]
  const result=scoreAssessment(definition,Object.fromEntries(definition.questions.map((q,i)=>[q.id,answers[i]])))
  const dimension=result.dimensions[0]
  assert.ok(Math.abs(dimension.value-45.83)<0.02)
  for(const locale of ['en','ru']){
    const reading=gaugeModel(dimension,result,locale).rangeReading
    assert.equal(reading.kind,'descriptive')
    assert.equal(reading.rows.length,5)
    assert.equal(reading.rows.findIndex(b=>b.current),2)
    assert.equal(reading.current.displayRange,'40–<60')
    assert.match(reading.narrative,locale==='ru'?/усталост|истощени/:/tiredness|exhaustion/)
  }
})

test('personality typologies expose response-linked traits without asserting a fixed type',()=>{
  for(const key of ['hh-socionics-32','hh-enneagram-36','hh-disc-style-20','hh-temperaments-16']){
    for(const locale of ['en','ru']){
      const result=score(getAssessmentDefinition(key,'v1',locale),.5)
      const report=buildAssessmentResultReport(result,locale)
      assert.ok(report.personalityType,key+'/'+locale)
      for(const dimension of result.dimensions){
        const reading=gaugeModel(dimension,result,locale).rangeReading
        assert.ok(reading.trait,key+'/'+dimension.key)
        assert.equal(reading.kind,'source-options')
        assert.equal(reading.clusterBasis,'source-answer-anchors')
        assert.equal(reading.rows.length,5)
        assert.ok(reading.sourceQuestions?.length > 0)
        assert.ok(reading.contextual?.length > 90,key+'/'+dimension.key)
        assert.ok(reading.directionNote.includes(locale==='ru'?'личност':'personality'))
      }
    }
  }
})

test('never attach clinical or directional levels to mixed historical totals, counts or calibrated scores',()=>{
  for (const [key,expected] of [
    ['hh-money-pressure','historical-mixed'],
    ['hh-overthinking-loop','historical-mixed'],
    ['hh-screen-saturation','historical-mixed'],
    ['cfpb-financial-wellbeing-5','continuous'],
    ['cdc-healthy-days-symptoms','continuous'],
  ]) {
    const def=getAssessmentDefinition(key,'v1',key.startsWith('hh-')?'ru':'en')
    const result=score(def)
    for(const dimension of result.dimensions){
      const reading=gaugeModel(dimension,result,'ru').rangeReading
      assert.equal(reading.kind,expected,key+'/'+dimension.key)
      assert.equal(reading.rows.length,expected==='historical-mixed'?5:1)
      assert.equal(reading.rows.filter(row=>row.current).length,1)
      if(expected==='historical-mixed') {
        assert.equal(reading.rows[0].from,0)
        assert.equal(reading.rows.at(-1).to,4)
        assert.match(reading.caution,/не означает уровень тяжести/)
      }
      assert.doesNotMatch(reading.caution,/клинический уровень\s+(сильный|умеренный)/)
    }
  }
  const verified=score(getAssessmentDefinition('phq-4','v1','en'))
  const modified={...verified,contentHash:'wrong'}
  for(const dimension of modified.dimensions){
    assert.equal(gaugeModel(dimension,modified),null)
  }
})

test('rendered reports clearly show selected range, all interval labels, conditional meaning and authentic personality hypothesis',()=>{
  const ui=readFileSync(new URL('../components/app/compact-assessment-report.jsx',import.meta.url),'utf8')
  const css=readFileSync(new URL('../components/app/compact-assessment-report.module.css',import.meta.url),'utf8')
  assert.match(ui,/data-assessment-range-report/)
  assert.match(ui,/data-current-score-range/)
  assert.match(ui,/data-all-score-ranges/)
  assert.match(ui,/data-selected-score-range/)
  assert.match(ui,/data-range-characterization/)
  assert.match(ui,/data-score-range-descriptions/)
  assert.match(ui,/rangeReading\.rows\.map/)
  assert.match(ui,/data-personality-scale-characterization/)
  assert.match(ui,/data-personality-type-summary/)
  assert.match(css,/\.rangeMap\{[^}]*grid-template-columns/s)
  assert.match(css,/@media\(max-width:570px\)/)
  assert.match(css,/\.rangeMap li\[data-selected-score-range\]/)
})
