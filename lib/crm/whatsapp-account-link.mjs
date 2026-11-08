// Only a signed Meta Cloud API inbound message is proof of WhatsApp control.
export const WHATSAPP_LINK_NOTICE='hh-whatsapp-account-link-v1'
const phone=/^[1-9][0-9]{7,14}$/,id=/^[0-9]{5,25}$/,tokenPattern=/^[A-Za-z0-9_-]{43}$/
export function whatsappWebhookReady(env=process.env){
 return env.VERCEL_ENV==='production'&&env.HH_CRM_MSG_WHATSAPP_ENABLED==='true'&&
  id.test(env.HH_CRM_MSG_WHATSAPP_PHONE_ID||'')&&
  !!env.HH_CRM_MSG_WHATSAPP_TOKEN&&
  (env.HH_CRM_MSG_META_APP_SECRET||'').length>=16&&
  (env.HH_CRM_MSG_META_VERIFY_TOKEN||'').length>=16&&
  /^v[0-9]{1,2}[.]0$/.test(env.HH_CRM_MSG_META_API_VERSION||'')
}
export function whatsappLinkReady(env=process.env){
 const pilot=env.HH_CRM_WA_ACCOUNT_LINK_PILOT_ENABLED==='true'
 const publicMode=env.HH_CRM_WA_ACCOUNT_LINK_PUBLIC_ENABLED==='true'&&env.HH_CRM_MSG_PRODUCTION_APPROVED==='true'
 return whatsappWebhookReady(env)&&(pilot||publicMode)&&
  phone.test(env.HH_CRM_MSG_WHATSAPP_NUMBER_PUBLIC||'')&&
  (!pilot||phone.test(env.HH_CRM_MSG_WHATSAPP_PILOT_WA_ID||''))
}
export function isWhatsAppLinkCommand(text){
 return typeof text==='string'&&/^HHWA(?:\s|$)/i.test(text.trim())
}
export function whatsappLinkToken(text){
 if(typeof text!=='string'||text.length>100)return null
 const match=/^HHWA ([A-Za-z0-9_-]{43})$/.exec(text.trim())
 return match&&tokenPattern.test(match[1])?match[1]:null
}
export function whatsappStop(text){
 return typeof text==='string'&&/^\/?stop$/i.test(text.trim())
}
export function whatsappProofAllowed(event,env=process.env,now=Date.now(),stop=false){
 const timestamp=event?.waProviderSentAt
 return (stop?whatsappWebhookReady(env):whatsappLinkReady(env))&&
  event?.type==='incoming'&&
  String(event.accountId)===String(env.HH_CRM_MSG_WHATSAPP_PHONE_ID)&&
  phone.test(String(event.userId||''))&&Number.isSafeInteger(timestamp)&&timestamp>0&&
  timestamp<=now+60000&&now-timestamp<=(stop?30*24*3600000:15*60000)&&
  (stop||env.HH_CRM_WA_ACCOUNT_LINK_PILOT_ENABLED!=='true'||
   String(event.userId)===String(env.HH_CRM_MSG_WHATSAPP_PILOT_WA_ID))
}
export function whatsappLinkUrl(token,env=process.env){
 return whatsappLinkReady(env)&&tokenPattern.test(token||'')
  ?'https://wa.me/'+env.HH_CRM_MSG_WHATSAPP_NUMBER_PUBLIC+'?text='+encodeURIComponent('HHWA '+token):null
}
