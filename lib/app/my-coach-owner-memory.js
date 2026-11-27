import 'server-only'
import {AppError} from '../assessments/contracts.js'
import {transaction} from './database.js'
import {ownerMemoryFingerprint,projectOwnerMemoryArchiveRow} from './my-coach-memory-source.js'
import {OWNER_MEMORY_VERSION,OWNER_MEMORY_MAX_RECORDS,OWNER_MEMORY_MAX_CIPHERTEXT_BYTES,
 normalizeOwnerMemoryQuery,searchOwnerReviewedEvidence} from '../coaching/coach-personal-memory.mjs'

// Deliberately owner-only, no model adapter or persistence. The older generic
// memory migration is not a prerequisite. Keep this default-off until reviewed.
export const coachOwnerMemoryEnabled=(env=process.env)=>env.HH_COACH_OWNER_MEMORY_SEARCH_ENABLED==='true'

export async function readMyCoachOwnerMemory(config,actor,input){
 let query
 try{query=normalizeOwnerMemoryQuery(input)}catch{throw new AppError('MY_COACH_MEMORY_QUERY_INVALID',400)}
 if(!actor?.id)throw new AppError('ACCOUNT_REQUIRED',401)
 return transaction(config,actor,async db=>{
  if(!(await db.query("select 1 from app.accounts where id=$1 and status='active' and onboarding_state='active'",[actor.id])).rows.length)
    throw new AppError('ACCOUNT_REQUIRED',401)
  // One owner-bound SQL snapshot, bounded row count AND transfer bytes.
  // Do not touch drafts, un-migrated legacy envelope, or create a second copy.
  const {rows}=await db.query(
    'with recent as (select account_id,protocol_id,protocol_ciphertext,saved_at,schema_version '+
    'from app_private.my_coach_protocol_records where account_id=$1 '+
    'order by saved_at desc,protocol_id desc limit $2), '+
    'bounded as (select *,row_number() over(order by saved_at desc,protocol_id desc) as position, '+
    'sum(octet_length(protocol_ciphertext)) over(order by saved_at desc,protocol_id desc rows unbounded preceding) as bytes from recent) '+
    'select account_id,protocol_id,saved_at,schema_version, '+
    'case when position<=$3 and bytes<=$4 then protocol_ciphertext else null end as protocol_ciphertext '+
    'from bounded order by position',
    [actor.id,OWNER_MEMORY_MAX_RECORDS+1,OWNER_MEMORY_MAX_RECORDS,OWNER_MEMORY_MAX_CIPHERTEXT_BYTES])
  const evidence=[]
  let partial=rows.length>OWNER_MEMORY_MAX_RECORDS,scanned=0,unsupported=0
  for(const row of rows.slice(0,OWNER_MEMORY_MAX_RECORDS)){
    if(row.account_id!==actor.id)throw new AppError('MY_COACH_MEMORY_UNAVAILABLE',503)
    if(!row.protocol_ciphertext){partial=true;break}
    try{
      const result=projectOwnerMemoryArchiveRow(config,actor,row)
      scanned++
      if(!result.supported){unsupported++;continue}
      evidence.push(...result.items)
    }catch{partial=true}
  }
  // Coverage refers only to this physical reviewed-field archive. Older
  // unsupported schemas/legacy data are not evidence of absence.
  if(unsupported)partial=true
  const items=searchOwnerReviewedEvidence(evidence,actor.id,query).map(item=>({...item,
    sourceFingerprint:ownerMemoryFingerprint(config,actor.id,item)}))
  return {version:OWNER_MEMORY_VERSION,purpose:'owner_history_review',providerShareable:false,
    status:partial?'partial':items.length?'ok':'no_match',
    coverage:{scope:'stored_reviewed_fields_only',completeWithinScope:!partial,
      recordsScanned:scanned,unsupportedRecords:unsupported,includesLegacyEnvelope:false},
    items}
 })
}
