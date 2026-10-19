import test from 'node:test'
import assert from 'node:assert/strict'
import { HH_CORE_CHECKIN_DEFINITIONS as definitions } from '../data/assessments/hh-core-checkins-v3.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { compareResults, validateResult, createProfileSnapshot } from '../lib/profile/history.js'
import { buildProfileSummary } from '../lib/profile/summary.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { gaugeModel, gaugeChange } from '../lib/assessments/dashboard-gauges.js'
import { buildTestDynamicsGroups } from '../lib/assessments/test-dynamics.js'
import { resultChangeSummary, practicalReflection, latestScoreObservation } from '../lib/assessments/personal-guidance.js'
import { checkinComparisonRows, checkinTrendResults, savedCheckinProfile } from '../lib/assessments/checkin-result-analysis.js'
const accountId='10000000-0000-4000-8000-000000000001'
const subject=new Set(['state.problem_intensity','state.current_interference'])
function result(definition,value,n=1){return {id:`20000000-0000-4000-8000-${String(n).padStart(12,'0')}`,accountId,measurementAt:`2026-10-${String(n).padStart(2,'0')}T12:00:00.000Z`,...scoreAssessment(definition,Object.fromEntries(definition.questions.map(q=>[q.id,value])))}}
for(const definition of definitions) {
 test(`${definition.key}/${definition.instrumentLocale}: real scorer/report/history/profile/dynamics chain`,()=>{
  const prior=result(definition,0),current=result(definition,definition.questions[0].max,2)
  assert.equal(validateResult(current),current)
  const expected=current.dimensions.filter(d=>!subject.has(d.key))
  assert.deepEqual(compareResults(current,prior).map(d=>d.key),expected.map(d=>d.key))
  assert.deepEqual(resultChangeSummary(current,[prior,current]).changes.map(d=>d.key),expected.map(d=>d.key))
  for(const locale of ['en','ru']) {
   const report=buildAssessmentResultReport(current,locale)
   assert.equal(report.verified,true);assert.equal(report.reportKind,'checkin-facets')
   assert.deepEqual(report.sections.map(s=>[s.key,s.value]),current.dimensions.map(d=>[d.key,d.value]))
   assert.equal(report.completeness.complete,true)
   assert.ok(report.sections.every(s=>s.band===null&&s.recommendedReview===false&&s.steps.length===0))
   const group=buildTestDynamicsGroups([prior,current],locale).groups[0]
   for(const dimension of current.dimensions){
    const gauge=gaugeModel(dimension,current,locale)
    assert.equal(gauge.displayKind,'checkin-observation');assert.equal(gauge.fraction,null);assert.deepEqual(gauge.bands,[])
    assert.deepEqual(gauge.anchors,definition.questions.find(q=>q.id===dimension.key).anchors)
    const scale=group.scales.find(s=>s.key===dimension.key)
    assert.equal(scale.track.length,subject.has(dimension.key)?1:2)
    assert.equal(scale.delta,subject.has(dimension.key)?null:dimension.value)
    assert.equal(gaugeChange(current,prior,dimension.key).state,subject.has(dimension.key)?'baseline':'changed')
    assert.equal(checkinTrendResults([prior,current],current,dimension.key).length,subject.has(dimension.key)?1:2)
   }
   assert.match(practicalReflection([prior,current],locale),locale==='ru'?/Выберите аспект/:/Choose the aspect/)
   assert.match(latestScoreObservation([prior,current],locale),locale==='ru'?/по аспектам/:/by aspect/)
  }
  const snapshot=createProfileSnapshot({id:'30000000-0000-4000-8000-000000000001',accountId,generatedResult:current,createdAt:current.measurementAt})
  const summary=buildProfileSummary({snapshot,results:[prior,current]})
  assert.equal(summary.rows.length,current.dimensions.length)
  for(const row of summary.rows){assert.equal(row.currentPercent,null);assert.equal(row.priorPercent,null);assert.equal(row.delta,subject.has(row.key)?null:row.value)}
 })
 test(`${definition.key}/${definition.instrumentLocale}: incompatible and malformed source cannot acquire interpretation or delta`,()=>{
  const prior=result(definition,0),current=result(definition,1,2)
  const mutations=[r=>({...r,contentHash:'sha256:bad'}),r=>({...r,definitionId:'40000000-0000-4000-8000-000000000001'}),r=>({...r,instrumentLocale:'xx'}),r=>({...r,dimensions:r.dimensions.slice(1)}),r=>({...r,dimensions:r.dimensions.map((d,i)=>i?d:{...d,value:null})}),r=>({...r,dimensions:r.dimensions.map((d,i)=>i?d:{...d,value:0.5})}),r=>({...r,dimensions:[r.dimensions[0],...r.dimensions.slice(0,-1)]})]
  for(const mutate of mutations){const forged=mutate(current);assert.equal(savedCheckinProfile(forged),null);assert.equal(buildAssessmentResultReport(forged).verified,false);assert.deepEqual(checkinComparisonRows(forged,prior),[]);assert.equal(gaugeModel(forged.dimensions[0],forged),null)}
  for(const other of [{...prior,accountId:'10000000-0000-4000-8000-000000000002'},{...prior,measurementAt:current.measurementAt},{...prior,measurementAt:'2026-10-03T12:00:00.000Z'},{...prior,measurementAt:'2026-10-01'}])assert.deepEqual(checkinComparisonRows(current,other),[])
  const foreign=definitions.find(d=>d.key===definition.key&&d.instrumentLocale!==definition.instrumentLocale)
  assert.deepEqual(checkinComparisonRows(current,result(foreign,0)),[])
 })
}

test('malformed dimensions fail closed before gauge lookup',()=>{
 const current=result(definitions[0],1,2)
 for(const dimensions of [null,{},'bad',[null,...current.dimensions.slice(1)],[undefined,...current.dimensions.slice(1)],new Array(current.dimensions.length)]){
  const forged={...current,dimensions};assert.equal(gaugeModel(current.dimensions[0],forged),null);assert.equal(savedCheckinProfile(forged),null);assert.equal(buildAssessmentResultReport(forged).verified,false)
 }
})
