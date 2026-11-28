import 'server-only'
import {randomUUID} from 'node:crypto'
import {transaction} from './database.js'
import {seal,openSealed} from './crypto.js'
import {AppError} from '../assessments/contracts.js'
import {lockCourseOwner} from './course-access.js'
import {claimTrustedFreeCoachingDays,assertFreeCoachingDayAvailable} from './coaching-free-day-quota.js'
import {ANTI_STRESS_SESSION_IDS} from '../coaching/coach-program-mode.mjs'
import {antiStressReviewStamp,projectAntiStressPrivateMemory} from '../coaching/anti-stress-private-memory.mjs'
import {antiStressExactObservedReview} from '../coaching/anti-stress-observed-review.mjs'
import {createAntiStressRun,validateAntiStressRun,advanceAntiStressRun,antiStressRunSummary,antiStressRunBinding,antiStressRunNewDailyClaims,antiStressBoundProtocol,appendAntiStressObservation,antiStressMeditationArtifact,expireAntiStressRunObservation,antiStressRunCredentialWindow,assertAntiStressCredentialEvent} from '../coaching/anti-stress-runs.mjs'
// Hard gate: provider observations, consent/review writer, global live lease,
// entitlement and reviewed RLS/privacy migration are not activated.
const TRUSTED_ANTI_STRESS_ADAPTER_READY=false
export const antiStressStorageEnabled=()=>TRUSTED_ANTI_STRESS_ADAPTER_READY&&process.env.HH_ANTI_STRESS_RUNS_ENABLED==='true'
const unavailable=()=>new AppError('ANTI_STRESS_UNAVAILABLE',503)
const conflict=()=>new AppError('ANTI_STRESS_CONFLICT',409)
const missing=()=>new AppError('ANTI_STRESS_NOT_FOUND',404)
const enabled=()=>{if(!antiStressStorageEnabled())throw unavailable()}
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)
const context=(actor,id,field)=>({accountId:actor.id,recordId:id,field})
const columns='id,revision,payload_ciphertext'
function decode(row,actor,config){
 if(!row)throw missing()
 try{
  const run=validateAntiStressRun(openSealed(row.payload_ciphertext,context(actor,row.id,'anti-stress.run'),config))
  if(run.id!==row.id||run.clock.revision!==Number(row.revision))throw Error('binding')
  return run
 }catch{throw unavailable()}
}
async function read(db,actor,config,id,lock=false){
 if(!uuid(id))throw missing()
 return decode((await db.query('select '+columns+' from app_private.anti_stress_runs where account_id=$1 and id=$2'+(lock?' for update':''),[actor.id,id])).rows[0],actor,config)
}
async function stamp(db){return Number((await db.query('select floor(extract(epoch from clock_timestamp())*1000)::bigint as now_ms')).rows[0].now_ms)}
async function fresh(db,event){
 const now=await stamp(db)
 if(!Number.isSafeInteger(event?.atMs)||event.atMs>now||now-event.atMs>15000)throw conflict()
}
// Both tables are proposals. All live coaching entry points must share the
// owner lock and lease invariant before this gate can be removed.
async function noOtherActive(db,actor,id){
 const a=(await db.query('select id from app_private.anti_stress_runs where account_id=$1 and id<>$2 and live_active=true limit 1',[actor.id,id])).rows
 const b=(await db.query('select id from app_private.clarity_course_runs where account_id=$1 and live_active=true limit 1',[actor.id])).rows
 if(a.length||b.length)throw conflict()
}
// Shared reservation table: historical Clarity name, one row per account
// for both courses. Do not release it after an ambiguous mint failure.
// No enrollment, daily claim or provider call occurs during reservation.
export async function reserveAntiStressRunCredential(config,actor,{runId,sessionId,protocolId,firstProtocolIds=null,entitlement}){
 enabled()
 if(!uuid(runId)||!uuid(protocolId)||!ANTI_STRESS_SESSION_IDS.includes(sessionId)||!entitlement||entitlement.accountId!==actor.id||entitlement.courseRunId!==runId||entitlement.programId!=='anti-stress-three-session'||entitlement.verified!==true||!['free','paid'].includes(entitlement.access))throw conflict()
 return transaction(config,actor,async db=>{
  await lockCourseOwner(db,actor)
  const now=await stamp(db)
  let run
  if(firstProtocolIds!==null){
   if(sessionId!==ANTI_STRESS_SESSION_IDS[0]||!Array.isArray(firstProtocolIds)||firstProtocolIds[0]!==protocolId)throw conflict()
   if((await db.query('select id from app_private.anti_stress_runs where account_id=$1 and id=$2',[actor.id,runId])).rows.length)throw conflict()
   try{run=createAntiStressRun({id:runId,protocolIds:firstProtocolIds,createdAt:now,access:entitlement.access})}catch{throw conflict()}
  }else run=await read(db,actor,config,runId,true)
  if(run.access!==entitlement.access)throw conflict()
  await noOtherActive(db,actor,run.id)
  const old=(await db.query('select possible_expires_at_ms,provider_closed_at_ms from app_private.clarity_live_credential_windows where account_id=$1 for update',[actor.id])).rows[0]
  const previousCredentialExpiresAt=old?Math.min(Number(old.possible_expires_at_ms),old.provider_closed_at_ms==null?Infinity:Number(old.provider_closed_at_ms)):null
  let window,binding
  try{binding=antiStressRunBinding(run,sessionId,protocolId);window=antiStressRunCredentialWindow(run,{sessionId,protocolId,now,previousCredentialExpiresAt})}catch(error){throw new AppError(error?.message==='ANTI_STRESS_CREDENTIAL_BUSY'?'ANTI_STRESS_CREDENTIAL_BUSY':'ANTI_STRESS_CONFLICT',409)}
  if(run.access==='free')await assertFreeCoachingDayAvailable(db,actor,{calendarDay:new Date(now).toISOString().slice(0,10),protocolId})
  const leaseId=randomUUID(),possibleExpiresAt=Date.parse(window.expiresAt)
  const result=await db.query("insert into app_private.clarity_live_credential_windows(account_id,lease_id,course_run_id,course_day,protocol_id,reserved_at_ms,possible_expires_at_ms,program_kind) values($1,$2,$3,$4,$5,$6,$7,'therapy') on conflict(account_id) do update set lease_id=excluded.lease_id,course_run_id=excluded.course_run_id,course_day=excluded.course_day,protocol_id=excluded.protocol_id,reserved_at_ms=excluded.reserved_at_ms,possible_expires_at_ms=excluded.possible_expires_at_ms,program_kind=excluded.program_kind,provider_closed_at_ms=null where (clarity_live_credential_windows.possible_expires_at_ms<=excluded.reserved_at_ms or clarity_live_credential_windows.provider_closed_at_ms<=excluded.reserved_at_ms) returning lease_id",
   [actor.id,leaseId,run.id,binding.number,protocolId,now,possibleExpiresAt])
  if(result.rows.length!==1||result.rows[0].lease_id!==leaseId)throw new AppError('ANTI_STRESS_CREDENTIAL_BUSY',409)
  const reviewRevision=firstProtocolIds!==null?0:Number((await db.query('select review_revision from app_private.anti_stress_sessions where account_id=$1 and course_run_id=$2 and session_number=$3 and protocol_id=$4',[actor.id,run.id,binding.number,protocolId])).rows[0]?.review_revision)
  if(!Number.isSafeInteger(reviewRevision)||reviewRevision<0)throw conflict()
  return {leaseId,run,sessionId,protocolId,now,previousCredentialExpiresAt,reviewRevision,reservedExpiresAt:window.expiresAt,...window}
 })
}
async function requireAntiStressCredentialEvent(db,actor,event,observation=false){
 const row=(await db.query('select lease_id,course_run_id,course_day,protocol_id,reserved_at_ms,possible_expires_at_ms,program_kind,provider_closed_at_ms from app_private.clarity_live_credential_windows where account_id=$1 for update',[actor.id])).rows[0]
 if(!row||row.provider_closed_at_ms!==null)throw conflict()
 try{assertAntiStressCredentialEvent({leaseId:row.lease_id,courseRunId:row.course_run_id,day:Number(row.course_day),protocolId:row.protocol_id,reservedAtMs:Number(row.reserved_at_ms),possibleExpiresAtMs:Number(row.possible_expires_at_ms),programKind:row.program_kind},event,{observation})}catch{throw conflict()}
}
// entitlement is an INTERNAL settled access decision, not a submitted client
// payload. No payment/free-offer policy is inferred from the program type.
export async function beginTrustedAntiStressRun(config,actor,{id,protocolIds,entitlement,event}){
 enabled()
 if(!entitlement||entitlement.accountId!==actor.id||entitlement.programId!=='anti-stress-three-session'||entitlement.courseRunId!==id||entitlement.verified!==true||!['free','paid'].includes(entitlement.access)||!uuid(id)||event?.type!=='begin'||event.day!==1)throw conflict()
 return transaction(config,actor,async db=>{
  await lockCourseOwner(db,actor)
  await fresh(db,event)
  await requireAntiStressCredentialEvent(db,actor,event)
  await noOtherActive(db,actor,id)
  let run
  try{run=advanceAntiStressRun(createAntiStressRun({id,protocolIds,createdAt:event.atMs,access:entitlement.access}),event)}catch{throw conflict()}
  await claimTrustedFreeCoachingDays(db,actor,antiStressRunNewDailyClaims(null,run))
  const inserted=await db.query('insert into app_private.anti_stress_runs(account_id,id,revision,payload_ciphertext,live_active) values($1,$2,$3,$4,true) returning id',[actor.id,id,run.clock.revision,seal(run,context(actor,id,'anti-stress.run'),config)])
  if(inserted.rows.length!==1)throw conflict()
  for(const [i,protocolId] of run.protocolIds.entries())await db.query('insert into app_private.anti_stress_sessions(account_id,course_run_id,session_number,protocol_id) values($1,$2,$3,$4)',[actor.id,id,i+1,protocolId])
  return antiStressRunSummary(run)
 })
}
export async function applyTrustedAntiStressRunEvent(config,actor,event){
 enabled()
 return transaction(config,actor,async db=>{
  await lockCourseOwner(db,actor)
  const before=await read(db,actor,config,event?.courseRunId,true)
  await fresh(db,event)
  await requireAntiStressCredentialEvent(db,actor,event)
  if(event.type==='begin')await noOtherActive(db,actor,before.id)
  let after
  try{after=advanceAntiStressRun(before,event)}catch{throw conflict()}
  await claimTrustedFreeCoachingDays(db,actor,antiStressRunNewDailyClaims(before,after))
  const changed=await db.query('update app_private.anti_stress_runs set revision=$3,payload_ciphertext=$4,live_active=$5,updated_at=now() where account_id=$1 and id=$2 and revision=$6 returning id',[actor.id,after.id,after.clock.revision,seal(after,context(actor,after.id,'anti-stress.run'),config),after.clock.days.some(d=>d.status==='active'),before.clock.revision])
  if(changed.rows.length!==1)throw conflict()
  return antiStressRunSummary(after)
 })
}
export async function readAntiStressSession(config,actor,runId,sessionId,locale,view='result'){
 enabled()
 const index=ANTI_STRESS_SESSION_IDS.indexOf(sessionId)
 if(index<0||!['result','protocol','log'].includes(view))throw missing()
 return transaction(config,actor,async db=>{
  const run=await read(db,actor,config,runId)
  const protocolId=run.protocolIds[index],binding=antiStressRunBinding(run,sessionId,protocolId)
  const field=view==='log'?'log_ciphertext':view==='protocol'?'ledger_ciphertext':'ledger_ciphertext,meditation_revision,meditation_ciphertext'
  const row=(await db.query('select protocol_id,review_revision,'+field+' from app_private.anti_stress_sessions where account_id=$1 and course_run_id=$2 and session_number=$3',[actor.id,run.id,index+1])).rows[0]
  if(!row||row.protocol_id!==protocolId)throw unavailable()
  const empty={courseRunId:run.id,sessionId,protocolId,scenarioVersion:binding.scenarioVersion,rows:[]}
  try{
   const reviewRevision=Number(row.review_revision)
   if(!Number.isSafeInteger(reviewRevision)||reviewRevision<0)throw Error('revision')
   const base={run:antiStressRunSummary(run),binding,reviewRevision}
   if(view==='log'){
    if(Boolean(reviewRevision)!==Boolean(row.log_ciphertext))throw Error('log revision')
    const log=row.log_ciphertext?openSealed(row.log_ciphertext,context(actor,protocolId,'anti-stress.log'),config):null
    if(log!==null&&(log.courseRunId!==run.id||log.sessionId!==sessionId||log.protocolId!==protocolId||log.scenarioVersion!==binding.scenarioVersion||log.revision!==reviewRevision||!Array.isArray(log.turns)))throw Error('log binding')
    return {...base,log}
   }
   if(Boolean(reviewRevision)!==Boolean(row.ledger_ciphertext))throw Error('ledger revision')
   const ledger=row.ledger_ciphertext?openSealed(row.ledger_ciphertext,context(actor,protocolId,'anti-stress.ledger'),config):empty
   if(reviewRevision&&ledger.revision!==reviewRevision)throw Error('ledger revision mismatch')
   const report=antiStressBoundProtocol(run,sessionId,protocolId,ledger,locale)
   if(view==='protocol')return {...base,protocol:{binding,rows:report.rows}}
   if(index===0){
    const revision=Number(row.meditation_revision)
    if(!Number.isSafeInteger(revision)||revision<0||Boolean(revision)!==Boolean(row.meditation_ciphertext))throw Error('meditation revision')
    const prior=revision?openSealed(row.meditation_ciphertext,context(actor,protocolId,'anti-stress.meditation'),config):null
    if(prior&&prior.revision!==revision)throw Error('meditation mismatch')
    report.result.meditation=antiStressMeditationArtifact(run,protocolId,ledger,prior,{type:'view'},prior?.language||locale)
    report.result.meditationAvailability=antiStressMeditationArtifact(run,protocolId,ledger,prior,{type:'availability'},locale)
   }
   return {...base,result:report.result}
  }catch{throw unavailable()}
 })
}
// Reviewed ledger and log writers must be attached to the actual verified
// Director/question/turn acknowledgement service before activation. No browser POST.

// Internal only; actual provider/Director evidence and consent adapter pending.
export async function appendTrustedAntiStressObservation(config,actor,event,permission,{locale=null}={}){
 enabled()
 if(!permission||permission.accountId!==actor.id||permission.courseRunId!==event?.courseRunId||permission.protocolId!==event?.protocolId||permission.verified!==true||permission.decision!=='accepted')throw conflict()
 return transaction(config,actor,async db=>{
  await lockCourseOwner(db,actor)
  const run=await read(db,actor,config,event.courseRunId,true)
  await fresh(db,event)
  await requireAntiStressCredentialEvent(db,actor,event,true)
  const binding=antiStressRunBinding(run,event.sessionId,event.protocolId),pid=binding.protocolId
  const row=(await db.query('select protocol_id,review_revision,ledger_ciphertext,log_ciphertext,last_reviewed_at_ms from app_private.anti_stress_sessions where account_id=$1 and course_run_id=$2 and session_number=$3 for update',[actor.id,run.id,binding.number])).rows[0]
  if(!row||row.protocol_id!==pid)throw conflict()
  const revision=Number(row.review_revision)
  let prior,next
  try{
   if(!Number.isSafeInteger(revision)||revision<0||(!revision&&(row.log_ciphertext||row.ledger_ciphertext)))throw Error('revision')
   prior=revision?openSealed(row.log_ciphertext,context(actor,pid,'anti-stress.log'),config):null
   const ledger=revision?openSealed(row.ledger_ciphertext,context(actor,pid,'anti-stress.ledger'),config):null
   if(revision&&(!prior||prior.revision!==revision||ledger?.revision!==revision||JSON.stringify(prior.rows)!==JSON.stringify(ledger.rows)))throw Error('projection mismatch')
   const reviewStamp=antiStressReviewStamp(prior?.rows??[])
   if(reviewStamp!==(row.last_reviewed_at_ms==null?null:Number(row.last_reviewed_at_ms)))throw Error('review timestamp mismatch')
   next=appendAntiStressObservation(run,event.sessionId,pid,prior,event)
   // Only a newly observed real client acknowledgement may create a review.
   // The exact authored question, actual answer and exact echo are checked
   // against the same encrypted log, then committed with the log in one CAS.
   if(next!==prior&&event.kind==='turn'&&event.role==='client'&&['en','ru','es'].includes(locale)){
    const candidate=antiStressExactObservedReview({sessionId:event.sessionId,turns:next.turns,locale})
    if(candidate){
     const review={...candidate,eventId:randomUUID(),expectedRevision:next.revision}
     await requireAntiStressCredentialEvent(db,actor,review,true)
     next=appendAntiStressObservation(run,event.sessionId,pid,next,review)
    }
   }
  }catch{throw conflict()}
  if(next===prior)return {reviewRevision:revision}
  const ledger={courseRunId:next.courseRunId,sessionId:next.sessionId,protocolId:pid,scenarioVersion:next.scenarioVersion,revision:next.revision,rows:next.rows}
  const changed=await db.query('update app_private.anti_stress_sessions set review_revision=$4,ledger_ciphertext=$5,log_ciphertext=$6,last_reviewed_at_ms=$8 where account_id=$1 and course_run_id=$2 and session_number=$3 and review_revision=$7 returning protocol_id',[actor.id,run.id,binding.number,next.revision,seal(ledger,context(actor,pid,'anti-stress.ledger'),config),seal(next,context(actor,pid,'anti-stress.log'),config),revision,antiStressReviewStamp(next.rows)])
  if(changed.rows.length!==1)throw conflict()
  return {reviewRevision:next.revision}
 })
}

// Exact most recently reviewed owner session. Clock heartbeats and transcript
// append do not change the ordering; a correction/skip replaces the old fact.
// Never decrypt log or meditation for this view.
export async function readLatestAntiStressPrivateMemory(config,actor,exclude=null,locale='en'){
 enabled()
 if(exclude!==null&&!uuid(exclude))throw conflict()
 return transaction(config,actor,async db=>{
  const sql='select s.course_run_id,s.session_number,s.protocol_id,s.review_revision,s.ledger_ciphertext,s.last_reviewed_at_ms,r.id,r.revision,r.payload_ciphertext from app_private.anti_stress_sessions s join app_private.anti_stress_runs r on r.account_id=s.account_id and r.id=s.course_run_id where s.account_id=$1 and s.last_reviewed_at_ms is not null'+(exclude===null?'':' and s.protocol_id<>$2::uuid')+' order by s.last_reviewed_at_ms desc,s.protocol_id desc limit 1'
  const row=(await db.query(sql,exclude===null?[actor.id]:[actor.id,exclude])).rows[0]
  if(!row)return null
  try{
   const run=decode(row,actor,config),index=Number(row.session_number)-1,protocolId=row.protocol_id
   if(run.id!==row.course_run_id||index<0||index>2||!Number.isInteger(index)||run.protocolIds[index]!==protocolId||protocolId===exclude)throw Error('binding')
   const ledger=openSealed(row.ledger_ciphertext,context(actor,protocolId,'anti-stress.ledger'),config)
   const revision=Number(row.review_revision)
   if(!Number.isSafeInteger(revision)||revision<1||ledger.revision!==revision)throw Error('revision')
   return projectAntiStressPrivateMemory(run,ANTI_STRESS_SESSION_IDS[index],protocolId,ledger,Number(row.last_reviewed_at_ms),locale)
  }catch{throw unavailable()}
 })
}

// Exact owner-scoped encrypted run, only for the trusted relay entry.
export async function readAntiStressRunForRelay(config,actor,runId){
 enabled()
 return transaction(config,actor,db=>read(db,actor,config,runId))
}
export async function readAntiStressRunSummary(config,actor,runId){
 enabled()
 return transaction(config,actor,async db=>antiStressRunSummary(await read(db,actor,config,runId)))
}

export async function listAntiStressRuns(config,actor,before=null){
 enabled()
 if(before!==null&&!uuid(before))throw missing()
 return transaction(config,actor,async db=>{
  const rows=(await db.query('select '+columns+' from app_private.anti_stress_runs where account_id=$1'+(before===null?'':' and id<$2::uuid')+' order by id desc limit 21',before===null?[actor.id]:[actor.id,before])).rows
  return {runs:rows.slice(0,20).map(row=>antiStressRunSummary(decode(row,actor,config))),nextCursor:rows.length>20?rows[19].id:null}
 })
}

async function mutateMeditation(config,actor,runId,protocolId,action,locale){
 enabled()
 return transaction(config,actor,async db=>{
  await lockCourseOwner(db,actor)
  const run=await read(db,actor,config,runId,true)
  antiStressRunBinding(run,ANTI_STRESS_SESSION_IDS[0],protocolId)
  const row=(await db.query('select protocol_id,review_revision,ledger_ciphertext,meditation_revision,meditation_ciphertext from app_private.anti_stress_sessions where account_id=$1 and course_run_id=$2 and session_number=1 for update',[actor.id,run.id])).rows[0]
  if(!row||row.protocol_id!==protocolId||!row.ledger_ciphertext)throw conflict()
  const revision=Number(row.meditation_revision)
  let next
  try{
   if(!Number.isSafeInteger(revision)||revision<0||Boolean(revision)!==Boolean(row.meditation_ciphertext))throw Error('revision')
   const ledger=openSealed(row.ledger_ciphertext,context(actor,protocolId,'anti-stress.ledger'),config)
   const reviewRevision=Number(row.review_revision)
   if(!Number.isSafeInteger(reviewRevision)||reviewRevision<1||ledger.revision!==reviewRevision)throw Error('ledger revision mismatch')
   const prior=revision?openSealed(row.meditation_ciphertext,context(actor,protocolId,'anti-stress.meditation'),config):null
   if(prior&&prior.revision!==revision)throw Error('revision mismatch')
   next=antiStressMeditationArtifact(run,protocolId,ledger,prior,{...action,atMs:await stamp(db)},prior?.language||locale)
  }catch{throw conflict()}
  const changed=await db.query('update app_private.anti_stress_sessions set meditation_revision=$3,meditation_ciphertext=$4 where account_id=$1 and course_run_id=$2 and session_number=1 and meditation_revision=$5 returning protocol_id',[actor.id,run.id,next.revision,seal(next,context(actor,protocolId,'anti-stress.meditation'),config),revision])
  if(changed.rows.length!==1)throw conflict()
  return next
 })
}
// Closure and permission are internal trusted adapter receipts, never JSON input.
export async function finalizeTrustedAntiStressMeditation(config,actor,{runId,protocolId,locale,closure,permission}){
 if(!closure||closure.accountId!==actor.id||closure.courseRunId!==runId||closure.protocolId!==protocolId||closure.verified!==true||closure.safetyState!=='clear'||closure.kind!=='safe_session_closure'||!permission||permission.accountId!==actor.id||permission.courseRunId!==runId||permission.protocolId!==protocolId||permission.verified!==true||permission.decision!=='accepted')throw conflict()
 return mutateMeditation(config,actor,runId,protocolId,{type:'create',expectedRevision:0,safeClosureVerified:true,storageConsentVerified:true},locale)
}
export async function editOwnedAntiStressMeditation(config,actor,{runId,protocolId,type,expectedRevision,body,locale,ownerConfirmed,storageConsent,readyToRead,expectedReviewRevision}){
 if(type==='owner_request'){
  if(expectedRevision!==0||ownerConfirmed!==true||storageConsent!==true||readyToRead!==true||!Number.isSafeInteger(expectedReviewRevision)||expectedReviewRevision<1||!['en','ru','es'].includes(locale)||body!==undefined)throw conflict()
  return mutateMeditation(config,actor,runId,protocolId,{type,expectedRevision,ownerConfirmed,storageConsent,readyToRead,expectedReviewRevision},locale)
 }
 if(!['save','decline'].includes(type)||!Number.isSafeInteger(expectedRevision)||expectedRevision<1)throw conflict()
 return mutateMeditation(config,actor,runId,protocolId,{type,expectedRevision,body},'en')
}

// Called only by a trusted recovery adapter, not a browser endpoint.
// Expiry of the observation lease is not proof the provider token is dead.
export async function recoverExpiredAntiStressRun(config,actor,runId,{sessionId,protocolId}={}){
 enabled()
 return transaction(config,actor,async db=>{
  await lockCourseOwner(db,actor)
  const before=await read(db,actor,config,runId,true)
  let after
  try{
   const binding=antiStressRunBinding(before,sessionId,protocolId)
   const active=before.clock.days.find(d=>d.status==='active')
   if(active&&active.day!==binding.number)throw conflict()
   after=expireAntiStressRunObservation(before,await stamp(db))
  }catch{throw conflict()}
  if(after!==before){
   const changed=await db.query('update app_private.anti_stress_runs set revision=$3,payload_ciphertext=$4,live_active=false,updated_at=now() where account_id=$1 and id=$2 and revision=$5 returning id',[actor.id,after.id,after.clock.revision,seal(after,context(actor,after.id,'anti-stress.run'),config),before.clock.revision])
   if(changed.rows.length!==1)throw conflict()
  }
  return antiStressRunSummary(after)
 })
}

// Only the trusted relay can request retirement after normal provider close
// and a durable stop. Preserve the original credential expiry for audit.
export async function retireAntiStressCredential(config,actor,{leaseId,courseRunId,day,protocolId}={}){
 enabled()
 if(!uuid(leaseId)||!uuid(courseRunId)||!uuid(protocolId)||![1,2,3].includes(day))throw conflict()
 return transaction(config,actor,async db=>{
  await lockCourseOwner(db,actor)
  const row=(await db.query('select lease_id,course_run_id,course_day,protocol_id,program_kind,provider_closed_at_ms from app_private.clarity_live_credential_windows where account_id=$1 for update',[actor.id])).rows[0]
  if(!row||row.program_kind!=='therapy'||row.lease_id!==leaseId||row.course_run_id!==courseRunId||Number(row.course_day)!==day||row.protocol_id!==protocolId)return false
  const existing=(await db.query('select '+columns+' from app_private.anti_stress_runs where account_id=$1 and id=$2 for update',[actor.id,courseRunId])).rows[0]
  if(existing){
   const run=decode(existing,actor,config)
   if(run.protocolIds[day-1]!==protocolId||run.clock.days.some(d=>d.status==='active'))throw conflict()
  }
  if(row.provider_closed_at_ms!==null)return true
  const closedAt=await stamp(db)
  const updated=await db.query("update app_private.clarity_live_credential_windows set provider_closed_at_ms=$3 where account_id=$1 and lease_id=$2 and program_kind='therapy' and provider_closed_at_ms is null returning lease_id",[actor.id,leaseId,closedAt])
  return updated.rows.length===1&&updated.rows[0].lease_id===leaseId
 })
}
