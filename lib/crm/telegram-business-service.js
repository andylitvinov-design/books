import 'server-only'
import {randomUUID} from 'node:crypto'
import {transaction} from '../app/database.js'
import {operationHash,seal} from '../app/crypto.js'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {publicEnquiryReference} from '../practitioners/public-service-enquiry-input.mjs'
import {webhookTransaction} from './messenger-webhook.js'
import {assertHolisticBusinessConnection} from './messenger-provider.js'
import {telegramBusinessMessageFromUpdate,telegramBusinessClientChoice,
  telegramBusinessConversationReply,telegramBusinessServiceTitle} from '../assist/telegram-business-request.mjs'
import {AppError} from '../assessments/contracts.js'

const TABLE='app_private.crm_tg_business_service_sessions'
const LOCK='hh-tg-business-service-session:'
const today=()=>new Date().toISOString().slice(0,10)
const response=(event,locale,service,type,other={})=>({
  handled:true,connectionId:event.connectionId,to:event.chatId,
  reply:telegramBusinessConversationReply(type,{locale,service,...other}),
  updateId:event.updateId,messageId:event.messageId,
  terminal:['submitted','cancelled','stopped','unavailable'].includes(type),
})
function keys(event,config){
 const business=operationHash({scope:'hh-tg-business-connection',id:event.connectionId},config)
 const user=operationHash({scope:'hh-tg-business-user',business,id:event.chatId},config)
 return {business,user,lock:LOCK+business+':'+user}
}
async function lock(db,key){
 await db.query('select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1,0))',[key])
}
async function stage(event,config,k){
 return webhookTransaction(config,async db=>{
  await lock(db,k.lock)
  const old=(await db.query('select * from '+TABLE+
    ' where business_hash=$1 and user_hash=$2 for update',[k.business,k.user])).rows[0]
  if(old&&Number(old.last_update_id)>=event.updateId)return {handled:true}
  const action=telegramBusinessClientChoice(event.text),request=event.request
  if(old?.stage==='stopped')return {handled:true}
  if(action?.kind==='stop'){
    if(!old)return {handled:true}
    await db.query("update "+TABLE+" set stage='stopped',last_update_id=$3,updated_at=now() "+
      "where business_hash=$1 and user_hash=$2",[k.business,k.user,event.updateId])
    return response(event,old.locale,old.service_key,'stopped')
  }
  if(request&&(!old||old.stage==='submitted'||old.stage==='cancelled'||
     old.service_key!==request.service||old.locale!==request.locale)){
    await db.query('insert into '+TABLE+
      ' (business_hash,user_hash,operation_id,practitioner_id,service_key,locale,stage,last_update_id) '+
      "values($1,$2,$3,$4,$5,$6,'format',$7) "+
      'on conflict(business_hash,user_hash) do update set '+
      'operation_id=excluded.operation_id,practitioner_id=excluded.practitioner_id, '+
      'service_key=excluded.service_key,locale=excluded.locale,stage=excluded.stage, '+
      'last_update_id=excluded.last_update_id,delivery_format=null,consent_at=null, '+
      'reference_code=null,created_at=now(),updated_at=now()',
      [k.business,k.user,randomUUID(),PRACTITIONER_ID,
        request.service,request.locale,event.updateId])
    // Only the first ever recognized request in this hashed Business chat gets
    // a photo. Persisting the session precedes provider sends, so duplicate
    // webhooks and new enquiries from the same person cannot repeat it.
    const reply=response(event,request.locale,request.service,'format')
    return old?reply:{...reply,welcomePhoto:true}
  }
  if(!old)return {handled:false}
  const update='update '+TABLE+' set last_update_id=$3,updated_at=now() '
    +'where business_hash=$1 and user_hash=$2'
  if(action?.kind==='cancel'&&old.stage!=='submitted'){
    await db.query("update "+TABLE+" set stage='cancelled',last_update_id=$3,"+
       'updated_at=now() where business_hash=$1 and user_hash=$2',
       [k.business,k.user,event.updateId])
    return response(event,old.locale,old.service_key,'cancelled')
  }
  if(action?.kind==='format'&&['format','confirm'].includes(old.stage)){
    await db.query('update '+TABLE+
      " set stage='confirm',delivery_format=$3,last_update_id=$4,updated_at=now()"+
      ' where business_hash=$1 and user_hash=$2',
      [k.business,k.user,action.value,event.updateId])
    return response(event,old.locale,old.service_key,'confirm',{format:action.value})
  }
  if(action?.kind==='confirm'&&old.stage==='confirm'&&old.delivery_format){
    // The customer explicitly approved both this service and this format.
    // This is consent to a single reply, not marketing, Cabinet or payment.
    await db.query('update '+TABLE+
      " set stage='committing',consent_at=now(),last_update_id=$3,updated_at=now()"+
      ' where business_hash=$1 and user_hash=$2',
      [k.business,k.user,event.updateId])
    return {handled:true,commit:{operationId:old.operation_id,connectionId:event.connectionId,
      chatId:event.chatId,service:old.service_key,locale:old.locale,format:old.delivery_format,
      business:k.business,user:k.user,lock:k.lock},event}
  }
  if(action?.kind==='confirm'&&old.stage==='committing'&&old.consent_at){
    await db.query(update,[k.business,k.user,event.updateId])
    return {handled:true,commit:{operationId:old.operation_id,connectionId:event.connectionId,
      chatId:event.chatId,service:old.service_key,locale:old.locale,format:old.delivery_format,
      business:k.business,user:k.user,lock:k.lock},event}
  }
  if(action?.kind==='confirm'&&old.stage==='submitted'&&old.reference_code){
    await db.query(update,[k.business,k.user,event.updateId])
    return response(event,old.locale,old.service_key,'submitted',
      {referenceCode:old.reference_code})
  }
  await db.query(update,[k.business,k.user,event.updateId])
  return {handled:true}
 })
}
// A real business order is inserted only after the signed Telegram message
// explicitly confirmed it. No browser-provided identity, product price,
// clinical text, arbitrary consultant or consent can reach this transaction.
async function saveConfirmedEnquiry(config,intent){
 return transaction(config,null,async db=>{
  await lock(db,intent.lock)
  await db.query("select set_config('hh.tg_business_operation',$1,true)",
    [String(intent.operationId)])
  const state=(await db.query('select operation_id,practitioner_id,service_key,locale,delivery_format '+
    'from '+TABLE+" where operation_id=$1 and business_hash=$2 and user_hash=$3 "+
    "and stage='committing' and consent_at is not null and consent_at>now()-interval '15 minutes'",
    [intent.operationId,intent.business,intent.user])).rows[0]
  if(!state||state.practitioner_id!==PRACTITIONER_ID||
     state.service_key!==intent.service||state.locale!==intent.locale||
     state.delivery_format!==intent.format)
    throw new AppError('BUSINESS_CONFIRMATION_REQUIRED',409)
  const title=telegramBusinessServiceTitle(intent.service,intent.locale)
  if(!title)throw new AppError('INVALID_SERVICE_ENQUIRY',400)
  await db.query("select set_config('hh.public_enquiry_operation',$1,true)",
    [String(intent.operationId)])
  const digest=operationHash({scope:'hh-tg-business-enquiry',operationId:intent.operationId,
    business:intent.business,user:intent.user,service:intent.service,
    locale:intent.locale,format:intent.format},config)
  // Atomic finalize: CRM and session state share one backend transaction.
  // Cancel/STOP use the same advisory lock and can never race between commits.
  const finalize=async(id,referenceCode)=>{
    const marked=await db.query(
      'update '+TABLE+" set stage='submitted',reference_code=$4,updated_at=now()"+
      ' where business_hash=$1 and user_hash=$2 and operation_id=$3 '+
      "and stage='committing' and consent_at is not null "+
      "and consent_at>now()-interval '15 minutes'",
      [intent.business,intent.user,intent.operationId,referenceCode])
    if(marked.rowCount!==1)throw new AppError('BUSINESS_CONFIRMATION_REQUIRED',409)
    return {id,referenceCode}
  }
  const prior=(await db.query(
    'select id,reference_code,operation_hash from app.public_service_enquiries where operation_id=$1',
    [intent.operationId])).rows[0]
  if(prior){
    if(prior.operation_hash!==digest)throw new AppError('IDEMPOTENCY_CONFLICT',409)
    return finalize(prior.id,prior.reference_code)
  }
  const practitioner=(await db.query(
    "select id from app.practitioners where id=$1 and active "+
    "and status in ('approved','submitted','changes_requested') and public_profile<>'{}'::jsonb",
    [PRACTITIONER_ID])).rows[0]
  if(!practitioner)throw new AppError('PRACTICE_UNAVAILABLE',503)
  // A fixed public recommendation may not correspond to a moderated master
  // listing. In that case store the honest unlinked service title.
  const matching=(await db.query(
    'select id from app.service_offerings where practitioner_id=$1 and active=true '+
    "and status='published' and (localized_copy->$2->>'title')=$3 order by id limit 2",
    [PRACTITIONER_ID,intent.locale,title])).rows
  const offeringId=matching.length===1?matching[0].id:null
  const id=randomUUID(),ref=publicEnquiryReference(id)
  const ctx=(field)=>({accountId:PRACTITIONER_ID,recordId:id,field})
  const message='A customer confirmed a Telegram Business enquiry for "'+title+
    '", format '+intent.format+'. Reply in the existing @holistichouse chat. '+
    'This is not a booked session or verified payment.'
  // No raw chat ID, Telegram username, arbitrary free text, symptoms or
  // reports are stored. Telegram reply identity remains at the provider.
  const contact={displayName:'Telegram customer',email:'',phone:'',
    submittedByVisitor:true,replyConsent:'tg_business_single_enquiry_v1'}
  const proof=operationHash({scope:'hh-tg-business-consent',operationId:intent.operationId,
    business:intent.business,user:intent.user},config)
  const inserted=(await db.query(
    'insert into app.public_service_enquiries '+
    '(id,recipient_practitioner_id,service_title,source_path,locale,reference_code,'+
    'description_ciphertext,contact_ciphertext,contact_channel,operation_id,operation_hash,'+
    'service_offering_id,telegram_handoff_digest) '+
    'values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning id',
    [id,PRACTITIONER_ID,title,'/'+intent.locale+'/services',intent.locale,ref,
      seal(message,ctx('public_lead.message'),config),
      seal(contact,ctx('public_lead.contact'),config),'telegram',
      intent.operationId,digest,offeringId,proof])).rows[0]
  if(!inserted)throw new AppError('REQUEST_FAILED',503)
  return finalize(id,ref)
 },{server:true})
}
export async function processTelegramBusinessConversation(update,config,env=process.env){
 if(env.HH_CRM_TG_CHAT_AUTOMATION_ENABLED!=='true')return {handled:false}
 const event=telegramBusinessMessageFromUpdate(update)
 if(!event)return {handled:false}
 if(!event.request&&!telegramBusinessClientChoice(event.text))
   return {handled:false}
 // The connected user's ID/rights must be checked at the provider before any
 // session lookup or write. No credential, chat text or IDs are logged.
 try{
   await assertHolisticBusinessConnection({connectionId:event.connectionId,
     to:event.chatId},env)
 }catch{return {handled:true}}
 const k=keys(event,config)
 const result=await stage(event,config,k)
 if(!result.commit)return result
 try{
   const saved=await saveConfirmedEnquiry(config,result.commit)
   // Both records are committed atomically before acknowledging the client.
   return response(event,result.commit.locale,result.commit.service,'submitted',
     {referenceCode:saved.referenceCode})
 }catch{
   // A competing Cancel/STOP may have won the lock before the CRM transaction.
   // Never send a retry nudge to an already terminal conversation.
   let stillPending=false
   try{
     stillPending=await webhookTransaction(config,async db=>{
       await lock(db,result.commit.lock)
       const row=(await db.query('select stage,operation_id from '+TABLE+
         ' where business_hash=$1 and user_hash=$2',
         [result.commit.business,result.commit.user])).rows[0]
       return row?.stage==='committing'&&row.operation_id===result.commit.operationId
     })
   }catch{}
   return stillPending
     ?response(event,result.commit.locale,result.commit.service,'unavailable')
     :{handled:true}
 }
}
