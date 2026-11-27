import test from 'node:test'
import assert from 'node:assert/strict'
import {COACH_PROGRAM_TYPES,coachProgramSettings,coachProgramModeInstruction,ANTI_STRESS_PROGRAM_ID,ANTI_STRESS_SESSION_IDS} from '../lib/coaching/coach-program-mode.mjs'
import {ANTI_STRESS_COURSE,antiStressScenario,antiStressTimeGuidance,antiStressLiveInstruction,antiStressProtocolRows,antiStressResult,antiStressDirective,antiStressCourseResult} from '../lib/coaching/anti-stress-course.mjs'
test('program mode is server catalog-owned and old programs retain coaching',()=>{
 assert.deepEqual(COACH_PROGRAM_TYPES,['coaching','therapy'])
 for(const id of [null,'clarity','clarity-three-day','goal','business'])assert.equal(coachProgramSettings(id).type,'coaching')
 assert.equal(coachProgramSettings(ANTI_STRESS_PROGRAM_ID).type,'therapy')
 assert.throws(()=>coachProgramSettings('therapy'))
 assert.match(coachProgramModeInstruction(ANTI_STRESS_PROGRAM_ID),/Safety, consent and client pace override/)
})
test('all three localized scenarios have exact timing and one versioned protocol field registry',()=>{
 assert.equal(ANTI_STRESS_COURSE.durationSeconds,2700)
 for(const id of ANTI_STRESS_SESSION_IDS)for(const locale of ['en','ru','es']){
  const s=antiStressScenario(id,locale)
  assert.equal(s.durationSeconds,900)
  assert.equal(s.minuteDots,15)
  assert.equal(s.programType,'therapy')
  assert.deepEqual(s.stages.map(x=>[x.from,x.to]),[[0,120],[120,240],[240,360],[360,660],[660,780],[780,900]])
  assert.equal(s.fields.length,new Set(s.fields.map(f=>f.id)).size)
  assert.ok(s.fields.every(f=>f.question&&f.label&&s.stages.some(x=>x.id===f.stage)))
  assert.ok(s.fields.some(f=>f.id==='practice_consent'))
  assert.ok(s.fields.some(f=>f.id==='practice_status'))
  for(const n of [0,119,120,239,240,359,360,659,660,779,780,899,900])assert.ok(antiStressTimeGuidance(id,n,locale))
  assert.match(antiStressLiveInstruction(id,locale),/THERAPY-ORIENTED SELF-REGULATION/)
  assert.match(antiStressTimeGuidance(id,900,locale),/No new questions/)
 }
 assert.equal(antiStressScenario('unknown'),null)
})
const id=ANTI_STRESS_SESSION_IDS[0]
const row=(fieldId,value,extra={})=>({fieldId,value,scenarioVersion:antiStressScenario(id).version,reviewed:true,evidenceId:'verified-'+fieldId,status:'confirmed',...extra})
test('results contain only confirmed exact-version rows; absence is not zero or success',()=>{
 const empty=antiStressResult(id)
 assert.deepEqual(empty.stress,{before:null,after:null,change:null,scale:[0,10],selfReported:true})
 assert.equal(empty.practiceStatus,null)
 assert.equal(empty.partial,true)
 const ledger=[row('stress_before',7),row('stress_after',8),row('skill_confidence',0),row('ground_anchor','chair'),row('practice_status','attempted')]
 let result=antiStressResult(id,ledger)
 assert.equal(result.stress.change,1)
 assert.equal(result.confidence,0)
 assert.equal(result.chosenResource,'chair')
 assert.equal(result.practiceStatus,null)
 result=antiStressResult(id,[...ledger,row('practice_consent','accepted')])
 assert.equal(result.practiceStatus,'attempted')
 for(const invalid of [row('stress_before',11),row('stress_before','7'),row('stress_before',7,{reviewed:false}),row('stress_before',7,{scenarioVersion:'other'}),row('stress_before',7,{evidenceId:''})]){
  assert.equal(antiStressResult(id,[invalid]).stress.before,null)
 }
 assert.equal(antiStressResult(id,[row('stress_before',7),row('stress_before',7)]).stress.before,null)
 const skipped=antiStressProtocolRows(id,[row('stress_before',null,{status:'skipped'})]).find(r=>r.fieldId==='stress_before')
 assert.equal(skipped.status,'skipped')
 assert.equal(skipped.value,null)
 assert.equal(antiStressCourseResult({[id]:ledger}).sessions[1].stress.before,null)
})
test('therapy Director gives priority to safety, autonomy and consent over clock',()=>{
 const ctx={safetyState:'clear',sessionConsent:'accepted',practiceConsent:'accepted',elapsedSeconds:360,connected:true}
 const act=extra=>antiStressDirective(id,{...ctx,...extra}).action
 assert.equal(act({safetyState:'crisis',clientRequest:'stop'}),'existing-safety-path')
 assert.equal(act({safetyState:undefined}),'assess-safety')
 assert.equal(act({clientRequest:'stop'}),'stop-with-support')
 assert.equal(act({paused:true}),'hold')
 assert.equal(act({connected:false}),'hold')
 assert.equal(act({sessionConsent:undefined}),'invite-explicit-start')
 assert.equal(act({elapsedSeconds:null}),'hold')
 assert.equal(act({distressIncreased:true}),'stop-practice-and-offer-support')
 assert.equal(act({elapsedSeconds:900}),'gentle-close')
 assert.equal(act({clientRequest:'slow'}),'reflect-and-wait')
 assert.equal(act({practiceConsent:'declined'}),'respect-skip')
 assert.equal(act({practiceConsent:undefined}),'invite-practice-consent')
 assert.equal(act({}),'guide-one-cue-and-wait')
})
