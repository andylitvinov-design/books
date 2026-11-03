import { validateMessageText } from './messenger-policy.js'
import { formatSmsText, smsMessageEstimate } from './sms-text.js'

// Device-originated SMS costs the sender's own mobile plan, not a CRM provider.
// RFC 5724 allows ?body, but Apple iOS SMS links must contain NO message text.
// Therefore the URL contains ONLY the recipient; the owner copies the body.
export const MANUAL_SMS_MAX_RECIPIENTS = 20
const E164 = /^\+[1-9]\d{7,14}$/

export function manualSmsEligible(contact) {
  return Boolean(contact && typeof contact.id === 'string' &&
    E164.test(contact.phone || '') &&
    contact.smsEligibility?.allowed === true &&
    contact.suppressed !== true && contact.lifecycle !== 'archived')
}

export function prepareManualSms({phone, body}) {
  if (!E164.test(phone || '')) throw new Error('MANUAL_SMS_INVALID_PHONE')
  let message
  try { message = validateMessageText(body) }
  catch(error) {
    throw new Error(error.message === 'PRIVATE_CONTENT_BLOCKED' ?
      'PRIVATE_CONTENT_BLOCKED' : 'MANUAL_SMS_INVALID_TEXT')
  }
  if (message.length < 3 || message.length > 240) throw new Error('MANUAL_SMS_INVALID_TEXT')
  const estimate = smsMessageEstimate(message)
  if (!estimate.valid) throw new Error('MANUAL_SMS_TOO_LONG')
  return {
    phone, body:message, text:formatSmsText(message),
    segments:estimate.segments, encoding:estimate.encoding,
    // No body, contact identifiers, consent data, or private links in the URL.
    href:'sms:'+phone,
  }
}

export function buildManualSmsQueue(contacts, ids, body) {
  if(!Array.isArray(contacts) || !Array.isArray(ids) ||
     ids.length > MANUAL_SMS_MAX_RECIPIENTS ||
     ids.some(id=>typeof id !== 'string'))
    throw new Error('MANUAL_SMS_INVALID_SELECTION')
  const selected = new Set(ids)
  if(selected.size !== ids.length) throw new Error('MANUAL_SMS_INVALID_SELECTION')
  const seen = new Set(), queue=[]
  for(const contact of contacts){
    if(!selected.has(contact?.id))continue
    if(!manualSmsEligible(contact))throw new Error('MANUAL_SMS_CONTACT_INELIGIBLE')
    if(seen.has(contact.phone))throw new Error('MANUAL_SMS_DUPLICATE_PHONE')
    seen.add(contact.phone)
    const sms=prepareManualSms({phone:contact.phone,body})
    queue.push({id:contact.id,name:contact.displayName||contact.phone,...sms})
  }
  if(queue.length !== selected.size)throw new Error('MANUAL_SMS_CONTACT_NOT_LOADED')
  return queue
}

// Contact-picker readback ignores ineligible contacts and duplicate numbers;
// it does not infer opt-in from a phone number, account, booking or paid plan.
export function listManualSmsCandidates(contacts) {
  if(!Array.isArray(contacts))return []
  const seen=new Set()
  return contacts.filter(contact=>{
    if(!manualSmsEligible(contact)||seen.has(contact.phone))return false
    seen.add(contact.phone)
    return true
  })
}
