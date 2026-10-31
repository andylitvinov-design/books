import {normalizeEnquiryAttribution} from '../analytics/enquiry-attribution.mjs'
import {safePublicPagePath} from '../analytics/public-page-traffic.mjs'

const translations={
 ru:{title:'📩 Holistic House · новая заявка',service:'Услуга',landing:'Первая зафиксированная страница',
  source:'Источник перехода',conversion:'Страница заявки',previous:'Предыдущая страница',campaign:'Кампания',
  reference:'Номер заявки',contact:'Контакт',guest:'пока не оставлен',provided:'оставлен на сайте',
  unknown:'не определён / нет согласия на аналитику',unknownService:'См. услугу в кабинете'},
 en:{title:'📩 Holistic House · new enquiry',service:'Service',landing:'First recorded page',
  source:'Traffic source',conversion:'Enquiry page',previous:'Previous page',campaign:'Campaign',
  reference:'Reference',contact:'Contact',guest:'not provided yet',provided:'submitted on site',
  unknown:'unknown / no analytics consent',unknownService:'See service in account'},
 es:{title:'📩 Holistic House · nueva solicitud',service:'Servicio',landing:'Primera página registrada',
  source:'Origen del tráfico',conversion:'Página de solicitud',previous:'Página anterior',campaign:'Campaña',
  reference:'Referencia',contact:'Contacto',guest:'todavía no proporcionado',provided:'enviado por web',
  unknown:'desconocido / sin consentimiento',unknownService:'Ver servicio en la cuenta'},
}
function safeServiceLabel(value){
 if(typeof value!=='string'||value.length>115||value.trim().length<3||
  /[\u0000-\u001f\u007f@<>]/.test(value)||
  /(?:https?:\/\/|www\.|(?:\+?\d[\s().-]*){7,})/i.test(value))return null
 // Public offer labels only. Do not relay arbitrary prose, phone numbers,
 // email addresses or links from an untrusted visitor into the owner bot.
 if(!/^[\p{L}\p{N}€$][\p{L}\p{N}\s€$.,·:()/+—–_-]*$/u.test(value))return null
 return value.trim()
}
export function ownerEnquiryNotice({locale='ru',enquiry}={}){
 const language=['ru','en','es'].includes(locale)?locale:'ru'
 const t=translations[language]
 const input=enquiry&&typeof enquiry==='object'?enquiry:{}
 const path=safePublicPagePath(input.sourcePath)||null
 const attribution=normalizeEnquiryAttribution(input.attribution)
 const ref=/^HH-[A-F0-9]{12}$/.test(input.referenceCode||'')?input.referenceCode:null
 const lines=[
  t.title,
  t.service+': '+(safeServiceLabel(input.serviceTitle)||t.unknownService),
  t.conversion+': '+(path||'—'),
  t.source+': '+(attribution?.trafficSource||t.unknown),
 ]
 if(attribution?.landingPath)lines.push(t.landing+': '+attribution.landingPath)
 if(attribution?.previousPath)lines.push(t.previous+': '+attribution.previousPath)
 if(attribution?.campaign)lines.push(t.campaign+': '+attribution.campaign)
 if(ref)lines.push(t.reference+': '+ref)
 lines.push(t.contact+': '+(input.hasContact===true?t.provided:t.guest))
 lines.push('https://holistichouse.vercel.app/'+language+'/app/practice?panel=requests')
 return lines.join('\n')
}
