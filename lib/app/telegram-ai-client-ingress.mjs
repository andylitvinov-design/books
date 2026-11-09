/** Signed-client-webhook caller only; no provider or DB side effects. */
import {telegramVideoAudioMeta} from '../crm/telegram-ai-audio.mjs'
const COMMAND=/^\/(hhvideo|hhvideo_(?:agree|confirm|cancel)|stop|unsubscribe)(?:@([A-Za-z][A-Za-z0-9_]{4,31}))?(?:\s+([^\u0000-\u001f]{1,1100}))?$/iu
const FEEDBACK=/^(?:10|[0-9]|да|нет|так себе|yes|no|so-so|sí|si|regular|\/watched|\/stop_checkin|\/skip_checkin)$/iu
const BOT=/^[A-Za-z][A-Za-z0-9_]{4,31}$/
const REPOST=['forward_origin','forward_from','forward_from_chat','forward_date',
 'forward_sender_name','is_automatic_forward','reply_to_message','external_reply',
 'via_bot','reply_to_story','forward_signature']
export function parseTelegramVideoClientIngress(update,username,now=Date.now()){
 if(!BOT.test(String(username||''))||!Number.isFinite(now)||
 !Number.isSafeInteger(update?.update_id)||update.update_id<0)return null
 const m=update?.message,id=m?.chat?.id
 if(m?.chat?.type!=='private'||m?.from?.is_bot===true||
 !Number.isSafeInteger(id)||id<=0||m.from?.id!==id||
 !Number.isSafeInteger(m.message_id)||m.message_id<1||
 !Number.isSafeInteger(m.date)||m.date<=0)return null
 const mediaPresent=Boolean(m.voice||m.audio)
 const audio=mediaPresent?telegramVideoAudioMeta(m):null
 if(mediaPresent){
  if(!audio||m.reply_to_message||m.external_reply||m.via_bot||
    m.reply_to_story)return null
 }else if(typeof m.text!=='string'||m.text.length>1200||
  REPOST.some(k=>Object.hasOwn(m,k)))return null
 const sent=m.date*1000
 if(now-sent>600000||sent-now>120000)return null
 // Metadata is not downloaded until explicit confirmation in a verified account.
 if(audio)return {type:'incoming',eventId:'tg:'+update.update_id,
  userId:String(id),messageId:'tg:'+id+':'+m.message_id,
  rawText:'/hhvideo_audio',body:'/hhvideo_audio',
  language:String(m.from.language_code||'').slice(0,8),
  sentAt:sent,stop:false,clientVideoIntent:true,feedbackOnly:false,
  audio,accountId:null,inlineAction:false,callbackId:null}
 const raw=m.text.trim(),command=COMMAND.exec(raw)
 let text,stop=false,feedbackOnly=false
 if(command){
  if(command[2]&&command[2].toLowerCase()!==username.toLowerCase())return null
  const name=command[1].toLowerCase(),goal=String(command[3]||'').trim()
  if(name==='hhvideo'&&goal.length>600||name!=='hhvideo'&&goal)return null
  stop=name==='stop'||name==='unsubscribe'
  text=stop?'/stop':command[2]?'/'+name+(goal?' '+goal:''):raw
 }else if(FEEDBACK.test(raw)){feedbackOnly=true;text=raw}
 else return null
 return {type:'incoming',eventId:'tg:'+update.update_id,
 userId:String(id),messageId:'tg:'+id+':'+m.message_id,
 rawText:text,body:text,language:String(m.from.language_code||'').slice(0,8),
 sentAt:sent,stop,clientVideoIntent:!stop&&!feedbackOnly,feedbackOnly,
 accountId:null,inlineAction:false,callbackId:null}
}