import test from 'node:test'
import assert from 'node:assert/strict'
import {createClarityRun,beginFreeClarityRun,advanceClarityRun,clarityRunSummary,clarityRunNotes,clarityRunScopeTag,validateClarityRun} from '../lib/coaching/clarity-course-runs.mjs'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const input=(n,access,ordinal)=>({id:id(n),access,ordinal,protocolIds:[id(n+1),id(n+2),id(n+3)],createdAt:0})
function event(run,day,type,atMs,{seg=50,coachId='mira',decision='start',turn='consent:'+seg}={}){
 const protocolId=run.protocolIds[day-1],connectionId=id(seg+100)
 return {courseRunId:run.id,expectedRevision:run.clock?.revision||0,day,type,atMs,protocolId,segmentId:id(seg),connectionId,coachId,
  ...(type==='begin'?{consent:{kind:'explicit_client_session_consent',decision,protocolId,connectionId,coachId,atMs,turnId:turn}}:{evidence:type==='observe'?'server_observed_connected':'server_observed_stop'})}
}
function tick(run,day,start,duration,seg=50){for(let t=10000;t<=duration;t+=10000)run=advanceClarityRun(run,event(run,day,'observe',start+t,{seg}));return run}
test('first run is created only with actual first begin; no premature enrollment',()=>{
 const data=input(1,'free',1),begin=event(data,1,'begin',0)
 assert.throws(()=>beginFreeClarityRun(data,{...begin,consent:true}),/NOT_AUTHORIZED/)
 assert.throws(()=>beginFreeClarityRun(data,event(data,2,'begin',0)),/INVALID/)
 const run=beginFreeClarityRun(data,begin)
 assert.equal(run.clock.days[0].status,'active')
 assert.equal(clarityRunSummary(run).status,'in_progress')
 assert.equal(clarityRunSummary(run).days.length,3)
 assert.throws(()=>createClarityRun(input(10,'free',2)),/INVALID/)
})
test('two independent runs, 7 + 13 minutes, coach change, no reset or cross-run mutation',()=>{
 const d=input(1,'free',1),paid=createClarityRun(input(10,'paid',2))
 let run=beginFreeClarityRun(d,event(d,1,'begin',0))
 run=tick(run,1,0,420000)
 run=advanceClarityRun(run,event(run,1,'disconnect',420000))
 assert.equal(clarityRunSummary(run).days[0].remainingMs,780000)
 assert.equal(clarityRunSummary(paid).totalElapsedMs,0)
 assert.throws(()=>advanceClarityRun(paid,event(run,1,'begin',430000)),/CONFLICT/)
 assert.throws(()=>advanceClarityRun(run,{...event(run,1,'begin',430000,{seg:51,decision:'continue'}),protocolId:paid.protocolIds[0]}),/CONFLICT/)
 run=advanceClarityRun(run,event(run,1,'begin',430000,{seg:51,coachId:'caesar',decision:'continue'}))
 run=tick(run,1,430000,780000,51)
 assert.equal(run.clock.days[0].protocolId,d.protocolIds[0])
 assert.equal(run.clock.days[0].segments[1].coachId,'caesar')
 assert.equal(clarityRunSummary(run).totalElapsedMs,1200000)
 assert.equal(clarityRunSummary(run).currentDay,2)
 assert.throws(()=>advanceClarityRun(run,event(run,2,'begin',1210000,{seg:52})),/DAILY_SESSION_LIMIT/)
 assert.equal(clarityRunSummary(paid).status,'ready')
})
test('paid run never uses a free slot; all three sessions cap at sixty minutes',()=>{
 let run=createClarityRun(input(10,'paid',2))
 for(let day=1;day<=3;day++){
  const at=(day-1)*1200000,seg=60+day
  run=advanceClarityRun(run,event(run,day,'begin',at,{seg}))
  run=tick(run,day,at,1200000,seg)
 }
 assert.equal(clarityRunSummary(run).totalElapsedMs,3600000)
 assert.equal(clarityRunSummary(run).status,'completed')
 assert.throws(()=>advanceClarityRun(run,event(run,3,'begin',3600000)),/CONFLICT/)
 assert.throws(()=>validateClarityRun({...run,access:'free',ordinal:1}),/INVALID/)
 assert.throws(()=>validateClarityRun({...run,protocolIds:[id(1),id(2),id(3)]}),/INVALID/)
})
test('journal scope isolates both runs and keeps ambiguous and legacy notes separate',()=>{
 const a=id(1),b=id(10),notes=[{id:'a',tags:[clarityRunScopeTag(a),'clarity-game-v1-1-1']},{id:'b',tags:[clarityRunScopeTag(b)]},{id:'old',tags:['clarity-game-v1-1-1']},{id:'ambiguous',tags:[clarityRunScopeTag(a),clarityRunScopeTag(b)]}]
 assert.equal(clarityRunScopeTag(a).length,39)
 assert.deepEqual(clarityRunNotes(notes,a).map(n=>n.id),['a'])
 assert.deepEqual(clarityRunNotes(notes,b).map(n=>n.id),['b'])
 assert.deepEqual(clarityRunNotes(notes).map(n=>n.id),['old'])
 assert.throws(()=>clarityRunScopeTag('wrong'),/INVALID/)
})
