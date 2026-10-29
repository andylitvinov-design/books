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
function decode(row,actor,config){
  const value=openSealed(row.payload_ciphertext,context(actor,row.operation_id),config)
  if(!validPayload(value))throw new AppError('INTELLIGENCE_MEMORY_UNAVAILABLE',503)
  return value
}
export async function saveIntelligenceFeedback(config,actor,input){
  if(!config.intelligenceMemoryEnabled)throw new AppError('INTELLIGENCE_MEMORY_DISABLED',503)
  onlyKeys(input,['operationId','consent','itemId','feedback'])
  requireUUID(input.operationId)
  if(input.consent!==true)throw new AppError('CONSENT_REQUIRED',400)
  const value={version:1,itemId:input.itemId,feedback:input.feedback}
  if(!validPayload(value))throw new AppError('INTELLIGENCE_MEMORY_INVALID',400)
  return transaction(config,actor,async db=>{
    await assertAccount(db,actor)
    // Serialize same-owner saves so retries and the bounded quota remain correct.
    await db.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[`intelligence-feedback:${actor.id}`])
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
    const rows=(await db.query('select operation_id,payload_ciphertext,created_at from app_private.intelligence_feedback_memory where account_id=$1 order by created_at,operation_id limit 101',[actor.id])).rows
    if(rows.length>100)throw new AppError('INTELLIGENCE_MEMORY_UNAVAILABLE',503)
    return {records:rows.map(row=>({operationId:row.operation_id,...decode(row,actor,config),createdAt:row.created_at}))}
  })
}
export async function deleteIntelligenceFeedback(config,actor,input){
  onlyKeys(input,['operationId','all'])
  if(input.all===true){if(input.operationId!==undefined)throw new AppError('INTELLIGENCE_MEMORY_INVALID',400)}
  else {if(input.all!==undefined)throw new AppError('INTELLIGENCE_MEMORY_INVALID',400);requireUUID(input.operationId)}
  return transaction(config,actor,async db=>{
    await assertAccount(db,actor)
    await db.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[`intelligence-feedback:${actor.id}`])
    const result=input.all===true
      ? await db.query('delete from app_private.intelligence_feedback_memory where account_id=$1',[actor.id])
      : await db.query('delete from app_private.intelligence_feedback_memory where account_id=$1 and operation_id=$2',[actor.id,input.operationId])
    return {deleted:result.rowCount>0}
  })
}
