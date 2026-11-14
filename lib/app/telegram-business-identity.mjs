// Numeric Telegram OIDC subject from the server-verified Supabase identity.
// Never use raw user_metadata, a browser-typed username, name or phone.
export function verifiedTelegramSubject(identities) {
  if(!Array.isArray(identities))return null
  const matches=identities.filter(row=>row?.provider==='custom:telegram')
  if(matches.length!==1)return null
  const subject=matches[0].identity_data?.sub
  return typeof subject==='string'&&/^[1-9][0-9]{0,15}$/.test(subject)
    ?subject:null
}
