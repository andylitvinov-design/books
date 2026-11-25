import 'server-only'
import {telegramReadablePayload} from '../crm/telegram-button-layout.mjs'
import {reikiHintsCard} from './reiki-hints-catalog.mjs'
import {expressReportNeutralNotice} from './express-report-notice.mjs'
import {ownerEnquiryNotice} from './owner-enquiry-notice.mjs'
import {freePackageOwnerNotice} from '../crm/ali-free-package-receipts.mjs'
import {AppError} from '../assessments/contracts.js'
import {telegramClientLinkReady,telegramClientSendReady,
  telegramClientMessage,telegramClientBotMode,telegramClientBotUsername,telegramOwnerPilotReady} from './client-telegram-policy.js'
import {resolvedOwnerTelegramEnv} from '../practitioners/telegram-owner-pairing.js'
import {verifyOwnerTelegram,ownerBotCredentials} from '../practitioners/telegram-hub.mjs'
import {ownerScopedTelegramCommands} from '../practitioners/owner-ai-telegram.mjs'

const API='https://api.telegram.org/bot'
const CALL_TIMEOUT=8500

// Keep the menu owner-scoped, with no dependency on an active AI subscription.
const ownerMenu=(env)=>ownerScopedTelegramCommands({
 mode:telegramClientBotMode(env),
 ownerAiEnabled:env.HH_OWNER_AI_TG_ENABLED==='true',
 ownerVideoEnabled:env.HH_OWNER_VIDEO_ENABLED==='true',
})
async function botCall(name,payload=null,env=process.env){
 if(!telegramClientLinkReady(env))throw new AppError('TELEGRAM_NOT_CONFIGURED',503)
 // Token always remains server-side. Practice bot fallback is explicitly gated.
 const mode=telegramClientBotMode(env)
 const secret=mode==='dedicated'?env.HH_CLIENT_TG_BOT_TOKEN:
   mode==='shared_practice'?env.HH_PRACTICE_TG_BOT_TOKEN:null
 if(!secret)throw new AppError('TELEGRAM_NOT_CONFIGURED',503)
 const token=encodeURIComponent(secret)
 try{
  const response=await fetch(API+token+'/'+name,{method:payload?'POST':'GET',
   ...(payload?{headers:{'Content-Type':'application/json'},body:JSON.stringify(telegramReadablePayload(payload))}:{}),
   cache:'no-store',signal:AbortSignal.timeout(CALL_TIMEOUT)})
  if(!response.ok)throw new Error('status')
  const body=await response.json()
  if(body?.ok!==true)throw new Error('api')
  return body.result
 }catch{throw new AppError('TELEGRAM_PROVIDER_UNAVAILABLE',503)}
}
export async function verifyClientBot(env=process.env,{requireWebhook=false}={}){
 const bot=await botCall('getMe',null,env)
 if(!bot?.is_bot||String(bot?.username||'').toLowerCase()!==
      String(telegramClientBotUsername(env)||'').toLowerCase())
   throw new AppError('TELEGRAM_BOT_IDENTITY_MISMATCH',503)
 if(requireWebhook){
   const info=await botCall('getWebhookInfo',null,env)
   if(info?.url!=='https://holistichouse.vercel.app/api/app/notification-channels/telegram/webhook')
     throw new AppError('TELEGRAM_WEBHOOK_NOT_CONNECTED',503)
   if(ownerMenu(env).length&&
     !info.allowed_updates?.includes('callback_query'))
     throw new AppError('TELEGRAM_OWNER_MENU_NOT_CONNECTED',503)
 }
 return {username:bot.username,botId:String(bot.id)}
}
export async function registerClientTelegramWebhook(env=process.env,{config}={}){
 // Safe manual owner action: refuses to overwrite any other app's webhook.
 if(env.VERCEL_ENV!=='production'||!telegramClientLinkReady(env))
   throw new AppError('TELEGRAM_NOT_CONFIGURED',503)
 await verifyClientBot(env)
 if(telegramClientBotMode(env)==='shared_practice'){
   // Do not switch the owner bot away from getUpdates before its verified
   // private recipient is safely paired and confirmed. Existing outbound
   // Council/My Practice deliveries continue to use the same bot token.
   if(!config)throw new AppError('TELEGRAM_OWNER_PAIRING_REQUIRED',409)
   const paired=await resolvedOwnerTelegramEnv(config,env)
   const checked=await verifyOwnerTelegram(paired)
   if(!checked.verified||!checked.botVerified||!checked.chatVerified)
     throw new AppError('TELEGRAM_OWNER_PAIRING_REQUIRED',409)
 }
 
 const expected='https://holistichouse.vercel.app/api/app/notification-channels/telegram/webhook'
 const existing=await botCall('getWebhookInfo',null,env)
 if(existing?.url&&existing.url!==expected)throw new AppError('TELEGRAM_WEBHOOK_ALREADY_IN_USE',409)
 const set=await botCall('setWebhook',{url:expected,secret_token:env.HH_CLIENT_TG_WEBHOOK_SECRET,
  allowed_updates:['message','callback_query'],drop_pending_updates:false,max_connections:4},env)
 if(set!==true)throw new AppError('TELEGRAM_PROVIDER_UNAVAILABLE',503)
 const checked=await botCall('getWebhookInfo',null,env)
 if(checked?.url!==expected)throw new AppError('TELEGRAM_PROVIDER_UNAVAILABLE',503)
 let ownerAiCommandsReady=false
 const ownerCommands=ownerMenu(env)
 if(ownerCommands.length){
   const paired=await resolvedOwnerTelegramEnv(config,env)
   const owner=ownerBotCredentials(paired)
   const chatNumber=Number(owner?.chat)
   if(!Number.isSafeInteger(chatNumber)||chatNumber<=0)
     throw new AppError('TELEGRAM_OWNER_PAIRING_REQUIRED',409)
   const confirmed=await botCall('setMyCommands',{
     commands:ownerCommands,scope:{type:'chat',chat_id:chatNumber}
   },env)
   if(confirmed!==true)throw new AppError('TELEGRAM_OWNER_MENU_UNAVAILABLE',503)
   ownerAiCommandsReady=await ownerAiMenuReady(config,env)
   if(!ownerAiCommandsReady)throw new AppError('TELEGRAM_OWNER_MENU_UNAVAILABLE',503)
 }
 return {webhookRegistered:true,username:telegramClientBotUsername(env),
   mode:telegramClientBotMode(env),ownerAiCommandsReady}
}
export async function ownerAiMenuReady(config,env=process.env){
 const ownerCommands=ownerMenu(env)
 if(!ownerCommands.length||!config)return false
 try{
   const paired=await resolvedOwnerTelegramEnv(config,env)
   const owner=ownerBotCredentials(paired)
   const chatNumber=Number(owner?.chat)
   if(!Number.isSafeInteger(chatNumber)||chatNumber<=0)return false
   const saved=await botCall('getMyCommands',{
     scope:{type:'chat',chat_id:chatNumber}
   },env)
   // Exact owner-scoped readback removes stale legacy commands; do not alter global/customer scopes.
   return Array.isArray(saved)&&saved.length===ownerCommands.length&&
     ownerCommands.every((command,i)=>
        saved[i]?.command===command.command&&saved[i]?.description===command.description)
 }catch{return false}
}
export async function sendClientTelegramMessage({chatId,locale,requestId},env=process.env){
 if(!telegramClientSendReady(env))throw new AppError('TELEGRAM_SEND_NOT_APPROVED',503)
 if(typeof chatId!=='string'||!/^[1-9][0-9]{4,19}$/.test(chatId))
  throw new AppError('TELEGRAM_INVALID_CHAT',400)
 // Fixed neutral content only. No medical details, raw client text or session secret.
 const result=await botCall('sendMessage',{chat_id:chatId,
  text:telegramClientMessage(locale,requestId),disable_web_page_preview:true},env)
 if(!Number.isSafeInteger(result?.message_id))throw new AppError('TELEGRAM_PROVIDER_UNAVAILABLE',503)
 return {accepted:true,providerMessageId:String(result.message_id)}
}


/** One explicitly consented goal reminder in an already-verified first-party bot.
 * NEVER accept user-provided chat IDs from public requests; only the private
 * account-bound Daybook delivery worker may call this wrapper.
 */
export async function sendDaybookDailyTelegramMessage({chatId,message,button,profileUrl},env=process.env){
 if(!telegramClientSendReady(env)||env.HH_DAYBOOK_DAILY_SEND_APPROVED!=='true'||
    env.VERCEL_ENV!=='production')throw new AppError('DAYBOOK_SEND_NOT_APPROVED',503)
 if(typeof chatId!=='string'||!/^[1-9][0-9]{4,19}$/.test(chatId))
  throw new AppError('TELEGRAM_INVALID_CHAT',400)
 if(typeof message!=='string'||message.length>1200||message.length<30||
    typeof button!=='string'||button.length>64||button.length<5)
  throw new AppError('DAYBOOK_MESSAGE_INVALID',400)
 let url
 try{url=new URL(profileUrl)}catch{throw new AppError('DAYBOOK_LINK_INVALID',400)}
 if(url.origin!=='https://holistichouse.vercel.app'||
    !/^\/(en|ru)\/app\/my-coaching-plan$/.test(url.pathname)||
    !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(url.searchParams.get('goal')||''))
  throw new AppError('DAYBOOK_LINK_INVALID',400)
 const result=await botCall('sendMessage',{chat_id:chatId,text:message,
  disable_web_page_preview:true,reply_markup:{inline_keyboard:[[{text:button,url:profileUrl}]]}},env)
 if(!Number.isSafeInteger(result?.message_id))throw new AppError('TELEGRAM_PROVIDER_UNAVAILABLE',503)
 return {accepted:true,providerMessageId:String(result.message_id)}
}


/** One consented Daybook weekly photograph in a verified first-party chat.
 * The independent weekly release gate never permits generic broadcasts.
 */
export async function sendDaybookWeeklyTelegramMessage({chatId,caption,button,profileUrl,photoUrl},env=process.env){
 if(!telegramClientSendReady(env)||env.HH_DAYBOOK_WEEKLY_SEND_APPROVED!=='true'||
    env.VERCEL_ENV!=='production')throw new AppError('DAYBOOK_WEEKLY_SEND_NOT_APPROVED',503)
 if(typeof chatId!=='string'||!/^[1-9][0-9]{4,19}$/.test(chatId))
  throw new AppError('TELEGRAM_INVALID_CHAT',400)
 if(typeof caption!=='string'||caption.length<30||caption.length>1000||
    typeof button!=='string'||button.length<5||button.length>64)
  throw new AppError('DAYBOOK_WEEKLY_MESSAGE_INVALID',400)
 let url,photo
 try{url=new URL(profileUrl);photo=new URL(photoUrl)}catch{throw new AppError('DAYBOOK_WEEKLY_LINK_INVALID',400)}
 if(url.origin!=='https://holistichouse.vercel.app'||
    !/^\/(en|ru)\/app\/my-coaching-plan$/.test(url.pathname)||
    !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(url.searchParams.get('goal')||'')||
    photo.origin!=='https://images.pexels.com'||
    !/^\/photos\/[0-9]{3,10}\/[A-Za-z0-9_-]+\.(?:jpe?g|png)$/.test(photo.pathname)||
    photo.searchParams.get('auto')!=='compress'||photo.searchParams.get('w')!=='1080')
  throw new AppError('DAYBOOK_WEEKLY_LINK_INVALID',400)
 const result=await botCall('sendPhoto',{chat_id:chatId,photo:photoUrl,caption,
   reply_markup:{inline_keyboard:[[{text:button,url:profileUrl}]]}},env)
 if(!Number.isSafeInteger(result?.message_id))throw new AppError('TELEGRAM_PROVIDER_UNAVAILABLE',503)
 return {accepted:true,providerMessageId:String(result.message_id)}
}

/** Finite, catalog-only Reiki Hints series. No arbitrary caption or photo URL. */
export async function sendReikiHintsTelegramMessage({chatId,day,locale},env=process.env){
 if(!telegramClientSendReady(env)||env.HH_REIKI_HINTS_SEND_APPROVED!=='true'||env.VERCEL_ENV!=='production')throw new AppError('REIKI_HINTS_SEND_NOT_APPROVED',503)
 if(typeof chatId!=='string'||!/^[1-9][0-9]{4,19}$/.test(chatId))throw new AppError('TELEGRAM_INVALID_CHAT',400)
 const card=reikiHintsCard(day,locale)
 const result=await botCall('sendPhoto',{chat_id:chatId,photo:card.photoUrl,caption:card.caption,allow_paid_broadcast:false},env)
 if(!Number.isSafeInteger(result?.message_id)||String(result?.chat?.id||'')!==chatId)throw new AppError('TELEGRAM_PROVIDER_UNAVAILABLE',503)
 return {accepted:true,providerMessageId:String(result.message_id)}
}

/** A neutral alert, accepted only for a verified opt-in client account.
 * A precise report URL and any private content are never transmitted.
 */
export async function sendClientTelegramReportNotice({chatId,locale},env=process.env){
  if(!telegramClientSendReady(env))throw new AppError('TELEGRAM_SEND_NOT_APPROVED',503)
  if(typeof chatId!=='string'||!/^[1-9][0-9]{4,19}$/.test(chatId))
    throw new AppError('TELEGRAM_INVALID_CHAT',400)
  const sent=await botCall('sendMessage',{
    chat_id:chatId,text:expressReportNeutralNotice(locale),disable_web_page_preview:true,
  },env)
  if(!Number.isSafeInteger(sent?.message_id))
    throw new AppError('TELEGRAM_PROVIDER_UNAVAILABLE',503)
  return {accepted:true,providerMessageId:String(sent.message_id)}
}

/** Explicit owner-click test ONLY. The caller must verify the authenticated
 * owner, their own confirmed chat, bot identity/webhook and rate limit first.
 * Does not override HH_CLIENT_TG_SEND_APPROVED or enable event dispatch.
 */
export async function sendOwnerTelegramTestMessage({chatId,locale},env=process.env){
 if(!telegramClientLinkReady(env))throw new AppError('TELEGRAM_NOT_CONFIGURED',503)
 if(typeof chatId!=='string'||!/^[1-9][0-9]{4,19}$/.test(chatId))
   throw new AppError('TELEGRAM_INVALID_CHAT',400)
 const body=locale==='ru'
  ?'Holistic House: тестовое уведомление. Ваш Telegram подключён. Личные данные остаются в защищённом кабинете.'
  :locale==='es'
  ?'Holistic House: aviso de prueba. Tu Telegram está conectado. Los datos privados permanecen en tu cuenta segura.'
  :'Holistic House: test notification. Your Telegram is connected. Private information stays in your secure account.'
 const result=await botCall('sendMessage',{
   chat_id:chatId,text:body,disable_web_page_preview:true,
 },env)
 if(!Number.isSafeInteger(result?.message_id))
   throw new AppError('TELEGRAM_PROVIDER_UNAVAILABLE',503)
 return {accepted:true,providerMessageId:String(result.message_id)}
}


/** Aggregate-only master statistics sent to a chat verified by Telegram /start.
 * Separate opt-in/release gate; no patient data and no generic bulk sending.
 */
export async function sendMasterAnalyticsTelegram({chatId,text},env=process.env){
 if(env.HH_MASTER_ANALYTICS_TG_ENABLED!=='true'||!telegramClientLinkReady(env))
   throw new AppError('MASTER_ANALYTICS_DISABLED',503)
 if(typeof chatId!=='string'||!/^[1-9][0-9]{4,19}$/.test(chatId)||
    typeof text!=='string'||!text.startsWith('🏡 Holistic House · My Practice')||
    text.length>3900)
   throw new AppError('MASTER_ANALYTICS_INVALID_MESSAGE',400)
 const result=await botCall('sendMessage',{
   chat_id:chatId,text,disable_web_page_preview:true,
 },env)
 if(!Number.isSafeInteger(result?.message_id)||
    String(result?.chat?.id||'')!==chatId)
   throw new AppError('TELEGRAM_PROVIDER_UNAVAILABLE',503)
 return {accepted:true,providerMessageId:String(result.message_id)}
}


/** Real, server-derived owner activity only. Never expose visitor text,
 * contact information, private content, user-provided URL or chat ID to a caller.
 * Only the separate owner pilot may use this function; generic client sends
 * retain the independent HH_CLIENT_TG_SEND_APPROVED release gate.
 */
export async function sendOwnerTelegramEventMessage({chatId,locale,event,enquiry=null,stage=null,reference=null},env=process.env){
 if(!telegramOwnerPilotReady(env))throw new AppError('TELEGRAM_OWNER_PILOT_DISABLED',503)
 if(typeof chatId!=='string'||!/^[1-9][0-9]{4,19}$/.test(chatId)||
   !['enquiry','message','free_stage'].includes(event))throw new AppError('TELEGRAM_INVALID_CHAT',400)
 const language=['en','ru','es'].includes(locale)?locale:'en'
 const textByLocale={
  en:event==='enquiry'?'Holistic House: a new request is waiting in My Practice.':
   'Holistic House: you have a new client message in My Practice.',
  ru:event==='enquiry'?'Holistic House: в «Моей практике» появилась новая заявка.':
   'Holistic House: в «Моей практике» новое сообщение клиента.',
  es:event==='enquiry'?'Holistic House: hay una nueva solicitud en Mi práctica.':
   'Holistic House: tienes un mensaje de cliente en Mi práctica.',
 }
 const text=event==='free_stage'&&/^FR-[A-F0-9]{10}$/.test(String(reference||''))
   ?freePackageOwnerNotice(stage,language)+'\nCase / Заявка: '+reference:
   event==='free_stage'?null:
   event==='enquiry'?ownerEnquiryNotice({locale:language,enquiry}):
   textByLocale[language]+'\nhttps://holistichouse.vercel.app/'+language+
   '/app/practice?panel=requests'
 if(typeof text!=='string'||text.length<20||text.length>3900)
  throw new AppError('TELEGRAM_INVALID_MESSAGE',400)
 const result=await botCall('sendMessage',{
  chat_id:chatId,text,disable_web_page_preview:true,
 },env)
 if(!Number.isSafeInteger(result?.message_id)||
    (event==='free_stage'&&String(result?.chat?.id||'')!==chatId))
  throw new AppError('TELEGRAM_PROVIDER_UNAVAILABLE',503)
 return {accepted:true,providerMessageId:String(result.message_id)}
}
