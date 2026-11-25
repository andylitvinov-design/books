import {prepareManualSms} from '../crm/manual-sms.js'

// An expressly chosen reply channel is only for one concrete enquiry.
// Refuse if SMS STOP or owner global suppression is unresolved/active.
const WORDS={
 en:'Thank you for your enquiry to Holistic House. Which day works for a short call?',
 ru:'Спасибо за обращение в Holistic House. Какой день удобен для короткого звонка?',
 es:'Gracias por contactar Holistic House. ¿Qué día le conviene una llamada breve?',
}
export function prepareRequestedEnquirySms(item){
 if(!item||item.replyChannel!=='sms'||item.contactConsent!=='business-reply-only-v1'||
    item.smsReplyBlocked!==false||typeof item.phone!=='string')
  throw new Error('ENQUIRY_SMS_NOT_ELIGIBLE')
 return prepareManualSms({phone:item.phone,body:WORDS[item.locale]||WORDS.en})
}
