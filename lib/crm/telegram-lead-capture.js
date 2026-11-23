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
// A signed, officially verified Business message may create one neutral lead.
// The inbox role intentionally has NO direct read/write grants on CRM contacts.
// Only the narrowly scoped, postgres-owned private function can see the row.
async function ensureUnqualifiedLead(db,config,{ownerId,emailHash,locale,origin}){
  const contactId=randomUUID()
  const record={displayName:'Telegram visitor',email:'',phone:'',
    channel:'telegram',origin,replyConsent:null,marketingConsent:false}
  const contactCipher=seal(record,
    {accountId:ownerId,recordId:contactId,field:'crm.contact'},config)
  const row=(await db.query(
    'select created,suppressed from app_private.crm_tg_business_lead_capture_v1('+ 
      '$1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [PRACTITIONER_ID,ownerId,emailHash,locale,contactId,contactCipher,
      randomUUID(),randomUUID(),randomUUID()])).rows[0]
  if(typeof row?.created!=='boolean'||typeof row?.suppressed!=='boolean')
    throw new AppError('TELEGRAM_CRM_CONTACT_UNCONFIRMED',503)
  return {created:row.created,suppressed:row.suppressed}
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
    // hh_app_inbox cannot read app.accounts directly, nor see the
    // practitioner without its private RLS setting. Resolve only the owner
    // of this verified, enabled Telegram CRM account through the existing
    // role-scoped definer. The Business lead RPC independently verifies
    // the matching active PRACTITIONER_ID before any insert.
    const botId=telegramBotBusinessId(env)
    if(!botId)throw new AppError('CHANNEL_NOT_CONNECTED',503)
    const digest=businessHash('telegram',botId,config)
    const owner=(await db.query(
      'select owner_id from app_private.crm_msg_resolve($1,$2)',
      ['telegram',digest])).rows[0]?.owner_id
    if(!owner)throw new AppError('TELEGRAM_CRM_OWNER_UNCONFIRMED',503)
    const peer=operationHash({scope:'hh-telegram-business-peer',id:event.chatId},config)
    const emailHash=operationHash({scope:'crm-tg-business-peer',owner,peer},config)
    return ensureUnqualifiedLead(db,config,{ownerId:owner,emailHash,
      locale:localeForBusiness(event),origin:'telegram_business'})
  })
  return {...result,connectionId:event.connectionId,chatId:event.chatId,
    locale:localeForBusiness(event)}
}
