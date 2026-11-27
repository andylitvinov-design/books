import test from 'node:test'
import assert from 'node:assert/strict'
import {createClarityCourseClock,validateClarityCourseClock} from '../lib/coaching/clarity-course-clock.mjs'
import {createAntiStressCourseClock,validateAntiStressCourseClock} from '../lib/coaching/anti-stress-clock.mjs'
import {ANTI_STRESS_SESSION_IDS} from '../lib/coaching/coach-program-mode.mjs'
import {createAntiStressRun,validateAntiStressRun,advanceAntiStressRun,antiStressRunBinding,antiStressRunSummary,antiStressRunNewDailyClaims,antiStressBoundProtocol,antiStressRunDirective,appendAntiStressObservation} from '../lib/coaching/anti-stress-runs.mjs'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const input=(n=1,access='free')=>({id:id(n),protocolIds:[id(n+1),id(n+2),id(n+3)],createdAt:0,access})
function event(run,day,type,atMs,{seg=50,decision='start',coachId='mira',...extra}={}){
 const protocolId=run.protocolIds[day-1],connectionId=id(seg+100)
 return {courseRunId:run.id,sessionId:ANTI_STRESS_SESSION_IDS[day-1],expectedRevision:run.clock.revision,day,type,atMs,protocolId,segmentId:id(seg),connectionId,coachId,
 ...(type==='begin'?{consent:{kind:'explicit_client_session_consent',decision,protocolId,connectionId,coachId,atMs,turnId:'consent:'+seg}}:{evidence:type==='observe'?'server_observed_connected':'server_observed_stop'}),...extra}
}
function tick(run,day,start,duration,seg=50){for(let t=10000;t<=duration;t+=10000)run=advanceAntiStressRun(run,event(run,day,'observe',start+t,{seg}));return run}
test('independent immutable therapy mode and 900-second trusted cap',()=>{
 let run=createAntiStressRun(input())
 assert.throws(()=>validateAntiStressRun({...run,programType:'coaching'}))
 assert.throws(()=>validateAntiStressCourseClock(createClarityCourseClock()))
 assert.throws(()=>validateClarityCourseClock(createAntiStressCourseClock()))
 assert.throws(()=>advanceAntiStressRun(run,event(run,1,'begin',0,{consent:true})),/NOT_AUTHORIZED/)
 run=advanceAntiStressRun(run,event(run,1,'begin',0))
 assert.deepEqual(antiStressRunNewDailyClaims(null,run),[{calendarDay:'1970-01-01',protocolId:id(2)}])
 run=tick(run,1,0,300000)
 run=advanceAntiStressRun(run,event(run,1,'disconnect',301000))
 assert.equal(antiStressRunSummary(run).days[0].remainingMs,600000)
 assert.throws(()=>advanceAntiStressRun(run,event(run,1,'begin',400000,{seg:51})),/NOT_AUTHORIZED/)
 run=advanceAntiStressRun(run,event(run,1,'begin',400000,{seg:51,decision:'continue',coachId:'caesar'}))
 assert.equal(antiStressRunBinding(run,ANTI_STRESS_SESSION_IDS[0],id(2)).time.elapsedSeconds,300)
 run=tick(run,1,400000,590000,51)
 run=advanceAntiStressRun(run,event(run,1,'observe',1001000,{seg:51}))
 assert.equal(antiStressRunSummary(run).days[0].elapsedMs,900000)
 assert.equal(antiStressRunSummary(run).days[0].remainingMs,0)
 assert.equal(run.clock.days[0].segments[1].coachId,'caesar')
 assert.throws(()=>advanceAntiStressRun(run,event(run,2,'begin',1002000,{seg:52})),/DAILY_SESSION_LIMIT/)
 assert.throws(()=>antiStressRunBinding(run,ANTI_STRESS_SESSION_IDS[1],id(2)),/CONFLICT/)
 for(let d=2;d<=3;d++){let at=(d-1)*86400000;run=advanceAntiStressRun(run,event(run,d,'begin',at,{seg:50+d}));run=tick(run,d,at,900000,50+d)}
 assert.equal(antiStressRunSummary(run).totalElapsedMs,2700000)
 assert.equal(antiStressRunSummary(run).status,'completed')
})
test('Director and report consume exact bound server data; browser timing cannot promote state',()=>{
 let run=createAntiStressRun(input())
 const sid=ANTI_STRESS_SESSION_IDS[0],pid=id(2),binding=antiStressRunBinding(run,sid,pid)
 const ledger={courseRunId:run.id,sessionId:sid,protocolId:pid,scenarioVersion:binding.scenarioVersion,rows:[]}
 const context={safetyState:'clear',connected:true,elapsedSeconds:400,sessionConsent:'accepted',practiceConsent:'accepted'}
 assert.equal(antiStressRunDirective(run,sid,pid,ledger,context).action,'invite-explicit-start')
 assert.throws(()=>antiStressBoundProtocol(run,sid,pid,{...ledger,courseRunId:id(100)}),/CONFLICT/)
 run=advanceAntiStressRun(run,event(run,1,'begin',0));run=tick(run,1,0,360000)
 assert.equal(antiStressRunDirective(run,sid,pid,ledger,context).action,'invite-practice-consent')
 const accepted={...ledger,rows:[{fieldId:'practice_consent',scenarioVersion:binding.scenarioVersion,status:'confirmed',reviewed:true,evidenceId:'consent-1',value:'accepted'}]}
 assert.equal(antiStressRunDirective(run,sid,pid,accepted,context).action,'guide-one-cue-and-wait')
 assert.equal(antiStressRunDirective(run,sid,pid,accepted,{...context,distressIncreased:true}).action,'stop-practice-and-offer-support')
 assert.equal(antiStressBoundProtocol(run,sid,pid,accepted).result.stress.before,null)
 run=advanceAntiStressRun(run,event(run,1,'disconnect',361000))
 assert.equal(antiStressRunDirective(run,sid,pid,accepted,context).action,'hold')
})

test('trusted review append preserves provenance, rejects conflicting scope and supports correction',()=>{
 let run=createAntiStressRun(input())
 run=advanceAntiStressRun(run,event(run,1,'begin',0));run=tick(run,1,0,10000)
 const sid=ANTI_STRESS_SESSION_IDS[0],pid=id(2)
 const scope={courseRunId:run.id,sessionId:sid,protocolId:pid,scenarioVersion:antiStressRunBinding(run,sid,pid).scenarioVersion,segmentId:id(50),connectionId:id(150),coachId:'mira',atMs:10000}
 let state=null
 const apply=e=>{state=appendAntiStressObservation(run,sid,pid,state,e)}
 const turn=(n,role,text)=>({...scope,eventId:'evt:'+n,turnId:'turn:'+n,expectedRevision:state?.revision??0,kind:'turn',proof:'server_observed_final_turn',role,text})
 apply(turn(1,'coach','Which resource?'));apply(turn(2,'client','Quiet shore'));apply(turn(3,'client','Yes, quiet shore'))
 const review={...scope,eventId:'review:1',expectedRevision:3,kind:'review',proof:'server_observed_explicit_field_review',role:'client',fieldId:'resource_selected',status:'confirmed',value:'Quiet shore',questionTurnId:'turn:1',answerTurnId:'turn:2',confirmationTurnId:'turn:3'}
 assert.throws(()=>apply({...review,courseRunId:id(99)}),/CONFLICT/)
 assert.throws(()=>apply({...review,confirmationTurnId:'turn:1'}),/CONFLICT/)
 assert.throws(()=>apply({...review,proof:'model_guess'}),/CONFLICT/)
 apply(review);assert.equal(state.revision,4);apply(review);assert.equal(state.revision,4)
 assert.throws(()=>apply({...review,value:'invented'}),/CONFLICT/)
 assert.equal(antiStressBoundProtocol(run,sid,pid,state).result.resources.selected,'Quiet shore')
 apply(turn(4,'coach','Remove resource?'));apply(turn(5,'client','Remove'));apply(turn(6,'client','Yes'))
 apply({...review,eventId:'review:2',expectedRevision:7,status:'skipped',value:null,questionTurnId:'turn:4',answerTurnId:'turn:5',confirmationTurnId:'turn:6'})
 assert.equal(state.rows.length,1);assert.equal(state.reviews.length,2);assert.equal(state.turns.length,6)
 assert.equal(antiStressBoundProtocol(run,sid,pid,state).result.resources.selected,null)
 assert.throws(()=>apply({...turn(7,'client','x'),atMs:10001}),/CONFLICT/)
})
