import 'server-only'
import {transaction} from '../app/database.js'
import {operationHash,seal} from '../app/crypto.js'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {telegramBusinessServiceTitle} from '../assist/telegram-business-request.mjs'
import {publicEnquiryReference} from '../practitioners/public-service-enquiry-input.mjs'
import {telegramOwnerPilotReady,telegramClientBotUsername} from '../app/client-telegram-policy.js'
import {verifyClientBot} from '../app/client-telegram-transport.js'
import {dispatchPublicServiceEnquiryTelegram} from '../app/public-enquiry-telegram.js'

const HASH=/^[a-f0-9]{64}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LANGUAGES=new Set(['ru','en','es'])
const FORMATS=new Set(['online','inperson','async'])
const notSaved=locale=>({saved:false,message:
 locale==='ru'?'Не удалось подтвердить сохранение заявки. Отправьте /retry_request — повтор не создаст дубликат.':
 locale==='es'?'No puedo confirmar tu solicitud. Envía /retry_request para reintentar sin duplicados.':
 'I cannot confirm saving your request. Send /retry_request to check again without duplicates.'})
const valid=i=>i&&HASH.test(i.business)&&HASH.test(i.user)&&
 UUID.test(i.operationId)&&UUID.test(i.ownerId)&&
 UUID.test(i.accountId)&&UUID.test(i.threadId)&&
 LANGUAGES.has(i.locale)&&FORMATS.has(i.format)&&
 Boolean(telegramBusinessServiceTitle(i.service,i.locale))

/** Only an HMAC-verified WhatsApp Cloud API event may supply this intent.
 * Before persisting a public enquiry, independently recheck current consent,
 * the exact operation UUID, service, format, owner and non-stopped CRM thread
 * under the same advisory lock as the signed WhatsApp webhook STOP handler.
 */
export async function finalizeWhatsAppService(config,intent){
 if(!valid(intent))return notSaved(intent?.locale)
 const title=telegramBusinessServiceTitle(intent.service,intent.locale)
 const result=await transaction(config,null,async db=>{
  const lock=intent.business+':'+intent.user
  await db.query('select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1,0))',[lock])
  await db.query("select set_config('hh.wa_service_operation',$1,true)",[intent.operationId])
  const session=(await db.query(
   'select service_operation_id,service_key,delivery_format,locale from '+
   'app_private.crm_wa_diagnostic_sessions where business_hash=$1 and user_hash=$2 '+
   "and stage='done' and consent_at is not null limit 1",
   [intent.business,intent.user])).rows[0]
  if(!session||String(session.service_operation_id)!==intent.operationId||
     session.service_key!==intent.service||session.delivery_format!==intent.format||
     session.locale!==intent.locale)return null
  await db.query("select set_config('hh.coaching_handoff_owner',$1,true)",[intent.ownerId])
  await db.query("select set_config('hh.coaching_handoff_thread',$1,true)",[intent.threadId])
  await db.query("select set_config('hh.coaching_handoff_user',$1,true)",[intent.user])
  const thread=(await db.query(
   'select id from app.crm_msg_threads where id=$1 and owner_id=$2 '+
   'and user_hash=$3 and not suppressed limit 1',
   [intent.threadId,intent.ownerId,intent.user])).rows[0]
  if(!thread?.id)return null
  const owner=(await db.query(
   "select id,trusted_auth_user_id from app.practitioners where id=$1 and active and "+
   "status in ('approved','submitted','changes_requested') and public_profile<>'{}'::jsonb",
   [PRACTITIONER_ID])).rows[0]
  if(!owner||owner.trusted_auth_user_id!==intent.ownerId)return null
  await db.query("select set_config('hh.public_enquiry_operation',$1,true)",[intent.operationId])
  const digest=operationHash({scope:'hh-wa-verified-service-v1',
   operationId:intent.operationId,business:intent.business,user:intent.user,
   service:intent.service,format:intent.format,locale:intent.locale},config)
  const prior=(await db.query(
   'select id,reference_code,operation_hash from app.public_service_enquiries '+
   'where operation_id=$1 limit 1',[intent.operationId])).rows[0]
  let id=intent.operationId,referenceCode=publicEnquiryReference(id)
  if(prior){
   if(prior.operation_hash!==digest)return null
   id=prior.id;referenceCode=prior.reference_code
  }else{
   const offer=(await db.query(
     'select id from app.service_offerings where practitioner_id=$1 and active=true '+
     "and status='published' and (localized_copy->$2->>'title')=$3 order by id limit 2",
     [PRACTITIONER_ID,intent.locale,title])).rows
   const offeringId=offer.length===1?offer[0].id:null
   const ctx=field=>({accountId:PRACTITIONER_ID,recordId:id,field})
   const description='Customer confirmed a WhatsApp request for '+title+
     ', format '+intent.format+'. The client-authored goal is in the consented encrypted CRM Messages thread. '+
     'No session time or payment is confirmed.'
   const contact={displayName:'WhatsApp customer',email:'',phone:'',
     submittedByVisitor:true,replyConsent:'whatsapp_single_enquiry_v1'}
   const inserted=(await db.query(
    'insert into app.public_service_enquiries '+
    '(id,recipient_practitioner_id,service_title,source_path,locale,reference_code,'+
    'description_ciphertext,contact_ciphertext,contact_channel,operation_id,operation_hash,service_offering_id) '+
    'values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning id',
    [id,PRACTITIONER_ID,title,'/'+intent.locale+'/services',intent.locale,referenceCode,
     seal(description,ctx('public_lead.message'),config),
     seal(contact,ctx('public_lead.contact'),config),'whatsapp',
     intent.operationId,digest,offeringId])).rows[0]
   if(!inserted?.id)return null
  }
  // Persist the neutral @Andydotbot notification intent in the SAME backend
  // transaction as the enquiry. No provider send occurs before commit.
  await db.query('insert into app_private.notification_public_enquiry_intents '+
   '(enquiry_id,owner_id) values($1,$2) on conflict do nothing',[id,intent.ownerId])
  return {id,referenceCode}
 },{server:true})
 if(!result)return notSaved(intent.locale)
 const message=intent.locale==='ru'
   ?'Спасибо 🌿 Ваша заявка '+result.referenceCode+' сохранена. Мастер сможет ответить в этом WhatsApp. Время и оплата ещё не подтверждены.'
   :intent.locale==='es'
     ?'Gracias 🌿 Tu solicitud '+result.referenceCode+' está guardada. El profesional puede responder por WhatsApp. No hay cita ni pago confirmado.'
     :'Thank you 🌿 Request '+result.referenceCode+' is saved. The practitioner can reply in WhatsApp. No appointment or payment is confirmed.'
 return {saved:true,enquiryId:result.id,operationId:intent.operationId,
  referenceCode:result.referenceCode,practitionerId:PRACTITIONER_ID,
  locale:intent.locale,message}
}

/** Only the existing paired @Andydotbot owner-notification outbox may send
 * the neutral HH reference. Never include WhatsApp phone, goal, or chat text.
 */
export async function notifyOwnerWhatsAppService(config,finished,env=process.env){
 if(!finished?.saved||!UUID.test(finished.enquiryId)||
    !UUID.test(finished.operationId)||finished.practitionerId!==PRACTITIONER_ID)
   return {attempted:0,accepted:0,reason:'no_verified_enquiry'}
 if(!telegramOwnerPilotReady(env)||
    String(telegramClientBotUsername(env)||'').toLowerCase()!=='andydotbot')
   return {attempted:0,accepted:0,reason:'andydot_not_activated'}
 try{await verifyClientBot(env)}
 catch{return {attempted:0,accepted:0,reason:'owner_bot_unverified'}}
 return dispatchPublicServiceEnquiryTelegram(config,
  finished.enquiryId,finished.operationId,env)
}
