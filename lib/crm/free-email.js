// Local-only preparation for business email via the owner's installed mail app.
// No recipient data is sent to a new API. This does NOT verify delivery.
const EMAIL=/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/
const BAD=/[\u0000-\u001f\u007f]/
export const FREE_EMAIL_MAX_RECIPIENTS=20
const MAIL_FOOTER=Object.freeze({
 en:'Holistic House\nhttps://holistichouse.vercel.app\nTo stop receiving updates, reply "Unsubscribe".',
 ru:'Holistic House\nhttps://holistichouse.vercel.app\nЧтобы отказаться от рассылки, ответьте «Отписаться».',
 es:'Holistic House\nhttps://holistichouse.vercel.app\nPara dejar de recibir novedades, responde «Baja».',
})
// Keep URI reserved characters out of mailto headers even if an unusual valid
// email address contains characters such as '?' or '#'.
export function safeManualMailto(email){
 return 'mailto:'+encodeURIComponent(email).replace(/%40/gi,'@')
}
export function formatFreeEmailBody(body,locale='en'){
 return body.trim()+'\n\n'+(MAIL_FOOTER[locale]||MAIL_FOOTER.en)
}
export function freeEmailEligible(contact){
 return !!contact && typeof contact.email==='string' && contact.email.length<=254 &&
  !BAD.test(contact.email) && EMAIL.test(contact.email) &&
  contact.emailVerified===true && contact.emailEligibility?.allowed===true &&
  contact.suppressed!==true && contact.lifecycle!=='archived'
}
export function eligibleFreeEmailContacts(contacts){
 if(!Array.isArray(contacts))return []
 const seen=new Set()
 return contacts.filter(contact=>{
  if(!freeEmailEligible(contact))return false
  const key=contact.email.toLowerCase()
  if(seen.has(key))return false
  seen.add(key);return true
 })
}
export function prepareFreeEmail(contact,subject,body,locale='en'){
 if(!freeEmailEligible(contact))throw new Error('FREE_EMAIL_CONSENT_REQUIRED')
 if(typeof subject!=='string'||!subject.trim()||subject.length>120||BAD.test(subject))
  throw new Error('FREE_EMAIL_INVALID_SUBJECT')
 if(typeof body!=='string'||body.trim().length<5||body.length>2000||
   /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body))
  throw new Error('FREE_EMAIL_INVALID_BODY')
 // No confidential report links or diagnostic data in an outbound campaign draft.
 if(/\b(?:diagnos(?:is|es)|prescription|dosage|lab results|patient report)\b|(?:диагноз|рецепт|назначени[ея]|результат[ы]? анализ)/i.test(body)||
   /https?:\/\/[^\s]+#[A-Za-z0-9_-]{12,}/.test(body))
  throw new Error('FREE_EMAIL_PRIVATE_CONTENT')
 // An identifying web link and reply-based unsubscribe instruction are added
 // regardless of the edited draft. Owner must still verify legally required
 // physical contact details and manually honor opt-outs: no inbox API is connected.
 const recipient=contact.email.toLowerCase()
 return {id:contact.id,email:recipient,name:contact.displayName||recipient,
  subject:subject.trim(),body:formatFreeEmailBody(body,locale),
  mailto:safeManualMailto(recipient), // No subject/body or injected mailto headers
 }
}
export function buildFreeEmailQueue(contacts,ids,subject,body,locale='en'){
 if(!Array.isArray(contacts)||!Array.isArray(ids)||ids.length>FREE_EMAIL_MAX_RECIPIENTS||
  new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'))
  throw new Error('FREE_EMAIL_INVALID_SELECTION')
 const lookup=new Map(eligibleFreeEmailContacts(contacts).map(c=>[c.id,c]))
 if(ids.some(id=>!lookup.has(id)))throw new Error('FREE_EMAIL_CONSENT_REQUIRED')
 return ids.map(id=>prepareFreeEmail(lookup.get(id),subject,body,locale))
}
