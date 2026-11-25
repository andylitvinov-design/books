import 'server-only'
import {transaction} from './database.js'
import {seal,openSealed} from './crypto.js'
import {AppError,onlyKeys} from '../assessments/contracts.js'
import {getCoachPersona} from '../coaching/persona-registry.mjs'
import {normalizeMyCoachDraft,draftRevision,draftWriteDecision,validDraftId,MY_COACH_DRAFT_PROVENANCE} from '../personal-coaching/my-coach-draft.mjs'
import {normalizeMyCoachProtocolCursor,MY_COACH_PROTOCOL_PAGE_SIZE} from '../personal-coaching/protocol-archive.mjs'
import {saveMyCoachProtocolInTransaction,verifySavedMyCoachProtocolInTransaction} from './personal-coaching.js'
const ctx=(actor,id)=>({accountId:actor.id,recordId:id,field:'my_coach.draft'})
const bad=()=>new AppError('MY_COACH_DRAFT_INVALID',400)
const conflict=()=>new AppError('MY_COACH_DRAFT_CONFLICT',409)
const idOf=id=>{if(!validDraftId(id))throw bad();return id.toLowerCase()}
const revOf=value=>{try{return draftRevision(value)}catch{throw bad()}}
async function assertOwner(db,actor){
 const {rows}=await db.query("select id from app.accounts where id=$1 and status='active' and onboarding_state='active'",[actor.id])
 if(!rows.length)throw new AppError('ACCOUNT_REQUIRED',401)
}
function unpack(row,actor,config){
 if(!row)return null
 const revision=Number(row.revision)
 if(row.deleted_at)return {revision,deleted:true}
 const payload=openSealed(row.payload_ciphertext,ctx(actor,row.session_id),config)
 if(payload?.id!==row.session_id||payload.personaId!==row.persona_id||payload.provenance!==MY_COACH_DRAFT_PROVENANCE)
  throw new AppError('MY_COACH_DRAFT_UNAVAILABLE',503)
 return {revision,payload,updatedAt:new Date(row.updated_at).toISOString()}
}
async function find(db,actor,config,id,lock=false){
 const {rows}=await db.query('select session_id,persona_id,payload_ciphertext,revision,updated_at,deleted_at from app_private.my_coach_drafts where account_id=$1 and session_id=$2'+(lock?' for update':''),[actor.id,id])
 return unpack(rows[0],actor,config)
}
export async function readMyCoachDrafts(config,actor,{id,personaId,before,beforeId}={}){
 return transaction(config,actor,async db=>{
  await assertOwner(db,actor)
  const schema=(await db.query("select to_regclass('app_private.my_coach_drafts') as present")).rows[0]
  if(!schema?.present){
   if(process.env.HH_MY_COACH_DRAFTS_ENABLED==='true'||id!==undefined)throw new AppError('MY_COACH_DRAFT_UNAVAILABLE',503)
   return {drafts:[],hasMore:false,nextCursor:null}
  }
  if(id!==undefined){
   if(personaId!==undefined||before!==undefined||beforeId!==undefined)throw bad()
   const row=await find(db,actor,config,idOf(id))
   if(!row||row.deleted)throw new AppError('MY_COACH_DRAFT_NOT_FOUND',404)
   return {draft:{...row.payload,revision:row.revision,updatedAt:row.updatedAt}}
  }
  if(personaId!==undefined&&!getCoachPersona(personaId))throw bad()
  let cursor;try{cursor=normalizeMyCoachProtocolCursor({before:before??null,beforeId:beforeId??null})}catch{throw bad()}
  const values=[actor.id]
  let predicate='account_id=$1 and deleted_at is null'
  if(personaId!==undefined){values.push(personaId);predicate+=' and persona_id=$'+values.length}
  if(cursor){values.push(cursor.before,cursor.beforeId);predicate+=' and (updated_at,session_id)<($'+(values.length-1)+'::timestamptz,$'+values.length+'::uuid)'}
  values.push(MY_COACH_PROTOCOL_PAGE_SIZE+1)
  const {rows}=await db.query("select session_id,persona_id,payload_ciphertext,revision,updated_at,deleted_at,to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') as saved_at_cursor from app_private.my_coach_drafts where "+predicate+' order by updated_at desc,session_id desc limit $'+values.length,values)
  const page=rows.slice(0,MY_COACH_PROTOCOL_PAGE_SIZE),last=page.at(-1)
  return {drafts:page.map(row=>{
   const {payload,revision,updatedAt}=unpack(row,actor,config)
   return {id:payload.id,personaId:payload.personaId,locale:payload.locale,courseSessionId:payload.courseSessionId,status:payload.status,revision,updatedAt,turnCount:payload.turns.length}
  }),hasMore:rows.length>page.length,nextCursor:rows.length>page.length?{before:last.saved_at_cursor,beforeId:last.session_id}:null}
 })
}
export async function writeMyCoachDraft(config,actor,input){
 onlyKeys(input,['action','consent','expectedRevision','protocol','courseSessionId','status'])
 if(input.consent!==true)throw new AppError('MY_COACH_DRAFT_CONSENT_REQUIRED',403)
 const expected=revOf(input.expectedRevision)
 let payload
 try{payload=normalizeMyCoachDraft(input)}catch{throw bad()}
 const id=idOf(payload.id)
 if(payload.id!==id)throw bad()
 return transaction(config,actor,async db=>{
  await assertOwner(db,actor)
  const old=await find(db,actor,config,id,true)
  const decision=draftWriteDecision(old,expected,payload)
  if(decision==='conflict')throw conflict()
  if(decision==='retry')return {saved:true,id,revision:old.revision}
  const ciphertext=seal(payload,ctx(actor,id),config)
  const result=decision==='insert'
   ?await db.query('insert into app_private.my_coach_drafts(account_id,session_id,persona_id,payload_ciphertext,revision) values($1,$2,$3,$4,1) on conflict(account_id,session_id) do nothing returning revision',[actor.id,id,payload.personaId,ciphertext])
   :await db.query('update app_private.my_coach_drafts set payload_ciphertext=$3,revision=revision+1,updated_at=now() where account_id=$1 and session_id=$2 and revision=$4 and deleted_at is null returning revision',[actor.id,id,ciphertext,expected])
  if(!result.rows.length)throw conflict()
  return {saved:true,id,revision:Number(result.rows[0].revision)}
 })
}
export async function closeMyCoachDraft(config,actor,input){
 const finalize=input.action==='finalize'
 onlyKeys(input,finalize?['action','consent','id','expectedRevision','protocol']:['action','confirmed','id','expectedRevision'])
 if(finalize?input.consent!==true:input.confirmed!==true)throw bad()
 const id=idOf(input.id),expected=revOf(input.expectedRevision)
 if(finalize&&input.protocol?.id!==id)throw bad()
 return transaction(config,actor,async db=>{
  await assertOwner(db,actor)
  const row=await find(db,actor,config,id,true)
  if(!row)throw new AppError('MY_COACH_DRAFT_NOT_FOUND',404)
  // A successful finalize retry reuses the immutable archive's exact-payload
  // check, but cannot recreate an erased draft.
  if(row.deleted){
   if(finalize){
    if(row.revision===expected+1&&await verifySavedMyCoachProtocolInTransaction(db,config,actor,input.protocol))
     return {saved:true,id,finalized:true}
    throw conflict()
   }
   return {deleted:true,id}
  }
  if(row.revision!==expected)throw conflict()
  if(finalize&&(input.protocol.personaId!==row.payload.personaId||
    input.protocol.startedAt!==row.payload.startedAt))throw conflict()
  if(finalize)await saveMyCoachProtocolInTransaction(db,config,actor,{consent:true,protocol:input.protocol})
  const result=await db.query('update app_private.my_coach_drafts set payload_ciphertext=null,deleted_at=now(),updated_at=now(),revision=revision+1 where account_id=$1 and session_id=$2 and revision=$3 and deleted_at is null returning revision',[actor.id,id,expected])
  if(!result.rows.length)throw conflict()
  return finalize?{saved:true,id,finalized:true}:{deleted:true,id}
 })
}
