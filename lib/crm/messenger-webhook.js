import 'server-only'
import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto'
import { databasePool } from '../app/database.js'
import { seal, operationHash } from '../app/crypto.js'
import { businessHash, providerMessageHash } from './messenger-store.js'
import { channelTransportReady, telegramPilotReady } from './messenger-policy.js'
import { AppError } from '../assessments/contracts.js'
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
      const start=text.startsWith('/start')
      events.push({type:'incoming',accountId:null,userId:String(message.chat.id),
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
  const businessId=event.accountId||env.HH_CRM_MSG_TELEGRAM_BOT_ID
  if(!businessId||!/^\d{5,25}$/.test(String(businessId)))return false
  const accountDigest=businessHash(provider,businessId,config)
  return webhookTransaction(config,async db=>{
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
    const messageCipher=seal({text:safeString(event.body,1200)||'[Non-text message]'},
      {accountId:owner,recordId:messageId,field:'crm.msgbody'},config)
    const providerHash=providerMessageHash(provider,event.messageId,config)
    const eventHash=operationHash({scope:'crm-msg-event',provider,accountDigest,eventId:event.eventId},config)
    const language=event.language?.startsWith('ru')?'ru':event.language?.startsWith('es')?'es':'en'
    const when=new Date(event.sentAt)
    if(!Number.isFinite(when.getTime()))return false
    const row=(await db.query(
      'select app_private.crm_msg_ingest($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) as saved',
      [provider,accountDigest,userHash,userCipher,displayCipher,contactId,contactCipher,
        contactEmailHash,language,messageId,messageCipher,providerHash,eventHash,when.toISOString(),!!event.stop]
    )).rows[0]
    return !!row?.saved
  })
}
