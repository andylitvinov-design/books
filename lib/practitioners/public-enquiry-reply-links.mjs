// Explicit one-off reply consent is NOT a verified identity or marketing permission.
// This helper is used only by the authenticated practitioner request view.
const EMAIL=/^[^\s@<>\x00-\x1f\x7f]{1,64}@[^\s@<>\x00-\x1f\x7f]{1,190}\.[^\s@<>\x00-\x1f\x7f]{2,}$/
const PHONE=/^\+[1-9]\d{7,14}$/
const REF=/^HH-[A-F0-9]{12}$/

export function publicEnquiryReplyContact(contact){
  if(contact?.submittedByVisitor!==true||contact?.replyConsent!=='website_reply_only_v1')return null
  const email=typeof contact.email==='string'&&EMAIL.test(contact.email)?contact.email:''
  // Historical manual channel edits may have overwritten phone while keeping
  // visitor consent. Only an immutable snapshot or an unedited record is safe.
  const candidate=Object.hasOwn(contact,'visitorReplyPhone')?contact.visitorReplyPhone:
    contact.channel?'':contact.phone
  const phone=typeof candidate==='string'&&PHONE.test(candidate)?candidate:''
  return email||phone?{email,phone}:null
}

// The owner writes the reply in Holistic House but must explicitly SEND it
// in their own email/WhatsApp app. A generated URL is not delivery evidence.
export function publicEnquiryReplyHandoffs(contact,referenceCode,text){
  const message=typeof text==='string'?text.trim():''
  if(message.length<1||message.length>1200||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(message)||
     !REF.test(String(referenceCode||'')))return {emailUrl:null,whatsAppUrl:null}
  const email=typeof contact?.email==='string'&&EMAIL.test(contact.email)?contact.email:''
  const phone=typeof contact?.phone==='string'&&PHONE.test(contact.phone)?contact.phone:''
  const content=message+'\n\nHolistic House · '+referenceCode
  const subject='Holistic House · '+referenceCode
  return {
    emailUrl:email?'mailto:'+encodeURIComponent(email).replace(/%40/gi,'@')+
      '?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(content):null,
    whatsAppUrl:phone?'https://wa.me/'+phone.slice(1)+'?text='+encodeURIComponent(content):null,
  }
}
