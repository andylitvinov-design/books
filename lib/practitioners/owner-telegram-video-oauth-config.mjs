// Small server-side OAuth configuration contract. Keep admin page rendering
// independent of the Telegram renderer, database and media dependencies.
export function ownerVideoOauthConfig(env=process.env){
 const clientId=String(env.HH_OWNER_VIDEO_GOOGLE_CLIENT_ID||'')
 const clientSecret=String(env.HH_OWNER_VIDEO_GOOGLE_CLIENT_SECRET||'')
 if(!/^[A-Za-z0-9_-]{20,170}\.apps\.googleusercontent\.com$/.test(clientId)||
   clientSecret.length<10||clientSecret.length>500)return null
 return {clientId,clientSecret}
}
export function ownerVideoOauthConfigured(env=process.env){
 return Boolean(ownerVideoOauthConfig(env))
}
