// Read-only status recovery for SMS whose Twilio delivery callback was missed.
// No POST to Twilio, no re-send, no message body or phone returned to the browser.
import { AppError, requireUUID } from '../assessments/contracts.js'
import { smsRecipientFingerprint } from './sms.js'

const SID=/^SM[0-9a-f]{32}$/i
const ACCOUNT=/^AC[0-9a-f]{32}$/i
const SERVICE=/^MG[0-9a-f]{32}$/i
const TOKEN=/^[0-9a-f]{32}$/i
const STATUS=new Set(['accepted','queued','sending','sent','delivered','undelivered','failed'])
const TERMINAL=new Set(['blocked','delivered','undelivered','failed'])

export function getTwilioStatusConfig(env=process.env) {
 const accountSid=String(env.HH_CRM_TWILIO_ACCOUNT_SID||'')
 const messagingServiceSid=String(env.HH_CRM_TWILIO_MESSAGING_SERVICE_SID||'')
 const authToken=String(env.HH_CRM_TWILIO_AUTH_TOKEN||'')
 if(!ACCOUNT.test(accountSid)||!SERVICE.test(messagingServiceSid)||!TOKEN.test(authToken))
  return {enabled:false}
 // Readback stays available when SMS sending is paused, so late receipts remain verifiable.
 return {enabled:true,accountSid,messagingServiceSid,authToken}
}

export async function fetchTwilioSmsStatus({providerId,recipientHash,encryptionKey,config},fetcher=fetch){
 if(!config?.enabled||!SID.test(providerId||'')||!/^[a-f0-9]{64}$/.test(recipientHash||'')||
    !encryptionKey) throw new Error('SMS_STATUS_UNAVAILABLE')
 const url='https://api.twilio.com/2010-04-01/Accounts/'+config.accountSid+
  '/Messages/'+providerId+'.json'
 const controller=new AbortController()
 const timer=setTimeout(()=>controller.abort(),9000)
 try {
  const response=await fetcher(url,{
   method:'GET',
   signal:controller.signal,
   cache:'no-store',
   headers:{Authorization:'Basic '+Buffer.from(config.accountSid+':'+config.authToken).toString('base64')},
  })
  if(!response.ok)throw new Error('SMS_STATUS_UNCONFIRMED')
  const message=await response.json().catch(()=>null)
  // A scoped owner record must also match the provider's account, Messaging Service
  // and HMAC of the actual recipient. Do not accept unrelated Twilio message SIDs.
  if(message?.sid!==providerId||message?.account_sid!==config.accountSid||
     message?.messaging_service_sid!==config.messagingServiceSid||
     typeof message?.to!=='string'||
     smsRecipientFingerprint(message.to,encryptionKey)!==recipientHash||
     !STATUS.has(message.status))
   throw new Error('SMS_STATUS_UNCONFIRMED')
  return {status:message.status}
 }catch{throw new Error('SMS_STATUS_UNCONFIRMED')}
 finally{clearTimeout(timer)}
}

export async function refreshCrmSmsStatus({repo,actor,appConfig,payload,env=process.env,fetcher=fetch}){
 if(!payload||typeof payload!=='object'||Array.isArray(payload)||
    Object.keys(payload).some(k=>k!=='requestId'))throw new AppError('INVALID_SMS_STATUS_REQUEST',400)
 requireUUID(payload.requestId)
 const config=getTwilioStatusConfig(env)
 if(!config.enabled)throw new AppError('SMS_STATUS_UNAVAILABLE',503)
 const existing=await repo.withOwner(actor,store=>store.smsForStatusCheck(payload.requestId))
 if(TERMINAL.has(existing.status))
   return {updated:false,status:existing.status}
 if(!existing.providerId)throw new AppError('SMS_STATUS_UNAVAILABLE',409)
 let receipt
 try {
  receipt=await fetchTwilioSmsStatus({
   providerId:existing.providerId,recipientHash:existing.recipientHash,
   encryptionKey:appConfig.encryptionKey,config,
  },fetcher)
 }catch{throw new AppError('SMS_STATUS_UNCONFIRMED',503)}
 const saved=await repo.withOwner(actor,store=>
  store.applySmsProviderStatus({requestId:payload.requestId,providerId:existing.providerId,
   recipientHash:existing.recipientHash,status:receipt.status}))
 return {updated:true,status:saved.status}
}
