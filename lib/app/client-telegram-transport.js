import 'server-only'
import {AppError} from '../assessments/contracts.js'
import {telegramClientLinkReady,telegramClientSendReady,
  telegramClientMessage} from './client-telegram-policy.js'

const API='https://api.telegram.org/bot'
const CALL_TIMEOUT=8500
async function botCall(name,payload=null,env=process.env){
 if(!telegramClientLinkReady(env))throw new AppError('TELEGRAM_NOT_CONFIGURED',503)
 const token=encodeURIComponent(env.HH_CLIENT_TG_BOT_TOKEN)
 try{
  const response=await fetch(API+token+'/'+name,{method:payload?'POST':'GET',
   ...(payload?{headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}:{}),
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
      String(env.HH_CLIENT_TG_BOT_USERNAME||'').toLowerCase())
   throw new AppError('TELEGRAM_BOT_IDENTITY_MISMATCH',503)
 if(requireWebhook){
   const info=await botCall('getWebhookInfo',null,env)
   if(info?.url!=='https://holistichouse.vercel.app/api/app/notification-channels/telegram/webhook')
     throw new AppError('TELEGRAM_WEBHOOK_NOT_CONNECTED',503)
 }
 return {username:bot.username,botId:String(bot.id)}
}
export async function registerClientTelegramWebhook(env=process.env){
 // Safe manual owner action: refuses to overwrite any other app's webhook.
 if(env.VERCEL_ENV!=='production'||!telegramClientLinkReady(env))
   throw new AppError('TELEGRAM_NOT_CONFIGURED',503)
 await verifyClientBot(env)
 const expected='https://holistichouse.vercel.app/api/app/notification-channels/telegram/webhook'
 const existing=await botCall('getWebhookInfo',null,env)
 if(existing?.url&&existing.url!==expected)throw new AppError('TELEGRAM_WEBHOOK_ALREADY_IN_USE',409)
 const set=await botCall('setWebhook',{url:expected,secret_token:env.HH_CLIENT_TG_WEBHOOK_SECRET,
  allowed_updates:['message'],drop_pending_updates:false,max_connections:4},env)
 if(set!==true)throw new AppError('TELEGRAM_PROVIDER_UNAVAILABLE',503)
 const checked=await botCall('getWebhookInfo',null,env)
 if(checked?.url!==expected)throw new AppError('TELEGRAM_PROVIDER_UNAVAILABLE',503)
 return {webhookRegistered:true,username:env.HH_CLIENT_TG_BOT_USERNAME}
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
