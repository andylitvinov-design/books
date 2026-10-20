// Self-entered client phone: storage permission ONLY. It is never SMS consent,
// verified possession, CRM lead identity, or permission to call/send messages.
export const PHONE_STORAGE_CONSENT_VERSION='client-contact-phone-v1'
const E164=/^\+[1-9][0-9]{7,14}$/
export function normalizeClientPhone(raw){
 if(typeof raw!=='string'||raw.length>40||/[\r\n\x00-\x1f\x7f]/.test(raw))
  throw new Error('INVALID_CONTACT_PHONE')
 const phone=raw.replace(/[\s().-]/g,'')
 if(!E164.test(phone))throw new Error('INVALID_CONTACT_PHONE')
 return phone
}
export function validateClientPhoneSave(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||
   Object.keys(input).some(k=>!['action','phone','storageConsent','consentVersion'].includes(k))||
   input.action!=='save'||input.storageConsent!==true||
   input.consentVersion!==PHONE_STORAGE_CONSENT_VERSION)
  throw new Error('PHONE_STORAGE_CONSENT_REQUIRED')
 return {phone:normalizeClientPhone(input.phone),consentVersion:PHONE_STORAGE_CONSENT_VERSION}
}
export function validateClientPhoneRemoval(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||
  Object.keys(input).length!==1||input.action!=='remove')
  throw new Error('INVALID_PHONE_REMOVAL')
 return true
}
export function maskClientPhone(lastFour){
 return /^[0-9]{4}$/.test(lastFour||'')?'••• ••• '+lastFour:''
}
