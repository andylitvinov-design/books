import 'server-only'
import {randomUUID} from 'node:crypto'
import {webhookTransaction,ingestMessengerEventInTransaction} from './messenger-webhook.js'
import {operationHash} from '../app/crypto.js'
import {businessHash} from './messenger-store.js'
import {channelTransportReady,telegramBotBusinessId,telegramPilotReady} from './messenger-policy.js'
import {assertHolisticBusinessConnection} from './messenger-provider.js'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {AppError} from '../assessments/contracts.js'
import {telegramBusinessMessageFromUpdate} from '../assist/telegram-business-request.mjs'
import {telegramBotLeadCandidate,telegramBusinessLeadCandidate} from './telegram-lead-capture-policy.mjs'

// Only a first-party signed webhook reaches these functions. Capture an unqualified
// contact and one "new" opportunity, never message text, media, health disclosures,
// marketing permission, website login, a booking, or an automatic paid send.
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
     !channelTransportReady('telegram',env))return {created:false}
  const event=telegramBusinessLeadCandidate(update)
  if(!event)return {created:false}
  // Telegram's actual Business owner, can_reply and connection are verified
  // before touching any contact, conversation or provider media reference.
  try{await assertHolisticBusinessConnection({connectionId:event.connectionId,to:event.chatId},env)}
  catch(error){
    if(error?.code==='ACCOUNT_CHANGED'||error?.code==='INVALID_MESSAGE')
      return {created:false}
    throw error
  }
  const botId=telegramBotBusinessId(env)
  if(!botId)throw new AppError('CHANNEL_NOT_CONNECTED',503)
  const accountDigest=businessHash('telegram',botId,config)
  const message=update.business_message
  const name=[message.from?.first_name,message.from?.last_name]
    .filter(value=>typeof value==='string').join(' ').slice(0,80)||'Telegram Business client'
  const photo=Array.isArray(message.photo)
    ?message.photo.filter(p=>typeof p?.file_id==='string'&&
      /^[A-Za-z0-9_-]{10,256}$/.test(p.file_id)).at(-1):null
  return webhookTransaction(config,async db=>{
    const account=(await db.query(
      'select owner_id,account_id from app_private.crm_msg_resolve($1,$2)',
      ['telegram',accountDigest])).rows[0]
    if(!account)throw new AppError('TELEGRAM_CRM_ACCOUNT_UNCONFIRMED',503)
    const userHash=operationHash({scope:'crm-msg-user',provider:'telegram_business',
      accountDigest,userId:event.chatId},config)
    // hh_app_inbox may read only this verified sender after these
    // transaction-local scoped settings, not other private conversations.
    await db.query("select set_config('hh.telegram_handoff_owner',$1,true)",[account.owner_id])
    await db.query("select set_config('hh.telegram_handoff_account',$1,true)",[account.account_id])
    await db.query("select set_config('hh.telegram_handoff_user',$1,true)",[userHash])
    const prior=(await db.query(
      'select id,suppressed from app.crm_msg_threads '+
      'where owner_id=$1 and account_id=$2 and user_hash=$3 limit 1',
      [account.owner_id,account.account_id,userHash])).rows[0]
    if(prior?.suppressed)return {created:false,suppressed:true}
    const body=event.text||(
      message.voice?'[Voice message]':photo?'[Photo]':
      message.document?'[Document]':'[Message attachment]')
    const saved=await ingestMessengerEventInTransaction(db,'telegram',{
      type:'incoming',userId:event.chatId,name,
      language:localeForBusiness(event),body,rawText:event.text,
      telegramBusinessVerified:true,
      telegramBusinessConnectionId:event.connectionId,
      telegramPhotoFileId:photo?.file_id||null,
      eventId:'tg-business:'+event.updateId,
      messageId:'tg-business:'+event.chatId+':'+event.messageId,
      sentAt:message.date*1000,stop:false,
    },config,accountDigest)
    if(!saved&&!prior)throw new AppError('TELEGRAM_CRM_CONTACT_UNCONFIRMED',503)
    return {created:!prior&&saved,updated:saved,suppressed:false,
      connectionId:event.connectionId,chatId:event.chatId,locale:localeForBusiness(event)}
  })
}
// The STOP gate runs first: suppress an existing Business CRM contact, never
// create a contact in reaction to STOP or resend to an opted-out customer.
export async function suppressTelegramBusinessLead(update,config,env=process.env){
  const event=telegramBusinessMessageFromUpdate(update)
  if(!event||!channelTransportReady('telegram',env))return false
  try{await assertHolisticBusinessConnection({connectionId:event.connectionId,to:event.chatId},env)}
  catch{return false}
  const bot=telegramBotBusinessId(env)
  if(!bot)return false
  const business=businessHash('telegram',bot,config)
  const user=operationHash({scope:'crm-msg-user',provider:'telegram_business',
    accountDigest:business,userId:event.chatId},config)
  return webhookTransaction(config,async db=>{
    await db.query('select app_private.crm_tg_suppress_existing($1,$2)',[business,user])
    return true
  })
}
// After the client's /agree, persist each new customer message as a real
// inbound CRM item, idempotent by the signed Telegram update. Never copy
// unconsented health information, drawings or private voice transcripts.
export async function captureTelegramBotConsentedMessage(event,config,env=process.env){
  if(!telegramBotLeadCandidate(event)||!channelTransportReady('telegram',env))return false
  if(telegramPilotReady(env)&&String(event.userId)!==String(env.HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID))
    return false
  const bot=telegramBotBusinessId(env)
  if(!bot)return false
  const business=businessHash('telegram',bot,config)
  const user=operationHash({scope:'crm-msg-user',provider:'telegram',
    accountDigest:business,userId:event.userId},config)
  return webhookTransaction(config,async db=>{
    const session=(await db.query(
      'select stage,consent_at,ai_consent_at from app_private.crm_tg_diagnostic_sessions '+
      'where business_hash=$1 and user_hash=$2 limit 1',
      [business,user])).rows[0]
    const companion=(await db.query(
      'select ai_consent_at,stopped_at from app_private.crm_tg_companion_sessions '+
      'where business_hash=$1 and user_hash=$2 limit 1',
      [business,user])).rows[0]
    const permitted=(session&&session.stage!=='stopped'&&
      (session.consent_at||session.ai_consent_at))||
      (companion?.ai_consent_at&&!companion.stopped_at)
    if(!permitted)return false
    return ingestMessengerEventInTransaction(db,'telegram',{
      ...event,body:event.rawText||(
        event.isTelegramVoice?'[Voice message]':
        event.photoFileId?'[Photo]':'[Message]'),
      telegramPhotoFileId:event.photoFileId||null,
    },config,business)
  })
}
