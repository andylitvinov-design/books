import {ownerMaterialRequest} from '@/lib/clients/material-library-http'
import {privateJson} from '@/lib/clients/delivery-http'
import {requireSameOrigin} from '@/lib/app/config'
import {telegramClientBotMode,telegramClientLinkReady}
  from '@/lib/app/client-telegram-policy'
import {verifyClientBot,registerClientTelegramWebhook}
  from '@/lib/app/client-telegram-transport'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

const errors=new Set([
  'TELEGRAM_WEBHOOK_NOT_CONNECTED','TELEGRAM_OWNER_MENU_NOT_CONNECTED',
  'TELEGRAM_PROVIDER_UNAVAILABLE','TELEGRAM_BOT_IDENTITY_MISMATCH',
  'TELEGRAM_NOT_CONFIGURED'
])

async function status(){
  const env=process.env
  const configured=telegramClientLinkReady(env)&&
    telegramClientBotMode(env)==='shared_practice'
  if(!configured)return {configured:false,webhookVerified:false,reason:'TELEGRAM_NOT_CONFIGURED'}
  try{
    // Calls provider getMe and getWebhookInfo: HTTP 200 on Holistic House is
    // NOT enough to claim that Telegram can deliver updates.
    await verifyClientBot(env,{requireWebhook:true})
    return {configured:true,webhookVerified:true,reason:null}
  }catch(error){
    return {configured:true,webhookVerified:false,
      reason:errors.has(error?.code)?error.code:'TELEGRAM_PROVIDER_UNAVAILABLE'}
  }
}
export async function GET(request){
  return ownerMaterialRequest(request,async()=>privateJson(await status()))
}
export async function POST(request){
  return ownerMaterialRequest(request,async({config})=>{
    requireSameOrigin(request,config)
    if(telegramClientBotMode(process.env)!=='shared_practice')
      return privateJson({error:'TELEGRAM_NOT_CONFIGURED'},409)
    // Existing verifier checks the exact bot and paired numeric private chat
    // and refuses to overwrite any foreign Telegram webhook.
    await registerClientTelegramWebhook(process.env,{config})
    const current=await status()
    if(!current.webhookVerified)
      return privateJson({error:'TELEGRAM_WEBHOOK_NOT_CONNECTED'},503)
    return privateJson({...current,registered:true,
      note:'Webhook configuration verified. Real inbound and outbound receipts still require an owner message.'})
  })
}
