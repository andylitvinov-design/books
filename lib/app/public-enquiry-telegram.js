import 'server-only'
import {transaction,consumeRate} from './database.js'
import {openSealed} from './crypto.js'
import {requireUUID} from '../assessments/contracts.js'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {telegramOwnerPilotReady} from './client-telegram-policy.js'
import {sendOwnerTelegramEventMessage} from './client-telegram-transport.js'

export async function readPublicEnquiryNoticeMetadata(config,enquiryId,operationId){
 requireUUID(enquiryId)
 requireUUID(operationId)
 return transaction(config,null,async db=>{
  // This capability is used only within the protected transaction.
  await db.query("select set_config('hh.public_enquiry_operation',$1,true)",[operationId])
  return (await db.query(
   `select service_title as "serviceTitle",source_path as "sourcePath",created_at as "createdAt",
     reference_code as "referenceCode",(contact_ciphertext is not null) as "hasContact",
     to_jsonb(e)->'attribution' as attribution
    from app.public_service_enquiries e
    where e.id=$1 and e.recipient_practitioner_id=$2 and e.operation_id=$3 limit 1`,
   [enquiryId,PRACTITIONER_ID,operationId])).rows[0]
 },{server:true})
}

// Only a committed, contact-bearing public enquiry addressed to the approved
// first-party practitioner can claim this notification. No visitor can choose
// a recipient, text, channel, or replay a provider attempt.
export async function dispatchPublicServiceEnquiryTelegram(config,enquiryId,operationId,env=process.env){
 if(!telegramOwnerPilotReady(env))return {attempted:0,accepted:0,reason:'owner_pilot_off'}
 requireUUID(enquiryId)
 requireUUID(operationId)
 const targets=await transaction(config,null,async db=>(await db.query(
  'select * from app_private.notification_tg_public_enquiry_claim($1,$2)',
  [enquiryId,PRACTITIONER_ID])).rows,{server:true})
 if(targets.length!==1)return {attempted:0,accepted:0,reason:'no_consented_target_or_duplicate'}
 const target=targets[0]
 const finish=(status,providerId=null)=>transaction(config,null,async db=>db.query(
  'select app_private.notification_tg_public_enquiry_finish($1,$2,$3)',
  [enquiryId,status,providerId]),{server:true})
 try{
  // Bound per-owner volume even if an attacker bypasses the public IP limit.
  // A throttled, claimed event is suppressed and never automatically retried.
  await consumeRate(config,{scope:'hh-owner-telegram-real-enquiry',ownerId:target.target_account_id},12,3600)
  const allowed=await transaction(config,null,async db=>(await db.query(
   'select app_private.notification_tg_public_enquiry_allowed($1,$2,$3) as allowed',
   [enquiryId,target.target_chat_hash,PRACTITIONER_ID])).rows[0]?.allowed,{server:true})
  if(allowed!==true){
   await finish('suppressed')
   return {attempted:0,accepted:0,reason:'revoked_or_ineligible'}
  }
  const verified=openSealed(target.target_ciphertext,{
   accountId:target.target_account_id,recordId:target.target_account_id,
   field:'notification.telegram.chat'},config)
  if(typeof verified?.chatId!=='string'||!/^[1-9][0-9]{4,19}$/.test(verified.chatId)){
   await finish('failed')
   return {attempted:0,accepted:0,reason:'invalid_verified_chat'}
  }
  // SQL row is owner-scoped, and only explicitly public service metadata is
  // selected. No ciphertext, message text, user identity or direct contact
  // may leave the protected Postgres boundary for Telegram.
  const enquiry=await readPublicEnquiryNoticeMetadata(config,enquiryId,operationId)
  if(!enquiry){
   await finish('suppressed')
   return {attempted:0,accepted:0,reason:'enquiry_missing'}
  }
  const result=await sendOwnerTelegramEventMessage({
   chatId:verified.chatId,locale:target.target_locale,event:'enquiry',enquiry},env)
  // Bot API acceptance is not proof of actual end-user delivery or reading.
  await finish('accepted',result.providerMessageId)
  return {attempted:1,accepted:1}
 }catch(error){
  await finish(error?.code==='RATE_LIMITED'?'suppressed':'failed').catch(()=>{})
  return {attempted:1,accepted:0,reason:error?.code==='RATE_LIMITED'?'rate_limited':'provider_unconfirmed'}
 }
}
