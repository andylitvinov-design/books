import {timingSafeEqual} from 'node:crypto'

// Customer notification bot MUST be separate from the existing owner digest,
// Ezohata diagnostic bot, and the CRM pilot webhook.
export const TELEGRAM_CLIENT_CONSENT_VERSION='hh-tg-message-alerts-v1'
export function validClientBotUsername(value){
 return typeof value==='string'&&/^[A-Za-z][A-Za-z0-9_]{3,30}bot$/i.test(value)&&value.length<=32
}
export function telegramClientLinkReady(env=process.env){
 return env.HH_CLIENT_TG_LINK_ENABLED==='true' &&
   typeof env.HH_CLIENT_TG_BOT_TOKEN==='string'&&env.HH_CLIENT_TG_BOT_TOKEN.length>=20&&
   typeof env.HH_CLIENT_TG_WEBHOOK_SECRET==='string'&&
   /^[A-Za-z0-9_-]{32,256}$/.test(env.HH_CLIENT_TG_WEBHOOK_SECRET)&&
   validClientBotUsername(env.HH_CLIENT_TG_BOT_USERNAME)
}
export function telegramClientSendReady(env=process.env){
 return telegramClientLinkReady(env) && env.HH_CLIENT_TG_SEND_APPROVED==='true'
}
export function verifyClientTelegramSecret(supplied,env=process.env){
 if(!telegramClientLinkReady(env)||typeof supplied!=='string')return false
 const expected=Buffer.from(env.HH_CLIENT_TG_WEBHOOK_SECRET,'utf8')
 const received=Buffer.from(supplied,'utf8')
 return expected.length===received.length&&timingSafeEqual(expected,received)
}
export function interpretTelegramClientUpdate(update){
 if(!update||!Number.isSafeInteger(update.update_id))return null
 const message=update.message
 if(!message||message.chat?.type!=='private'||message.from?.is_bot||
    !Number.isSafeInteger(message.chat.id)||message.chat.id<=0||
    message.from?.id!==message.chat.id||typeof message.text!=='string')return null
 const body=message.text.trim()
 const link=body.match(/^\/start(?:@[A-Za-z0-9_]{5,32})?\s+([A-Za-z0-9_-]{32})$/i)
 if(link)return {type:'link',chatId:String(message.chat.id),token:link[1],sentAt:message.date}
 if(/^\/(stop|unsubscribe)(?:@[A-Za-z0-9_]{5,32})?$/i.test(body))
   return {type:'stop',chatId:String(message.chat.id),sentAt:message.date}
 return null
}
export function validateTelegramStartToken(value){
 return typeof value==='string'&&/^[A-Za-z0-9_-]{32}$/.test(value)
}
export function telegramClientMessage(locale,requestId){
 if(typeof requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId))
   throw new Error('INVALID_REQUEST')
 const language=['en','ru','es'].includes(locale)?locale:'en'
 const heading=language==='ru'?'Holistic House: у вас новое сообщение.':
    language==='es'?'Holistic House: tienes un mensaje nuevo.':'Holistic House: you have a new message.'
 const link='https://holistichouse.vercel.app/'+language+'/app/consultations?request='+requestId.toLowerCase()
 return heading+'\n'+link
}
