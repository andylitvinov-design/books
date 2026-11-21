// A service selected on the public website is not the express-review journey.
// Reuse the same verified service names and V2 informed reply consent.
import {parseTelegramServiceDraft,telegramBusinessServiceTitle,telegramBusinessClientChoice} from '../assist/telegram-business-request.mjs'
import {transitionTelegramDiagnosticV2} from './telegram-diagnostic-v2.mjs'

const STOP=/^(?:\/?stop|стоп|остановить|parar|detener)$/i
const COMMAND=/^\/[a-z_]+(?:@[A-Za-z0-9_]+)?/i
// A first-party public WhatsApp draft is the client's selected service,
// not a booking, Meta account proof, or permission for private questions.
const PUBLIC_DRAFTS=Object.freeze({
 en:{header:'Holistic House — service enquiry',service:'Service: ',request:'Request: '},
 ru:{header:'Holistic House — запрос по услуге',service:'Услуга: ',request:'Запрос: '},
 es:{header:'Holistic House — solicitud de servicio',service:'Servicio: ',request:'Solicitud: '},
})
const PUBLIC_SERVICE_KEYS=Object.freeze(['homeopathy','coaching','reiki','constellations','business'])
export function parseWhatsAppSiteServiceDraft(text){
 if(typeof text!=='string'||!text||text.length>1200)return null
 const lines=text.split(/\r?\n/).map(s=>s.trim())
 const matches=[]
 for(const [locale,draft] of Object.entries(PUBLIC_DRAFTS)){
  if(!lines.includes(draft.header))continue
  const service=lines.filter(line=>line.startsWith(draft.service))
  const requests=lines.filter(line=>line.startsWith(draft.request))
  if(service.length!==1||requests.length!==1||
     !requests[0].slice(draft.request.length).trim())continue
  const named=PUBLIC_SERVICE_KEYS.filter(key=>
   telegramBusinessServiceTitle(key,locale)===service[0].slice(draft.service.length))
  if(named.length===1)matches.push({service:named[0],locale})
 }
 return matches.length===1?matches[0]:null
}
const copy={
 ru:{yes:'Да, начинаем',format:['Онлайн','Лично','Письменно'],
  intro:n=>'Вы выбрали «'+n+'». Я помогу передать запрос мастеру через WhatsApp. Ответы будут сохранены в защищённой CRM, без маркетинговых рассылок. Не присылайте медицинские документы. Начнём?',
  formatAsk:n=>'Для услуги «'+n+'» какой формат удобнее: онлайн, лично или письменно?',
  goal:'Какая главная задача или цель? Напишите 1–2 предложения без медицинских подробностей.',
  again:'Опишите задачу чуть подробнее (от 12 символов), без медицинских подробностей.',
  choose:'Выберите формат: онлайн, лично или письменно.',
  done:'Спасибо! Ваш запрос сохранён в CRM для мастера. Он сможет ответить в этом WhatsApp-чате. Время и оплата пока не подтверждены.',
  later:'Пока запрос не сохраняю. Чтобы продолжить, напишите «Да, начинаем».'},
 en:{yes:"Yes, let's begin",format:['Online','In person','Written'],
  intro:n=>'You selected “'+n+'”. I can help prepare your request for a practitioner in WhatsApp. Your answers will be stored in the secure CRM, with no marketing opt-in. Please do not send medical records. Shall we begin?',
  formatAsk:n=>'For “'+n+'”, do you prefer online, in person or written support?',
  goal:'What is your main goal? Please write 1–2 sentences without medical details.',
  again:'Please describe your goal in at least 12 characters, without medical details.',
  choose:'Choose online, in person or written support.',
  done:'Thank you! Your request was saved to the practitioner CRM. A human can reply here in WhatsApp. No appointment or payment has been confirmed.',
  later:'Nothing has been saved yet. Reply “Yes, let’s begin” to continue.'},
 es:{yes:'Sí, empezamos',format:['En línea','Presencial','Por escrito'],
  intro:n=>'Elegiste «'+n+'». Puedo preparar tu solicitud en WhatsApp. Las respuestas se guardarán en el CRM privado, sin suscripción comercial. No envíes documentos médicos. ¿Empezamos?',
  formatAsk:n=>'Para «'+n+'», ¿prefieres en línea, presencial o por escrito?',
  goal:'¿Cuál es tu objetivo principal? Escríbelo en 1–2 frases sin datos médicos.',
  again:'Describe tu objetivo en al menos 12 caracteres, sin datos médicos.',
  choose:'Elige en línea, presencial o por escrito.',
  done:'¡Gracias! La solicitud se guardó en el CRM para el profesional. Puede responderte aquí en WhatsApp. No hay reserva ni pago confirmado.',
  later:'Aún no he guardado nada. Responde «Sí, empezamos» para continuar.'},
}
function result(stage,locale,serviceKey,deliveryFormat=null,extra={}){
 return {handled:true,stage,locale,topic:null,serviceKey,deliveryFormat,
   consent:false,body:null,reply:null,keyboard:[],stop:false,...extra}
}
export function whatsappServiceIntakeEvent(session,event){
 const raw=String(event?.rawText||'').trim()
 const selected=parseTelegramServiceDraft(raw)||parseWhatsAppSiteServiceDraft(raw)
 if(!selected&&!session?.serviceKey)return null
 const serviceKey=selected?.service||session.serviceKey
 const locale=selected?.locale||(copy[session?.locale]?session.locale:'en')
 const title=telegramBusinessServiceTitle(serviceKey,locale)
 if(!title)return null
 const t=copy[locale],format=session?.deliveryFormat||null
 if(session?.stage==='stopped')return result('stopped',locale,serviceKey,format)
 if(STOP.test(raw)){
  const stop=Boolean(session?.consentAt)
  return result('stopped',locale,serviceKey,format,{stop,body:stop?'/stop':null})
 }
 if(selected||(/^start(?: again)?$/i.test(raw)&&session?.stage==='done'))
  return result('consent',locale,serviceKey,null,{
   reply:t.intro(title),keyboard:[[t.yes]],serviceStart:true,
  })
 if(session?.stage==='consent'){
  const check=transitionTelegramDiagnosticV2(
   {stage:'consent',locale},{...event,locale,rawText:raw})
  if(check.consent===true)
   return result('focus',locale,serviceKey,null,{
    consent:true,body:'One-time WhatsApp CRM reply consent; service: '+title,
    reply:t.formatAsk(title),keyboard:[t.format],
   })
  return result('consent',locale,serviceKey,null,{
   reply:/^(не сейчас|not now|ahora no)$/i.test(raw)?t.later:t.intro(title),
   keyboard:[[t.yes]],
  })
 }
 if(session?.stage==='focus'){
  const choice=telegramBusinessClientChoice(raw)
  if(choice?.kind!=='format')
   return result('focus',locale,serviceKey,null,{reply:t.choose,keyboard:[t.format]})
  return result('question',locale,serviceKey,choice.value,{
   body:'Selected WhatsApp service format: '+choice.value,reply:t.goal,
  })
 }
 if(session?.stage==='question'){
  if(raw.length<12||raw.length>900||COMMAND.test(raw)||event?.photoFileId)
   return result('question',locale,serviceKey,format,{reply:t.again})
  return result('done',locale,serviceKey,format,{
   body:'Service: '+title+'; format: '+(format||'unspecified')+'; request: '+raw,
   reply:t.done,
  })
 }
 if(session?.stage==='done'){
  if(/^\/retry_request$/i.test(raw))return result('done',locale,serviceKey,format,{retry:true})
  if(raw&&!COMMAND.test(raw)&&!event?.photoFileId)
   return result('done',locale,serviceKey,format,{body:raw.slice(0,1200)})
  return result('done',locale,serviceKey,format)
 }
 return result('consent',locale,serviceKey,null,{
  reply:t.intro(title),keyboard:[[t.yes]],
 })
}
