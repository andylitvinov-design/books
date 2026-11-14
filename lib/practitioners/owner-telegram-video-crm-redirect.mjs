// CRM accepts owner-only /video commands but never renders media. Keep the
// heavyweight renderer and its native FFmpeg binary in the signed Dot webhook.
import {parseOwnerVideoUpdate} from './owner-telegram-video-model.mjs'

const TELEGRAM='https://api.telegram.org/bot'
const DOT_REDIRECT='🎬 Создание видео перенесено в твой бот Dot. '+
  'Открой https://t.me/Andydotbot?start=audio → «Аудио и видео» → «Создать видео». '+
  'Это защищает от смешивания файлов двух ботов. Ничего не опубликовано.'

async function telegramCall(owner,method,payload,fetcher){
 const response=await fetcher(TELEGRAM+encodeURIComponent(owner.token)+'/'+method,{
   method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),
   cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000),
 })
 if(!response.ok)throw Error('VIDEO_TELEGRAM_UNAVAILABLE')
 const data=await response.json().catch(()=>null)
 if(data?.ok!==true)throw Error('VIDEO_TELEGRAM_UNAVAILABLE')
 return data.result
}

export async function receiveOwnerTelegramCrmVideoRedirect(config,update,{
 env=process.env,fetcher=fetch,now=Date.now(),resolveOwnerEnv=null,
}={}){
 if(env.VERCEL_ENV==='preview'||env.HH_OWNER_VIDEO_ENABLED!=='true')
   return {handled:false}
 const username=String(env.HH_CRM_MSG_TELEGRAM_USERNAME||'').replace(/^@/,'')
 const event=parseOwnerVideoUpdate(update,{now,botUsername:username})
 if(!event)return {handled:false}
 const resolver=resolveOwnerEnv||
   (await import('./telegram-owner-pairing.js')).resolvedOwnerTelegramEnv
 const effective=await resolver(config,env)
 const chat=String(effective.HH_PRACTICE_TG_CHAT_ID||'')
 const token=env.HH_CRM_MSG_TELEGRAM_ENABLED==='true'
   ?env.HH_CRM_MSG_TELEGRAM_TOKEN:null
 if(!/^[1-9]\d{3,19}$/.test(chat)||
    !/^\d{6,16}:[A-Za-z0-9_-]{25,}$/.test(token||'')||
    !username||event.chatId!==chat||event.userId!==chat)return {handled:false}
 // No two-bot media sharing, queued render, YouTube publishing or side effects.
 if(event.action==='media'||event.action==='reject')return {handled:false}
 const owner={chat,token}
 if(event.callbackId){
   await telegramCall(owner,'answerCallbackQuery',{
     callback_query_id:event.callbackId,text:'Видео теперь в Dot',show_alert:false,
   },fetcher).catch(()=>{})
 }
 await telegramCall(owner,'sendMessage',{
   chat_id:owner.chat,text:DOT_REDIRECT,disable_web_page_preview:true,
 },fetcher).then(result=>{
   if(String(result?.chat?.id)!==chat||!Number.isSafeInteger(result.message_id))
     throw Error('VIDEO_TELEGRAM_WRONG_DESTINATION')
 }).catch(()=>{})
 return {handled:true}
}
