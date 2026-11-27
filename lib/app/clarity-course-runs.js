import 'server-only'
import {randomUUID} from 'node:crypto'
import {transaction} from './database.js'
import {seal,openSealed,operationHash} from './crypto.js'
import {AppError} from '../assessments/contracts.js'
import {lockCourseOwner} from './course-access.js'
import {claimTrustedFreeCoachingDays} from './coaching-free-day-quota.js'
import {clarityClockNewDailyClaims} from '../coaching/clarity-course-clock.mjs'
import {isClarityRunId,createClarityRun,validateClarityRun,beginFreeClarityRun,advanceClarityRun,clarityRunSummary,clarityRunResumeMetadata,expireClarityRunObservation} from '../coaching/clarity-course-runs.mjs'
// Separate release gate: no production writes, token grants, or payment
// acceptance until the trusted transport, global quota and checkout are wired.
const TRUSTED_RUN_ADAPTER_READY=false
const VERIFIED_CHECKOUT_ADAPTER_READY=false
export const clarityRunStorageEnabled=()=>TRUSTED_RUN_ADAPTER_READY&&process.env.HH_CLARITY_RUNS_ENABLED==='true'
const unavailable=()=>new AppError('CLARITY_RUN_UNAVAILABLE',503)
const conflict=()=>new AppError('CLARITY_RUN_CONFLICT',409)
const notFound=()=>new AppError('CLARITY_RUN_NOT_FOUND',404)
const requireEnabled=()=>{if(!clarityRunStorageEnabled())throw unavailable()}
const context=(actor,id)=>({accountId:actor.id,recordId:id,field:'clarity.course.run'})
function decode(row,actor,config){
 if(!row)return null
 try{
  const run=validateClarityRun(openSealed(row.payload_ciphertext,context(actor,row.id),config))
  if(run.id!==row.id||run.ordinal!==row.ordinal||run.access!==row.access||run.clock.revision!==Number(row.revision))throw Error('binding')
  return run
 }catch{throw unavailable()}
}
const columns='id,ordinal,access,revision,payload_ciphertext'
async function read(db,actor,config,id,lock=false){
 if(!isClarityRunId(id))throw notFound()
 const row=(await db.query('select '+columns+' from app_private.clarity_course_runs where account_id=$1 and id=$2'+(lock?' for update':''),[actor.id,id])).rows[0]
 const run=decode(row,actor,config)
 if(!run)throw notFound()
 return run
}
export async function readClarityRun(config,actor,id){
 requireEnabled()
 return transaction(config,actor,db=>read(db,actor,config,id))
}
export async function listClarityRuns(config,actor,{before=null}={}){
 requireEnabled()
 if(before!==null&&(!Number.isSafeInteger(before)||before<1))throw new AppError('CLARITY_RUN_CURSOR_INVALID',400)
 return transaction(config,actor,async db=>{
  const rows=(await db.query('select '+columns+' from app_private.clarity_course_runs where account_id=$1'+(before===null?'':' and ordinal<$2')+' order by ordinal desc limit 21',before===null?[actor.id]:[actor.id,before])).rows
  const runs=rows.slice(0,20).map(row=>clarityRunSummary(decode(row,actor,config)))
  return {runs,hasMore:rows.length>20,nextCursor:rows.length>20?runs.at(-1).ordinal:null}
 })
}
async function insert(db,actor,config,run,paymentKey=null){
 const result=await db.query('insert into app_private.clarity_course_runs(account_id,id,ordinal,access,revision,payload_ciphertext,payment_key) values($1,$2,$3,$4,$5,$6,$7) returning id',[actor.id,run.id,run.ordinal,run.access,run.clock.revision,seal(run,context(actor,run.id),config),paymentKey])
 if(result.rows.length!==1)throw conflict()
 for(const [i,protocolId] of run.protocolIds.entries())
  await db.query('insert into app_private.clarity_course_run_sessions(account_id,course_run_id,course_day,protocol_id) values($1,$2,$3,$4)',[actor.id,run.id,i+1,protocolId])
}
async function ensureNoOtherActive(db,actor,config,id){
 // Account lock serializes all run writers. A second purchased course can be
 // READY while the old one is active; simultaneous live calls are disallowed.
 const rows=(await db.query('select '+columns+' from app_private.clarity_course_runs where account_id=$1 and id<>$2 and live_active=true',[actor.id,id])).rows
 for(const row of rows)if(decode(row,actor,config).clock.days.some(day=>day.status==='active'))throw conflict()
 if(rows.length)throw unavailable()
}
async function writeClock(db,actor,config,before,after){
 const updated=(await db.query('update app_private.clarity_course_runs set revision=$3,payload_ciphertext=$4,live_active=$5,updated_at=now() where account_id=$1 and id=$2 and revision=$6 returning id',[actor.id,after.id,after.clock.revision,seal(after,context(actor,after.id),config),after.clock.days.some(d=>d.status==='active'),before.clock.revision])).rows
 if(updated.length!==1)throw conflict()
}
async function serverStamp(db){return Number((await db.query('select floor(extract(epoch from clock_timestamp())*1000)::bigint as now_ms')).rows[0].now_ms)}
// No public POST. The trusted adapter must already have verified the actual
// connection and explicit consent before calling this seam. The shared day
// quota is then claimed inside the same database transaction as the run.
// Stable start identity is server-allocated before consent; retry must use it.
export async function startFirstClarityRun(config,actor,{id,protocolIds,event}){
 requireEnabled()
 if(!isClarityRunId(id)||!Array.isArray(protocolIds)||protocolIds.length!==3)throw conflict()
 return transaction(config,actor,async db=>{
  await lockCourseOwner(db,actor)
  const row=(await db.query('select '+columns+' from app_private.clarity_course_runs where account_id=$1 and ordinal=1',[actor.id])).rows[0]
  if(row){
   const existing=decode(row,actor,config),first=existing.clock.days[0].segments[0]
   if(existing.id===id&&existing.protocolIds.every((p,i)=>p===protocolIds[i])&&event?.type==='begin'&&event.day===1&&event.courseRunId===id&&event.protocolId===protocolIds[0]&&first?.startedAt===event.atMs&&first?.consentTurnId===event?.consent?.turnId&&first?.connectionId===event?.connectionId&&first?.segmentId===event?.segmentId&&first?.coachId===event?.coachId){
    // A retry cannot create a different day claim or change the protocol.
    return clarityRunSummary(existing)
   }
   throw conflict()
  }
  // A paid-only or inconsistent archive never manufactures a replacement free course.
  if((await db.query('select id from app_private.clarity_course_runs where account_id=$1 limit 1',[actor.id])).rows.length)throw conflict()
  const now=await serverStamp(db)
  if(!Number.isSafeInteger(event?.atMs)||event.atMs>now||now-event.atMs>15000)throw conflict()
  let run
  try{run=beginFreeClarityRun({id,ordinal:1,access:'free',protocolIds,createdAt:event.atMs},event)}catch{throw conflict()}
  await ensureNoOtherActive(db,actor,config,id)
  await claimTrustedFreeCoachingDays(db,actor,clarityClockNewDailyClaims(null,run.clock))
  await insert(db,actor,config,run)
  await db.query('update app_private.clarity_course_runs set live_active=true where account_id=$1 and id=$2',[actor.id,id])
  return clarityRunSummary(run)
 })
}
// Internal adapter seam only. NOT an implementation of checkout or payment
// verification. A settled order must come from the existing billing authority,
// bound to account, SKU, amount/currency, environment and a unique order.
export async function createPaidClarityRunFromSettledOrder(config,actor,order){
 requireEnabled()
 if(!VERIFIED_CHECKOUT_ADAPTER_READY)throw unavailable()
 if(!order||order.accountId!==actor.id||order.sku!=='clarity-express-repeat'||order.status!=='settled'||order.environment!==config.billingEnvironment||typeof order.id!=='string'||!order.id)throw conflict()
 const paymentKey=operationHash(['clarity-express-repeat',order.environment,order.id],config)
 return transaction(config,actor,async db=>{
  await lockCourseOwner(db,actor)
  const prior=(await db.query('select '+columns+' from app_private.clarity_course_runs where account_id=$1 and payment_key=$2',[actor.id,paymentKey])).rows[0]
  if(prior)return clarityRunSummary(decode(prior,actor,config))
  const last=(await db.query('select ordinal from app_private.clarity_course_runs where account_id=$1 order by ordinal desc limit 1',[actor.id])).rows[0]
  if(!last)throw conflict()
  const run=createClarityRun({id:randomUUID(),ordinal:last.ordinal+1,access:'paid',protocolIds:Array.from({length:3},()=>randomUUID()),createdAt:await serverStamp(db)})
  await insert(db,actor,config,run,paymentKey)
  return clarityRunSummary(run)
 })
}
export async function applyTrustedClarityRunEvent(config,actor,event){
 requireEnabled()
 return transaction(config,actor,async db=>{
  await lockCourseOwner(db,actor)
  const before=await read(db,actor,config,event?.courseRunId,true)
  const now=await serverStamp(db)
  if(!Number.isSafeInteger(event.atMs)||event.atMs>now||now-event.atMs>15000)throw conflict()
  if(event.type==='begin')await ensureNoOtherActive(db,actor,config,before.id)
  let after
  try{after=advanceClarityRun(before,event)}catch{throw conflict()}
  await claimTrustedFreeCoachingDays(db,actor,clarityClockNewDailyClaims(before.clock,after.clock))
  await writeClock(db,actor,config,before,after)
  return clarityRunSummary(after)
 })
}
// Internal recovery only. After the provider adapter loses observations (or
// restarts), reconcile the encrypted ledger under the same owner lock/CAS.
// This neither closes a provider socket nor authorizes a new token: the
// adapter must independently ensure the previous credential cannot be used.
// No raw timestamp, duration, revision or stop evidence is accepted from UI.
export async function recoverExpiredClarityRun(config,actor,runId){
 requireEnabled()
 return transaction(config,actor,async db=>{
  await lockCourseOwner(db,actor)
  const before=await read(db,actor,config,runId,true)
  const now=await serverStamp(db)
  let after
  try{after=expireClarityRunObservation(before,now)}catch{throw conflict()}
  if(after!==before)await writeClock(db,actor,config,before,after)
  return clarityRunSummary(after)
 })
}
// Called by existing draft/report adapters once run storage is active.
// A report UUID identifies precisely one logical session, not the latest day.
export async function readClarityRunBinding(db,actor,protocolId){
 requireEnabled()
 if(!isClarityRunId(protocolId))throw notFound()
 const row=(await db.query('select course_run_id,course_day from app_private.clarity_course_run_sessions where account_id=$1 and protocol_id=$2',[actor.id,protocolId])).rows[0]
 if(!row)throw notFound()
 return {courseRunId:row.course_run_id,day:row.course_day}
}

export async function excludeBoundClarityResults(config,actor,results){
 if(!clarityRunStorageEnabled()||!results.length)return results
 return transaction(config,actor,async db=>{
  const {rows}=await db.query('select protocol_id from app_private.clarity_course_run_sessions where account_id=$1 and protocol_id=any($2::uuid[])',[actor.id,results.map(r=>r.id)])
  const bound=new Set(rows.map(r=>r.protocol_id))
  return results.filter(r=>!bound.has(r.id))
 })
}

// Read one owner-scoped page in one query. Validate each decrypted run and
// immutable session binding; don't expose ciphertext or the entire clock.
// Disabled installations do not access proposal tables.
export async function readClarityResumeBindings(db,actor,config,items){
 if(!clarityRunStorageEnabled()||!items.length)return new Map()
 const requested=new Map()
 for(const item of items){
  if(!isClarityRunId(item?.id))throw conflict()
  const id=item.id.toLowerCase()
  if(requested.has(id))throw conflict()
  requested.set(id,item.courseSessionId)
 }
 const {rows}=await db.query(`select r.id,r.ordinal,r.access,r.revision,r.payload_ciphertext,s.protocol_id,s.course_day
  from app_private.clarity_course_run_sessions s join app_private.clarity_course_runs r
  on r.account_id=s.account_id and r.id=s.course_run_id
  where s.account_id=$1 and s.protocol_id=any($2::uuid[])`,[actor.id,[...requested.keys()]])
 const result=new Map(),runs=new Map()
 for(const row of rows){
  const id=row.protocol_id,day=Number(row.course_day)
  if(!requested.has(id)||result.has(id)||requested.get(id)!=='clarity_day_'+day)throw conflict()
  let run=runs.get(row.id)
  if(!run){run=decode(row,actor,config);runs.set(row.id,run)}
  let metadata
  try{metadata=clarityRunResumeMetadata(run,day,id)}catch{throw conflict()}
  result.set(id,metadata)
 }
 return result
}
