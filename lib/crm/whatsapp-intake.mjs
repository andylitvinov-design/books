// WhatsApp uses the owner-approved six-stage Telegram text, not a second CRM.
import {transitionTelegramDiagnosticV2} from './telegram-diagnostic-v2.mjs'
import {whatsappExpressReviewLocale} from './express-review-channel-handoff.mjs'

export const WA_INTAKE_STAGES=Object.freeze(['consent','focus','photo','question','drawing','done','stopped'])
const START=/^(?:start|старт|iniciar)$/i
const STOP=/^(?:\/?stop|стоп|остановить|parar|detener)$/i
export function whatsappIntakeLocale(text,previous=null){
  const websiteLocale=whatsappExpressReviewLocale(String(text||''))
  if(websiteLocale)return websiteLocale
  if(['en','ru','es'].includes(previous))return previous
  if(/[А-Яа-яЁё]/.test(text||''))return 'ru'
  if(/\b(?:hola|español|espanol)\b/i.test(text||''))return 'es'
  return 'en'
}
export function whatsappIntakeReady(env=process.env){
  return env.HH_CRM_WA_DIAGNOSTIC_ENABLED==='true'
    && env.HH_CRM_MSG_WHATSAPP_ENABLED==='true'
    && (env.HH_CRM_MSG_PRODUCTION_APPROVED==='true'
      || (env.VERCEL_ENV==='production'&&env.HH_CRM_MSG_WHATSAPP_PILOT_ENABLED==='true'))
}
export function whatsappIntakeEvent(session,event){
  const original=String(event?.rawText||'').trim()
  const locale=whatsappIntakeLocale(original,session?.locale||event?.locale)
  const rawText=STOP.test(original)?'/stop':
    (!session||START.test(original))?'/start':original
  // Meta sends only a media ID in the webhook; the owner-only media proxy
  // verifies true MIME and size separately before downloading photo bytes.
  const mediaId=String(event?.photoFileId||'')
  const next=transitionTelegramDiagnosticV2(session,{
    ...event,locale,rawText,
    photoBytes:/^\d{10,40}$/.test(mediaId)?1:0,
  })
  if(!next.reply)return next
  const replace={en:'Telegram',ru:'Telegram',es:'Telegram'}
  return {...next,reply:next.reply
    .replaceAll(replace[locale], 'WhatsApp')
    .replaceAll('Через этот бот','В этом WhatsApp-чате')
    .replaceAll('в этом боте','в этом чате')
    .replaceAll('снова нажми Start','напиши «Старт»')
    .replaceAll('press Start in this bot','write START in this chat')
    .replaceAll('pulsa Start en este bot','escribe START aquí')}
}
