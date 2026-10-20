import test from 'node:test'
import assert from 'node:assert/strict'
import {TANTRIC_REFLECTION_DEFINITIONS} from '../data/assessments/tantric-reflections-v1.js'
import {scoreAssessment} from '../lib/assessments/scoring.js'
import {interpretationBandModel,interpretationDimensionPlan} from '../lib/assessments/interpretation-registry.js'
import {gaugeChange} from '../lib/assessments/dashboard-gauges.js'
test('all 12 registered Tantric definitions retain scale-specific descriptive five-level matrices and neutral trends',()=>{
 for(const def of TANTRIC_REFLECTION_DEFINITIONS){
  const score=value=>scoreAssessment(def,Object.fromEntries(def.questions.map(q=>[q.id,value])))
  const low=score(0),mid=score(2),high=score(4)
  for(const d of mid.dimensions){
   for(const locale of ['en','ru']){
    const model=interpretationBandModel(mid,d,locale),plan=interpretationDimensionPlan(mid,d.key)
    assert.equal(model.basis,'descriptive');assert.deepEqual(model.bands,[]);assert.equal(model.currentBand,null)
    assert.equal(model.answerBands.length,5)
    assert.equal(model.currentAnswerBand.label,def.responseAnchors[2])
    assert.equal(model.currentAnswerBand.levelLabel,locale==='ru'?'Зависит от ситуации':'Depends on context')
    for(const band of model.answerBands){
     assert.ok(band.note.includes(plan.label[locale]));assert.equal(band.optionalPractice,plan.step[locale]);assert.ok(band.levelLabel)
    }
    assert.match(model.answerBands[0].note,locale==='ru'?/не недостаток или диагноз/:/not a defect or diagnosis/)
    assert.match(model.answerBands[4].note,locale==='ru'?/не духовный уровень/:/not a spiritual rank/)
   }
   const earlier=r=>({...r,accountId:'synthetic',measurementAt:'2026-10-01T12:00:00Z'})
   const later=r=>({...r,accountId:'synthetic',measurementAt:'2026-10-02T12:00:00Z'})
   assert.equal(gaugeChange(later(high),earlier(low),d.key).state,'changed')
   assert.equal(gaugeChange(later(low),earlier(high),d.key).state,'changed')
   assert.equal(gaugeChange(later(mid),earlier(mid),d.key).state,'unchanged')
  }
 }
})
