import 'server-only'
import {transaction} from './database.js'
import {seal,openSealed} from './crypto.js'
import {AppError} from '../assessments/contracts.js'
import {lockCourseOwner} from './course-access.js'
import {claimTrustedFreeCoachingDays} from './coaching-free-day-quota.js'
import {ANTI_STRESS_SESSION_IDS} from '../coaching/coach-program-mode.mjs'
import {createAntiStressRun,validateAntiStressRun,advanceAntiStressRun,antiStressRunSummary,antiStressRunBinding,antiStressRunNewDailyClaims,antiStressBoundProtocol,appendAntiStressObservation,antiStressMeditationArtifact,expireAntiStressRunObservation} from '../coaching/anti-stress-runs.mjs'
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
   }
   return {...base,result:report.result}
  }catch{throw unavailable()}
 })
}
// Reviewed ledger and log writers must be attached to the actual verified
// Director/question/turn acknowledgement service before activation. No browser POST.

// Internal only; actual provider/Director evidence and consent adapter pending.
export async function appendTrustedAntiStressObservation(config,actor,event,permission){
 enabled()
 if(!permission||permission.accountId!==actor.id||permission.courseRunId!==event?.courseRunId||permission.protocolId!==event?.protocolId||permission.verified!==true||permission.decision!=='accepted')throw conflict()
 return transaction(config,actor,async db=>{
  await lockCourseOwner(db,actor)
  const run=await read(db,actor,config,event.courseRunId,true)
  await fresh(db,event)
  const binding=antiStressRunBinding(run,event.sessionId,event.protocolId),pid=binding.protocolId
  const row=(await db.query('select protocol_id,review_revision,ledger_ciphertext,log_ciphertext from app_private.anti_stress_sessions where account_id=$1 and course_run_id=$2 and session_number=$3 for update',[actor.id,run.id,binding.number])).rows[0]
  if(!row||row.protocol_id!==pid)throw conflict()
  const revision=Number(row.review_revision)
  let prior,next
  try{
   if(!Number.isSafeInteger(revision)||revision<0||(!revision&&(row.log_ciphertext||row.ledger_ciphertext)))throw Error('revision')
   prior=revision?openSealed(row.log_ciphertext,context(actor,pid,'anti-stress.log'),config):null
   const ledger=revision?openSealed(row.ledger_ciphertext,context(actor,pid,'anti-stress.ledger'),config):null
   if(revision&&(!prior||prior.revision!==revision||ledger?.revision!==revision||JSON.stringify(prior.rows)!==JSON.stringify(ledger.rows)))throw Error('projection mismatch')
   next=appendAntiStressObservation(run,event.sessionId,pid,prior,event)
  }catch{throw conflict()}
  if(next===prior)return {reviewRevision:revision}
  const ledger={courseRunId:next.courseRunId,sessionId:next.sessionId,protocolId:pid,scenarioVersion:next.scenarioVersion,revision:next.revision,rows:next.rows}
  const changed=await db.query('update app_private.anti_stress_sessions set review_revision=$4,ledger_ciphertext=$5,log_ciphertext=$6 where account_id=$1 and course_run_id=$2 and session_number=$3 and review_revision=$7 returning protocol_id',[actor.id,run.id,binding.number,next.revision,seal(ledger,context(actor,pid,'anti-stress.ledger'),config),seal(next,context(actor,pid,'anti-stress.log'),config),revision])
  if(changed.rows.length!==1)throw conflict()
  return {reviewRevision:next.revision}
 })
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
  const row=(await db.query('select protocol_id,ledger_ciphertext,meditation_revision,meditation_ciphertext from app_private.anti_stress_sessions where account_id=$1 and course_run_id=$2 and session_number=1 for update',[actor.id,run.id])).rows[0]
  if(!row||row.protocol_id!==protocolId||!row.ledger_ciphertext)throw conflict()
  const revision=Number(row.meditation_revision)
  let next
  try{
   if(!Number.isSafeInteger(revision)||revision<0||Boolean(revision)!==Boolean(row.meditation_ciphertext))throw Error('revision')
   const ledger=openSealed(row.ledger_ciphertext,context(actor,protocolId,'anti-stress.ledger'),config)
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
export async function editOwnedAntiStressMeditation(config,actor,{runId,protocolId,type,expectedRevision,body}){
 if(!['save','decline'].includes(type)||!Number.isSafeInteger(expectedRevision)||expectedRevision<1)throw conflict()
 return mutateMeditation(config,actor,runId,protocolId,{type,expectedRevision,body},'en')
}

// Called only by a trusted recovery adapter, not a browser endpoint.
// Expiry of the observation lease is not proof the provider token is dead.
export async function recoverExpiredAntiStressRun(config,actor,runId){
 enabled()
 return transaction(config,actor,async db=>{
  await lockCourseOwner(db,actor)
  const before=await read(db,actor,config,runId,true)
  let after
  try{after=expireAntiStressRunObservation(before,await stamp(db))}catch{throw conflict()}
  if(after!==before){
   const changed=await db.query('update app_private.anti_stress_runs set revision=$3,payload_ciphertext=$4,live_active=false,updated_at=now() where account_id=$1 and id=$2 and revision=$5 returning id',[actor.id,after.id,after.clock.revision,seal(after,context(actor,after.id,'anti-stress.run'),config),before.clock.revision])
   if(changed.rows.length!==1)throw conflict()
  }
  return antiStressRunSummary(after)
 })
}
