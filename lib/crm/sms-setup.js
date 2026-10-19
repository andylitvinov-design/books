import 'server-only'
import { SMS_WEBHOOK_URL } from './sms.js'

const ACCOUNT = /^AC[0-9a-fA-F]{32}$/
const SERVICE = /^MG[0-9a-fA-F]{32}$/
const AUTH = /^[0-9a-fA-F]{32}$/

// Explicit owner action only. Makes read-only GETs to fixed Twilio API endpoints;
// never buys a number, changes a webhook, creates a service or sends an SMS.
export async function probeTwilioSmsConnection(env=process.env, fetcher=fetch) {
  const sid=env.HH_CRM_TWILIO_ACCOUNT_SID||''
  const token=env.HH_CRM_TWILIO_AUTH_TOKEN||''
  const service=env.HH_CRM_TWILIO_MESSAGING_SERVICE_SID||''
  if(!ACCOUNT.test(sid)||!AUTH.test(token)||!SERVICE.test(service))
    return { status:'missing_credentials',providerVerified:false,
      senderAttached:false,inboundWebhookVerified:false,statusCallbackVerified:false }
  const url='https://messaging.twilio.com/v1/Services/'+service
  const headers={Authorization:'Basic '+Buffer.from(sid+':'+token).toString('base64')}
  const controller=new AbortController()
  const timer=setTimeout(()=>controller.abort(),8000)
  try {
    const response=await fetcher(url,{method:'GET',headers,signal:controller.signal,cache:'no-store'})
    if(response.status===401||response.status===403)
      return {status:'invalid_credentials',providerVerified:false}
    if(!response.ok)return {status:'provider_unavailable',providerVerified:false}
    const info=await response.json().catch(()=>null)
    if(info?.sid!==service||info?.account_sid!==sid)
      return {status:'account_mismatch',providerVerified:false}

    const inboundWebhookVerified=info.inbound_request_url===SMS_WEBHOOK_URL &&
      String(info.inbound_method||'').toUpperCase()==='POST' &&
      info.use_inbound_webhook_on_number!==true
    // This value is useful to operators but not required for each send:
    // every outgoing SMS explicitly supplies StatusCallback.
    const statusCallbackVerified=info.status_callback===SMS_WEBHOOK_URL

    // Check at most one Twilio sender, not its telephone number or content.
    const listing=await fetcher(url+'/PhoneNumbers?PageSize=1',{
      method:'GET',headers,signal:controller.signal,cache:'no-store',
    })
    if(!listing.ok)return {status:'sender_lookup_unavailable',providerVerified:true,
      inboundWebhookVerified,statusCallbackVerified,senderAttached:false}
    const sender=await listing.json().catch(()=>null)
    const senderAttached=Array.isArray(sender?.phone_numbers)&&sender.phone_numbers.length>0
    return {status:inboundWebhookVerified&&senderAttached?'connected':'needs_configuration',
      providerVerified:true,inboundWebhookVerified,statusCallbackVerified,senderAttached,
      optOutManuallyVerified:env.HH_CRM_SMS_ADVANCED_OPTOUT_VERIFIED==='true'}
  } catch {
    return {status:'provider_unavailable',providerVerified:false}
  } finally { clearTimeout(timer) }
}
