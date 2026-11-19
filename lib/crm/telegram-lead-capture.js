import 'server-only'
import {randomUUID} from 'node:crypto'
import {webhookTransaction,ingestMessengerEventInTransaction} from './messenger-webhook.js'
import {operationHash,seal} from '../app/crypto.js'
import {businessHash} from './messenger-store.js'
import {channelTransportReady,telegramBusinessTransportReady,telegramBotBusinessId,telegramPilotReady} from './messenger-policy.js'
import {assertHolisticBusinessConnection} from './messenger-provider.js'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {AppError} from '../assessments/contracts.js'
import {telegramBotLeadCandidate,telegramBusinessLeadCandidate} from './telegram-lead-capture-policy.mjs'

// Only a first-party signed webhook reaches these functions. Capture an unqualified
// contact and one "new" opportunity, never message text, media, health disclosures,
// marketing permission, website login, a booking, or an automatic paid send.
// Official Telegram Business identity/can_reply is verified BEFORE entry.
 // hh_app_inbox has no direct SELECT/INSERT on contacts or opportunities.
 // Reuse the already-installed postgres-owned function; do not widen table grants.
async function ensureUnqualifiedLead(db,config,{ownerId,emailHash,locale,origin}){
  const contactId=randomUUID()
  const record={displayName:'Telegram visitor',email:'',phone:'',
    channel:'telegram',origin,replyConsent:null,marketingConsent:false}
  const context={accountId:ownerId,recordId:contactId,field:'crm.contact'}
  const cipher=seal(record,context,config)
  const result=(await db.query(
    'select created,suppressed from app_private.crm_tg_business_lead_capture_v1('+
      '$1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [PRACTITIONER_ID,ownerId,emailHash,locale,contactId,cipher,
      randomUUID(),randomUUID(),randomUUID()])).rows[0]
  if(typeof result?.created!=='boolean'||typeof result?.suppressed!=='boolean')
    throw new AppError('TELEGRAM_CRM_CONTACT_UNCONFIRMED',503)
  return {created:result.created,suppressed:result.suppressed}
}
function localeForBusiness(event){
  return /[\u0400-\u04ff]/u.test(event.text)?'ru':
    /[¡¿áéíóúñ]/iu.test(event.text)?'es':'en'
}
export async function captureTelegramBotLead(event,config,env=process.env){
  if(!telegramBotLeadCandidate(event)||!channelTransportReady('telegram',env))return {created:false}
  if(telegramPilotReady(env)&&String(event.userId)!==String(env.HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID))
    return {created:false}
  const botId=telegramBotBusinessId(env)
  if(!botId)throw new AppError('CHANNEL_NOT_CONNECTED',503)
  const digest=businessHash('telegram',botId,config)
  return webhookTransaction(config,async db=>{
    const account=(await db.query(
      'select owner_id,account_id from app_private.crm_msg_resolve($1,$2)',
      ['telegram',digest])).rows[0]
    if(!account?.owner_id)throw new AppError('TELEGRAM_CRM_ACCOUNT_UNCONFIRMED',503)
    const user=operationHash({scope:'crm-msg-user',provider:'telegram',
      accountDigest:digest,userId:String(event.userId)},config)
    // Reuse the diagnostic session lock to avoid recreating a contact after
    // a previously honored /stop, even when STOP predated CRM registration.
    await db.query('select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1,0))',
      [digest+':'+user])
    const revoked=(await db.query(
      'select (exists(select 1 from app_private.crm_tg_diagnostic_sessions s '+
      "where s.business_hash=$1 and s.user_hash=$2 and s.stage='stopped') or "+
      'exists(select 1 from app_private.crm_tg_companion_sessions c '+
      'where c.business_hash=$1 and c.user_hash=$2 and c.stopped_at is not null)) as stopped',
      [digest,user])).rows[0]?.stopped===true
    if(revoked)return {created:false,suppressed:true}
    // The inbox role cannot directly INSERT crm_contacts/opportunities.
    // Use existing privileged, owner-scoped and idempotent CRM ingest.
    // Before a separate client-approved handoff store only a neutral receipt,
    // not their unconsented message, photo, voice or health information.
    const saved=await ingestMessengerEventInTransaction(db,'telegram',{
      ...event,eventId:'tg:first-contact:'+event.userId,
      messageId:'tg:first-contact:'+event.userId,
      body:'Telegram conversation started',
      photoFileId:null,photoBytes:null,telegramPhotoFileId:null,
      sentAt:Date.now(),stop:false,
    },config,digest)
    return {created:saved,suppressed:false}
  })
}
export async function captureTelegramBusinessLead(update,config,env=process.env){
  if(env.HH_CRM_TG_CHAT_AUTOMATION_ENABLED!=='true'||
    !telegramBusinessTransportReady(env))return {created:false}
  const event=telegramBusinessLeadCandidate(update)
  if(!event)return {created:false}
  // Telegram's signed payload alone is not sufficient to establish ownership:
  // verify the official current Business connection and can_reply permission.
  try{
    await assertHolisticBusinessConnection({connectionId:event.connectionId,
      to:event.chatId},env)
  }catch(error){
    if(error?.code==='ACCOUNT_CHANGED'||error?.code==='INVALID_MESSAGE')
      return {created:false}
    throw error // Telegram retries transient verification failures.
  }
  const result=await webhookTransaction(config,async db=>{
    const owner=(await db.query(
      'select p.trusted_auth_user_id as id from app.practitioners p '+
      "join app.accounts a on a.id=p.trusted_auth_user_id and a.status='active' "+
      "where p.id=$1 and p.active and p.status in ('approved','submitted','changes_requested') "+ 
      "and p.public_profile<>'{}'::jsonb",
      [PRACTITIONER_ID])).rows[0]?.id
    if(!owner)throw new AppError('TELEGRAM_CRM_OWNER_UNCONFIRMED',503)
    const peer=operationHash({scope:'hh-telegram-business-peer',id:event.chatId},config)
    const emailHash=operationHash({scope:'crm-tg-business-peer',owner,peer},config)
    return ensureUnqualifiedLead(db,config,{ownerId:owner,emailHash,
      locale:localeForBusiness(event),origin:'telegram_business'})
  })
  return {...result,connectionId:event.connectionId,chatId:event.chatId,
    locale:localeForBusiness(event)}
}
