// Only use identities returned by the server-verified Supabase Auth user.
const normalizeEmail=value=>typeof value==='string'&&value.length<=254&&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())?value.trim().toLowerCase():null

export function verifiedGoogleEmailForReport(identities,accountEmail){
  if(!Array.isArray(identities))return null
  const google=identities.filter(item=>item?.provider==='google')
  if(google.length!==1)return null
  const data=google[0].identity_data
  if(!data||data.email_verified!==true||typeof data.sub!=='string'||!data.sub.trim())return null
  const verified=normalizeEmail(data.email)
  return verified&&verified===normalizeEmail(accountEmail)?verified:null
}

export function reportRecipientEmailMatches(expectedEmail,verifiedGoogleEmail){
  const expected=normalizeEmail(expectedEmail)
  return Boolean(expected&&expected===normalizeEmail(verifiedGoogleEmail))
}
