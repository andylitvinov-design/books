import test from 'node:test'
import assert from 'node:assert/strict'
import {createClarityRun,beginFreeClarityRun,advanceClarityRun,clarityRunSummary,clarityRunNotes,clarityRunScopeTag,validateClarityRun,clarityRunTranscript,clarityRunResumeMetadata} from '../lib/coaching/clarity-course-runs.mjs'
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

test('transcript is scoped to exact run and logical day; retains coach authorship',()=>{
 const run=createClarityRun(input(1,'free',1))
 const protocol={id:run.protocolIds[0],courseSessionId:'clarity_day_1',personaId:'mira',provenance:'client_autosaved_unreviewed_draft',turns:[{role:'user',content:'hello'},{role:'assistant',content:'hi',authorPersonaId:'caesar',visitId:id(98)}]}
 const result=clarityRunTranscript(protocol,1,run,'2026-11-26T20:00:00Z')
 assert.equal(result.reviewed,false)
 assert.equal(result.courseRunId,run.id)
 assert.equal(result.turns[1].personaId,'caesar')
 assert.equal(result.turns[1].visitId,id(98))
 assert.equal(clarityRunTranscript(protocol,2,run,'now'),null)
 assert.equal(clarityRunTranscript(protocol,1,createClarityRun(input(10,'paid',2)),'now'),null)
 assert.equal(clarityRunTranscript({...protocol,provenance:'unverified'},1,run,'now'),null)
})

import {clarityClockNewDailyClaims,createClarityCourseClock} from '../lib/coaching/clarity-course-clock.mjs'
import {readFileSync} from 'node:fs'
test('shared day claims derive only from trusted start and credited midnight crossing',()=>{
 const midnight=86400000,d={...input(1,'free',1),createdAt:midnight-10000}
 let run=beginFreeClarityRun(d,event(d,1,'begin',midnight-10000)),before=run.clock
 assert.deepEqual(clarityClockNewDailyClaims(null,before),[{calendarDay:'1970-01-01',protocolId:d.protocolIds[0]}])
 run=advanceClarityRun(run,event(run,1,'observe',midnight))
 assert.deepEqual(clarityClockNewDailyClaims(before,run.clock),[])
 before=run.clock;run=advanceClarityRun(run,event(run,1,'observe',midnight+10000))
 assert.deepEqual(clarityClockNewDailyClaims(before,run.clock),[{calendarDay:'1970-01-02',protocolId:d.protocolIds[0]}])
 before=run.clock;run=advanceClarityRun(run,event(run,1,'disconnect',midnight+11000))
 assert.deepEqual(clarityClockNewDailyClaims(before,run.clock),[])
 before=run.clock;run=advanceClarityRun(run,event(run,1,'begin',midnight+20000,{seg:51,decision:'continue',coachId:'caesar'}))
 assert.deepEqual(clarityClockNewDailyClaims(before,run.clock),[])
 assert.throws(()=>clarityClockNewDailyClaims(run.clock,createClarityCourseClock()),/INVALID/)
 let paid=createClarityRun(input(10,'paid',2));paid=advanceClarityRun(paid,event(paid,1,'begin',0,{seg:60}))
 assert.deepEqual(clarityClockNewDailyClaims(null,paid.clock),[])
 assert.throws(()=>clarityClockNewDailyClaims(run.clock,paid.clock),/INVALID/)
})
test('shared quota is transactional and independent of coach, course, device, or paid fallback',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
 const store=read('lib/app/clarity-course-runs.js'),quota=read('lib/app/coaching-free-day-quota.js'),sql=read('docs/coaching/clarity-course-runs.proposal.sql')
 assert.ok(store.indexOf('await claimTrustedFreeCoachingDays(db,actor,clarityClockNewDailyClaims(null,run.clock))')<store.indexOf('await insert(db,actor,config,run)'))
 assert.match(store,/await claimTrustedFreeCoachingDays\(db,actor,clarityClockNewDailyClaims\(before.clock,after.clock\)\)\s+await writeClock/)
 assert.match(quota,/on conflict\(account_id,calendar_day\) do nothing returning protocol_id/)
 assert.match(quota,/where account_id=\$1 and calendar_day=\$2::date/)
 assert.match(sql,/primary key\(account_id,calendar_day\)/)
 assert.match(sql,/coaching_free_session_days force row level security/)
 assert.match(sql,/revoke all on app_private.coaching_free_session_days from public,anon,authenticated/)
 assert.doesNotMatch(sql,/grant update[^\n]*coaching_free_session_days/)
})

test('resume metadata is specific to the immutable course instance and day',()=>{
 const first=input(1,'free',1),second=input(10,'paid',2)
 let a=beginFreeClarityRun(first,event(first,1,'begin',0))
 a=tick(a,1,0,420000)
 a=advanceClarityRun(a,event(a,1,'disconnect',420000))
 let b=createClarityRun(second)
 assert.deepEqual(clarityRunResumeMetadata(a,1,first.protocolIds[0]),{courseRunId:first.id,courseOrdinal:1,day:1,clarityTime:{elapsedSeconds:420,remainingSeconds:780,status:'paused'}})
 assert.deepEqual(clarityRunResumeMetadata(b,1,second.protocolIds[0]),{courseRunId:second.id,courseOrdinal:2,day:1,clarityTime:null})
 assert.throws(()=>clarityRunResumeMetadata(b,1,first.protocolIds[0]),/CONFLICT/)
 assert.throws(()=>clarityRunResumeMetadata(a,2,first.protocolIds[0]),/CONFLICT/)
 b=advanceClarityRun(b,event(b,1,'begin',430000,{seg:61}))
 b=tick(b,1,430000,10000,61)
 assert.equal(clarityRunResumeMetadata(b,1,second.protocolIds[0]).clarityTime.elapsedSeconds,10)
 assert.equal(clarityRunResumeMetadata(a,1,first.protocolIds[0]).clarityTime.elapsedSeconds,420)
 assert.equal(clarityRunResumeMetadata(a,2,first.protocolIds[1]).clarityTime,null)
})
test('server reads run bindings in the same owner-scoped draft transaction',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
 const store=read('lib/app/clarity-course-runs.js'),draft=read('lib/app/my-coach-protocol-drafts.js')
 assert.match(store,/where s.account_id=\$1 and s.protocol_id=any\(\$2::uuid\[\]\)/)
 assert.match(store,/r.account_id=s.account_id and r.id=s.course_run_id/)
 assert.match(store,/requested.get\(id\)!=='clarity_day_'\+day/)
 assert.match(store,/clarityRunResumeMetadata\(run,day,id\)/)
 assert.match(draft,/day&&!binding\?await readClarityCourseClockInTransaction/)
 assert.match(draft,/await readClarityResumeBindings\(db,actor,config,courseItems\)/)
})
