import test from 'node:test'
import assert from 'node:assert/strict'
import {createClarityRun,beginFreeClarityRun,advanceClarityRun,clarityRunSummary,clarityRunNotes,clarityRunScopeTag,validateClarityRun,clarityRunTranscript,clarityRunResumeMetadata,clarityRunReviewPatch,expireClarityRunObservation,assertClarityCredentialEvent} from '../lib/coaching/clarity-course-runs.mjs'
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
 assert.equal(result.personaId,'mira')
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
 assert.match(draft,/await readClarityResumeBindings\(db,actor,config,courseItems,\{includeVisits:true\}\)/)
})

test('bound early archive review preserves the draft until a genuine trusted timed end',()=>{
 const data=input(1,'free',1)
 assert.equal(clarityRunReviewPatch(null),null) // historical unbound archive
 let run=createClarityRun(data)
 const binding=()=>clarityRunResumeMetadata(run,1,data.protocolIds[0])
 assert.throws(()=>clarityRunReviewPatch(binding()),/CLARITY_SESSION_STILL_OPEN/)
 run=beginFreeClarityRun(data,event(data,1,'begin',0))
 assert.throws(()=>clarityRunReviewPatch(binding()),/CLARITY_SESSION_STILL_OPEN/)
 run=tick(run,1,0,420000)
 run=advanceClarityRun(run,event(run,1,'disconnect',420000))
 assert.throws(()=>clarityRunReviewPatch(binding()),/CLARITY_SESSION_STILL_OPEN/)
 run=advanceClarityRun(run,event(run,1,'begin',430000,{seg:51,decision:'continue',coachId:'caesar'}))
 run=tick(run,1,430000,780000,51)
 assert.deepEqual(clarityRunReviewPatch(binding()),{durationSeconds:1200,clarityTimeLimitReached:true})
 assert.throws(()=>clarityRunReviewPatch(clarityRunResumeMetadata(run,2,data.protocolIds[1])),/CLARITY_SESSION_STILL_OPEN/)
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
 const server=read('lib/app/personal-coaching.js'),ui=read('components/my-coach-live-dialogue.jsx')
 assert.ok(server.indexOf('verifiedTime=clarityRunReviewPatch(binding)')<server.indexOf('const result=existing?{saved:true,id:protocol.id,alreadySaved:true}'))
 assert.match(server,/if\(!existing&&draft\?\.state!=='active'\)/)
 assert.match(ui,/response.status===409&&result\?\.error==='CLARITY_SESSION_STILL_OPEN'/)
 assert.match(ui,/protocolSaveSnapshotRef.current=null;setProtocolSaveLocked\(false\)/)
})

test('run transcript preserves legacy coach labels and exact visit attribution without inference metadata',()=>{
 const run=createClarityRun(input(1,'free',1)),visitId=id(91),capturedAt='2026-11-27T09:00:00.000Z'
 const record={id:run.protocolIds[0],courseSessionId:'clarity_day_1',personaId:'mira',provenance:'client_reviewed_dialogue',turns:[
  {role:'assistant',content:'Welcome',coachId:'mira',locale:'en',capturedAt},
  {role:'user',content:'Continue',coachId:'caesar',visitId,locale:'en',capturedAt},
  {role:'assistant',content:'Let us continue',coachId:'caesar',authorPersonaId:'caesar',visitId,locale:'en',capturedAt,inference:{provider:'gemini_live_free',model:'private'}},
  {role:'assistant',content:'Legacy captured reply',coachId:'sofia'}
 ]}
 const log=clarityRunTranscript(record,1,run,capturedAt)
 assert.equal(log.turns[0].personaId,'mira')
 assert.equal(log.turns[1].coachId,'caesar')
 assert.equal(log.turns[1].visitId,visitId)
 assert.equal(log.turns[1].capturedAt,capturedAt)
 assert.equal(log.turns[2].personaId,'caesar')
 assert.equal(log.turns[2].locale,'en')
 assert.equal(log.turns[2].inference,undefined)
 assert.equal(log.turns[3].personaId,'sofia')
})


test('expired observation recovery pauses the same logical session without charging the gap or making homework eligible',()=>{
 const data=input(1,'free',1)
 let run=beginFreeClarityRun(data,event(data,1,'begin',0))
 run=tick(run,1,0,420000)
 const before=run
 assert.equal(expireClarityRunObservation(before,435000),before,'exact grace limit is not a lost observation')
 assert.throws(()=>expireClarityRunObservation(before,419999),/CONFLICT/)
 assert.throws(()=>expireClarityRunObservation(before,'435001'),/CONFLICT/)
 run=expireClarityRunObservation(before,435001)
 assert.equal(run.clock.revision,before.clock.revision+1)
 assert.equal(run.clock.days[0].status,'paused')
 assert.equal(run.clock.days[0].elapsedMs,420000)
 assert.equal(run.clock.days[0].segments[0].reason,'lost_observation')
 assert.equal(run.clock.days[0].segments[0].observedAt,420000)
 assert.equal(run.clock.days[0].segments[0].endedAt,435001)
 assert.equal(run.clock.days[0].protocolId,data.protocolIds[0])
 assert.equal(run.clock.days[1].status,'not_started')
 assert.deepEqual(clarityClockNewDailyClaims(before.clock,run.clock),[])
 assert.equal(expireClarityRunObservation(run,440000),run,'recovery retry is a no-op')
 assert.throws(()=>clarityRunReviewPatch(clarityRunResumeMetadata(run,1,data.protocolIds[0])),/STILL_OPEN/)
 assert.throws(()=>advanceClarityRun(run,event(before,1,'observe',440000)),/CONFLICT/)
 assert.throws(()=>advanceClarityRun(run,event(run,1,'observe',440000)),/CONFLICT/)
 assert.throws(()=>advanceClarityRun(run,event(run,1,'begin',440000,{seg:51,coachId:'caesar'})),/NOT_AUTHORIZED/)
 run=advanceClarityRun(run,event(run,1,'begin',440000,{seg:51,coachId:'caesar',decision:'continue'}))
 assert.equal(run.clock.days[0].segments[1].coachId,'caesar')
 assert.equal(run.clock.days[0].elapsedMs,420000)
 run=tick(run,1,440000,780000,51)
 assert.equal(run.clock.days[0].elapsedMs,1200000)
 assert.equal(clarityRunSummary(run).currentDay,2)
 assert.equal(expireClarityRunObservation(run,2000000),run)
 assert.equal(before.clock.days[0].status,'active')
})

test('stale connection recovery uses owner lock, database time and CAS, never a browser event route',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
 const store=read('lib/app/clarity-course-runs.js')
 const wrapper=store.slice(store.indexOf('export async function recoverExpiredClarityRun('),store.indexOf('// Called by existing draft/report adapters'))
 assert.match(wrapper,/return clarityRunSummary\(await readClarityRunForRelay\(config,actor,runId\)\)/)
 const recovery=store.slice(store.indexOf('export async function readClarityRunForRelay('),store.indexOf('export async function listClarityRuns('))
 assert.match(recovery,/requireEnabled\(\)/)
 assert.match(recovery,/await lockCourseOwner\(db,actor\)/)
 assert.match(recovery,/await read\(db,actor,config,id,true\)/)
 assert.match(recovery,/row\.lease_id!==segment\.connectionId/)
 assert.match(recovery,/row\.course_run_id!==id/)
 assert.match(recovery,/Math\.min\(closed,expires\)>now/)
 assert.match(recovery,/const now=await serverStamp\(db\)/)
 assert.match(recovery,/expireClarityRunObservation\(before,now\)/)
 assert.match(recovery,/if\(after!==before\)await writeClock\(db,actor,config,before,after\)/)
 assert.doesNotMatch(recovery,/claimTrustedFreeCoachingDays|issueGeminiFreeLiveToken|fetch\(/)
 const api=read('app/api/app/clarity-course/runs/route.js')
 assert.doesNotMatch(api,/recoverExpiredClarityRun|export (?:const|async function|function) POST/)
 assert.match(store,/TRUSTED_RUN_ADAPTER_READY=false/)
})


test('private credential reservation is account-locked, bounded and cannot expose a public mint or release',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
 const store=read('lib/app/clarity-course-runs.js'),sql=read('docs/coaching/clarity-course-runs.proposal.sql')
 const body=store.slice(store.indexOf('export async function reserveClarityCredentialInTransaction'),store.indexOf('export async function reserveClarityRunCredential'))
 assert.ok(body.indexOf('await lockCourseOwner')<body.indexOf('for update'))
 assert.ok(body.indexOf('clarityRunCredentialWindow(')<body.indexOf('insert into '))
 assert.match(body,/possible_expires_at_ms<=excluded\.reserved_at_ms/)
 assert.match(body,/previousCredentialExpiresAt/)
 assert.match(sql,/clarity_live_credential_windows force row level security/)
 assert.match(sql,/account_id uuid primary key references app.accounts\(id\) on delete cascade/)
 assert.doesNotMatch(sql,/grant delete[^\n]*clarity_live_credential_windows/i)
 assert.match(store,/const TRUSTED_RUN_ADAPTER_READY=false/)
})


test('trusted clock events must match the durable credential, never another run, day or expired connection',()=>{
 const lease={leaseId:id(90),courseRunId:id(1),protocolId:id(2),day:1,reservedAtMs:1000,possibleExpiresAtMs:1201000}
 const begin={type:'begin',courseRunId:lease.courseRunId,protocolId:lease.protocolId,day:1,
  connectionId:lease.leaseId,atMs:1000,consent:{connectionId:lease.leaseId}}
 const reject=/CLARITY_CREDENTIAL_EVENT_REJECTED/
 assert.equal(assertClarityCredentialEvent(lease,begin),true)
 assert.throws(()=>assertClarityCredentialEvent(null,begin),reject)
 for(const wrong of [{courseRunId:id(3)},{protocolId:id(4)},{day:2},{connectionId:id(91)},
  {atMs:999},{atMs:1201000},{consent:{connectionId:id(91)}},{type:'token_minted'}])
  assert.throws(()=>assertClarityCredentialEvent(lease,{...begin,...wrong}),reject)
 const observe={...begin,type:'observe',atMs:1201000}
 assert.equal(assertClarityCredentialEvent(lease,observe),true)
 assert.throws(()=>assertClarityCredentialEvent(lease,{...observe,atMs:1201001}),reject)
 assert.throws(()=>assertClarityCredentialEvent({...lease,leaseId:id(91)},observe),reject)
 assert.throws(()=>assertClarityCredentialEvent({...lease,possibleExpiresAtMs:1201001},observe),reject)
 assert.throws(()=>assertClarityCredentialEvent({...lease,reservedAtMs:'1000'},observe),reject)
 for(const type of ['disconnect','pause','coach_change','lost_observation'])
  assert.equal(assertClarityCredentialEvent(lease,{...observe,type,atMs:1210000}),true)
 // Matching a lease still cannot start or credit a clock without trusted
 // explicit consent / server observation, enforced by the domain reducer.
 const d=input(1,'free',1)
 assert.throws(()=>beginFreeClarityRun(d,{...event(d,1,'begin',1000),connectionId:lease.leaseId,consent:begin.consent}),/NOT_AUTHORIZED/)
})

test('credential interlock is in both owner-locked mutation paths before time or quota is committed',()=>{
 const store=readFileSync(new URL('../lib/app/clarity-course-runs.js',import.meta.url),'utf8')
 const interlock=store.slice(store.indexOf('async function requireClarityCredentialEvent'),store.indexOf('// No public POST.'))
 assert.match(interlock,/where account_id=\$1 for update/)
 assert.match(interlock,/assertClarityCredentialEvent\(/)
 for(const [start,end] of [['export async function startFirstClarityRun','// Never accept an order object'],
  ['export async function applyTrustedClarityRunEvent','// Internal recovery only.']]){
  const body=store.slice(store.indexOf(start),store.indexOf(end))
  const lock=body.indexOf('await lockCourseOwner(db,actor)'),check=body.indexOf('await requireClarityCredentialEvent(db,actor,event)')
  assert.ok(lock>=0&&check>lock&&check<body.indexOf('await claimTrustedFreeCoachingDays'))
 }
 const route=readFileSync(new URL('../app/api/app/clarity-course/runs/route.js',import.meta.url),'utf8')
 assert.doesNotMatch(route,/requireClarityCredentialEvent|applyTrustedClarityRunEvent|startFirstClarityRun/)
})


test('daily quota preflight reads the shared slot before credential reservation and never claims consent',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
 const store=read('lib/app/clarity-course-runs.js'),quota=read('lib/app/coaching-free-day-quota.js')
 const preflight=quota.slice(quota.indexOf('export async function assertFreeCoachingDayAvailable'),quota.indexOf('// INTERNAL ONLY:'))
 assert.match(preflight,/where account_id=\$1 and calendar_day=\$2::date/)
 assert.match(preflight,/protocolId.toLowerCase\(\)/)
 assert.doesNotMatch(preflight,/insert into|update |delete from/i)
 const body=store.slice(store.indexOf('export async function reserveClarityCredentialInTransaction'),store.indexOf('export async function reserveClarityRunCredential'))
 const lock=body.indexOf('await lockCourseOwner'),check=body.indexOf("if(run.access==='free')await assertFreeCoachingDayAvailable")
 assert.ok(lock>=0&&check>lock&&check<body.indexOf('insert into '))
 assert.match(body,/new Date\(now\).toISOString\(\).slice\(0,10\)/)
 assert.doesNotMatch(body,/await claimTrustedFreeCoachingDays/)
})


test('credential retirement is private, exact-lease, owner-locked, and cannot leave an active run',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
 const store=read('lib/app/clarity-course-runs.js'),relay=read('lib/app/clarity-live-relay.js')
 const body=store.slice(store.indexOf('export async function retireClarityCredentialInTransaction'),store.indexOf('// Bind every real clock mutation'))
 assert.match(body,/await lockCourseOwner/)
 assert.match(body,/row.lease_id!==leaseId/)
 assert.match(body,/run.clock.days.some\(d=>d.status==='active'\)/)
 assert.match(body,/where account_id=\$1 and lease_id=\$2 and provider_closed_at_ms is null/)
 assert.match(store,/if\(!row\|\|row.provider_closed_at_ms!==null\)throw conflict\(\)/)
 assert.match(relay,/retireLease:binding=>retireClarityCredential\(config,actor,binding\)/)
 assert.doesNotMatch(read('app/api/app/clarity-course/runs/route.js'),/retireClarityCredential/)
})


test('bound day eligibility requires reviewed prior protocols and rejects a preexisting archive or draft',async()=>{
 const source=readFileSync(new URL('../lib/app/clarity-course-runs.js',import.meta.url),'utf8')
 const code=source.slice(source.indexOf('async function canStartBoundDay('),source.indexOf('export async function readClarityBoundStart('))
 const canStart=new Function(code+'\nreturn canStartBoundDay')()
 const actor={id:'owner'},run={protocolIds:[id(91),id(92),id(93)],clock:{days:[{day:1,status:'time_limit',elapsedMs:1200000},{day:2,status:'not_started',elapsedMs:0},{day:3,status:'not_started',elapsedMs:0}]}}
 const records=new Set([run.protocolIds[0]]),drafts=new Set()
 const db={query:async(sql,args)=>{
  assert.equal(args[0],actor.id)
  assert.match(sql,/account_id=\$1 and protocol_id=\$2/)
  const set=sql.includes('my_coach_protocol_drafts')?drafts:records
  return {rows:set.has(args[1])?[{protocol_id:args[1]}]:[]}
 }}
 assert.equal(await canStart(db,actor,run,2),true)
 assert.equal(await canStart(db,actor,run,3),false)
 records.clear();assert.equal(await canStart(db,actor,run,2),false)
 records.add(run.protocolIds[0]);records.add(run.protocolIds[1]);assert.equal(await canStart(db,actor,run,2),false)
 records.delete(run.protocolIds[1]);drafts.add(run.protocolIds[1]);assert.equal(await canStart(db,actor,run,2),false)
 drafts.clear();assert.equal(await canStart(db,actor,run,2),true)
 assert.match(source,/if\(run.clock.days\[day-1\]\?\.status==='not_started'&&!await canStartBoundDay\(db,actor,run,day\)\)throw conflict\(\)/)
 const draftsSource=readFileSync(new URL('../lib/app/my-coach-protocol-drafts.js',import.meta.url),'utf8')
 assert.match(draftsSource,/courseRunId&&!cursor&&!hasMore&&drafts.length===0\?await readClarityBoundStart/)
})
