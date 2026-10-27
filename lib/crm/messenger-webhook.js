import 'server-only'
import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto'
import { databasePool } from '../app/database.js'
import { seal, operationHash } from '../app/crypto.js'
import { businessHash, providerMessageHash } from './messenger-store.js'
import { channelTransportReady, telegramPilotReady, telegramPublicDiagnosticReady, telegramBotBusinessId } from './messenger-policy.js'
import { AppError } from '../assessments/contracts.js'
import { telegramDiagnosticReady, telegramPublicStartRequested, transitionTelegramDiagnostic } from './telegram-diagnostic.mjs'
import { verifyTelegramSecondAccountInvite } from './telegram-second-pilot.mjs'
import { telegramDiagnosticDailyReplyCount } from './telegram-diagnostic-v2.mjs'
import { telegramInlineCallbackSelection, telegramInlineActionAllowed } from './telegram-inline-buttons.mjs'
import {recordInternalSalesbotInbound} from './salesbot-internal-runtime.js'
import {whatsappExpressReviewLocale} from './express-review-channel-handoff.mjs'
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
    const click=payload?.callback_query
    // Inline callbacks originate from a private Telegram bot message, and
    // only its original private-chat participant may press its buttons.
    if(click&&Number.isSafeInteger(payload.update_id)&&
       click.message?.chat?.type==='private'&&
       click.message?.from?.is_bot===true&&
       click.from?.is_bot!==true&&
       String(click.message.chat.id)===String(click.from?.id)&&
       /^\d{1,25}$/.test(String(click.from.id))&&
       Number.isSafeInteger(click.message.message_id)&&
       click.message.message_id>0&&
       /^[A-Za-z0-9_-]{4,128}$/.test(String(click.id||''))){
      const selection=telegramInlineCallbackSelection(click.data)
      const base={callbackId:click.id,callbackMessageId:click.message.message_id,
        userId:String(click.from.id)}
      if(!selection){
        events.push({type:'callback_ignored',...base})
      }else{
        events.push({...base,type:'incoming',accountId:null,
          rawText:selection.rawText,inlineAction:selection.inlineAction,
          inlineLocale:selection.locale,photoFileId:null,photoBytes:null,
          name:safeString([click.from.first_name,click.from.last_name]
            .filter(Boolean).join(' ')||'Telegram contact'),
          language:click.from.language_code,body:selection.rawText,
          eventId:'tg:'+payload.update_id,messageId:'tgcb:'+click.id,
          sentAt:Date.now(),stop:/^\/stop$/.test(selection.rawText)})
      }
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
          const safeBody=safeString(body,1200)
          // The customer sends the static language marker from their site
          // locale. This records the right language in CRM; it is NOT a
          // WhatsApp SalesBot activation or a permission for auto-replies.
          // The signed source text retains WhatsApp's line breaks; safeBody is
          // presentation-normalized and would hide the anchored locale marker.
          const diagnosticLocale=whatsappExpressReviewLocale(String(body??''))
          events.push({type:'incoming',accountId,userId:String(m.from),name:safeString(name),
            language:diagnosticLocale||null,diagnosticLocale:diagnosticLocale||null,
            body:safeBody,eventId:'wa:'+m.id,messageId:'wa:'+m.id,
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
    const connected=(await db.query('select owner_id,account_id from app_private.crm_msg_resolve($1,$2)',
      ['telegram',accountDigest])).rows[0]
    if(!connected)return {handled:true}
    const restricted=telegramPilotReady(env)
    const publicIntake=telegramPublicDiagnosticReady(env)
    const ownerChat=String(event.userId)===env.HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID
    // Serialize all second-chat invitations before the per-user update lock.
    // One invited tester at a time, no public bot traffic and no extra CRM.
    if(restricted&&!ownerChat){
      await db.query('select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1,0))',
        [accountDigest+':second-chat-pilot'])
    }
    await db.query('select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1,0))',
      [accountDigest+':'+userHash])
    const previous=(await db.query(
      'select stage,locale,consent_at,last_update_id,reply_day,reply_count,pilot_access_until,flow_version,topic '+
      'from app_private.crm_tg_diagnostic_sessions '+
      'where business_hash=$1 and user_hash=$2 for update',
      [accountDigest,userHash])).rows[0]
    if(previous&&Number(previous.last_update_id)>=updateId)return {handled:true}
    const invite=restricted&&!ownerChat
      ?verifyTelegramSecondAccountInvite(event.rawText,{
        ownerId:connected.owner_id,config,env,
      }):null
    const activeGuest=Boolean(restricted&&!ownerChat&&
      previous?.stage!=='stopped'&&previous?.pilot_access_until&&
      Date.parse(previous.pilot_access_until)>Date.now())
    // STOP must remain effective even when a guest pilot invite has expired.
    // A signed webhook may suppress an existing CRM chat, but may never create
    // an unsolicited lead, send a reply or extend pilot eligibility.
    const rawStop=String(event.rawText||'').trim()
    const isStop=/^\/(?:stop|unsubscribe)(?:@[A-Za-z0-9_]+)?$/i.test(rawStop)||
      ['стоп','остановить','остановить диалог','stop','parar','detener'].includes(rawStop.toLowerCase())
    if(restricted&&!ownerChat&&!activeGuest&&!invite&&!isStop)return {handled:true}
    // Unknown public chats cannot inject arbitrary text/photos into the CRM or
    // create a session. A permanent bot link starts only with Telegram's /start.
    if(publicIntake&&!previous){
      if(isStop){
        await db.query('select app_private.crm_tg_suppress_existing($1,$2)',
          [accountDigest,userHash])
        return {handled:true}
      }
      if(!telegramPublicStartRequested(rawStop))
        return {handled:true}
      // Bounded new-session admission (100 per rolling 24h per CRM bot).
      // Serialize concurrent admissions so provider-driven spam cannot
      // overwhelm private state or bypass the cap with parallel /start calls.
      await db.query('select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1,0))',
        [accountDigest+':public-intake-admission'])
      const admission=(await db.query(
        "select count(*)::int as total from app_private.crm_tg_diagnostic_sessions "+
        "where business_hash=$1 and created_at>now()-interval '24 hours'",[accountDigest])).rows[0]
      if(Number(admission?.total||0)>=100)return {handled:true}
    }
    if(isStop&&!previous&&restricted&&!ownerChat){
      await db.query('select app_private.crm_tg_suppress_existing($1,$2)',
        [accountDigest,userHash])
      return {handled:true}
    }
    if(restricted&&!ownerChat&&!activeGuest&&invite){
      const existing=(await db.query(
        "select 1 from app_private.crm_tg_diagnostic_sessions "+
        "where business_hash=$1 and user_hash<>$2 and pilot_access_until>now() "+
        "and stage<>'stopped' limit 1",
        [accountDigest,userHash])).rows[0]
      if(existing)return {handled:true}
    }
    // A button on an older Telegram message may not mutate the current stage
    // or create a duplicate consented CRM contact.
    if(event.inlineAction&&(
       !telegramInlineActionAllowed(event.inlineAction,
         previous?.stage,Number(previous?.flow_version)||1) ||
       (event.inlineLocale&&previous?.locale&&event.inlineLocale!==previous.locale)))
      return {handled:true}
    const lang=event.language?.startsWith('ru')?'ru':event.language?.startsWith('es')?'es':'en'
    const priorFlow=invite&&!activeGuest?null:previous
    const next=transitionTelegramDiagnostic(priorFlow&&{
      stage:priorFlow.stage,locale:priorFlow.locale,consentAt:priorFlow.consent_at,
      flowVersion:Number(priorFlow.flow_version)||1,topic:priorFlow.topic,
    },{...event,locale:invite?.locale||lang,
      rawText:isStop?'/stop':invite?'/start hhreview_'+invite.locale:event.rawText})
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
    const pilotUntil=activeGuest?previous.pilot_access_until:(invite?.accessUntil||null)
    await db.query(
      'insert into app_private.crm_tg_diagnostic_sessions '+
      '(business_hash,user_hash,stage,locale,last_update_id,consent_at,reply_day,reply_count,pilot_access_until,flow_version,topic) '+
      'values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) '+
      'on conflict(business_hash,user_hash) do update set '+
      'stage=excluded.stage,locale=excluded.locale,last_update_id=excluded.last_update_id, '+
      'consent_at=excluded.consent_at,reply_day=excluded.reply_day, '+
      'reply_count=excluded.reply_count,pilot_access_until=excluded.pilot_access_until, '+
      'flow_version=excluded.flow_version,topic=excluded.topic,updated_at=now()',
      [accountDigest,userHash,next.stage,next.locale,updateId,consentAt,today,updatedCount,
        pilotUntil,next.flowVersion===2?2:1,next.topic||null])
    // Only AFTER the explicitly consented topic message has been durably
    // ingested, enroll an activated graph for INTERNAL OWNER review.
    // Never alter the existing six-message Telegram customer conversation.
    // Isolate optional automation errors so a client question or consent
    // cannot be rolled back by a malformed owner graph/run.
    if(next.flowVersion===2&&previous?.stage==='focus'&&next.stage==='photo'&&
       previous?.consent_at&&next.body&&next.topic){
      await db.query('SAVEPOINT hh_salesbot_internal_event')
      try{
        await recordInternalSalesbotInbound(db,{
          ownerId:connected.owner_id,accountId:connected.account_id,userHash,
          eventId:event.eventId,locale:next.locale,topic:next.topic,
        },config)
        await db.query('RELEASE SAVEPOINT hh_salesbot_internal_event')
      }catch{
        await db.query('ROLLBACK TO SAVEPOINT hh_salesbot_internal_event').catch(()=>{})
        await db.query('RELEASE SAVEPOINT hh_salesbot_internal_event').catch(()=>{})
        // Internal workflow is explicitly optional; signed Telegram intake
        // and the client's privacy-first consent must still be committed.
      }
    }
    return {handled:true,reply,keyboard:reply?next.keyboard:[],to:String(event.userId),
      locale:next.locale,approvedPilotGuest:restricted&&!ownerChat&&(activeGuest||Boolean(invite))}
  })
}
