import {timingSafeEqual} from 'node:crypto'

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

// The encrypted owner-issued PKCE challenge, not an admin SameSite=Strict
// cookie, authenticates the Google cross-site callback. It expires after 10m.
const OAUTH_NONCE=/^[A-Za-z0-9_-]{43}$/
export function ownerVideoOauthStateMatches(challenge,state,now=Date.now()){
 if(!challenge||!Number.isSafeInteger(challenge.time)||!Number.isSafeInteger(now)||
   !OAUTH_NONCE.test(challenge.verifier)||!OAUTH_NONCE.test(challenge.state)||
   !OAUTH_NONCE.test(state)||now<challenge.time||now-challenge.time>600000)return false
 return timingSafeEqual(Buffer.from(challenge.state),Buffer.from(state))
}
