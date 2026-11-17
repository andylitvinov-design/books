// Verified Telegram Login (OIDC) identity, never browser-submitted metadata.
// IMPORTANT: OIDC `sub` is an opaque authentication subject and is NOT
// necessarily the numeric Telegram Bot API peer ID. The signed Telegram
// profile `id` claim is the one that matches business_message.from.id.
// Missing profile `id` fails closed: never match a CRM chat on OIDC `sub`.
export function verifiedTelegramSubject(identities) {
  if(!Array.isArray(identities))return null
  const matches=identities.filter(row=>row?.provider==='custom:telegram')
  if(matches.length!==1)return null
  const data=matches[0].identity_data
  if(!data||typeof data.sub!=='string'||!data.sub.trim())return null
  const id=data.id
  const peer=typeof id==='number'&&Number.isSafeInteger(id)?String(id):
    typeof id==='string'?id:null
  // Telegram Bot API identifiers may be larger than 32 bits but are bounded
  // to 52 bits. Reject rounding, leading zeros, negatives and profile names.
  if(!peer||!/^[1-9][0-9]{0,15}$/.test(peer))return null
  const numeric=Number(peer)
  return Number.isSafeInteger(numeric)&&numeric<2**52?peer:null
}
