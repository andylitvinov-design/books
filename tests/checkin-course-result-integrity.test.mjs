import test from 'node:test'
import assert from 'node:assert/strict'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { verifiedHistoryResult } from '../lib/assessments/verified-history.js'
import { buildAntistressWeeklyCheckpoint } from '../lib/inner-growth/anti-stress-weekly-checkpoint.js'
import { buildFinalCourseRetest, compareFinalCourseTests } from '../lib/inner-growth/course-final-retest.js'

// Synthetic data only. No client responses, real account IDs or private history.
const definition=getAssessmentDefinition('hh-weekly-pulse','v1','en')
const original=(id,measurementAt,tension=5)=>({
  ...scoreAssessment(definition,Object.fromEntries(definition.questions.map(q=>[
    q.id,q.id==='weekly.tension'?tension:5,
  ]))),
  id,accountId:'synthetic-account',measurementAt,
})
const base=original('baseline','2026-10-13T11:50:00.000Z',7)
const later=original('day-eight','2026-10-22T12:00:00.000Z',4)
const tamper=source=>({...source,contentHash:'sha256:tampered'})
const badScore=source=>({...source,dimensions:source.dimensions.map((d,i)=>
  i===1?{...d,value:99}:d)})
const checkpoint=(results,extra={})=>buildAntistressWeeklyCheckpoint({
  startedAt:'2026-10-13T12:00:00.000Z', completedLessons:8,
  testKeys:['hh-weekly-pulse'],results,now:'2026-10-24T13:00:00.000Z',
  startable:true,rightsStatus:'cleared',requireVerifiedResults:true,...extra,
})
const metadata=[{key:'hh-weekly-pulse',version:'v1',title:'Weekly Wellbeing Check-in',
  startable:true,rightsStatus:'cleared',suggestedRepeatDays:7}]
const final=(results,extra={})=>buildFinalCourseRetest({
  testKeys:['hh-weekly-pulse'],metadata,results,
  startedAt:'2026-10-13T12:00:00.000Z',
  completedAt:'2026-10-26T18:00:00.000Z',
  now:'2026-10-30T13:00:00.000Z',
  antiStress:true,requireVerifiedResults:true,...extra,
})

test('real immutable weekly results complete the week-one checkpoint',()=>{
  assert.equal(verifiedHistoryResult(base),true)
  assert.equal(verifiedHistoryResult(later),true)
  const state=checkpoint([base,later])
  assert.equal(state.completed,true)
  assert.equal(state.reason,'complete')
  assert.equal(state.baselineResultId,base.id)
  assert.equal(state.afterResultId,later.id)
  assert.equal(state.verificationRequired,false)
})

test('latest impossible result cannot hide behind an older valid week-one measurement',()=>{
  const changed=badScore(original('corrupted','2026-10-23T12:00:00.000Z',1))
  assert.equal(verifiedHistoryResult(changed),false)
  const state=checkpoint([base,later,changed])
  assert.equal(state.completed,false)
  assert.equal(state.afterResultId,null)
  assert.equal(state.verificationRequired,true)
  assert.equal(state.canStart,true)
  assert.equal(state.reason,'due')
})

test('invalid latest baseline cannot be replaced with an older good result',()=>{
  const older=original('older-baseline','2026-10-10T11:00:00.000Z')
  const latest=badScore(original('bad-baseline','2026-10-13T11:55:00.000Z'))
  const state=checkpoint([older,latest,later])
  assert.equal(state.completed,false)
  assert.equal(state.canStart,false)
  assert.equal(state.reason,'no_baseline')
  assert.equal(state.verificationRequired,true)
})

test('future observations are never counted as current weekly retests',()=>{
  const future=original('future','2026-11-15T12:00:00.000Z')
  const state=checkpoint([base,future])
  assert.equal(state.completed,false)
  assert.equal(state.afterResultId,null)
})

test('source-authentic full course retest uses compatible dimensions and explicitly descriptive differences',()=>{
  const retest=original('final','2026-10-27T19:00:00.000Z',3)
  const out=final([base,retest])
  assert.equal(out.completedCount,1)
  assert.equal(out.fullyRetested,true)
  assert.equal(out.tests[0].verificationRequired,false)
  assert.equal(out.tests[0].afterResultId,'final')
  assert.ok(out.tests[0].comparison?.some(row=>row.key==='weekly.tension'&&row.from===7&&row.to===3&&row.delta===-4))
  assert.equal(out.tests[0].comparison?.every(row=>row.pValue===undefined),true)
})

test('the newest corrupted final attempt invalidates completion without deleting older score',()=>{
  const good=original('final-good','2026-10-27T19:00:00.000Z',3)
  const bad=tamper(original('final-bad','2026-10-29T19:00:00.000Z',2))
  const out=final([base,good,bad])
  assert.equal(out.completedCount,0)
  assert.equal(out.fullyRetested,false)
  assert.equal(out.tests[0].completed,false)
  assert.equal(out.tests[0].afterResultId,null)
  assert.equal(out.tests[0].comparison,null)
  assert.equal(out.tests[0].verificationRequired,true)
  assert.equal(out.tests[0].canRepeat,true)
})

test('a corrupted baseline is never used to calculate a course change',()=>{
  const older=original('older','2026-10-10T11:00:00.000Z')
  const newest=tamper(base)
  const retest=original('final','2026-10-27T19:00:00.000Z',3)
  const out=final([older,newest,retest])
  assert.equal(out.tests[0].baselineResultId,null)
  assert.equal(out.tests[0].completed,false)
  assert.equal(out.tests[0].comparison,null)
  assert.equal(out.tests[0].verificationRequired,true)
})

test('different unit or construct metadata cannot be treated as matching measured axes',()=>{
  const retest=original('final','2026-10-27T19:00:00.000Z',3)
  const altered={...retest,dimensions:retest.dimensions.map((d,i)=>
    i===0?{...d,unit:'different-unit'}:d)}
  assert.equal(verifiedHistoryResult(altered),false)
  const out=final([base,altered])
  assert.equal(out.tests[0].completed,false)
  assert.equal(out.tests[0].verificationRequired,true)
  assert.equal(compareFinalCourseTests(base,altered,8,{requireVerifiedResults:true}),null)
})

test('signed-in course endpoint verifies owner-scoped dimensions before weekly and final reporting',async()=>{
  const {readFile}=await import('node:fs/promises')
  const source=await readFile(new URL('../lib/app/growth-daily.js',import.meta.url),'utf8')
  assert.match(source,/select id,provenance,dimensions,measurement_at from app\.assessment_results where account_id=\$1/)
  assert.match(source,/results:weeklyRows\.map\(row=>\(\{/)
  assert.match(source,/id:row\.id,\.\.\.row\.provenance,dimensions:row\.dimensions/)
  assert.equal((source.match(/requireVerifiedResults:true/g)||[]).length,2)
  assert.match(source,/const weeklyLast=usesOporaOutcomeChecks&&newestWeeklyRow&&/)
  assert.match(source,/verifiedHistoryResult\(\{id:newestWeeklyRow\.id/)
  assert.match(source,/due:weeklyLast\?nextDue\?\.getTime\(\)<=Date\.now\(\):true/)
})
