import 'server-only'
import {transaction} from './database.js'
import {seal,openSealed,operationHash} from './crypto.js'
import {AppError,requireUUID} from '../assessments/contracts.js'
import {journalWrite,journalDelete,journalPage} from './daybook-journal-contract.mjs'
import {clarityJournalIdentity,assertClarityJournalIdentityUnchanged,assertClarityJournalBinding} from '../coaching/clarity-journal-scope.mjs'
import {clarityRunStorageEnabled} from './clarity-course-runs.js'

const context=(actor,id)=>({accountId:actor.id,recordId:id,field:'daybook.entry'})
const columns='id,payload_ciphertext,revision,created_at,updated_at'
async function active(db,actor,lock=false){
 if(!(await db.query("select id from app.accounts where id=$1 and status='active' and onboarding_state='active'"+(lock?' for update':''),[actor.id])).rows.length) throw new AppError('ACCOUNT_REQUIRED',401)
}
function view(row,actor,config){
 const payload=openSealed(row.payload_ciphertext,context(actor,row.id),config)
 // Validate the decrypted schema; stored operation IDs are never part of journal content.
 const normalized=journalWrite({...payload,id:row.id,revision:row.revision,operationId:row.id})
 delete normalized.operationId
 return {...normalized,createdAt:row.created_at,updatedAt:row.updated_at}
}
async function rowFor(db,actor,id){
 return (await db.query(`select ${columns} from app_private.daybook_entries where account_id=$1 and id=$2`,[actor.id,id])).rows[0]
}
async function receipt(db,actor,input,operation,fingerprint){
 const found=(await db.query('select entry_id,operation,revision,request_fingerprint from app_private.daybook_entry_receipts where account_id=$1 and operation_id=$2',[actor.id,input.operationId])).rows[0]
 if(found&&(found.entry_id!==input.id||found.operation!==operation||found.request_fingerprint!==fingerprint)) throw new AppError('JOURNAL_IDEMPOTENCY_CONFLICT',409)
 return found
}
async function recordReceipt(db,actor,input,operation,fingerprint,revision){
 await db.query('insert into app_private.daybook_entry_receipts(account_id,operation_id,entry_id,request_fingerprint,operation,revision) values($1,$2,$3,$4,$5,$6)',[actor.id,input.operationId,input.id,fingerprint,operation,revision])
}
async function verifyCourseScope(db,actor,config,input){
 let identity
 try{
  identity=clarityJournalIdentity(input)
  if(input.revision>0){
   const row=await rowFor(db,actor,input.id)
   if(row)identity=assertClarityJournalIdentityUnchanged(view(row,actor,config),input)
  }
 }catch(error){
  if(error instanceof AppError)throw error
  throw new AppError('CLARITY_JOURNAL_SCOPE_INVALID',409)
 }
 if(!identity.courseRunId&&!identity.reportId)return
 if(!clarityRunStorageEnabled()){
  if(identity.courseRunId)throw new AppError('CLARITY_RUN_UNAVAILABLE',503)
  return // ordinary legacy homework remains supported
 }
 if(identity.courseRunId){
  const owned=(await db.query('select id from app_private.clarity_course_runs where account_id=$1 and id=$2',[actor.id,identity.courseRunId])).rows[0]
  if(!owned)throw new AppError('CLARITY_RUN_NOT_FOUND',404)
 }
 if(identity.reportId){
  const row=(await db.query('select course_run_id,course_day from app_private.clarity_course_run_sessions where account_id=$1 and protocol_id=$2',[actor.id,identity.reportId])).rows[0]
  try{assertClarityJournalBinding(identity,row?{courseRunId:row.course_run_id,day:Number(row.course_day)}:null)}
  catch{throw new AppError('CLARITY_JOURNAL_SCOPE_INVALID',409)}
 }
}
export function createDaybookJournalRepository(config){
 return {
  async list(actor,input={}){
   const {limit,before}=journalPage(input)
   return transaction(config,actor,async db=>{
    await active(db,actor)
    const cursor=before?await rowFor(db,actor,before):null
    if(before&&!cursor) throw new AppError('JOURNAL_CURSOR_UNAVAILABLE',409)
    const rows=(await db.query(`select ${columns} from app_private.daybook_entries where account_id=$1`+
     (cursor?' and (created_at,id)<($3::timestamptz,$4::uuid)':'')+' order by created_at desc,id desc limit $2',
     cursor?[actor.id,limit+1,cursor.created_at,cursor.id]:[actor.id,limit+1])).rows
    const page=rows.slice(0,limit)
    return {entries:page.map(row=>view(row,actor,config)),nextCursor:rows.length>limit?page.at(-1).id:null}
   })
  },
  async read(actor,id){
   requireUUID(id)
   return transaction(config,actor,async db=>{
    await active(db,actor)
    const row=await rowFor(db,actor,id)
    if(!row) throw new AppError('NOT_FOUND',404)
    return {entry:view(row,actor,config)}
   })
  },
  async save(actor,raw){
   const input=journalWrite(raw),fingerprint=operationHash({operation:'save',input},config)
   return transaction(config,actor,async db=>{
    // Serialize all writes for this account, including request retries and deletion.
    await active(db,actor,true)
    const prior=await receipt(db,actor,input,'save',fingerprint)
    if(prior){
     const row=await rowFor(db,actor,input.id)
     if(!row) throw new AppError('JOURNAL_ENTRY_DELETED',410)
     if(row.revision!==prior.revision) throw new AppError('JOURNAL_REVISION_ADVANCED',409)
     return {entry:view(row,actor,config),saved:true,replayed:true}
    }
    if((await db.query("select 1 from app_private.daybook_entry_receipts where account_id=$1 and entry_id=$2 and operation='delete' limit 1",[actor.id,input.id])).rows.length) throw new AppError('JOURNAL_ENTRY_DELETED',410)
    await verifyCourseScope(db,actor,config,input)
    if(input.goalId){
     const existing=input.revision>0?await rowFor(db,actor,input.id):null
     const sameGoal=existing&&view(existing,actor,config).goalId===input.goalId
     // New links require an accepted goal. Existing historical links survive completion.
     if(!(await db.query("select id from app_private.coaching_goals where id=$1 and account_id=$2 and (status in ('accepted','active','in_progress') or $3::boolean)",[input.goalId,actor.id,Boolean(sameGoal)])).rows.length)throw new AppError('JOURNAL_GOAL_UNAVAILABLE',409)
    }
    const {id,revision}=input
    const payload={text:input.text,tags:input.tags,kind:input.kind,locale:input.locale,timezone:input.timezone,localDay:input.localDay,goalId:input.goalId}
    const ciphertext=seal(payload,context(actor,id),config)
    let row
    if(revision===0){
     row=(await db.query(`insert into app_private.daybook_entries(id,account_id,payload_ciphertext,revision) values($1,$2,$3,1) on conflict do nothing returning ${columns}`,[id,actor.id,ciphertext])).rows[0]
    }else{
     row=(await db.query(`update app_private.daybook_entries set payload_ciphertext=$3,revision=revision+1,updated_at=now() where id=$1 and account_id=$2 and revision=$4 returning ${columns}`,[id,actor.id,ciphertext,revision])).rows[0]
    }
    if(!row) throw new AppError('JOURNAL_REVISION_CONFLICT',409)
    await recordReceipt(db,actor,input,'save',fingerprint,row.revision)
    // Readback inside the committed transaction, using the stored ciphertext.
    return {entry:view(row,actor,config),saved:true,replayed:false}
   })
  },
  async remove(actor,raw){
   const input=journalDelete(raw),fingerprint=operationHash({operation:'delete',input},config)
   return transaction(config,actor,async db=>{
    await active(db,actor,true)
    if(await receipt(db,actor,input,'delete',fingerprint)) return {id:input.id,deleted:true,replayed:true}
    const deleted=(await db.query('delete from app_private.daybook_entries where account_id=$1 and id=$2 and revision=$3 returning id',[actor.id,input.id,input.revision])).rows[0]
    if(!deleted) throw new AppError('JOURNAL_REVISION_CONFLICT',409)
    await recordReceipt(db,actor,input,'delete',fingerprint,input.revision)
    return {id:input.id,deleted:true,replayed:false}
   })
  },
 }
}
