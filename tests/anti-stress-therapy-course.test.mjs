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

test('personal meditation is based on explicitly confirmed tried resource only',()=>{
 const base=[row('practice_consent','accepted'),row('practice_status','attempted'),row('resource_kind','imagery'),row('resource_selected','quiet shore'),row('resource_response','comfortable'),row('meditation_consent','accepted')]
 for(const locale of ['en','ru','es']){
  const m=antiStressResult(id,base,locale).meditation
  assert.equal(m.status,'draft');assert.equal(m.language,locale);assert.match(m.body,/quiet shore/)
  assert.deepEqual(m.sourceFieldIds,['resource_selected'])
  assert.deepEqual(m.gateEvidenceIds,['verified-practice_consent','verified-practice_status','verified-resource_kind','verified-resource_response','verified-meditation_consent'])
 }
 assert.equal(antiStressResult(id,base.filter(x=>x.fieldId!=='meditation_consent')).meditation.body,null)
 for(const [field,value] of [['resource_response','uncomfortable'],['practice_status','stopped'],['practice_consent','declined'],['meditation_consent','declined']]){
  assert.equal(antiStressResult(id,base.map(r=>r.fieldId===field?{...r,value}:r)).meditation.body,null)
 }
 assert.equal(antiStressResult(id,[...base,row('resource_selected','duplicate')]).meditation.body,null)
 assert.equal(antiStressResult(id,base.map(r=>r.fieldId==='resource_selected'?{...r,reviewed:false}:r)).meditation.body,null)
 const nonvisual=base.map(r=>r.fieldId==='resource_kind'?{...r,value:'nonvisual'}:r.fieldId==='resource_selected'?{...r,value:'chair contact'}:r)
 assert.match(antiStressResult(id,nonvisual).meditation.body,/chair contact/)
 assert.equal(antiStressResult(ANTI_STRESS_SESSION_IDS[1]).meditation,undefined)
 assert.ok(antiStressScenario(ANTI_STRESS_SESSION_IDS[1]).fields.some(f=>f.id==='calm_steps'))
 assert.ok(antiStressScenario(ANTI_STRESS_SESSION_IDS[2]).fields.some(f=>f.id==='low_energy_option'))
})

test('meditation uses only confirmed optional sensory details, quality and phrase',()=>{
 const base=[row('practice_consent','accepted'),row('practice_status','attempted'),row('resource_kind','imagery'),row('resource_selected','quiet shore'),row('resource_response','comfortable'),row('meditation_consent','accepted'),row('resource_details','warm stone'),row('resource_quality','steadiness'),row('resource_phrase','I can rest',{reviewed:false})]
 const m=antiStressResult(id,base).meditation
 assert.match(m.body,/warm stone/);assert.match(m.body,/steadiness/);assert.ok(!m.body.includes('I can rest'))
 assert.deepEqual(m.sourceFieldIds,['resource_selected','resource_details','resource_quality'])
 assert.deepEqual(m.sourceEvidenceIds,['verified-resource_selected','verified-resource_details','verified-resource_quality'])
})

test('ambiguous shared evidence cannot create a personal meditation',()=>{
 const base=[row('practice_consent','accepted'),row('practice_status','attempted'),row('resource_kind','imagery'),row('resource_selected','quiet shore'),row('resource_response','comfortable'),row('meditation_consent','accepted',{evidenceId:'verified-resource_selected'})]
 assert.equal(antiStressResult(id,base).meditation.body,null)
})

import {antiStressProgressProjection} from '../lib/coaching/anti-stress-progress.mjs'
test('all therapy progress groups and archive rows use the same exact session scenario, never the clock as answer evidence',()=>{
 for(const sessionId of ANTI_STRESS_SESSION_IDS)for(const locale of ['en','ru','es']){
  const s=antiStressScenario(sessionId,locale),selection={runId:'run',protocolId:'protocol',sessionId},binding={programType:'therapy',courseRunId:'run',protocolId:'protocol',sessionId,scenarioVersion:s.version}
  const run={id:'run',programType:'therapy',days:Array.from({length:3},(_,i)=>i===s.number-1?{protocolId:'protocol',sessionId}:{})}
  const make=rows=>({binding,run,reviewRevision:1,protocol:{binding,rows}})
  const empty=antiStressProtocolRows(sessionId,[],locale),unloaded=antiStressProgressProjection({selection,locale,elapsedMs:900000})
  assert.equal(unloaded.minuteDots,15);assert.equal(unloaded.elapsedMinutes,15);assert.equal(unloaded.available,false);assert.ok(unloaded.groups.every(g=>g.tone==='gray'))
  const p=antiStressProgressProjection({selection,locale,data:make(empty),elapsedMs:900000})
  assert.equal(p.groups.length,6);assert.deepEqual(p.groups.map(g=>g.label),s.stages.map(g=>g.label));assert.deepEqual(p.groups.flatMap(g=>g.children.map(f=>f.fieldId)),s.fields.map(f=>f.id));assert.ok(p.groups.every(g=>g.tone==='gray'))
  const ledger=s.fields.map(f=>({fieldId:f.id,scenarioVersion:s.version,reviewed:true,evidenceId:'e-'+f.id,status:'confirmed',value:f.kind==='rating'?0:f.kind==='choice'?f.choices[0]:'A client statement'}))
  const rows=antiStressProtocolRows(sessionId,ledger,locale),complete=antiStressProgressProjection({selection,locale,data:make(rows)})
  assert.ok(complete.groups.slice(1).every(g=>g.tone==='green'));assert.equal(complete.groups[0].tone,'gray');assert.equal(complete.groups.flatMap(g=>g.children).find(r=>r.fieldId==='stress_before').value,0)
  assert.equal(antiStressProgressProjection({selection,locale,data:make([...rows,rows[0]])}),null)
  assert.equal(antiStressProgressProjection({selection,locale,data:{...make(rows),binding:{...binding,protocolId:'other'}}}),null)
  assert.equal(antiStressProgressProjection({selection,locale,data:{...make(rows),reviewRevision:0}}),null)
 }
})
