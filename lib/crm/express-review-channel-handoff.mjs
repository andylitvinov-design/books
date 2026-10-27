// Static, privacy-safe locale handoff for the *existing* personal WhatsApp
// contact. It is NOT a WhatsApp Cloud API automation or an appointment.
// A message is created only when the visitor presses Send in WhatsApp.
import {whatsappEnquiryUrl} from '../whatsapp-enquiry.js'

export const EXPRESS_REVIEW_LOCALES = Object.freeze(['en','ru','es'])
const COPY=Object.freeze({
  en:{
    service:'Free written express review with Andrey',
    request:'HHREVIEW_EN — Please guide me through your approved six-step personal express review in English. One reply about this enquiry only, no marketing.',
    option:'English (EN)',
  },
  ru:{
    service:'Бесплатная личная экспресс-диагностика с Андреем',
    request:'HHREVIEW_RU — Хочу пройти ранее утверждённый сценарий из шести шагов на русском языке. Только личный ответ по запросу, без рекламы.',
    option:'Русский (RU)',
  },
  es:{
    service:'Revisión personal exprés gratuita con Andrey',
    request:'HHREVIEW_ES — Quiero seguir el diálogo personal aprobado de seis pasos en español. Solo una respuesta personal, sin publicidad.',
    option:'Español (ES)',
  },
})

export function whatsappExpressReviewHandoff(locale){
  if(!EXPRESS_REVIEW_LOCALES.includes(locale))return null
  const message=COPY[locale]
  return whatsappEnquiryUrl({
    locale,service:message.service,request:message.request,option:message.option,
    pagePath:'/'+locale+'/services/free-situation-review',
  })
}

// Called exclusively *after* Meta's signed webhook has been verified.
// The original static site's language is carried in the customer-sent request,
// not inferred from their phone's language or a private tracking identifier.
// A WhatsApp message is still a MANUAL enquiry, never a bot enrollment.
export function whatsappExpressReviewLocale(text){
  if(typeof text!=='string'||text.length>1200)return null
  const match=/^(Request|Запрос|Solicitud):[ \t]*HHREVIEW_(EN|RU|ES)[ \t]+[—-][ \t]+/mi.exec(text)
  if(!match)return null
  const locale=match[2].toLowerCase()
  const label={en:'Request',ru:'Запрос',es:'Solicitud'}[locale]
  return match[1]===label?locale:null
}
