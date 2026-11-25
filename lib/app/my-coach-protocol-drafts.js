import 'server-only'
import {transaction} from './database.js'
import {seal,openSealed} from './crypto.js'
import {AppError} from '../assessments/contracts.js'
import {normalizeMyCoachDraft,draftTranscriptPrefix,validDraftRevision,coachDraftReviewDecision} from '../personal-coaching/protocol-draft.mjs'
import {isMyCoachProtocolId,normalizeMyCoachProtocolCursor} from '../personal-coaching/protocol-archive.mjs'

const context=(actor,id)=>({accountId:actor.id,recordId:id.toLowerCase(),field:'my_coach.draft'})
const conflict=()=>new AppError('MY_COACH_DRAFT_CONFLICT',409)
const invalid=()=>new AppError('MY_COACH_DRAFT_INVALID',400)
async function active(db,actor){
 if(!(await db.query("select id from app.accounts where id=$1 and status='active' and onboarding_state='active'",[actor.id])).rows[0])
  throw new AppError('ACCOUNT_REQUIRED',401)
}
export async function lockCoachDraft(db,actor,id){
 // Serialize first insert, retry, discard and promotion even if the row is absent.
 await db.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[actor.id+':my-coach:'+id.toLowerCase()])
 return (await db.query('select protocol_id,revision,state,payload_ciphertext,updated_at from app_private.my_coach_protocol_drafts where account_id=$1 and protocol_id=$2 for update',[actor.id,id.toLowerCase()])).rows[0]||null
}
function unpack(row,actor,config){
 const value=openSealed(row.payload_ciphertext,context(actor,row.protocol_id),config)
 if(!value||value.protocol?.id?.toLowerCase()!==String(row.protocol_id).toLowerCase()||
  value.protocol.provenance!=='client_autosaved_unreviewed_draft')throw new AppError('MY_COACH_DRAFT_UNAVAILABLE',503)
 return {...value,id:row.protocol_id,revision:row.revision,updatedAt:new Date(row.updated_at).toISOString()}
}
export async function saveCoachDraft(config,actor,input){
 if(input.consent!==true||!validDraftRevision(input.revision))throw invalid()
 let value
 try{value=normalizeMyCoachDraft(input.value)}catch{throw invalid()}
 const id=value.protocol.id.toLowerCase()
 return transaction(config,actor,async db=>{
  await active(db,actor)
  const row=await lockCoachDraft(db,actor,id)
  if(row&&row.state!=='active')throw conflict()
  const reviewed=(await db.query('select protocol_id from app_private.my_coach_protocol_records where account_id=$1 and protocol_id=$2',[actor.id,id])).rows[0]
  if(reviewed)throw conflict()
  if(row){
   const old=unpack(row,actor,config)
   if(input.revision===row.revision){
    if(JSON.stringify({courseSessionId:old.courseSessionId,protocol:old.protocol})!==JSON.stringify(value))throw conflict()
    return {saved:true,id:value.protocol.id,revision:row.revision}
   }
   if(input.revision!==row.revision+1||old.courseSessionId!==value.courseSessionId||
     !draftTranscriptPrefix(old.protocol,value.protocol))throw conflict()
   const updated=await db.query("update app_private.my_coach_protocol_drafts set revision=$3,payload_ciphertext=$4,updated_at=now() where account_id=$1 and protocol_id=$2 and state='active' and revision=$5 returning revision",
    [actor.id,id,input.revision,seal(value,context(actor,id),config),row.revision])
   if(updated.rows.length!==1)throw conflict()
  }else{
   if(input.revision!==1)throw conflict()
   await db.query("insert into app_private.my_coach_protocol_drafts(account_id,protocol_id,revision,payload_ciphertext) values($1,$2,$3,$4)",
    [actor.id,id,1,seal(value,context(actor,id),config)])
  }
  return {saved:true,id:value.protocol.id,revision:input.revision}
 })
}
export async function listCoachDrafts(config,actor,options){
 let cursor
 try{cursor=normalizeMyCoachProtocolCursor(options)}catch{throw invalid()}
 return transaction(config,actor,async db=>{
  await active(db,actor)
  const values=cursor?[actor.id,cursor.before,cursor.beforeId]:[actor.id]
  const extra=cursor?' and (updated_at,protocol_id)<($2::timestamptz,$3::uuid)':''
  const {rows}=await db.query("select protocol_id,revision,payload_ciphertext,updated_at,to_char(updated_at AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') as cursor_at from app_private.my_coach_protocol_drafts where account_id=$1 and state='active'"+extra+' order by updated_at desc,protocol_id desc limit 21',values)
  const page=rows.slice(0,20),last=page.at(-1),hasMore=rows.length>20
  return {drafts:page.map(row=>unpack(row,actor,config)),hasMore,nextCursor:hasMore?{before:last.cursor_at,beforeId:last.protocol_id}:null}
 })
}
export async function discardCoachDraft(config,actor,input){
 if(input.confirmed!==true||!isMyCoachProtocolId(input.id))throw invalid()
 const id=input.id.toLowerCase()
 return transaction(config,actor,async db=>{
  await active(db,actor)
  const row=await lockCoachDraft(db,actor,id)
  if(row?.state==='active')await db.query("update app_private.my_coach_protocol_drafts set state='discarded',payload_ciphertext=null,updated_at=now() where account_id=$1 and protocol_id=$2",[actor.id,id])
  else if(!row)await db.query("insert into app_private.my_coach_protocol_drafts(account_id,protocol_id,revision,state) values($1,$2,1,'discarded')",[actor.id,id])
  return {deleted:true,id}
 })
}
// Called by the existing immutable reviewed-archive writer inside its transaction.
export async function assertCoachDraftReview(db,actor,config,protocol,revision){
 const row=await lockCoachDraft(db,actor,protocol.id)
 const existing=(await db.query('select protocol_id from app_private.my_coach_protocol_records where account_id=$1 and protocol_id=$2',[actor.id,protocol.id.toLowerCase()])).rows[0]
 const decision=coachDraftReviewDecision(row,revision,Boolean(existing))
 if(decision==='invalid')throw invalid()
 if(decision==='conflict')throw conflict()
 if(decision==='promote'){
  const old=unpack(row,actor,config)
  if(!draftTranscriptPrefix(old.protocol,protocol))throw conflict()
 }
 return row
}
export async function finalizeCoachDraft(db,actor,id,row){
 if(row?.state==='finalized')return
 if(row)await db.query("update app_private.my_coach_protocol_drafts set state='finalized',payload_ciphertext=null,updated_at=now() where account_id=$1 and protocol_id=$2",[actor.id,id.toLowerCase()])
 else await db.query("insert into app_private.my_coach_protocol_drafts(account_id,protocol_id,revision,state) values($1,$2,1,'finalized')",[actor.id,id.toLowerCase()])
}
