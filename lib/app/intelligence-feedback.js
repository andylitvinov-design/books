import 'server-only'
import { transaction } from './database.js'
import { seal, openSealed } from './crypto.js'
import { AppError, onlyKeys, requireUUID } from '../assessments/contracts.js'

const context=(actor,id)=>({accountId:actor.id,recordId:id,field:'intelligence.feedback'})
const validItem=id=>typeof id==='string' && /^(youtube:[A-Za-z0-9_-]{11}|test:[a-z0-9-]{1,96}|service:(situation|dao|alchemy|hypnotherapy|business)|course:reiki-preview)$/.test(id)
const validPayload=value=>value && value.version===1 && validItem(value.itemId) && ['useful','not_useful'].includes(value.feedback) && Object.keys(value).sort().join(',')==='feedback,itemId,version'
async function assertAccount(db,actor){
  const row=(await db.query("select id from app.accounts where id=$1 and status='active' and onboarding_state='active'",[actor.id])).rows[0]
  if(!row)throw new AppError('ACCOUNT_UNAVAILABLE',403)
}
async function lockRevision(db,actor){
  await db.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[`intelligence-feedback:${actor.id}`])
  const row=(await db.query('select revision from app_private.intelligence_feedback_state where account_id=$1',[actor.id])).rows[0]
  return row ? Number(row.revision) : 0
}
function requireRevision(input){
  if(!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0)throw new AppError('INTELLIGENCE_MEMORY_INVALID',400)
}
async function advanceRevision(db,actor,revision){
  if(revision===Number.MAX_SAFE_INTEGER)throw new AppError('INTELLIGENCE_MEMORY_UNAVAILABLE',503)
  await db.query('insert into app_private.intelligence_feedback_state(account_id,revision) values($1,$2) on conflict(account_id) do update set revision=excluded.revision',[actor.id,revision+1])
  return revision+1
}
function decode(row,actor,config){
  const value=openSealed(row.payload_ciphertext,context(actor,row.operation_id),config)
  if(!validPayload(value))throw new AppError('INTELLIGENCE_MEMORY_UNAVAILABLE',503)
  return value
}
export async function intelligenceFeedbackStatus(config,actor){
  return transaction(config,actor,async db=>{
    await assertAccount(db,actor)
    const row=(await db.query("select to_regclass('app_private.intelligence_feedback_memory') is not null and to_regclass('app_private.intelligence_feedback_state') is not null as available")).rows[0]
    return {managementAvailable:row.available===true,saveEnabled:row.available===true&&config.intelligenceMemoryEnabled===true}
  })
}
export async function saveIntelligenceFeedback(config,actor,input){
  if(!config.intelligenceMemoryEnabled)throw new AppError('INTELLIGENCE_MEMORY_DISABLED',503)
  onlyKeys(input,['operationId','consent','expectedRevision','itemId','feedback'])
  requireUUID(input.operationId)
  requireRevision(input)
  if(input.consent!==true)throw new AppError('CONSENT_REQUIRED',400)
  const value={version:1,itemId:input.itemId,feedback:input.feedback}
  if(!validPayload(value))throw new AppError('INTELLIGENCE_MEMORY_INVALID',400)
  return transaction(config,actor,async db=>{
    await assertAccount(db,actor)
    // Serialize same-owner saves so retries and the bounded quota remain correct.
    const revision=await lockRevision(db,actor)
    if(revision!==input.expectedRevision)throw new AppError('INTELLIGENCE_MEMORY_STALE',409)
    const previous=(await db.query('select operation_id,payload_ciphertext from app_private.intelligence_feedback_memory where account_id=$1 and operation_id=$2',[actor.id,input.operationId])).rows[0]
    if(previous){
      const decoded=decode(previous,actor,config)
      if(decoded.itemId!==value.itemId||decoded.feedback!==value.feedback)throw new AppError('INTELLIGENCE_MEMORY_CONFLICT',409)
      return {saved:true}
    }
    const count=Number((await db.query('select count(*)::int as count from app_private.intelligence_feedback_memory where account_id=$1',[actor.id])).rows[0].count)
    if(count>=100)throw new AppError('INTELLIGENCE_MEMORY_LIMIT',409)
    await db.query("insert into app_private.intelligence_feedback_memory(account_id,operation_id,consent_version,payload_ciphertext) values($1,$2,'intelligence-feedback-v1',$3)",
      [actor.id,input.operationId,seal(value,context(actor,input.operationId),config)])
    return {saved:true}
  })
}
export async function exportIntelligenceFeedback(config,actor){
  return transaction(config,actor,async db=>{
    await assertAccount(db,actor)
    const revision=await lockRevision(db,actor)
    const rows=(await db.query('select operation_id,payload_ciphertext,created_at from app_private.intelligence_feedback_memory where account_id=$1 order by created_at,operation_id limit 101',[actor.id])).rows
    if(rows.length>100)throw new AppError('INTELLIGENCE_MEMORY_UNAVAILABLE',503)
    return {revision,records:rows.map(row=>({operationId:row.operation_id,...decode(row,actor,config),createdAt:row.created_at}))}
  })
}
// Only the current server-selected candidate IDs leave this private adapter.
export async function matchingUnhelpfulFeedback(config,actor,candidates){
  if(!config.intelligenceMemoryEnabled)throw new AppError('INTELLIGENCE_MEMORY_DISABLED',503)
  if(!Array.isArray(candidates)||candidates.length>200||candidates.some(id=>!validItem(id)))throw new AppError('INTELLIGENCE_MEMORY_INVALID',400)
  if(!candidates.length)return {dismissedIds:[]}
  const wanted=new Set(candidates), memory=await exportIntelligenceFeedback(config,actor)
  return {dismissedIds:[...new Set(memory.records.filter(row=>row.feedback==='not_useful'&&wanted.has(row.itemId)).map(row=>row.itemId))]}
}
export async function editIntelligenceFeedback(config,actor,input){
  if(!config.intelligenceMemoryEnabled)throw new AppError('INTELLIGENCE_MEMORY_DISABLED',503)
  onlyKeys(input,['operationId','expectedRevision','consent','feedback'])
  requireUUID(input.operationId);requireRevision(input)
  if(input.consent!==true)throw new AppError('CONSENT_REQUIRED',400)
  if(!['useful','not_useful'].includes(input.feedback))throw new AppError('INTELLIGENCE_MEMORY_INVALID',400)
  return transaction(config,actor,async db=>{
    await assertAccount(db,actor)
    const revision=await lockRevision(db,actor)
    if(revision!==input.expectedRevision)throw new AppError('INTELLIGENCE_MEMORY_STALE',409)
    const row=(await db.query('select operation_id,payload_ciphertext from app_private.intelligence_feedback_memory where account_id=$1 and operation_id=$2',[actor.id,input.operationId])).rows[0]
    if(!row)throw new AppError('INTELLIGENCE_MEMORY_NOT_FOUND',404)
    const value=decode(row,actor,config)
    await db.query('update app_private.intelligence_feedback_memory set payload_ciphertext=$3,updated_at=now() where account_id=$1 and operation_id=$2',
      [actor.id,input.operationId,seal({...value,feedback:input.feedback},context(actor,input.operationId),config)])
    return {updated:true,revision:await advanceRevision(db,actor,revision)}
  })
}
export async function deleteIntelligenceFeedback(config,actor,input){
  onlyKeys(input,['operationId','all','expectedRevision'])
  requireRevision(input)
  if(input.all===true){if(input.operationId!==undefined)throw new AppError('INTELLIGENCE_MEMORY_INVALID',400)}
  else {if(input.all!==undefined)throw new AppError('INTELLIGENCE_MEMORY_INVALID',400);requireUUID(input.operationId)}
  return transaction(config,actor,async db=>{
    await assertAccount(db,actor)
    const revision=await lockRevision(db,actor)
    if(revision!==input.expectedRevision)throw new AppError('INTELLIGENCE_MEMORY_STALE',409)
    const result=input.all===true
      ? await db.query('delete from app_private.intelligence_feedback_memory where account_id=$1',[actor.id])
      : await db.query('delete from app_private.intelligence_feedback_memory where account_id=$1 and operation_id=$2',[actor.id,input.operationId])
    return {deleted:result.rowCount>0,revision:await advanceRevision(db,actor,revision)}
  })
}
