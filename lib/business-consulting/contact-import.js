import {validateContactInput} from '../crm/consent.js'

// An anonymous public enquiry permits a reply to that enquiry only. It is not
// an OTP, SMS/WhatsApp subscription, or a verified Cabinet identity.
export function businessContactFromEnquiry(payload,locale){
 if(payload?.contactConsent!=='business-reply-only-v1')
  throw new Error('BUSINESS_CONTACT_NO_REPLY_PERMISSION')
 return validateContactInput({
  displayName:payload.name,
  email:payload.email,
  phone:payload.phone,
  locale,
  lifecycle:'lead',
  source:'website',
 })
}
