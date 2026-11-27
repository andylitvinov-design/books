// Internal domain for a separately authorized course run. No enrollment,
// payment, model or browser input may construct a trusted event directly.
import {ANTI_STRESS_PROGRAM_ID,ANTI_STRESS_SESSION_IDS} from './coach-program-mode.mjs'
import {ANTI_STRESS_VERSION,antiStressScenario,antiStressDirective,antiStressResult,antiStressProtocolRows} from './anti-stress-course.mjs'
import {createAntiStressCourseClock,validateAntiStressCourseClock,advanceAntiStressCourseClock,antiStressClockSummary,antiStressClockResumeTime,antiStressClockNewDailyClaims,ANTI_STRESS_CLOCK_MAX_GAP_MS,ANTI_STRESS_LOGICAL_SESSION_MS} from './anti-stress-clock.mjs'
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

// Only an internal verified provider/Director adapter may construct these events.
// No browser/model-supplied confirmation flags. Corrections append history.
const reviewToken=v=>typeof v==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(v)
const rejectReview=()=>fail('ANTI_STRESS_REVIEW_CONFLICT')
export function appendAntiStressObservation(run,sessionId,protocolId,prior,event){
 const binding=antiStressRunBinding(run,sessionId,protocolId),day=run.clock.days[binding.number-1]
 const scope={courseRunId:run.id,sessionId,protocolId,scenarioVersion:binding.scenarioVersion}
 const matches=o=>o&&Object.entries(scope).every(([k,v])=>o[k]===v)
 if(!matches(event)||!stamp(event.atMs)||!reviewToken(event.eventId)||!['turn','review'].includes(event.kind))rejectReview()
 const state=prior??{...scope,revision:0,turns:[],reviews:[],rows:[]}
 if(!matches(state)||!Array.isArray(state.turns)||!Array.isArray(state.reviews)||!Array.isArray(state.rows)||state.revision!==state.turns.length+state.reviews.length)rejectReview()
 const history=[...state.turns,...state.reviews],seen=history.find(x=>x.eventId===event.eventId)
 if(seen){if(JSON.stringify(seen)!==JSON.stringify(event))rejectReview();return state}
 if(event.expectedRevision!==state.revision||state.revision>=4000)rejectReview()
 const seg=day.segments.find(x=>x.segmentId===event.segmentId&&x.connectionId===event.connectionId&&x.coachId===event.coachId)
 if(!seg||event.atMs<seg.startedAt||event.atMs>seg.observedAt||history.some(x=>x.atMs>event.atMs))rejectReview()
 if(event.kind==='turn'){
  if(event.proof!=='server_observed_final_turn'||!reviewToken(event.turnId)||!['client','coach'].includes(event.role)||typeof event.text!=='string'||!event.text.trim()||event.text.length>8000||state.turns.some(x=>x.turnId===event.turnId))rejectReview()
  return {...state,revision:state.revision+1,turns:[...state.turns,{...event}]}
 }
 const field=antiStressScenario(sessionId).fields.find(f=>f.id===event.fieldId)
 if(!field||event.proof!=='server_observed_explicit_field_review'||!['confirmed','skipped'].includes(event.status)||event.role!=='client')rejectReview()
 const question=state.turns.find(x=>x.turnId===event.questionTurnId),answer=state.turns.find(x=>x.turnId===event.answerTurnId),ack=state.turns.find(x=>x.turnId===event.confirmationTurnId)
 if(!question||question.role!=='coach'||!answer||answer.role!=='client'||!ack||ack.role!=='client'||answer===ack||question.atMs>answer.atMs||answer.atMs>ack.atMs||ack.atMs>event.atMs||ack.segmentId!==event.segmentId||state.reviews.some(x=>x.confirmationTurnId===ack.turnId))rejectReview()
 // The trusted adapter must bind the acknowledged question/value; raw model
 // guesses are not evidence. This reducer does not infer semantic agreement.
 const v=event.value,valid=field.kind==='rating'?Number.isInteger(v)&&v>=0&&v<=10:field.kind==='choice'?field.choices.includes(v):typeof v==='string'&&v.trim().length>0&&v.length<=2000
 if(event.status==='confirmed'?!valid:v!==null)rejectReview()
 const row={fieldId:field.id,scenarioVersion:scope.scenarioVersion,status:event.status,value:v,reviewed:true,evidenceId:event.eventId,sourceTurnIds:[question.turnId,answer.turnId,ack.turnId],coachId:event.coachId,confirmedAt:event.atMs}
 return {...state,revision:state.revision+1,reviews:[...state.reviews,{...event}],rows:[...state.rows.filter(x=>x.fieldId!==field.id),row]}
}

// Independent meditation artifact; never overwrite client edits on projection.
export function antiStressMeditationArtifact(run,protocolId,ledger,prior,action,locale='en'){
 const sid=ANTI_STRESS_SESSION_IDS[0],report=antiStressBoundProtocol(run,sid,protocolId,ledger,locale),draft=report.result.meditation
 const scope={courseRunId:run.id,protocolId,sessionId:sid,scenarioVersion:report.binding.scenarioVersion}
 const ready=run.clock.days[0].status==='time_limit'&&draft?.status==='draft'
 const bad=()=>fail('ANTI_STRESS_MEDITATION_CONFLICT')
 const valid=v=>typeof v==='string'&&v.trim().length>0&&v.length<=12000
 if(prior&&(!Object.entries(scope).every(([k,v])=>prior[k]===v)||!Number.isSafeInteger(prior.revision)||prior.revision<1||!['draft','saved','declined'].includes(prior.status)||!Array.isArray(prior.sourceEvidenceIds)||!['en','ru','es'].includes(prior.language)||!(prior.status==='declined'?prior.body===null:valid(prior.body))))bad()
 const current=ready&&prior&&JSON.stringify(prior.sourceEvidenceIds)===JSON.stringify(draft.sourceEvidenceIds)&&Array.isArray(prior.gateEvidenceIds)&&JSON.stringify(prior.gateEvidenceIds)===JSON.stringify(draft.gateEvidenceIds)
 if(action?.type==='view')return !prior?null:prior.status==='declined'?{...scope,status:'declined',revision:prior.revision,body:null}:current?prior:{...scope,status:'needs_review',revision:prior.revision,body:null}
 if(!action||!stamp(action.atMs)||action.expectedRevision!==(prior?.revision??0))bad()
 if(action.type==='create'){
  if(prior||!ready||action.safeClosureVerified!==true||action.storageConsentVerified!==true)bad()
  return {...scope,revision:1,status:'draft',title:draft.title,body:draft.body,language:draft.language,sourceEvidenceIds:[...draft.sourceEvidenceIds],gateEvidenceIds:[...draft.gateEvidenceIds],createdAt:action.atMs,updatedAt:action.atMs}
 }
 if(!prior||action.atMs<prior.updatedAt)bad()
 if(action.type==='decline')return {...prior,revision:prior.revision+1,status:'declined',body:null,updatedAt:action.atMs}
 if(action.type!=='save'||!current||prior.status==='declined'||!valid(action.body))bad()
 return {...prior,revision:prior.revision+1,status:'saved',body:action.body.trim(),updatedAt:action.atMs}
}

// Recovery uses server time, never guesses a disconnect, completion or consent.
export function expireAntiStressRunObservation(run,atMs){
 validateAntiStressRun(run)
 if(!stamp(atMs)||(run.clock.lastEventAt!==null&&atMs<run.clock.lastEventAt))fail('ANTI_STRESS_RUN_CONFLICT')
 const day=run.clock.days.find(d=>d.status==='active')
 if(!day)return run
 const segment=day.segments.at(-1)
 if(atMs-segment.observedAt<=ANTI_STRESS_CLOCK_MAX_GAP_MS)return run
 return advanceAntiStressRun(run,{courseRunId:run.id,sessionId:ANTI_STRESS_SESSION_IDS[day.day-1],expectedRevision:run.clock.revision,day:day.day,protocolId:day.protocolId,segmentId:segment.segmentId,connectionId:segment.connectionId,type:'lost_observation',atMs,evidence:'server_observed_stop'})
}
// A credential budget is not authorization or a connection receipt.
// Caller must reserve the latest possible expiry under the account-wide
// mint lock before issuing any token, including failed/ambiguous responses.
export function antiStressRunCredentialWindow(run,{sessionId,protocolId,now,previousCredentialExpiresAt}={}){
 const binding=antiStressRunBinding(run,sessionId,protocolId)
 if(!stamp(now)||now<run.createdAt||(run.clock.lastEventAt!==null&&now<run.clock.lastEventAt))fail('ANTI_STRESS_RUN_CONFLICT')
 const current=run.clock.days.find(d=>d.status!=='time_limit')
 if(!current||current.day!==binding.number||current.status==='active')fail('ANTI_STRESS_RUN_CONFLICT')
 if(previousCredentialExpiresAt!==null&&(!stamp(previousCredentialExpiresAt)||previousCredentialExpiresAt>now))fail('ANTI_STRESS_CREDENTIAL_BUSY')
 const last=run.clock.days.flatMap(d=>d.segments).at(-1)
 if(last&&(previousCredentialExpiresAt===null||previousCredentialExpiresAt<last.observedAt))fail('ANTI_STRESS_CREDENTIAL_BUSY')
 const remainingMs=ANTI_STRESS_LOGICAL_SESSION_MS-current.elapsedMs
 if(remainingMs<=0||!stamp(now+remainingMs))fail('ANTI_STRESS_RUN_CONFLICT')
 return {expiresAt:new Date(now+remainingMs).toISOString(),newSessionExpireTime:new Date(now+Math.min(45000,remainingMs)).toISOString()}
}
