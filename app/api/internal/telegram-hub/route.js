import {NextResponse} from 'next/server'
import {PRIVATE_HEADERS,readBody} from '@/lib/app/http'
import {
  ownerBotCredentials,matchGatewayKey,validateGatewayPayload,
  verifyOwnerTelegram,sendOwnerDocument
} from '@/lib/practitioners/telegram-hub.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const maxDuration=60
const respond=(body,status=200)=>NextResponse.json(body,{status,headers:PRIVATE_HEADERS})

// Only another server with the separate random relay key can invoke this.
// BotFather token / numeric chat ID reside ONLY in this HH Vercel Production app.
export async function POST(request){
  if(process.env.VERCEL_ENV==='preview')return respond({error:'NOT_AVAILABLE'},404)
  if(!matchGatewayKey(request.headers.get('x-hh-council-relay-key'),
      process.env.HH_COUNCIL_TG_RELAY_KEY))
    return respond({error:'UNAUTHORIZED'},401)
  if(request.headers.get('origin'))return respond({error:'SERVER_ONLY'},403)
  const declared=Number(request.headers.get('content-length')||0)
  if(declared>94000)return respond({error:'REPORT_TOO_LARGE'},413)
  let payload
  try{payload=await readBody(request,94000)}
  catch{return respond({error:'INVALID_BODY'},400)}
  if(validateGatewayPayload(payload))return respond({error:'INVALID_PAYLOAD'},400)
  if(!ownerBotCredentials(process.env))
    return respond({error:'TELEGRAM_NOT_CONFIGURED'},503)
  try{
    if(payload.mode==='probe'){
      const status=await verifyOwnerTelegram()
      return respond({ok:status.verified,configured:status.configured,
        bot_username_verified:status.botVerified,
        owner_username_verified:status.chatVerified,
        private_chat_verified:status.chatVerified,
        existing_webhook_present:status.hasWebhook,
        delivery_enabled:process.env.HH_PRACTICE_TG_ENABLED==='true',
        no_message_sent:true
      },status.verified?200:422)
    }
    if(process.env.HH_PRACTICE_TG_ENABLED!=='true')
      return respond({error:'TELEGRAM_NOT_ENABLED'},503)
    return respond(await sendOwnerDocument(payload))
  }catch{
    return respond({error:'TELEGRAM_PROVIDER_UNAVAILABLE_OR_UNVERIFIED'},503)
  }
}
export async function GET(){
  return respond({ok:true,enabled:false,note:'Private server-to-server POST only'})
}
