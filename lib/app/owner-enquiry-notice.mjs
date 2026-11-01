import {normalizeEnquiryAttribution} from '../analytics/enquiry-attribution.mjs'
import {verifiedEnquiryPath,verifiedEnquiryServiceTitle} from '../analytics/enquiry-public-catalog.mjs'

const translations={
 ru:{title:'📩 Holistic House · новая заявка',service:'Услуга',date:'Дата заявки',landing:'Первая записанная после согласия страница по данным браузера',
  source:'Источник по данным браузера',conversion:'Страница заявки по данным браузера',previous:'Предыдущая страница по данным браузера',campaign:'Кампания по данным браузера',
  reference:'Номер заявки',contact:'Контакт',guest:'пока не оставлен',provided:'оставлен на сайте',
  unknown:'не определён / нет согласия на аналитику',unknownService:'См. услугу в кабинете'},
 en:{title:'📩 Holistic House · new enquiry',service:'Service',date:'Enquiry date',landing:'First browser-reported page recorded after consent',
  source:'Browser-reported source',conversion:'Browser-reported enquiry page',previous:'Previous browser-reported page',campaign:'Browser-reported campaign',
  reference:'Reference',contact:'Contact',guest:'not provided yet',provided:'submitted on site',
  unknown:'unknown / no analytics consent',unknownService:'See service in account'},
 es:{title:'📩 Holistic House · nueva solicitud',service:'Servicio',date:'Fecha de solicitud',landing:'Primera página indicada por el navegador tras el consentimiento',
  source:'Origen indicado por el navegador',conversion:'Página de solicitud indicada por el navegador',previous:'Página anterior indicada por el navegador',campaign:'Campaña indicada por el navegador',
  reference:'Referencia',contact:'Contacto',guest:'todavía no proporcionado',provided:'enviado por web',
  unknown:'desconocido / sin consentimiento',unknownService:'Ver servicio en la cuenta'},
}
export function ownerEnquiryNotice({locale='ru',enquiry}={}){
 const language=['ru','en','es'].includes(locale)?locale:'ru'
 const t=translations[language]
 const input=enquiry&&typeof enquiry==='object'?enquiry:{}
 const path=verifiedEnquiryPath(input.sourcePath)||null
 const attribution=normalizeEnquiryAttribution(input.attribution)
 const ref=/^HH-[A-F0-9]{12}$/.test(input.referenceCode||'')?input.referenceCode:null
 const date=input.createdAt instanceof Date?input.createdAt:new Date(input.createdAt||'')
 const lines=[
  t.title,
  t.service+': '+(verifiedEnquiryServiceTitle(input.serviceTitle)||t.unknownService),
  t.conversion+': '+(path||'—'),
  t.source+': '+(attribution?.trafficSource||t.unknown),
 ]
 if(Number.isFinite(date.getTime()))lines.splice(2,0,t.date+': '+
  new Intl.DateTimeFormat(language,{dateStyle:'medium',timeStyle:'short',timeZone:'America/Toronto'}).format(date))
 if(attribution?.landingPath)lines.push(t.landing+': '+attribution.landingPath)
 if(attribution?.previousPath)lines.push(t.previous+': '+attribution.previousPath)
 if(attribution?.campaign)lines.push(t.campaign+': '+attribution.campaign)
 if(ref)lines.push(t.reference+': '+ref)
 lines.push(t.contact+': '+(input.hasContact===true?t.provided:t.guest))
 lines.push('https://holistichouse.vercel.app/'+language+'/app/practice?panel=requests')
 return lines.join('\n')
}
