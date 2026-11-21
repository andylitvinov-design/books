// WhatsApp text presentation over the SAME approved Secretary catalogue as Telegram.
// No LLM calls with customer text, unapproved prices, templated sales, or new links.
import {classifyTelegramSecretaryQuery,composeTelegramSecretaryAnswer,composeTelegramSecretaryClarification} from './telegram-secretary-offers.mjs'
import {whatsappFreeReviewRequested} from './whatsapp-intake.mjs'
import {parseWhatsAppSiteServiceDraft} from './whatsapp-service-intake.mjs'
import {parseTelegramServiceDraft} from '../assist/telegram-business-request.mjs'

export function whatsappSecretaryQuery(text,locale){
 if(typeof text!=='string')return null
 const raw=text.trim()
 if(!raw||raw.length>1200||
    /^(?:\/?stop|стоп|остановить|parar|detener|unsubscribe|отписаться)$/iu.test(raw)||
    /^HHWA(?:\s|$)/i.test(raw)||
    whatsappFreeReviewRequested(raw)||
    parseTelegramServiceDraft(raw)||parseWhatsAppSiteServiceDraft(raw))return null
 // A signed, ordinary first message is a Secretary conversation, never a
 // hidden invitation to six stages of personal diagnostics.
 const language=['ru','en','es'].includes(locale)?locale:'en'
 if(/^(?:hi|hello|hey|привет|здравствуйте|добрый день|hola|buenas)[!.? ]*$/iu.test(raw))
  return {kind:'welcome',locale:language}
 return classifyTelegramSecretaryQuery(raw,language)||
  (composeTelegramSecretaryClarification(raw,language)?{kind:'clarify_unknown',locale:language,raw}:null)
}
export function whatsappSecretaryPublicAnswer(query,services=[]){
 if(!query)return null
 if(query.kind==='clarify_unknown'){
  const clarified=composeTelegramSecretaryClarification(query.raw,query.locale);
  return clarified?{text:clarified.text,locale:query.locale,kind:'clarify'}:null;
 }
 if(query.kind==='welcome'){
  const copy={
   ru:'Здравствуйте! Я Ali, помощник Holistic House. По какой услуге или вопросу вы обращаетесь?',
   en:'Hello! I’m Ali, the Holistic House assistant. Which service or question can I help you with?',
   es:'¡Hola! Soy Ali, asistente de Holistic House. ¿Por qué servicio o consulta nos escribes?',
  }
  const locale=['ru','en','es'].includes(query.locale)?query.locale:'en'
  return {text:copy[locale],locale,kind:'welcome'}
 }
 const planned=composeTelegramSecretaryAnswer(query,services)
 if(!planned?.handled||typeof planned.text!=='string')return null
 const links=(planned.buttons||[]).filter(b=>b&&typeof b.url==='string'&&
   b.url.startsWith('https://holistichouse.vercel.app/'+query.locale+'/')&&
   !/[?#]/.test(b.url)&&b.url.length<=240).slice(0,3)
 const linkText=links.map((b,i)=>(i+1)+'. '+b.url).join('\n')
 const human=query.locale==='ru'?
  '\n\nДля личного ответа напишите «Хочу консультацию».':
  query.locale==='es'?
   '\n\nPara hablar con una persona, escribe «Quiero consulta».':
   '\n\nFor a human response, write “I want a consultation”.'
 const text=planned.text+(linkText?'\n'+linkText:'')+human
 return {text:text.length<=1200?text:planned.text.slice(0,1150),
   locale:query.locale,kind:planned.kind}
}
