import 'server-only'
import {randomUUID} from 'node:crypto'
import {transaction} from './database.js'
import {seal,openSealed,operationHash} from './crypto.js'
import {lockCourseOwner} from './course-access.js'
import {AppError} from '../assessments/contracts.js'
import {validateGoalRun,goalRunResumeMetadata,goalRunResultBinding} from '../coaching/goal-course-runs.mjs'
import {createGoalResultDocument,validateGoalResultDocument} from '../coaching/goal-result-document.mjs'
// Hard veto until shared entitlement, provider observation, reviewed migration
// and privacy lifecycle have passed native integration/owner acceptance.
const TRUSTED_GOAL_STORAGE_READY=false
export const goalRunStorageEnabled=()=>TRUSTED_GOAL_STORAGE_READY&&process.env.HH_GOAL_RUNS_ENABLED==='true'
const unavailable=()=>new AppError('GOAL_RUN_UNAVAILABLE',503)
const conflict=()=>new AppError('GOAL_RUN_CONFLICT',409)
const missing=()=>new AppError('GOAL_RUN_NOT_FOUND',404)
const requireEnabled=()=>{if(!goalRunStorageEnabled())throw unavailable()}
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)
const ctx=(actor,id,field)=>({accountId:actor.id,recordId:id,field})
const runCtx=(actor,id)=>ctx(actor,id,'goal.course.run')
const resultCtx=(actor,id)=>ctx(actor,id,'goal.course.result')
async function readRun(db,actor,config,id){
 if(!uuid(id))throw missing()
 const row=(await db.query('select id,goal_id,entitlement_id,revision,payload_ciphertext from app_private.goal_course_runs where account_id=$1 and id=$2',[actor.id,id])).rows[0]
 if(!row)throw missing()
 try{
  const run=validateGoalRun(openSealed(row.payload_ciphertext,runCtx(actor,id),config))
  if(run.id!==row.id||run.goalId!==row.goal_id||run.entitlementId!==row.entitlement_id||run.clock.revision!==Number(row.revision))throw Error('binding')
  const sessions=(await db.query('select course_day,protocol_id from app_private.goal_course_run_sessions where account_id=$1 and course_run_id=$2 order by course_day',[actor.id,id])).rows
  if(sessions.length!==8||sessions.some((s,i)=>Number(s.course_day)!==i+1||s.protocol_id!==run.protocolIds[i]))throw Error('sessions')
  return run
 }catch{throw unavailable()}
}
export async function readOwnedGoalRun(config,actor,id){
 requireEnabled()
 return transaction(config,actor,db=>readRun(db,actor,config,id))
}
// Internal seam only: caller must establish actual settled, non-refunded
// entitlement in this same owner-locked transaction. No caller or route yet.
export async function insertVerifiedGoalRun(db,actor,config,run){
 requireEnabled()
 await lockCourseOwner(db,actor)
 validateGoalRun(run)
 if(run.clock.revision!==0)throw conflict()
 const goal=(await db.query('select id from app_private.coaching_goals where account_id=$1 and id=$2',[actor.id,run.goalId])).rows[0]
 if(!goal)throw missing()
 const rows=(await db.query('insert into app_private.goal_course_runs(account_id,id,goal_id,entitlement_id,revision,payload_ciphertext) values($1,$2,$3,$4,$5,$6) returning id',[actor.id,run.id,run.goalId,run.entitlementId,run.clock.revision,seal(run,runCtx(actor,run.id),config)])).rows
 if(rows.length!==1||rows[0].id!==run.id)throw conflict()
 for(const [i,protocolId] of run.protocolIds.entries()){
  const saved=(await db.query('insert into app_private.goal_course_run_sessions(account_id,course_run_id,course_day,protocol_id) values($1,$2,$3,$4) returning protocol_id',[actor.id,run.id,i+1,protocolId])).rows
  if(saved.length!==1||saved[0].protocol_id!==protocolId)throw conflict()
 }
 return run
}
async function sourceProtocol(db,actor,config,protocolId){
 const row=(await db.query('select protocol_id,protocol_ciphertext,saved_at,schema_version from app_private.my_coach_protocol_records where account_id=$1 and protocol_id=$2',[actor.id,protocolId])).rows[0]
 if(!row||row.schema_version!==1||row.protocol_id!==protocolId)throw missing()
 const protocol=openSealed(row.protocol_ciphertext,ctx(actor,protocolId,'my_coach.protocol'),config)
 if(protocol?.id!==protocolId||protocol.provenance!=='client_reviewed_dialogue')throw conflict()
 const savedAt=new Date(row.saved_at).toISOString()
 return {protocol:{...protocol,savedAt},sourceHash:operationHash(['goal-result-source-v1',protocolId,savedAt,row.protocol_ciphertext],config)}
}
async function resultRow(db,actor,runId,day){
 return (await db.query('select id,protocol_id,revision,source_hash,payload_ciphertext from app_private.goal_course_result_records where account_id=$1 and course_run_id=$2 and course_day=$3',[actor.id,runId,day])).rows[0]||null
}
function unpack(row,actor,config,binding,sourceHash){
 if(!row)return null
 try{
  const doc=validateGoalResultDocument(openSealed(row.payload_ciphertext,resultCtx(actor,row.id),config))
  if(doc.id!==row.id||doc.revision!==Number(row.revision)||doc.protocolId!==row.protocol_id||doc.sourceHash!==row.source_hash||doc.sourceHash!==sourceHash||
   doc.courseRunId!==binding.courseRunId||doc.goalId!==binding.goalId||doc.day!==binding.day||doc.courseSessionId!==binding.courseSessionId||doc.protocolId!==binding.protocolId)throw Error('binding')
  return doc
 }catch{throw unavailable()}
}
// Separate, immutable reviewed snapshot. Read exact server-owned source
// under the owner lock; no browser transcript/result/duration accepted.
export async function saveReviewedGoalResult(config,actor,runId,day){
 requireEnabled()
 return transaction(config,actor,async db=>{
  await lockCourseOwner(db,actor)
  const run=await readRun(db,actor,config,runId)
  if(!Number.isInteger(day)||day<1||day>8)throw missing()
  const protocolId=run.protocolIds[day-1],source=await sourceProtocol(db,actor,config,protocolId)
  const binding=goalRunResultBinding(run,day,source.protocol)
  const existing=unpack(await resultRow(db,actor,runId,day),actor,config,binding,source.sourceHash)
  if(existing)return {document:existing,alreadySaved:true}
  const doc=createGoalResultDocument(run,day,source.protocol,{id:randomUUID(),sourceHash:source.sourceHash,createdAt:new Date().toISOString()})
  const rows=(await db.query('insert into app_private.goal_course_result_records(account_id,id,course_run_id,course_day,protocol_id,revision,source_hash,payload_ciphertext) values($1,$2,$3,$4,$5,$6,$7,$8) returning id',[actor.id,doc.id,runId,day,protocolId,doc.revision,doc.sourceHash,seal(doc,resultCtx(actor,doc.id),config)])).rows
  if(rows.length!==1||rows[0].id!==doc.id)throw conflict()
  return {document:doc,alreadySaved:false}
 })
}
export async function readReviewedGoalResult(config,actor,runId,day){
 requireEnabled()
 return transaction(config,actor,async db=>{
  const run=await readRun(db,actor,config,runId)
  if(!Number.isInteger(day)||day<1||day>8)throw missing()
  const row=await resultRow(db,actor,runId,day)
  if(!row)return null
  const source=await sourceProtocol(db,actor,config,run.protocolIds[day-1]),binding=goalRunResultBinding(run,day,source.protocol)
  return unpack(row,actor,config,binding,source.sourceHash)
 })
}
