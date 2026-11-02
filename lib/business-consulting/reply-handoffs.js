import {safeManualMailto} from '../crm/free-email.js'
import {prepareRequestedEnquirySms} from './reply-policy.js'

const E164=/^\+[1-9]\d{7,14}$/
const EMAIL=/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

// All links are deliberately recipient-only. Opening a native app is not a
// provider dispatch or proof of delivery; never infer marketing permission.
export function prepareRequestedEnquiryHandoff(item){
 if(!item || item.contactConsent!=='business-reply-only-v1' ||
    item.replyBlocked===true)throw new Error('ENQUIRY_REPLY_NOT_ELIGIBLE')
 if(item.replyChannel==='sms')return {
  channel:'sms',...prepareRequestedEnquirySms(item),
 }
 if(item.replyBlocked!==false)
  throw new Error('ENQUIRY_REPLY_NOT_ELIGIBLE')
 if(item.replyChannel==='email' && typeof item.email==='string' &&
    EMAIL.test(item.email) && item.email.length<=254)
  return {channel:'email',href:safeManualMailto(item.email)}
 if(item.replyChannel==='phone' && E164.test(item.phone||''))
  return {channel:'phone',href:'tel:'+item.phone}
 if(item.replyChannel==='whatsapp' && E164.test(item.phone||''))
  return {channel:'whatsapp',href:'https://wa.me/'+item.phone.slice(1)}
 throw new Error('ENQUIRY_REPLY_NOT_ELIGIBLE')
}
