import 'server-only'
import {transaction} from '../app/database.js'
import {operationHash} from '../app/crypto.js'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {webhookTransaction} from './messenger-webhook.js'
import {telegramBusinessMessageFromUpdate,telegramBusinessClientChoice} from '../assist/telegram-business-request.mjs'
import {dispatchPublicServiceEnquiryTelegram} from '../app/public-enquiry-telegram.js'
import {telegramClientBotUsername,telegramOwnerPilotReady} from '../app/client-telegram-policy.js'
import {verifyClientBot} from '../app/client-telegram-transport.js'

/**
 * Attach a confirmed Telegram Business enquiry to the existing consented
 * owner-only notification outbox. @Andydotbot sends a neutral receipt to the
 * paired owner, not a bot-to-bot forward or an unverified client message.
 * This is called only from the signed CRM Telegram webhook AFTER the service
 * confirmation has committed. A replay is harmless: the existing SQL claim
 * is unique per enquiry and never blindly retries uncertain Telegram sends.
 */
export async function notifyConfirmedTelegramBusinessOwner(config,update,env=process.env){
 if(env.HH_CRM_TG_CHAT_AUTOMATION_ENABLED!=='true')
  return {attempted:0,accepted:0,reason:'business_automation_off'}
 const event=telegramBusinessMessageFromUpdate(update)
 if(!event||telegramBusinessClientChoice(event.text)?.kind!=='confirm')
  return {attempted:0,accepted:0,reason:'not_customer_confirmation'}
 // Match only the verified signed conversation: no arbitrary bot-supplied
 // recipient, chat ID, service, clinical text or unauthenticated request.
 const business=operationHash({scope:'hh-tg-business-connection',id:event.connectionId},config)
 const user=operationHash({scope:'hh-tg-business-user',business,id:event.chatId},config)
 const session=await webhookTransaction(config,async db=>{
  const result=await db.query(
   "select operation_id,reference_code from app_private.crm_tg_business_service_sessions "+
   "where business_hash=$1 and user_hash=$2 and practitioner_id=$3 "+
   "and stage='submitted' and consent_at is not null and last_update_id=$4 "+
   "and reference_code is not null limit 1",
   [business,user,PRACTITIONER_ID,event.updateId])
  return result.rows[0]||null
 })
 if(!session)return {attempted:0,accepted:0,reason:'no_committed_enquiry'}
 // Reuse the already-deployed private intent table, operation-scoped backend
 // RLS, and the current verified owner/practitioner relation. No new schema.
 const enquiryId=await transaction(config,null,async db=>{
  await db.query("select set_config('hh.public_enquiry_operation',$1,true)",
   [String(session.operation_id)])
  const match=(await db.query(
   'select e.id,p.trusted_auth_user_id as owner_id from app.public_service_enquiries e '+
   'join app.practitioners p on p.id=e.recipient_practitioner_id '+
   "where e.operation_id=$1 and e.reference_code=$2 and e.recipient_practitioner_id=$3 "+
   "and e.contact_channel='telegram' and e.contact_ciphertext is not null "+
   "and e.status='requested' and e.created_at>now()-interval '15 minutes' "+
   "and p.active and p.status in ('approved','submitted','changes_requested') limit 1",
   [session.operation_id,session.reference_code,PRACTITIONER_ID])).rows[0]
  if(!match?.id||!match?.owner_id)return null
  await db.query('insert into app_private.notification_public_enquiry_intents '+
   '(enquiry_id,owner_id) values($1,$2) on conflict do nothing',
   [match.id,match.owner_id])
  return match.id
 },{server:true})
 if(!enquiryId)return {attempted:0,accepted:0,reason:'invalid_enquiry_or_owner'}
 // Never substitute a generic notification bot: this request is specifically
 // for the owner's established @Andydotbot. A missing gate leaves the intent
 // unclaimed and available to the existing owner-authorized recovery control.
 if(!telegramOwnerPilotReady(env)||
    String(telegramClientBotUsername(env)||'').toLowerCase()!=='andydotbot')
  return {attempted:0,accepted:0,reason:'andydot_not_activated'}
 try{await verifyClientBot(env)}
 catch{return {attempted:0,accepted:0,reason:'andydot_identity_unconfirmed'}}
 return dispatchPublicServiceEnquiryTelegram(config,enquiryId,session.operation_id,env)
}
