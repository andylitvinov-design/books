// Internal domain for a separately authorized course run. No enrollment,
// payment, model or browser input may construct a trusted event directly.
import {ANTI_STRESS_PROGRAM_ID,ANTI_STRESS_SESSION_IDS} from './coach-program-mode.mjs'
import {ANTI_STRESS_VERSION,antiStressScenario,antiStressDirective,antiStressResult,antiStressProtocolRows} from './anti-stress-course.mjs'
import {createAntiStressCourseClock,validateAntiStressCourseClock,advanceAntiStressCourseClock,antiStressClockSummary,antiStressClockResumeTime,antiStressClockNewDailyClaims} from './anti-stress-clock.mjs'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const validId=v=>typeof v==='string'&&uuid.test(v)
const stamp=v=>Number.isSafeInteger(v)&&v>=0&&v<=8640000000000000
const fail=(code='ANTI_STRESS_RUN_INVALID')=>{throw Error(code)}
export function createAntiStressRun({id,protocolIds,createdAt,access}){
 return validateAntiStressRun({version:1,id,programId:ANTI_STRESS_PROGRAM_ID,programType:'therapy',scenarioVersion:ANTI_STRESS_VERSION,protocolIds:[...protocolIds],createdAt,access,clock:createAntiStressCourseClock({dailyPolicy:access})})
}
export function validateAntiStressRun(run){
 if(!run||run.version!==1||!validId(run.id)||run.programId!==ANTI_STRESS_PROGRAM_ID||run.programType!=='therapy'||run.scenarioVersion!==ANTI_STRESS_VERSION||!stamp(run.createdAt)||!['free','paid'].includes(run.access)||!Array.isArray(run.protocolIds)||run.protocolIds.length!==3||run.protocolIds.some(id=>!validId(id)||id===run.id)||new Set(run.protocolIds).size!==3)fail()
 validateAntiStressCourseClock(run.clock)
 if((run.clock.dailyPolicy==='paid')!==(run.access==='paid'))fail()
 for(const d of run.clock.days){
  if(d.protocolId!==null&&d.protocolId!==run.protocolIds[d.day-1])fail()
  if(d.segments.some(s=>s.startedAt<run.createdAt))fail()
 }
 return run
}
export function antiStressRunBinding(run,sessionId,protocolId){
 validateAntiStressRun(run)
 const index=ANTI_STRESS_SESSION_IDS.indexOf(sessionId)
 if(index<0||run.protocolIds[index]!==protocolId)fail('ANTI_STRESS_RUN_CONFLICT')
 return {courseRunId:run.id,programId:run.programId,programType:run.programType,scenarioVersion:antiStressScenario(sessionId).version,sessionId,protocolId,number:index+1,time:antiStressClockResumeTime(run.clock,index+1,protocolId)}
}
export function advanceAntiStressRun(run,event){
 validateAntiStressRun(run)
 if(!event||event.courseRunId!==run.id||!stamp(event.atMs)||event.atMs<run.createdAt||![1,2,3].includes(event.day)||event.protocolId!==run.protocolIds[event.day-1]||event.sessionId!==ANTI_STRESS_SESSION_IDS[event.day-1])fail('ANTI_STRESS_RUN_CONFLICT')
 return validateAntiStressRun({...run,clock:advanceAntiStressCourseClock(run.clock,event)})
}
export function antiStressRunSummary(run){
 validateAntiStressRun(run)
 const s=antiStressClockSummary(run.clock)
 return {id:run.id,programId:run.programId,programType:run.programType,scenarioVersion:run.scenarioVersion,access:run.access,status:s.complete?'completed':s.days.every(d=>d.status==='not_started')?'ready':'in_progress',revision:s.revision,totalElapsedMs:s.totalElapsedMs,currentDay:s.currentDay,days:s.days.map((d,i)=>({...d,sessionId:ANTI_STRESS_SESSION_IDS[i],protocolId:run.protocolIds[i]}))}
}
export function antiStressRunNewDailyClaims(before,after){
 validateAntiStressRun(after)
 if(before){validateAntiStressRun(before);if(before.id!==after.id||before.access!==after.access||before.createdAt!==after.createdAt||before.protocolIds.some((id,i)=>id!==after.protocolIds[i]))fail('ANTI_STRESS_RUN_CONFLICT')}
 return antiStressClockNewDailyClaims(before?.clock??null,after.clock)
}
// Reviewed rows must originate from an authenticated, exact-run ledger reader.
// Never accept client-supplied reviewed flags as authoritative provenance.
export function antiStressBoundProtocol(run,sessionId,protocolId,ledger,locale='en'){
 const binding=antiStressRunBinding(run,sessionId,protocolId)
 if(!ledger||ledger.courseRunId!==run.id||ledger.protocolId!==protocolId||ledger.sessionId!==sessionId||ledger.scenarioVersion!==binding.scenarioVersion||!Array.isArray(ledger.rows))fail('ANTI_STRESS_LEDGER_CONFLICT')
 return {binding,rows:antiStressProtocolRows(sessionId,ledger.rows,locale),result:antiStressResult(sessionId,ledger.rows,locale)}
}
// This is the server-owned Director adapter. Actual consent/clock come from
// persisted observations. The trusted safety classifier must supply context.
// No elapsed time or sessionConsent from a browser/model can override binding.
export function antiStressRunDirective(run,sessionId,protocolId,ledger,context={},locale='en'){
 const {binding,rows}=antiStressBoundProtocol(run,sessionId,protocolId,ledger,locale)
 const consent=rows.find(r=>r.fieldId==='practice_consent'&&r.status==='confirmed')?.value
 const time=binding.time
 return antiStressDirective(sessionId,{safetyState:context.safetyState,clientRequest:context.clientRequest,distressIncreased:context.distressIncreased,
  connected:context.connected===true,paused:time?.status==='paused',sessionConsent:time?'accepted':undefined,practiceConsent:consent,elapsedSeconds:time?.elapsedSeconds},locale)
}
