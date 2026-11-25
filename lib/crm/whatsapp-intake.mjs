// WhatsApp uses the owner-approved six-stage Telegram text, not a second CRM.
import {transitionTelegramDiagnosticV2} from './telegram-diagnostic-v2.mjs'
import {whatsappExpressReviewLocale} from './express-review-channel-handoff.mjs'
import {whatsappServiceIntakeEvent} from './whatsapp-service-intake.mjs'

export const WA_INTAKE_STAGES=Object.freeze(['consent','focus','photo','question','drawing','done','stopped'])
const START=/^(?:start|старт|iniciar)$/i
const STOP=/^(?:\/?stop|стоп|остановить|parar|detener)$/i
// A greeting, question about a paid service, or an ordinary chat cannot
// enroll anyone in the personal six-stage diagnostic. Only the real site
// marker or a clear customer-authored request starts its consent screen.
export function whatsappFreeReviewRequested(text){
 if(typeof text!=='string'||!text.trim()||text.length>1200)return false
 if(whatsappExpressReviewLocale(text))return true
 const raw=text.trim()
 if(/^\/(?:free[_-]?review|express[_-]?review|review|diagnostic)$/.test(raw.toLowerCase()))return true
 if(raw.length>180)return false
 const free=/(?:\bfree\s+(?:express\s+)?(?:review|diagnostic|assessment)\b|бесплатн[а-яё]*\s+(?:(?:экспресс[- ])?)(?:диагностик[а-яё]*|разбор[а-яё]*)|(?:revisi[oó]n|diagn[oó]stico)\s+gratuit[ao])/iu
 const request=/(?:\b(?:i want|i'd like|i would like|please start|start|request|book)\b|(?:хочу|пройти|начать|мне нужна|можно пройти|записаться)|(?:quiero|solicito|empezar|iniciar))/iu
 if(free.test(raw)&&request.test(raw))return true
 return /^(?:free (?:express )?(?:review|diagnostic|assessment)|бесплатн[а-яё]*\s+(?:(?:экспресс[- ])?)(?:диагностик[а-яё]*|разбор[а-яё]*)|(?:revisi[oó]n|diagn[oó]stico)\s+gratuit[ao])$/iu.test(raw)
}
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
    && ((env.HH_CRM_MSG_PRODUCTION_APPROVED==='true'&&
         env.HH_CRM_WA_DIAGNOSTIC_PUBLIC_ENABLED==='true')
      || (env.VERCEL_ENV==='production'&&env.HH_CRM_MSG_PRODUCTION_APPROVED!=='true'&&
         env.HH_CRM_MSG_WHATSAPP_PILOT_ENABLED==='true'))
}
export function whatsappIntakeEvent(session,event){
  const original=String(event?.rawText||'').trim()
  // A free-review customer may accept in their own language even when the
  // language-neutral /free_review command defaulted to English. Respect only
  // an explicit consent-stage reply; never reinterpret later private stages.
  const consentLocale=session?.stage==='consent'
    ?(/^(?:да(?:[, ]+начинаем)?|начинаем)$/iu.test(original)?'ru'
      :/^(?:s[ií](?:[, ]+empezamos)?|empezamos)$/iu.test(original)?'es':null)
    :null
  const locale=consentLocale||whatsappIntakeLocale(original,session?.locale||event?.locale)
  const rawText=STOP.test(original)?'/stop':
    (!session||START.test(original))?'/start':original
  // Meta sends only a media ID in the webhook; the owner-only media proxy
  // verifies true MIME and size separately before downloading photo bytes.
  const mediaId=String(event?.photoFileId||'')
  const service=whatsappServiceIntakeEvent(session,{...event,locale,rawText:original})
  if(service)return service
  if(!session&&!STOP.test(original)&&!whatsappFreeReviewRequested(original))
    return {handled:false,locale}
  const next=transitionTelegramDiagnosticV2(consentLocale?{...session,locale}:session,{
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
