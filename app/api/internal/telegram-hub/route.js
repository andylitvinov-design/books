import {NextResponse} from 'next/server'
import {PRIVATE_HEADERS,readBody} from '@/lib/app/http'
import {getAppConfig} from '@/lib/app/config'
import {closeDatabase} from '@/lib/app/database'
import {ensureOwnerTelegramPairing,resolvedOwnerTelegramEnv} from '@/lib/practitioners/telegram-owner-pairing'
import {
  ownerBotCredentials,matchGatewayKey,validateGatewayPayload,
  verifyOwnerTelegram,sendOwnerDocument
} from '@/lib/practitioners/telegram-hub.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const maxDuration=60
const respond=(body,status=200)=>NextResponse.json(body,{status,headers:PRIVATE_HEADERS})

// Server-to-server only; BotFather token stays in this Holistic House project.
export async function POST(request){
  if(process.env.VERCEL_ENV==='preview')return respond({error:'NOT_AVAILABLE'},404)
  if(!matchGatewayKey(request.headers.get('x-hh-council-relay-key'),
      process.env.HH_COUNCIL_TG_RELAY_KEY))
    return respond({error:'UNAUTHORIZED'},401)
  if(request.headers.get('origin'))return respond({error:'SERVER_ONLY'},403)
  if(Number(request.headers.get('content-length')||0)>94000)
    return respond({error:'REPORT_TOO_LARGE'},413)
  let payload
  try{payload=await readBody(request,94000)}
  catch{return respond({error:'INVALID_BODY'},400)}
  if(validateGatewayPayload(payload))return respond({error:'INVALID_PAYLOAD'},400)
  if(!process.env.HH_PRACTICE_TG_BOT_TOKEN)
    return respond({error:'TELEGRAM_NOT_CONFIGURED'},503)

  try{
    const config=getAppConfig()
    const pairing=await ensureOwnerTelegramPairing(config)
    if(!['paired','already_configured'].includes(pairing.status)){
      return payload.mode==='probe'
        ?respond({ok:false,configured:false,pairing_status:pairing.status,no_message_sent:true},422)
        :respond({error:'TELEGRAM_IDENTITY_NOT_PAIRED'},503)
    }
    const env=await resolvedOwnerTelegramEnv(config)
    if(!ownerBotCredentials(env))
      return respond({error:'TELEGRAM_NOT_CONFIGURED'},503)
    if(payload.mode==='probe'){
      const status=await verifyOwnerTelegram(env)
      return respond({ok:status.verified,configured:status.configured,
        bot_username_verified:status.botVerified,
        owner_username_verified:status.chatVerified,
        private_chat_verified:status.chatVerified,
        existing_webhook_present:status.hasWebhook,
        delivery_enabled:env.HH_PRACTICE_TG_ENABLED==='true',
        no_message_sent:true
      },status.verified?200:422)
    }
    if(env.HH_PRACTICE_TG_ENABLED!=='true')
      return respond({error:'TELEGRAM_NOT_ENABLED'},503)
    return respond(await sendOwnerDocument(payload,env))
  }catch{
    return respond({error:'TELEGRAM_PROVIDER_UNAVAILABLE_OR_UNVERIFIED'},503)
  }finally{
    await closeDatabase()
  }
}
export async function GET(){
  return respond({ok:true,enabled:false,note:'Private server-to-server POST only'})
}
