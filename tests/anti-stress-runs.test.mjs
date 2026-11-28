import test from 'node:test'
import assert from 'node:assert/strict'
import {createClarityCourseClock,validateClarityCourseClock} from '../lib/coaching/clarity-course-clock.mjs'
import {createAntiStressCourseClock,validateAntiStressCourseClock} from '../lib/coaching/anti-stress-clock.mjs'
import {ANTI_STRESS_SESSION_IDS} from '../lib/coaching/coach-program-mode.mjs'
import {antiStressScenario} from '../lib/coaching/anti-stress-course.mjs'
import {createAntiStressRun,validateAntiStressRun,advanceAntiStressRun,antiStressRunBinding,antiStressRunSummary,antiStressRunNewDailyClaims,antiStressBoundProtocol,antiStressRunDirective,appendAntiStressObservation,antiStressMeditationArtifact,expireAntiStressRunObservation,antiStressRunCredentialWindow,assertAntiStressCredentialEvent} from '../lib/coaching/anti-stress-runs.mjs'
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

test('separate meditation requires safe completion, preserves client edits and respects revocation',()=>{
 let run=createAntiStressRun(input())
 run=advanceAntiStressRun(run,event(run,1,'begin',0))
 const sid=ANTI_STRESS_SESSION_IDS[0],pid=id(2),version=antiStressRunBinding(run,sid,pid).scenarioVersion
 const ledger={courseRunId:run.id,sessionId:sid,protocolId:pid,scenarioVersion:version,rows:Object.entries({practice_consent:'accepted',practice_status:'attempted',resource_kind:'imagery',resource_selected:'quiet shore',resource_response:'comfortable',meditation_consent:'accepted'}).map(([fieldId,value])=>({fieldId,value,status:'confirmed',reviewed:true,evidenceId:fieldId,scenarioVersion:version}))}
 const create={type:'create',expectedRevision:0,atMs:900000,safeClosureVerified:true,storageConsentVerified:true}
 assert.throws(()=>antiStressMeditationArtifact(run,pid,ledger,null,create),/CONFLICT/)
 run=tick(run,1,0,900000)
 assert.throws(()=>antiStressMeditationArtifact(run,pid,ledger,null,{...create,safeClosureVerified:false}),/CONFLICT/)
 assert.throws(()=>antiStressMeditationArtifact(run,pid,ledger,null,{...create,storageConsentVerified:false}),/CONFLICT/)
 const reviewLedger={...ledger,revision:8}
 const request={type:'owner_request',expectedRevision:0,expectedReviewRevision:8,ownerConfirmed:true,storageConsent:true,readyToRead:true,atMs:900000}
 assert.deepEqual(antiStressMeditationArtifact(run,pid,reviewLedger,null,{type:'availability'}),{eligible:true,reviewRevision:8})
 for(const change of [{ownerConfirmed:false},{storageConsent:false},{readyToRead:false},{expectedReviewRevision:7}])assert.throws(()=>antiStressMeditationArtifact(run,pid,reviewLedger,null,{...request,...change}),/CONFLICT/)
 const requested=antiStressMeditationArtifact(run,pid,reviewLedger,null,request,'ru')
 assert.equal(requested.origin,'owner_requested_after_session');assert.match(requested.body,/quiet shore/)
 assert.equal(antiStressMeditationArtifact(run,pid,reviewLedger,requested,{type:'availability'}),null)
 const draft=antiStressMeditationArtifact(run,pid,ledger,null,create,'ru')
 assert.equal(draft.status,'draft');assert.match(draft.body,/quiet shore/)
 assert.throws(()=>antiStressMeditationArtifact(run,pid,ledger,draft,create),/CONFLICT/)
 const saved=antiStressMeditationArtifact(run,pid,ledger,draft,{type:'save',expectedRevision:1,atMs:900001,body:'My own words'},'ru')
 assert.equal(saved.body,'My own words');assert.equal(saved.revision,2)
 assert.equal(antiStressMeditationArtifact(run,pid,ledger,saved,{type:'view'},'ru').body,'My own words')
 assert.throws(()=>antiStressMeditationArtifact(run,pid,ledger,saved,{type:'save',expectedRevision:1,atMs:900002,body:'stale'}),/CONFLICT/)
 // Changed or newly issued consent/comfort/type invalidates the earlier
 // version without destroying a client's edited text behind their back.
 for(const fieldId of ['meditation_consent','practice_consent','practice_status','resource_kind','resource_response']){
  const revised={...ledger,rows:ledger.rows.map(row=>row.fieldId===fieldId?{...row,evidenceId:fieldId+':new'}:row)}
  assert.equal(antiStressMeditationArtifact(run,pid,revised,saved,{type:'view'},'ru').status,'needs_review')
  assert.throws(()=>antiStressMeditationArtifact(run,pid,revised,saved,{type:'save',expectedRevision:2,atMs:900002,body:'stale'}),/CONFLICT/)
 }
 const revoked={...ledger,rows:ledger.rows.map(r=>r.fieldId==='meditation_consent'?{...r,value:'declined'}:r)}
 assert.equal(antiStressMeditationArtifact(run,pid,revoked,saved,{type:'view'},'ru').body,null)
 const declined=antiStressMeditationArtifact(run,pid,revoked,saved,{type:'decline',expectedRevision:2,atMs:900002})
 assert.equal(declined.status,'declined');assert.equal(declined.body,null)
})

test('abandoned connection cannot credit lost time; remint is bounded by trusted remaining time and old expiry',()=>{
 let run=createAntiStressRun(input())
 const sid=ANTI_STRESS_SESSION_IDS[0],pid=id(2)
 const window=(now,previousCredentialExpiresAt=null)=>antiStressRunCredentialWindow(run,{sessionId:sid,protocolId:pid,now,previousCredentialExpiresAt})
 assert.equal(window(0).expiresAt,new Date(900000).toISOString())
 assert.throws(()=>window(0,1),/CREDENTIAL_BUSY/)
 run=advanceAntiStressRun(run,event(run,1,'begin',0));run=tick(run,1,0,300000)
 assert.throws(()=>window(300000),/CONFLICT/)
 assert.equal(expireAntiStressRunObservation(run,315000),run)
 assert.throws(()=>expireAntiStressRunObservation(run,299999),/CONFLICT/)
 run=expireAntiStressRunObservation(run,315001)
 assert.equal(run.clock.days[0].status,'paused')
 assert.equal(run.clock.days[0].elapsedMs,300000)
 assert.equal(run.clock.days[0].segments[0].reason,'lost_observation')
 assert.throws(()=>window(315001),/CREDENTIAL_BUSY/)
 assert.throws(()=>window(315001,900000),/CREDENTIAL_BUSY/)
 assert.throws(()=>window(900000,299999),/CREDENTIAL_BUSY/)
 assert.equal(window(900000,900000).expiresAt,new Date(1500000).toISOString())
 assert.equal(window(900000,900000).newSessionExpireTime,new Date(945000).toISOString())
 assert.throws(()=>antiStressRunCredentialWindow(run,{sessionId:ANTI_STRESS_SESSION_IDS[1],protocolId:id(3),now:900000,previousCredentialExpiresAt:900000}),/CONFLICT/)
 assert.throws(()=>advanceAntiStressRun(run,event(run,1,'begin',900000,{seg:51})),/NOT_AUTHORIZED/)
 run=advanceAntiStressRun(run,event(run,1,'begin',900000,{seg:51,decision:'continue',coachId:'caesar'}))
 assert.equal(run.clock.days[0].elapsedMs,300000)
 run=tick(run,1,900000,600000,51)
 assert.equal(run.clock.days[0].status,'time_limit')
 assert.throws(()=>window(1500000,1500000),/CONFLICT/)
})

test('therapy clock and reviewed turns must belong to the current shared credential, never Clarity or an expired token',()=>{
 const lease={programKind:'therapy',leaseId:id(90),courseRunId:id(1),protocolId:id(2),day:1,reservedAtMs:1000,possibleExpiresAtMs:901000}
 const start={type:'begin',courseRunId:lease.courseRunId,protocolId:lease.protocolId,day:1,sessionId:ANTI_STRESS_SESSION_IDS[0],connectionId:lease.leaseId,atMs:1000,consent:{connectionId:lease.leaseId}}
 const reject=/ANTI_STRESS_CREDENTIAL_EVENT_REJECTED/
 assert.equal(assertAntiStressCredentialEvent(lease,start),true)
 for(const wrong of [{courseRunId:id(3)},{protocolId:id(4)},{day:2},{sessionId:ANTI_STRESS_SESSION_IDS[1]},{connectionId:id(91)},{atMs:999},{atMs:901000},{consent:{connectionId:id(91)}},{type:'token_minted'}])assert.throws(()=>assertAntiStressCredentialEvent(lease,{...start,...wrong}),reject)
 assert.throws(()=>assertAntiStressCredentialEvent({...lease,programKind:'clarity'},start),reject)
 assert.throws(()=>assertAntiStressCredentialEvent({...lease,possibleExpiresAtMs:901001},start),reject)
 assert.equal(assertAntiStressCredentialEvent(lease,{...start,type:'observe',atMs:901000}),true)
 assert.throws(()=>assertAntiStressCredentialEvent(lease,{...start,type:'observe',atMs:901001}),reject)
 const {type,day,consent,...scope}=start
 assert.equal(assertAntiStressCredentialEvent(lease,{...scope,kind:'review',atMs:901000},{observation:true}),true)
 assert.throws(()=>assertAntiStressCredentialEvent(lease,{...scope,kind:'turn',atMs:901001},{observation:true}),reject)
 assert.throws(()=>assertAntiStressCredentialEvent(lease,{...start,kind:'turn',atMs:901000}),reject)
 assert.throws(()=>assertAntiStressCredentialEvent(lease,{...start,kind:'turn',atMs:901000},{observation:true}),reject)
 assert.equal(assertAntiStressCredentialEvent(lease,{...start,type:'disconnect',atMs:901001}),true)
})

test('reviewed therapy outcomes override the practice time window without repeating resolved questions',()=>{
 for(const locale of ['en','ru','es']){
  let run=createAntiStressRun(input());
  const sid=ANTI_STRESS_SESSION_IDS[0],pid=id(2),binding=antiStressRunBinding(run,sid,pid);
  const ledger={courseRunId:run.id,sessionId:sid,protocolId:pid,scenarioVersion:binding.scenarioVersion,rows:[]};
  run=advanceAntiStressRun(run,event(run,1,'begin',0));run=tick(run,1,0,360000);
  const row=(fieldId,value,status='confirmed')=>({fieldId,value,status,scenarioVersion:binding.scenarioVersion,reviewed:true,evidenceId:'review:'+fieldId});
  const act=(rows,context={})=>antiStressRunDirective(run,sid,pid,{...ledger,rows},{safetyState:'clear',connected:true,...context},locale);
  const consent=row('practice_consent','accepted');
  assert.equal(act([consent],{practiceStatus:'attempted'}).action,'guide-one-cue-and-wait','untrusted status must not override ledger');
  for(const status of ['attempted','adapted']){
   const next=act([consent,row('practice_status',status),row('stress_after',0),row('resource_details',null,'skipped')]);
   assert.equal(next.action,'listen-and-reflect');assert.equal(next.stage,'reflect');assert.equal(next.maxQuestions,1);
   assert.match(next.instruction,/Do not repeat/);
   assert.equal(next.instruction.includes(antiStressScenario(sid,locale).fields.find(f=>f.id==='stress_after').question),false);
   assert.equal(next.instruction.includes(antiStressScenario(sid,locale).fields.find(f=>f.id==='resource_details').question),false);
   assert.equal(act([consent,row('practice_status',status)],{distressIncreased:true}).action,'stop-practice-and-offer-support');
  }
  for(const status of ['stopped','declined','not_attempted'])assert.equal(act([consent,row('practice_status',status)]).action,'respect-skip');
  assert.equal(act([row('practice_consent',null,'skipped')]).action,'respect-skip');
  assert.equal(act([consent,row('practice_status',null,'skipped')]).action,'respect-skip');
  const allReflection=antiStressScenario(sid,locale).fields.filter(f=>f.stage==='reflect').map(f=>row(f.id,null,'skipped'));
  assert.equal(act([consent,row('practice_status','attempted'),...allReflection]).maxQuestions,0);
  run=tick(run,1,360000,300000);
  const next=act(allReflection);assert.equal(next.action,'listen-and-reflect');assert.equal(next.maxQuestions,0);
 }
})

test('Therapy review requires exact question, client answer, exact echo and explicit real acknowledgement',async()=>{
 const {antiStressExactObservedReview,antiStressReviewEcho}=await import('../lib/coaching/anti-stress-observed-review.mjs')
 const {antiStressScenario}=await import('../lib/coaching/anti-stress-course.mjs')
 const scenario=antiStressScenario('anti_stress_ground','ru')
 const field=scenario.fields.find(f=>f.id==='resource_selected')
 const scope={kind:'turn',proof:'server_observed_final_turn',scenarioVersion:scenario.version,sessionId:scenario.sessionId,courseRunId:'run',protocolId:'protocol',segmentId:'segment',connectionId:'lease',coachId:'mira'}
 const row=(n,role,text)=>({...scope,turnId:'turn-'+n,role,text,atMs:n})
 const t=[row(1,'coach',field.question),row(2,'client','Тихий сад'),row(3,'coach',antiStressReviewEcho('Тихий сад','ru')),row(4,'client','Да')]
 const review=antiStressExactObservedReview({sessionId:scenario.sessionId,turns:t,locale:'ru'})
 assert.equal(review.fieldId,'resource_selected');assert.equal(review.value,'Тихий сад');assert.equal(review.confirmationTurnId,'turn-4')
 for(const rows of [t.slice(0,3),[...t.slice(0,2),row(3,'coach',antiStressReviewEcho('Море','ru')),t[3]],[...t.slice(0,3),row(4,'client','Возможно')],[...t.slice(0,3),{...t[3],segmentId:'other'}],[row(1,'coach','Какой образ?'),...t.slice(1)]])
  assert.equal(antiStressExactObservedReview({sessionId:scenario.sessionId,turns:rows,locale:'ru'}),null)
 const permission=scenario.fields.find(f=>f.id==='practice_consent')
 const build=answer=>[row(1,'coach',permission.question),row(2,'client',answer),row(3,'coach',antiStressReviewEcho(answer,'ru')),row(4,'client','Да')]
 assert.equal(antiStressExactObservedReview({sessionId:scenario.sessionId,turns:build('Да'),locale:'ru'}),null)
 assert.equal(antiStressExactObservedReview({sessionId:scenario.sessionId,turns:build('попробовать'),locale:'ru'}).value,'accepted')
 assert.equal(antiStressExactObservedReview({sessionId:scenario.sessionId,turns:build('пропустить'),locale:'ru'}).status,'skipped')
})
