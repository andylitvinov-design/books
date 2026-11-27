// Private domain contract. Events and settled payment receipts originate in
// authenticated server adapters, never in browser JSON or a provider token mint.
import {createClarityCourseClock,advanceClarityCourseClock,validateClarityCourseClock,clarityClockSummary,clarityClockResumeTime,CLARITY_CLOCK_MAX_GAP_MS,CLARITY_LOGICAL_SESSION_MS} from './clarity-course-clock.mjs'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
export const isClarityRunId=v=>typeof v==='string'&&UUID.test(v)
const fail=(code='CLARITY_RUN_INVALID')=>{throw Error(code)}
const ms=v=>Number.isSafeInteger(v)&&v>=0&&v<=8640000000000000
export function createClarityRun({id,ordinal,access,protocolIds,createdAt,clock}){
 const run={version:1,id,ordinal,access,createdAt,protocolIds,clock:clock??createClarityCourseClock({dailyPolicy:access})}
 return validateClarityRun(run)
}
export function validateClarityRun(run){
 if(!run||run.version!==1||!isClarityRunId(run.id)||!Number.isSafeInteger(run.ordinal)||run.ordinal<1||
  !['free','paid'].includes(run.access)||(run.ordinal===1)!==(run.access==='free')||!ms(run.createdAt)||
  !Array.isArray(run.protocolIds)||run.protocolIds.length!==3||run.protocolIds.some(id=>!isClarityRunId(id)||id===run.id)||new Set(run.protocolIds).size!==3)fail()
 validateClarityCourseClock(run.clock)
 if((run.clock.dailyPolicy==='paid')!==(run.access==='paid'))fail()
 for(const d of run.clock.days){
  if(d.protocolId!==null&&d.protocolId!==run.protocolIds[d.day-1])fail()
  if(d.segments.some(s=>s.startedAt<run.createdAt))fail()
 }
 return run
}
export function advanceClarityRun(run,event){
 validateClarityRun(run)
 if(!event||event.courseRunId!==run.id||![1,2,3].includes(event.day)||event.protocolId!==run.protocolIds[event.day-1]||event.atMs<run.createdAt)fail('CLARITY_RUN_CONFLICT')
 return validateClarityRun({...run,clock:advanceClarityCourseClock(run.clock,event)})
}
// A lost observation is not a disconnect receipt, a completed session or a
// renewed provider credential. Only a trusted server timestamp can close
// an abandoned segment. The next begin still requires fresh consent.
export function expireClarityRunObservation(run,atMs){
 validateClarityRun(run)
 if(!ms(atMs)||(run.clock.lastEventAt!==null&&atMs<run.clock.lastEventAt))fail('CLARITY_RUN_CONFLICT')
 const day=run.clock.days.find(d=>d.status==='active')
 if(!day)return run
 const segment=day.segments.at(-1)
 if(atMs-segment.observedAt<=CLARITY_CLOCK_MAX_GAP_MS)return run
 return advanceClarityRun(run,{courseRunId:run.id,expectedRevision:run.clock.revision,
  day:day.day,protocolId:day.protocolId,segmentId:segment.segmentId,connectionId:segment.connectionId,
  type:'lost_observation',atMs,evidence:'server_observed_stop'})
}
// Internal credential budget, not entitlement or connection proof. Caller
// MUST hold the account-wide mint lock and read the latest possible expiry
// of every previously issued credential from durable server storage. Null
// is allowed only for a verified absence of any earlier account credential.
// A paused segment does not revoke Google's previous ephemeral token.
export function clarityRunCredentialWindow(run,{day,protocolId,now,previousCredentialExpiresAt}={}){
 validateClarityRun(run)
 if(!ms(now)||now<run.createdAt||(run.clock.lastEventAt!==null&&now<run.clock.lastEventAt)||
    ![1,2,3].includes(day)||run.protocolIds[day-1]!==protocolId)fail('CLARITY_RUN_CONFLICT')
 const current=run.clock.days.find(d=>d.status!=='time_limit')
 if(!current||current.day!==day||current.status==='active')fail('CLARITY_RUN_CONFLICT')
 if(previousCredentialExpiresAt!==null&&(!ms(previousCredentialExpiresAt)||previousCredentialExpiresAt>now))fail('CLARITY_CREDENTIAL_BUSY')
 const last=run.clock.days.flatMap(d=>d.segments).at(-1)
 if(last&&(previousCredentialExpiresAt===null||previousCredentialExpiresAt<last.observedAt))fail('CLARITY_CREDENTIAL_BUSY')
 const remainingMs=CLARITY_LOGICAL_SESSION_MS-current.elapsedMs
 if(remainingMs<=0||!ms(now+remainingMs))fail('CLARITY_RUN_CONFLICT')
 return {expiresAt:new Date(now+remainingMs).toISOString(),
  newSessionExpireTime:new Date(now+Math.min(45000,remainingMs)).toISOString()}
}
// A persisted lease identifies one possible provider connection, not proof
// that it connected. The trusted transport adapter uses leaseId as the
// server-allocated connectionId for every event. Never accept this proof
// directly from the browser. Stop may arrive late but cannot credit time.
export function assertClarityCredentialEvent(lease,event){
 const bad=()=>fail('CLARITY_CREDENTIAL_EVENT_REJECTED')
 if(!lease||!event||!isClarityRunId(lease.leaseId)||!isClarityRunId(lease.courseRunId)||
    !isClarityRunId(lease.protocolId)||![1,2,3].includes(lease.day)||
    !ms(lease.reservedAtMs)||!ms(lease.possibleExpiresAtMs)||
    lease.possibleExpiresAtMs<=lease.reservedAtMs||
    lease.possibleExpiresAtMs-lease.reservedAtMs>CLARITY_LOGICAL_SESSION_MS)bad()
 if(event.connectionId!==lease.leaseId||event.courseRunId!==lease.courseRunId||
    event.protocolId!==lease.protocolId||event.day!==lease.day||
    !ms(event.atMs)||event.atMs<lease.reservedAtMs)bad()
 if(event.type==='begin'){
  if(event.atMs>=lease.possibleExpiresAtMs||
     event.consent?.connectionId!==lease.leaseId)bad()
 }else if(event.type==='observe'){
  if(event.atMs>lease.possibleExpiresAtMs)bad()
 }else if(!['pause','disconnect','coach_change','lost_observation'].includes(event.type))bad()
 return true
}
export function beginFreeClarityRun(input,event){
 // Free enrollment and first consent/connection event must commit together.
 // A greeting, workbook click, token mint or unauthorized begin creates no run.
 if(input.access!=='free'||input.ordinal!==1||event?.type!=='begin'||event.day!==1)fail()
 return advanceClarityRun(createClarityRun(input),event)
}
export function clarityRunSummary(run){
 validateClarityRun(run)
 const summary=clarityClockSummary(run.clock)
 return {id:run.id,ordinal:run.ordinal,access:run.access,createdAt:new Date(run.createdAt).toISOString(),
  status:summary.complete?'completed':summary.totalElapsedMs===0&&summary.days.every(d=>d.status==='not_started')?'ready':'in_progress',
  revision:summary.revision,currentDay:summary.currentDay,totalElapsedMs:summary.totalElapsedMs,
  days:summary.days.map(d=>({...d,protocolId:run.protocolIds[d.day-1]}))}
}
export function clarityRunScopeTag(id){
 if(!isClarityRunId(id))fail()
 return 'cr:'+id // 39 chars; existing journal contract allows 40.
}
export function clarityRunNotes(entries,id=null){
 const tag=id===null?null:clarityRunScopeTag(id)
 return (Array.isArray(entries)?entries:[]).filter(entry=>{
  if(!Array.isArray(entry?.tags))return false
  const scopes=entry.tags.filter(t=>typeof t==='string'&&t.startsWith('cr:'))
  return tag===null?scopes.length===0:scopes.length===1&&scopes[0]===tag
 })
}
export function clarityRunProtocolId(run,day){
 validateClarityRun(run)
 if(![1,2,3].includes(day))fail()
 return run.protocolIds[day-1]
}

// Immutable run/day association is authoritative, even before its first
// connected begin. A bound day with no clock evidence never falls back to
// another course's elapsed time.
export function clarityRunResumeMetadata(run,day,protocolId){
 if(clarityRunProtocolId(run,day)!==protocolId)fail('CLARITY_RUN_CONFLICT')
 return {courseRunId:run.id,courseOrdinal:run.ordinal,day,clarityTime:clarityClockResumeTime(run.clock,day,protocolId)}
}
// Only the private, server-read binding can authorize permanent promotion.
// A paused or unstarted bound session must remain available as a draft.
export function clarityRunReviewPatch(binding){
 if(!binding)return null
 const t=binding.clarityTime
 if(t?.status!=='time_limit'||t.elapsedSeconds!==1200||t.remainingSeconds!==0)fail('CLARITY_SESSION_STILL_OPEN')
 return {durationSeconds:1200,clarityTimeLimitReached:true}
}
export function clarityRunTranscript(protocol,day,run,updatedAt){
 const id=clarityRunProtocolId(run,day)
 if(!protocol||protocol.id!==id||protocol.courseSessionId!=='clarity_day_'+day||
  !['client_reviewed_dialogue','client_autosaved_unreviewed_draft'].includes(protocol.provenance)||!Array.isArray(protocol.turns))return null
 return {courseRunId:run.id,id,day,personaId:protocol.personaId,reviewed:protocol.provenance==='client_reviewed_dialogue',updatedAt,
  turns:protocol.turns.map(t=>({role:t.role,content:t.content,
   ...(typeof t.capturedAt==='string'&&t.capturedAt.length===24&&Number.isFinite(Date.parse(t.capturedAt))&&new Date(t.capturedAt).toISOString()===t.capturedAt?{capturedAt:t.capturedAt}:{}),
   ...(['en','ru','es'].includes(t.locale)?{locale:t.locale}:{}),
   ...(t.role==='assistant'?{personaId:t.authorPersonaId||t.coachId||protocol.personaId}:{}),
   ...(t.visitId?{visitId:t.visitId,...(t.coachId?{coachId:t.coachId}:{})}:{}),
   ...(t.interrupted===true?{interrupted:true}:{}),...(t.unanswered===true?{unanswered:true}:{})}))}
}
