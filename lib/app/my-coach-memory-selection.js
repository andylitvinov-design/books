import 'server-only'
import {randomUUID} from 'node:crypto'
import {AppError} from '../assessments/contracts.js'
import {transaction} from './database.js'
import {operationHash} from './crypto.js'
import {ownerMemoryFingerprint,projectOwnerMemoryArchiveRow} from './my-coach-memory-source.js'
import {OWNER_MEMORY_MAX_CIPHERTEXT_BYTES,searchOwnerReviewedEvidence} from '../coaching/coach-personal-memory.mjs'
import {MEMORY_SELECTION_VERSION,MEMORY_SELECTION_PAGE,MEMORY_SELECTION_LIMIT,
 normalizeMemorySelection,ownerMemorySelectionAllowed,matchingMemoryEvidence,memorySelectionView} from '../coaching/coach-memory-selection.mjs'
const refs='app_private.client_ai_memory_protocol_refs'
const ops='app_private.client_ai_memory_protocol_ref_ops'
const settingsTable='app_private.client_ai_memory_settings'
const unavailable=()=>new AppError('MY_COACH_MEMORY_SOURCE_UNAVAILABLE',409)
export const coachMemorySelectionEnabled=(env=process.env)=>
 env.HH_COACH_MEMORY_SELECTION_ENABLED==='true'&&env.HH_CLIENT_MEMORY_ENABLED==='true'
async function active(db,actor){
 if(!actor?.id||!(await db.query("select 1 from app.accounts where id=$1 and status='active' and onboarding_state='active'",[actor.id])).rows.length)
  throw new AppError('ACCOUNT_REQUIRED',401)
}
async function readSettings(db,actor,lock=false){
 return (await db.query('select memory_enabled,sensitive_enabled,revision from '+settingsTable+
  ' where account_id=$1'+(lock?' for update':''),[actor.id])).rows[0]||null
}
const operation=(config,actor,input)=>operationHash({purpose:MEMORY_SELECTION_VERSION,accountId:actor.id,input},config)
async function refById(db,actor,id){
 return (await db.query('select * from '+refs+' where account_id=$1 and id=$2',[actor.id,id])).rows[0]||null
}
const receipt=row=>({id:row?.id??null,revision:row?.revision??null,status:row?.status??'unavailable'})
async function priorOperation(db,actor,input,requestHash){
 const row=(await db.query('select action,request_hash,ref_id from '+ops+
  ' where account_id=$1 and operation_id=$2',[actor.id,input.operationId])).rows[0]
 if(!row)return null
 if(row.action!==input.action||row.request_hash!==requestHash)throw new AppError('IDEMPOTENCY_CONFLICT',409)
 return {...receipt(await refById(db,actor,row.ref_id)),duplicate:true}
}
async function recordOperation(db,actor,input,requestHash,refId){
 await db.query('insert into '+ops+'(account_id,operation_id,action,request_hash,ref_id) values($1,$2,$3,$4,$5)',
 [actor.id,input.operationId,input.action,requestHash,refId])
}
async function archiveRows(db,actor,ids){
 if(!ids.length)return []
 const {rows}=await db.query(
  'with chosen as (select account_id,protocol_id,schema_version,protocol_ciphertext,'+
  'sum(octet_length(protocol_ciphertext)) over(order by protocol_id rows unbounded preceding) as total_bytes '+
  'from app_private.my_coach_protocol_records where account_id=$1 and protocol_id=any($2::uuid[])) '+
  'select account_id,protocol_id,schema_version,case when total_bytes<=$3 then protocol_ciphertext else null end as protocol_ciphertext from chosen',
  [actor.id,[...new Set(ids)],OWNER_MEMORY_MAX_CIPHERTEXT_BYTES])
 if(rows.some(row=>row.account_id!==actor.id))throw new AppError('MY_COACH_MEMORY_UNAVAILABLE',503)
 return rows
}
function evidence(config,actor,row,source){
 if(!row?.protocol_ciphertext)return null
 try{
  const result=projectOwnerMemoryArchiveRow(config,actor,row)
  return result.supported?matchingMemoryEvidence(result.items,source):null
 }catch{return null}
}
async function list(db,config,actor,input){
 const isSearch=input.action==='search'
 const pageSize=isSearch?MEMORY_SELECTION_LIMIT:MEMORY_SELECTION_PAGE
 const after=isSearch?null:input.after
 const settings=await readSettings(db,actor)
 const enabled=ownerMemorySelectionAllowed(settings)
 const empty={version:MEMORY_SELECTION_VERSION,consentRequired:!enabled,
  settingsRevision:settings?.revision??0,items:[],nextCursor:null,partial:false,
  ...(isSearch?{searchStatus:enabled?'no_match':'not_authorized'}:{})}
 if(!enabled)return empty
 const {rows}=await db.query('select * from '+refs+
  " where account_id=$1 and status='active' and ($2::uuid is null or id>$2::uuid) order by id limit $3",
  [actor.id,after,pageSize+1])
 if(rows.some(row=>row.account_id!==actor.id))throw new AppError('MY_COACH_MEMORY_UNAVAILABLE',503)
 const page=rows.slice(0,pageSize)
 const archives=await archiveRows(db,actor,page.map(r=>r.protocol_id))
 const items=[]
 let partial=rows.length>pageSize&&isSearch
 // Decode each distinct archive record once, within the existing byte cap.
 const projected=new Map()
 for(const row of archives){
  try{const result=projectOwnerMemoryArchiveRow(config,actor,row)
   if(result.supported)projected.set(row.protocol_id,result.items)
  }catch{/* unavailable source */}
 }
 for(const ref of page){
  const source={kind:'reviewed_coaching_protocol',protocolId:ref.protocol_id,fieldId:ref.field_id,
   fieldRevision:ref.field_revision,turnIndex:ref.turn_index}
  const item=matchingMemoryEvidence(projected.get(ref.protocol_id),source)
  if(!item||ownerMemoryFingerprint(config,actor.id,item)!==ref.source_hash){
   partial=true
   items.push({id:ref.id,revision:ref.revision,status:'source_unavailable',scope:'owner_only',providerShareable:false})
   continue
  }
  const view=memorySelectionView(ref,item)
  if(view)items.push(view);else partial=true
 }
 // Reauthorize current settings and active references; no cached text.
 const latest=await readSettings(db,actor)
 if(!ownerMemorySelectionAllowed(latest)||latest.revision!==settings.revision)
  return {...empty,consentRequired:!ownerMemorySelectionAllowed(latest),settingsRevision:latest?.revision??0,partial:true,
   ...(isSearch?{searchStatus:ownerMemorySelectionAllowed(latest)?'partial':'not_authorized'}:{})}
 if(!page.length)return empty
 const current=(await db.query('select id,revision from '+refs+
   " where account_id=$1 and status='active' and id=any($2::uuid[])",[actor.id,page.map(r=>r.id)])).rows
 const allowed=new Map(current.map(r=>[r.id,r.revision]))
 const valid=items.filter(item=>allowed.get(item.id)===item.revision)
 const incomplete=partial||current.length!==page.length
 if(isSearch){
  const found=searchOwnerReviewedEvidence(valid.filter(item=>item.status==='active'&&item.providerShareable===false)
    .map(item=>({...item,accountId:actor.id})),actor.id,input.query)
  return {...empty,items:found,partial:incomplete,
   searchStatus:incomplete?'partial':found.length?'ok':'no_match'}
 }
 return {...empty,items:valid,
  nextCursor:rows.length>pageSize?page.at(-1).id:null,partial:incomplete}
}
export async function manageMyCoachMemorySelection(config,actor,raw){
 let input
 try{input=normalizeMemorySelection(raw)}catch{throw new AppError('MY_COACH_MEMORY_SELECTION_INVALID',400)}
 return transaction(config,actor,async db=>{
  await active(db,actor)
  if(input.action==='list'||input.action==='search')return list(db,config,actor,input)
  // Same canonical settings lock as the existing owner consent writer.
  const settings=await readSettings(db,actor,true)
  if(!settings)throw new AppError('MY_COACH_MEMORY_CONSENT_REQUIRED',403)
  if(input.action==='save'&&!ownerMemorySelectionAllowed(settings))
   throw new AppError('MY_COACH_MEMORY_CONSENT_REQUIRED',403)
  const requestHash=operation(config,actor,input)
  const previous=await priorOperation(db,actor,input,requestHash)
  if(previous)return previous
  if(input.action==='forget'){
   const row=await refById(db,actor,input.id)
   if(!row)throw unavailable()
   if(row.revision!==input.expectedRevision)throw new AppError('STALE_REVISION',409)
   if(row.status==='blocked'){
    await recordOperation(db,actor,input,requestHash,row.id)
    return {...receipt(row),duplicate:false}
   }
   const {rows}=await db.query('update '+refs+
    " set status='blocked',source_hash=null,revision=revision+1 where account_id=$1 and id=$2 and revision=$3 and status='active' returning *",
    [actor.id,row.id,row.revision])
   if(rows.length!==1)throw new AppError('STALE_REVISION',409)
   await recordOperation(db,actor,input,requestHash,row.id)
   return {...receipt(rows[0]),duplicate:false}
  }
  if(settings.revision!==input.expectedSettingsRevision)throw new AppError('STALE_REVISION',409)
  const source=input.source
  const [archive]=await archiveRows(db,actor,[source.protocolId])
  const item=evidence(config,actor,archive,source)
  if(!item||ownerMemoryFingerprint(config,actor.id,item)!==input.sourceFingerprint)throw unavailable()
  const existing=(await db.query('select * from '+refs+' where account_id=$1 and protocol_id=$2 and field_id=$3',
   [actor.id,source.protocolId,source.fieldId])).rows[0]
  if(existing){
   if(existing.status!=='active')throw new AppError('MY_COACH_MEMORY_BLOCKED',409)
   if(existing.source_hash!==input.sourceFingerprint)throw unavailable()
   await recordOperation(db,actor,input,requestHash,existing.id)
   return {...receipt(existing),duplicate:false}
  }
  const total=Number((await db.query('select count(*)::integer as n from '+refs+
   " where account_id=$1 and status='active'",[actor.id])).rows[0]?.n)
  if(!Number.isSafeInteger(total)||total<0||total>=MEMORY_SELECTION_LIMIT)throw new AppError('MEMORY_LIMIT',429)
  const {rows}=await db.query('insert into '+refs+
   '(account_id,id,protocol_id,field_id,field_revision,turn_index,source_hash) values($1,$2,$3,$4,$5,$6,$7) returning *',
   [actor.id,randomUUID(),source.protocolId,source.fieldId,source.fieldRevision,source.turnIndex,input.sourceFingerprint])
  if(rows.length!==1)throw unavailable()
  await recordOperation(db,actor,input,requestHash,rows[0].id)
  return {...receipt(rows[0]),duplicate:false}
 })
}
