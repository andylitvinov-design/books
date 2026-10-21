import 'server-only'
import {transaction,consumeRate} from '../app/database.js'
import {telegramClientBotMode} from '../app/client-telegram-policy.js'
import {registerClientTelegramWebhook,verifyClientBot,ownerAiMenuReady} from '../app/client-telegram-transport.js'
import {resolvedOwnerTelegramEnv} from './telegram-owner-pairing.js'
import {ownerBotCredentials} from './telegram-hub.mjs'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {askCouncilTelegram} from './council-free-models.mjs'
import {resolvedOwnerAiEnvironment} from './owner-ai-provider-settings.js'
import {parseOwnerAiUpdate,ownerAiMenu,ownerAiPrompt,ownerAiResponseItems} from './owner-ai-telegram.mjs'

const FETCH_TIMEOUT_MS=11000
const BOT_API='https://api.telegram.org/bot'
const STATUS=new Set(['accepted','limited','error'])
async function callTelegram(method,data,env,fetcher){
  const credentials=ownerBotCredentials(env)
  if(!credentials)throw Error('OWNER_TELEGRAM_UNPAIRED')
  const response=await fetcher(BOT_API+encodeURIComponent(credentials.token)+'/'+method,{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify(data),cache:'no-store',redirect:'error',
    signal:AbortSignal.timeout(FETCH_TIMEOUT_MS)
  })
  if(!response.ok)throw Error('TELEGRAM_API_REJECTED')
  const payload=await response.json().catch(()=>null)
  if(payload?.ok!==true)throw Error('TELEGRAM_API_REJECTED')
  if(method==='sendMessage'&&
    (!Number.isSafeInteger(payload.result?.message_id)||
     String(payload.result?.chat?.id)!==String(credentials.chat)))
    throw Error('TELEGRAM_DESTINATION_UNVERIFIED')
  return payload.result
}
async function sendOwner(message,env,fetcher){
  const credentials=ownerBotCredentials(env)
  if(!credentials)throw Error('OWNER_TELEGRAM_UNPAIRED')
  return callTelegram('sendMessage',{
    chat_id:credentials.chat,disable_web_page_preview:true,
    text:message.text, ...(message.reply_markup?{reply_markup:message.reply_markup}:{})
  },env,fetcher)
}
async function claimUpdate(config,event){
  return transaction(config,null,async db=>{
    const result=await db.query(
      'insert into app_private.telegram_owner_ai_updates '+
      '(update_id,practitioner_id,action,model_mode,status) '+
      "values($1,$2,$3,$4,'claimed') on conflict(update_id) do nothing returning update_id",
      [event.updateId,PRACTITIONER_ID,event.action,event.mode||null]
    )
    return result.rowCount===1
  },{server:true})
}
async function settleUpdate(config,updateId,status,models={}){
  if(!STATUS.has(status))throw Error('INVALID_OWNER_AI_STATE')
  return transaction(config,null,async db=>{
    await db.query(
      'update app_private.telegram_owner_ai_updates set status=$2, '+
      'model_status=$3::jsonb,settled_at=now() '+
      'where update_id=$1 and practitioner_id=$4 and status=\'claimed\'',
      [updateId,status,JSON.stringify(models),PRACTITIONER_ID]
    )
  },{server:true})
}
// Called ONLY by the existing signed client/shared-bot webhook, not a public AI endpoint.
// Client /start pairing and /stop pass through unchanged.
export async function receiveOwnerAiTelegramWebhook(config,update,{
  env=process.env,fetcher=fetch,now=Date.now()
}={}){
  if(env.VERCEL_ENV==='preview'||env.HH_OWNER_AI_TG_ENABLED!=='true'||
     telegramClientBotMode(env)!=='shared_practice')return {handled:false}
  const event=parseOwnerAiUpdate(update,now)
  if(!event)return {handled:false}
  const effective=await resolvedOwnerTelegramEnv(config,env)
  const credentials=ownerBotCredentials(effective)
  // A Telegram username alone never authorizes access. Compare BOTH numeric
  // sender and private chat against the already verified encrypted owner pair.
  if(!credentials||event.chatId!==credentials.chat||event.userId!==credentials.chat)
    return {handled:false}
  const claimed=await claimUpdate(config,event)
  if(!claimed)return {handled:true,duplicate:true}
  let disposition='error',outcomes={}
  try{
    if(event.callbackId){
      await callTelegram('answerCallbackQuery',{callback_query_id:event.callbackId},effective,fetcher)
        .catch(()=>{})
    }
    // First owner /ai repairs/registers commands and callback delivery without
    // another login or user click. Never touch unrelated bot webhooks.
    if(event.action==='menu'&&!event.callbackId){
      let ready=false
      try{
        await verifyClientBot(env,{requireWebhook:true})
        ready=await ownerAiMenuReady(config,env)
      }catch{/* Existing bot/webhook may need safe owner-only registration. */}
      if(!ready){
        const registered=await registerClientTelegramWebhook(env,{config})
        if(registered.ownerAiCommandsReady!==true)
          throw Error('OWNER_AI_MENU_NOT_REGISTERED')
      }
    }
    if(event.action==='menu')await sendOwner(ownerAiMenu(),effective,fetcher)
    if(event.action==='prompt')await sendOwner(ownerAiPrompt(event.mode),effective,fetcher)
    if(event.action==='too_long')await sendOwner({
      text:'Вопрос слишком длинный. Напишите до 2000 символов или сократите его.'
    },effective,fetcher)
    if(event.action==='sensitive')await sendOwner({
      text:'Похоже, в вопросе есть личные контакты или секретный ключ. Удалите их и отправьте обезличенный рабочий вопрос.'
    },effective,fetcher)
    if(event.action==='question'){
      // A retry with the same update_id cannot reach the model adapters twice.
      await consumeRate(config,{scope:'hh-owner-ai-telegram',owner:PRACTITIONER_ID},10,3600)
      const aiEnv=await resolvedOwnerAiEnvironment(config,effective)
      const reviews=await askCouncilTelegram(event.question,event.mode,aiEnv,fetcher)
      outcomes=Object.fromEntries(Object.entries(reviews).map(([name,value])=>
        [name,{status:value.status,model:value.model,reason:value.reason||''}]))
      const responses=ownerAiResponseItems(reviews,event.mode)
      for(let i=0;i<responses.length;i++){
        await sendOwner({
          ...responses[i],
          ...(i===responses.length-1?{reply_markup:{
            inline_keyboard:[[{
              text:'🔄 Задать ещё вопрос',callback_data:'hh-ai:menu'
            }]]
          }}:{})
        },effective,fetcher)
      }
    }
    disposition='accepted'
  }catch(error){
    disposition=error?.code==='RATE_LIMITED'?'limited':'error'
    // A network timeout can occur AFTER Telegram accepted a message.
    // Do not auto-retry a claimed update or tell Telegram to replay it.
    if(disposition==='limited')await sendOwner({
      text:'Сегодня достигнут лимит: 10 вопросов в час. Попробуйте позднее.'
    },effective,fetcher).catch(()=>{})
    else await sendOwner({
      text:'Не удалось подключить меню AI Console или получить ответ. Проверьте доступность Telegram и повторите /ai. Чужой webhook не перезаписывается; изменений на сайте не было.'
    },effective,fetcher).catch(()=>{})
  }
  await settleUpdate(config,event.updateId,disposition,outcomes).catch(()=>{})
  return {handled:true,providerAccepted:disposition==='accepted'}
}
