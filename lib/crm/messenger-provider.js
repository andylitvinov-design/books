import 'server-only'
import { AppError } from '../assessments/contracts.js'
import { channelTransportReady, telegramPilotReady } from './messenger-policy.js'
const API = 'https://api.telegram.org'
const GRAPH = 'https://graph.facebook.com'
const INSTAGRAM = 'https://graph.instagram.com'
const TIMEOUT = 9000
export function configuredExternalId(channel,env=process.env) {
  if (channel==='whatsapp') return env.HH_CRM_MSG_WHATSAPP_PHONE_ID||''
  if (channel==='instagram') return env.HH_CRM_MSG_INSTAGRAM_ID||''
  if (channel==='messenger') return env.HH_CRM_MSG_MESSENGER_PAGE_ID||''
  return ''
}
function token(channel,env=process.env){
  return channel==='whatsapp'?env.HH_CRM_MSG_WHATSAPP_TOKEN:
    channel==='instagram'?env.HH_CRM_MSG_INSTAGRAM_TOKEN:
    channel==='messenger'?env.HH_CRM_MSG_MESSENGER_TOKEN:env.HH_CRM_MSG_TELEGRAM_TOKEN
}
async function readProvider(url,options={}){
  let response
  try { response=await fetch(url,{...options,signal:AbortSignal.timeout(TIMEOUT),cache:'no-store'}) }
  catch { throw new AppError('PROVIDER_STATUS_UNKNOWN',503) }
  let payload
  try{payload=await response.json()}catch{throw new AppError('PROVIDER_STATUS_UNKNOWN',503)}
  if(!response.ok || payload?.ok===false || payload?.error)
    throw new AppError(response.status>=500?'PROVIDER_STATUS_UNKNOWN':'PROVIDER_REJECTED',503)
  return payload
}
// Called ONLY on explicit owner action; never infer a business account from another user.
export async function verifyMessengerBusiness(channel,env=process.env){
  if(!channelTransportReady(channel,env)) throw new AppError('CHANNEL_NOT_CONNECTED',503)
  if(channel==='telegram'){
    const payload=await readProvider(API+'/bot'+encodeURIComponent(token(channel,env))+'/getMe')
    if(!payload?.result?.id || payload.result.is_bot!==true || String(payload.result.id)!==env.HH_CRM_MSG_TELEGRAM_BOT_ID) throw new AppError('PROVIDER_REJECTED',503)
    return String(payload.result.id)
  }
  const id=configuredExternalId(channel,env)
  if(!/^\d{5,25}$/.test(id)) throw new AppError('CHANNEL_NOT_CONNECTED',503)
  const version=env.HH_CRM_MSG_META_API_VERSION
  const verifiedUrl=channel==='instagram' ? INSTAGRAM+'/'+version+'/me?fields=id' : GRAPH+'/'+version+'/'+id+'?fields=id'
  const response=await readProvider(verifiedUrl,{
    headers:{Authorization:'Bearer '+token(channel,env)},
  })
  if(String(response?.id)!==id) throw new AppError('PROVIDER_REJECTED',503)
  return id
}
export async function sendOneMessengerMessage({channel,to,text},env=process.env){
  if(!channelTransportReady(channel,env)) throw new AppError('CHANNEL_NOT_CONNECTED',503)
  const access=token(channel,env)
  if(channel==='telegram'){
    // During pilot, an authenticated owner can reply ONLY to the explicitly
    // allowlisted test chat. Never attempt a provider send to any other chat.
    if(telegramPilotReady(env)&&String(to)!==env.HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID)
      throw new AppError('TEST_RECIPIENT_ONLY',403)
    // Telegram has no delivered/read receipt; success means accepted by Telegram.
    const payload=await readProvider(API+'/bot'+encodeURIComponent(access)+'/sendMessage',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({chat_id:to,text,disable_web_page_preview:true}),
    })
    const id=payload?.result?.message_id
    if(!id) throw new AppError('PROVIDER_STATUS_UNKNOWN',503)
    return {status:'accepted',providerId:String(id)}
  }
  const version=env.HH_CRM_MSG_META_API_VERSION
  let endpoint,body
  if(channel==='whatsapp'){
    endpoint=GRAPH+'/'+version+'/'+configuredExternalId(channel,env)+'/messages'
    body={messaging_product:'whatsapp',recipient_type:'individual',to,type:'text',text:{body:text,preview_url:false}}
  }else if(channel==='instagram'){
    // Official Instagram API with Instagram Login (not Facebook Login).
    // See Meta Send API: POST graph.instagram.com/{version}/me/messages.
    endpoint=INSTAGRAM+'/'+version+'/me/messages'
    body={recipient:{id:to},message:{text}}
  }else{
    // Official Page-scoped Messenger Send API.
    endpoint=GRAPH+'/'+version+'/'+configuredExternalId('messenger',env)+'/messages'
    body={recipient:{id:to},message:{text},messaging_type:'RESPONSE'}
  }
  const result=await readProvider(endpoint,{
    method:'POST',headers:{Authorization:'Bearer '+access,'Content-Type':'application/json'},
    body:JSON.stringify(body),
  })
  const id=channel==='whatsapp'?result?.messages?.[0]?.id:result?.message_id
  if(!id) throw new AppError('PROVIDER_STATUS_UNKNOWN',503)
  return {status:'accepted',providerId:String(id)}
}

// Called only after authenticated owner presses Connect.
// Refuse to hijack a bot whose webhook belongs to another application.
export async function ensureTelegramWebhook(env=process.env){
  if(env.VERCEL_ENV!=='production'||!channelTransportReady('telegram',env))
    throw new AppError('CHANNEL_NOT_CONNECTED',503)
  const secret=env.HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET
  if(!/^[A-Za-z0-9_-]{1,256}$/.test(secret))
    throw new AppError('INVALID_WEBHOOK_SECRET',503)
  const access=encodeURIComponent(token('telegram',env))
  const endpoint=API+'/bot'+access
  const callback='https://holistichouse.vercel.app/api/app/crm/messenger/webhook/telegram'
  const existing=await readProvider(endpoint+'/getWebhookInfo')
  const previous=String(existing?.result?.url||'')
  if(previous&&previous!==callback)
    throw new AppError('TELEGRAM_WEBHOOK_ALREADY_IN_USE',409)
  // Refresh the secret even when the same callback URL is already registered.
  // Telegram cannot reveal the old secret through getWebhookInfo.
  const setup=await readProvider(endpoint+'/setWebhook',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({url:callback,secret_token:secret,allowed_updates:['message'],
      max_connections:4,drop_pending_updates:false}),
  })
  if(setup?.ok!==true||setup.result!==true)
    throw new AppError('PROVIDER_REJECTED',503)
  const checked=await readProvider(endpoint+'/getWebhookInfo')
  if(checked?.result?.url!==callback)
    throw new AppError('PROVIDER_STATUS_UNKNOWN',503)
  return {connected:true,url:callback}
}
