import 'server-only'
import {parseOwnerVideoUpdate} from './owner-telegram-video-model.mjs'
import {resolvedOwnerTelegramEnv} from './telegram-owner-pairing.js'

// The verified CRM bot only points the owner to Dot; it never owns video
// sessions, renders files, or loads the native encoder. The CRM route verifies
// Telegram's webhook signature before invoking this handler.
const TOKEN=/^\d{6,16}:[A-Za-z0-9_-]{25,}$/
const CHAT=/^[1-9]\d{3,19}$/
const TELEGRAM='https://api.telegram.org/bot'
const DOT_MESSAGE='🎬 Создание видео перенесено в твой бот Dot. '+
  'Открой https://t.me/Andydotbot?start=audio → «Аудио и видео» → «Создать видео». '+
  'Это защищает от смешивания файлов двух ботов. Ничего не опубликовано.'

export async function receiveOwnerTelegramVideoCrmFallback(config,update,{
  env=process.env,fetcher=fetch,now=Date.now()
}={}){
  if(env.VERCEL_ENV==='preview'||env.HH_OWNER_VIDEO_ENABLED!=='true')return {handled:false}
  const username=String(env.HH_CRM_MSG_TELEGRAM_USERNAME||'').replace(/^@/,'')
  const event=parseOwnerVideoUpdate(update,{now,botUsername:username})
  if(!event)return {handled:false}
  if(env.HH_CRM_MSG_TELEGRAM_ENABLED!=='true'||!TOKEN.test(env.HH_CRM_MSG_TELEGRAM_TOKEN||''))
    return {handled:false}
  const effective=await resolvedOwnerTelegramEnv(config,env)
  const chat=String(effective.HH_PRACTICE_TG_CHAT_ID||'')
  if(!CHAT.test(chat)||event.chatId!==chat||event.userId!==chat)return {handled:false}
  if(event.action==='media'||event.action==='reject')return {handled:false}
  const token=env.HH_CRM_MSG_TELEGRAM_TOKEN
  const call=async(method,payload)=>{
    const response=await fetcher(TELEGRAM+encodeURIComponent(token)+'/'+method,{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify(payload),cache:'no-store',redirect:'error',
      signal:AbortSignal.timeout(12000)
    })
    if(!response.ok)throw Error('VIDEO_TELEGRAM_UNAVAILABLE')
    const data=await response.json().catch(()=>null)
    if(data?.ok!==true)throw Error('VIDEO_TELEGRAM_UNAVAILABLE')
    return data.result
  }
  if(event.callbackId)await call('answerCallbackQuery',{
    callback_query_id:event.callbackId,text:'Видео теперь в Dot',show_alert:false
  }).catch(()=>{})
  await call('sendMessage',{
    chat_id:chat,text:DOT_MESSAGE,disable_web_page_preview:true
  }).then(result=>{
    if(String(result?.chat?.id)!==chat||!Number.isSafeInteger(result.message_id))
      throw Error('VIDEO_TELEGRAM_WRONG_DESTINATION')
  }).catch(()=>{})
  return {handled:true}
}
