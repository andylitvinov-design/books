// Owner CRM direct Telegram contact: separate from the coaching questionnaire.
// A deep-link click is not consent; only a signed private Telegram update and
// an explicit /agree may establish reply permission in the existing CRM.
import {telegramPublicDiagnosticReady,channelTransportReady} from './messenger-policy.js'

const LOCALES=new Set(['en','ru','es'])
const START=/^\/start(?:@[A-Za-z0-9_]{5,32})?\s+hhtalk_(en|ru|es)$/i

export function telegramDirectChatReady(env=process.env){
 return env.HH_CRM_TG_DIRECT_CHAT_ENABLED==='true' &&
   telegramPublicDiagnosticReady(env) && channelTransportReady('telegram',env)
}
export function telegramDirectChatStartLocale(value){
 const m=START.exec(String(value||'').trim())
 return m?m[1].toLowerCase():null
}
export function telegramDirectChatPublicUrl(locale,env=process.env){
 if(!LOCALES.has(locale)||!telegramDirectChatReady(env))return null
 const bot=String(env.HH_CRM_MSG_TELEGRAM_USERNAME||'').replace(/^@/,'')
 if(!/^[A-Za-z0-9_]{5,32}$/.test(bot)||!/bot$/i.test(bot))return null
 return 'https://t.me/'+bot+'?start=hhtalk_'+locale
}
export function telegramDirectChatAgree(event){
 const raw=String(event?.rawText||'').trim()
 return /^\/agree(?:@[A-Za-z0-9_]{5,32})?$/i.test(raw) ||
   event?.inlineAction==='direct:agree'
}
const MESSAGES=Object.freeze({
 en:{
  consent:'Holistic House · Message the practitioner. Tap /agree to let the practitioner answer you here and in your linked Holistic House Cabinet. No newsletters or marketing. Do not send medical records or test results in Telegram. /stop ends contact.',
  ready:'Confirmed. You can now write your message here; it goes to the practitioner’s private Holistic House CRM. After linking this Telegram identity in Cabinet Settings, you can read the same conversation on the site. /stop ends contact.',
  resume:'Your messenger contact is already confirmed. Write your message here or link Telegram in Cabinet Settings to continue on the site.',
  needs:'To write to the practitioner, first tap /agree. You can choose /stop instead.',
  stopped:'Contact stopped. No messages will be forwarded. A new verified connection requires a separate support review; /agree does not automatically undo a blocked chat.',
  text:'Please write a short text message. Do not send private medical records through Telegram.',
 },
 ru:{
  consent:'Holistic House · Написать мастеру. Нажмите /agree, чтобы разрешить мастеру отвечать здесь и в связанном кабинете Holistic House. Без рассылок и рекламы. Не отправляйте в Telegram медицинские документы или анализы. /stop — прекратить связь.',
  ready:'Подтверждено. Теперь напишите мастеру здесь — сообщение попадёт в защищённую CRM Holistic House. После привязки Telegram в настройках кабинета та же переписка будет доступна на сайте. /stop — прекратить связь.',
  resume:'Связь через Telegram уже подтверждена. Напишите сообщение здесь или привяжите Telegram в настройках кабинета, чтобы продолжить на сайте.',
  needs:'Чтобы написать мастеру, сначала нажмите /agree. Или используйте /stop.',
  stopped:'Связь прекращена, сообщения не пересылаются. Для нового подтверждённого подключения потребуется отдельная проверка поддержкой; /agree не снимает блокировку автоматически.',
  text:'Напишите короткое текстовое сообщение. Не отправляйте медицинские документы через Telegram.',
 },
 es:{
  consent:'Holistic House · Escribir al profesional. Pulsa /agree para permitir respuestas aquí y en tu gabinete vinculado de Holistic House. Sin publicidad ni boletines. No envíes informes médicos ni análisis en Telegram. /stop cancela el contacto.',
  ready:'Confirmado. Ya puedes escribir aquí al profesional; tu mensaje se guarda en el CRM privado de Holistic House. Vincula Telegram en los ajustes para ver la misma conversación en el sitio. /stop cancela el contacto.',
  resume:'Tu contacto por Telegram ya está verificado. Escribe aquí o vincula Telegram en el gabinete para continuar en el sitio.',
  needs:'Para escribir al profesional, pulsa primero /agree. También puedes usar /stop.',
  stopped:'Contacto cancelado. No se reenviarán mensajes. Una nueva conexión verificada requiere revisión de soporte; /agree no elimina el bloqueo automáticamente.',
  text:'Escribe un mensaje breve de texto. No envíes informes médicos por Telegram.',
 }
})
export function telegramDirectChatPrompt(locale,kind){
 const lang=LOCALES.has(locale)?locale:'en'
 return MESSAGES[lang][kind]||null
}
