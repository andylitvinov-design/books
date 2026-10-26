import 'server-only'
import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto'
import { databasePool } from '../app/database.js'
import { seal, operationHash } from '../app/crypto.js'
import { businessHash, providerMessageHash } from './messenger-store.js'
import { channelTransportReady, telegramPilotReady, telegramBotBusinessId } from './messenger-policy.js'
import { AppError } from '../assessments/contracts.js'
import { telegramDiagnosticReady, transitionTelegramDiagnostic } from './telegram-diagnostic.mjs'
import { telegramDiagnosticDailyReplyCount } from './telegram-diagnostic-v2.mjs'
const safeString=(value,limit=120)=>String(value??'').replace(/[\r\n\u0000-\u001f]/g,' ').trim().slice(0,limit)
function constantEqual(a,b){
  if(!a||!b)return false
  const left=Buffer.from(a),right=Buffer.from(b)
  return left.length===right.length&&timingSafeEqual(left,right)
}
export function verifyMessengerWebhook(provider,raw,headers,env=process.env){
  if(!channelTransportReady(provider,env)) return false
  if(provider==='telegram') return constantEqual(
    headers.get('x-telegram-bot-api-secret-token'),env.HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET)
  const supplied=headers.get('x-hub-signature-256')||''
  if(!/^sha256=[0-9a-f]{64}$/i.test(supplied)) return false
  const expected='sha256='+createHmac('sha256',env.HH_CRM_MSG_META_APP_SECRET).update(raw).digest('hex')
  return constantEqual(supplied,expected)
}
export function verifyMessengerChallenge(provider,url,env=process.env){
  if(provider==='telegram'||!channelTransportReady(provider,env)) return null
  const query=new URL(url).searchParams
  if(query.get('hub.mode')!=='subscribe'||
      !constantEqual(query.get('hub.verify_token'),env.HH_CRM_MSG_META_VERIFY_TOKEN))return null
  const challenge=query.get('hub.challenge')||''
  return /^[A-Za-z0-9_-]{1,200}$/.test(challenge)?challenge:null
}
export function normalizeMessengerUpdates(provider,payload){
  const events=[]
  if(provider==='telegram'){
    const message=payload?.message
    if(message?.chat?.type==='private'&&message.from?.is_bot!==true&&
       Number.isSafeInteger(payload.update_id)&&message.chat?.id){
      const text=safeString(message.text||'[Non-text message]',1200)
      const photo=(message.photo||[]).filter(item=>item?.file_id&&Number.isSafeInteger(item.file_size))
        .sort((a,b)=>a.file_size-b.file_size).at(-1)
      const document=message.document&&['image/jpeg','image/png'].includes(message.document.mime_type)
        ? message.document:null
      const attachment=photo||document
      const start=text.startsWith('/start')
      events.push({type:'incoming',accountId:null,userId:String(message.chat.id),
        rawText:message.text ? text : '',
        photoFileId:attachment?.file_id||null,photoBytes:attachment?.file_size||null,
        name:safeString([message.from.first_name,message.from.last_name].filter(Boolean).join(' ')||'Telegram contact'),
        language:message.from.language_code,body:start?'Started conversation':text,
        eventId:'tg:'+payload.update_id,messageId:'tg:'+message.chat.id+':'+message.message_id,
        sentAt:Number(message.date)*1000||Date.now(),
        stop:/^\/(stop|unsubscribe)(?:@\w+)?$/i.test(text)})
    }
  }else if(provider==='whatsapp'){
    for(const entry of payload?.entry||[]){
      for(const change of entry.changes||[]){
        const value=change?.value
        const accountId=String(value?.metadata?.phone_number_id||'')
        for(const m of value?.messages||[]){
          const body=m.type==='text'?m.text?.body:
            m.type==='button'?m.button?.text:
            m.type==='interactive'?m.interactive?.button_reply?.title:
            '[Non-text message]'
          if(!m.from||!m.id)continue
          const name=(value?.contacts||[]).find(c=>c.wa_id===m.from)?.profile?.name||'WhatsApp contact'
          events.push({type:'incoming',accountId,userId:String(m.from),name:safeString(name),language:null,
            body:safeString(body,1200),eventId:'wa:'+m.id,messageId:'wa:'+m.id,
            sentAt:Number(m.timestamp)*1000||Date.now(),stop:/^stop$/i.test(String(body).trim())})
        }
        for(const status of value?.statuses||[]){
          if(status.id&&['delivered','read','failed'].includes(status.status))
            events.push({type:'receipt',accountId,messageId:String(status.id),status:status.status})
        }
      }
    }
  }else if(provider==='instagram'||provider==='messenger'){
    for(const entry of payload?.entry||[]){
      for(const event of entry.messaging||[]){
        const m=event.message
        if(!m?.mid||m.is_echo||!event.sender?.id)continue
        const body=safeString(m.text||'[Non-text message]',1200)
        events.push({type:'incoming',accountId:String(entry.id),userId:String(event.sender.id),
          name:provider==='instagram'?'Instagram contact':'Messenger contact',language:null,body,
          eventId:provider+':'+m.mid,messageId:provider+':'+m.mid,
          sentAt:Number(event.timestamp)||Date.now(),stop:/^stop$/i.test(body)})
      }
    }
  }
  if(events.length>30) throw new AppError('PAYLOAD_TOO_LARGE',413)
  return events
}
async function webhookTransaction(config,work){
  const db=await databasePool(config).connect()
  try{
    await db.query('BEGIN')
    const permissions=(await db.query('select rolsuper,rolbypassrls from pg_roles where rolname=current_user')).rows[0]
    if(!config.test&&(permissions?.rolsuper||permissions?.rolbypassrls))throw new AppError('DATABASE_ROLE_UNSAFE',503)
    await db.query('SET LOCAL ROLE hh_app_inbox')
    const value=await work(db)
    await db.query('COMMIT')
    return value
  }catch(e){await db.query('ROLLBACK').catch(()=>{});throw e}
  finally{db.release()}
}
export async function ingestMessengerUpdate(provider,event,config,env=process.env){
  // Telegram pilot MUST reject all non-test accounts before any database read
  // or lead creation. A verified webhook for the bot is not marketing consent.
  if(provider==='telegram'&&telegramPilotReady(env)&&
      (event.type!=='incoming'||String(event.userId)!==env.HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID))
    return false
  const businessId=event.accountId||(provider==='telegram'?telegramBotBusinessId(env):null)
  if(!businessId||!/^\d{5,25}$/.test(String(businessId)))return false
  const accountDigest=businessHash(provider,businessId,config)
  return webhookTransaction(config,db=>ingestMessengerEventInTransaction(db,provider,event,config,accountDigest))
}
async function ingestMessengerEventInTransaction(db,provider,event,config,accountDigest){
    if(event.type==='receipt'){
      const providerDigest=providerMessageHash(provider,event.messageId,config)
      const row=(await db.query('select app_private.crm_msg_receipt($1,$2,$3,$4) as recorded',
        [provider,accountDigest,providerDigest,event.status])).rows[0]
      return !!row?.recorded
    }
    if(!/^\d{1,25}$/.test(event.userId))return false
    const ref=(await db.query('select owner_id,account_id from app_private.crm_msg_resolve($1,$2)',
      [provider,accountDigest])).rows[0]
    if(!ref) return false
    const owner=ref.owner_id,accountId=ref.account_id,contactId=randomUUID(),messageId=randomUUID()
    const userHash=operationHash({scope:'crm-msg-user',provider,accountDigest,userId:event.userId},config)
    const userCipher=seal({externalId:event.userId},{accountId:owner,recordId:accountId,field:'crm.msgidentity'},config)
    const name=safeString(event.name,80)||'New enquiry'
    const displayCipher=seal({name},{accountId:owner,recordId:accountId,field:'crm.msgdisplay'},config)
    const contactCipher=seal({displayName:name,email:'',phone:''},
      {accountId:owner,recordId:contactId,field:'crm.contact'},config)
    const contactEmailHash=operationHash({scope:'crm-msg-contact',owner,accountDigest,userHash},config)
    const messageCipher=seal({text:safeString(event.body,1200)||'[Non-text message]',
      ...(provider==='telegram'&&event.telegramPhotoFileId
        ?{telegramPhotoFileId:event.telegramPhotoFileId,
          ...(event.telegramPhotoPurpose==='drawing'||event.telegramPhotoPurpose==='portrait'
            ?{telegramPhotoPurpose:event.telegramPhotoPurpose}:{})}:{} )},
      {accountId:owner,recordId:messageId,field:'crm.msgbody'},config)
    const providerHash=providerMessageHash(provider,event.messageId,config)
    const eventHash=operationHash({scope:'crm-msg-event',provider,accountDigest,eventId:event.eventId},config)
    const language=event.diagnosticLocale||
      (event.language?.startsWith('ru')?'ru':event.language?.startsWith('es')?'es':'en')
    const when=new Date(event.sentAt)
    if(!Number.isFinite(when.getTime()))return false
    const row=(await db.query(
      'select app_private.crm_msg_ingest($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) as saved',
      [provider,accountDigest,userHash,userCipher,displayCipher,contactId,contactCipher,
        contactEmailHash,language,messageId,messageCipher,providerHash,eventHash,when.toISOString(),!!event.stop]
    )).rows[0]
    return !!row?.saved
}

// A Telegram /start deep link opts into this path, but must never create a lead
// until /agree. The workflow state and CRM message are committed together,
// under the signed-webhook-only role, so retries cannot lose consent or duplicate a lead.
export async function processTelegramDiagnostic(event,config,env=process.env){
  if(event?.type!=='incoming'||!telegramDiagnosticReady(env)||
      !channelTransportReady('telegram',env)) return {handled:false}
  if(telegramPilotReady(env)&&String(event.userId)!==env.HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID)
    return {handled:true}
  if(!/^\d{1,25}$/.test(String(event.userId))||
      !/^tg:\d+$/.test(String(event.eventId)))return {handled:true}
  const updateId=Number(event.eventId.slice(3))
  if(!Number.isSafeInteger(updateId))return {handled:true}
  const businessId=telegramBotBusinessId(env)
  if(!/^\d{5,25}$/.test(String(businessId)))return {handled:true}
  const accountDigest=businessHash('telegram',businessId,config)
  const userHash=operationHash({scope:'crm-msg-user',provider:'telegram',
    accountDigest,userId:String(event.userId)},config)
  return webhookTransaction(config,async db=>{
    // Never start a flow for an unconnected CRM business account.
    const connected=(await db.query('select account_id from app_private.crm_msg_resolve($1,$2)',
      ['telegram',accountDigest])).rows[0]
    if(!connected)return {handled:true}
    await db.query('select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1,0))',
      [accountDigest+':'+userHash])
    const previous=(await db.query(
      'select stage,locale,consent_at,last_update_id,reply_day,reply_count,flow_version,topic '+
      'from app_private.crm_tg_diagnostic_sessions '+
      'where business_hash=$1 and user_hash=$2 for update',
      [accountDigest,userHash])).rows[0]
    if(previous&&Number(previous.last_update_id)>=updateId)return {handled:true}
    const lang=event.language?.startsWith('ru')?'ru':event.language?.startsWith('es')?'es':'en'
    const next=transitionTelegramDiagnostic(previous&&{
      stage:previous.stage,locale:previous.locale,consentAt:previous.consent_at,
      flowVersion:Number(previous.flow_version)||1,topic:previous.topic
    },{...event,locale:lang})
    if(!next.handled)return {handled:false}
    if(next.stage==='stopped'&&!next.stop){
      // Also block older, non-diagnostic CRM chats without creating a new lead.
      await db.query('select app_private.crm_tg_suppress_existing($1,$2)',
        [accountDigest,userHash])
    }
    // The first CRM lead appears only after explicit /agree, and each later
    // client message uses existing owner-encrypted and deduplicated inbox storage.
    if(next.body){
      const saved=await ingestMessengerEventInTransaction(db,'telegram',{
        ...event,body:next.body,stop:next.stop,diagnosticLocale:next.locale,
        telegramPhotoFileId:next.photoFileId,telegramPhotoPurpose:next.photoPurpose,
      },config,accountDigest)
      if(!saved)throw new AppError('TELEGRAM_INTAKE_NOT_SAVED',503)
    }
    const today=new Date().toISOString().slice(0,10)
    const count=telegramDiagnosticDailyReplyCount(previous,next,today)
    const reply=next.reply && count<10 ? next.reply:null
    const updatedCount=count+(reply?1:0)
    const consentAt=next.stage==='consent'?null:
      next.consent?new Date().toISOString():previous?.consent_at||null
    await db.query(
      'insert into app_private.crm_tg_diagnostic_sessions '+
      '(business_hash,user_hash,stage,locale,last_update_id,consent_at,reply_day,reply_count,flow_version,topic) '+
      'values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) '+
      'on conflict(business_hash,user_hash) do update set '+
      'stage=excluded.stage,locale=excluded.locale,last_update_id=excluded.last_update_id, '+
      'consent_at=excluded.consent_at,reply_day=excluded.reply_day, '+
      'reply_count=excluded.reply_count,flow_version=excluded.flow_version, '+
      'topic=excluded.topic,updated_at=now()',
      [accountDigest,userHash,next.stage,next.locale,updateId,consentAt,today,updatedCount,
        next.flowVersion===2?2:1,next.topic||null])
    return {handled:true,reply,keyboard:reply?next.keyboard:[],to:String(event.userId)}
  })
}
