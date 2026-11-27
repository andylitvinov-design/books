import 'server-only'
import {transaction} from './database.js'
import {seal,openSealed} from './crypto.js'
import {AppError} from '../assessments/contracts.js'
import {lockCourseOwner} from './course-access.js'
import {claimTrustedFreeCoachingDays} from './coaching-free-day-quota.js'
import {ANTI_STRESS_SESSION_IDS} from '../coaching/coach-program-mode.mjs'
import {createAntiStressRun,validateAntiStressRun,advanceAntiStressRun,antiStressRunSummary,antiStressRunBinding,antiStressRunNewDailyClaims,antiStressBoundProtocol} from '../coaching/anti-stress-runs.mjs'
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
// entitlement is an INTERNAL settled access decision, not a submitted client
// payload. No payment/free-offer policy is inferred from the program type.
export async function beginTrustedAntiStressRun(config,actor,{id,protocolIds,entitlement,event}){
 enabled()
 if(!entitlement||entitlement.accountId!==actor.id||entitlement.programId!=='anti-stress-three-session'||entitlement.courseRunId!==id||entitlement.verified!==true||!['free','paid'].includes(entitlement.access)||!uuid(id)||event?.type!=='begin'||event.day!==1)throw conflict()
 return transaction(config,actor,async db=>{
  await lockCourseOwner(db,actor)
  await fresh(db,event)
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
  if(event.type==='begin')await noOtherActive(db,actor,before.id)
  let after
  try{after=advanceAntiStressRun(before,event)}catch{throw conflict()}
  await claimTrustedFreeCoachingDays(db,actor,antiStressRunNewDailyClaims(before,after))
  const changed=await db.query('update app_private.anti_stress_runs set revision=$3,payload_ciphertext=$4,live_active=$5,updated_at=now() where account_id=$1 and id=$2 and revision=$6 returning id',[actor.id,after.id,after.clock.revision,seal(after,context(actor,after.id,'anti-stress.run'),config),after.clock.days.some(d=>d.status==='active'),before.clock.revision])
  if(changed.rows.length!==1)throw conflict()
  return antiStressRunSummary(after)
 })
}
export async function readAntiStressSession(config,actor,runId,sessionId,locale){
 enabled()
 const index=ANTI_STRESS_SESSION_IDS.indexOf(sessionId)
 if(index<0)throw missing()
 return transaction(config,actor,async db=>{
  const run=await read(db,actor,config,runId)
  const protocolId=run.protocolIds[index],binding=antiStressRunBinding(run,sessionId,protocolId)
  const row=(await db.query('select protocol_id,review_revision,ledger_ciphertext,log_ciphertext from app_private.anti_stress_sessions where account_id=$1 and course_run_id=$2 and session_number=$3',[actor.id,run.id,index+1])).rows[0]
  if(!row||row.protocol_id!==protocolId)throw unavailable()
  const empty={courseRunId:run.id,sessionId,protocolId,scenarioVersion:binding.scenarioVersion,rows:[]}
  let ledger,log
  try{
   ledger=row.ledger_ciphertext?openSealed(row.ledger_ciphertext,context(actor,protocolId,'anti-stress.ledger'),config):empty
   log=row.log_ciphertext?openSealed(row.log_ciphertext,context(actor,protocolId,'anti-stress.log'),config):null
   if(log!==null&&(log.courseRunId!==run.id||log.sessionId!==sessionId||log.protocolId!==protocolId||!Array.isArray(log.turns)))throw Error('log binding')
   const report=antiStressBoundProtocol(run,sessionId,protocolId,ledger,locale)
   return {run:antiStressRunSummary(run),protocol:{binding,rows:report.rows},result:report.result,log,reviewRevision:Number(row.review_revision)}
  }catch{throw unavailable()}
 })
}
// Reviewed ledger and log writers must be attached to the actual verified
// Director/question/turn acknowledgement service before activation. No browser POST.
