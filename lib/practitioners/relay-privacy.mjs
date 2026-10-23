// Pure redaction for assigned-practitioner API responses. The encrypted source
// contact remains available only to its own client account and to authorized
// platform operations; this is NEVER a contact-book lookup or identity proof.
export const RELAY_CONTACT_HIDDEN='[contact hidden]'
export function redactRelayContacts(value) {
  if(typeof value!=='string')return ''
  return value
    // Telegram / WhatsApp personal deep links and all other external URLs.
    .replace(/(?<![A-Za-z0-9])(?:https?:\/\/|www\.|t\.me\/|wa\.me\/|telegram\.me\/)\S+/giu,RELAY_CONTACT_HIDDEN)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu,RELAY_CONTACT_HIDDEN)
    .replace(/(^|[\s([{,;:])@[A-Za-z][A-Za-z0-9_]{4,31}\b/gu,
      (_match,prefix)=>prefix+RELAY_CONTACT_HIDDEN)
    .replace(/(^|[^\p{L}\p{N}])(\+?[1-9][\d\s().-]{7,25}\d)(?=$|[^\p{L}\p{N}])/gu,
      (_match,prefix,number)=>{
        const digits=number.replace(/\D/g,'')
        // Ordinary ISO dates and 4/8-digit booking references are not phones.
        if(digits.length<9||digits.length>15||
          /^\d{4}-\d{2}-\d{2}(?:\s|$)/.test(number))return prefix+number
        return prefix+RELAY_CONTACT_HIDDEN
      })
}
export function relayContactAlias(contact) {
  const raw=typeof contact==='string'?contact:
    typeof contact?.displayName==='string'?contact.displayName:
    typeof contact?.name==='string'?contact.name:''
  const cleaned=redactRelayContacts(raw)
    .replaceAll(RELAY_CONTACT_HIDDEN,'').replace(/\s+/g,' ').trim()
  return cleaned.slice(0,80)||'Client'
}
export function relayContactView(contact) {
  // Deliberately no email, phone, address, whatsapp, telegram, or external id.
  return {displayName:relayContactAlias(contact)}
}
export function assertNoRelayContacts(text) {
  if(typeof text!=='string'||redactRelayContacts(text)!==text)
    throw new Error('CONTACT_EXCHANGE_BLOCKED')
  return text
}
