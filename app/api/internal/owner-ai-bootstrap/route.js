import {NextResponse} from 'next/server'
import {getAppConfig} from '@/lib/app/config'
import {closeDatabase} from '@/lib/app/database'
import {PRIVATE_HEADERS} from '@/lib/app/http'
import {registerClientTelegramWebhook} from '@/lib/app/client-telegram-transport'
import {ownerAiBootstrapAuthorized} from '@/lib/practitioners/owner-ai-bootstrap.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const maxDuration=45

const reply=(data,status=200)=>NextResponse.json(data,{status,headers:PRIVATE_HEADERS})

// Short-lived, cryptographic, fixed-target operator handoff.
// This route cannot pick a bot, chat, webhook URL or change client sending.
// After HH_OWNER_AI_BOOTSTRAP_EXPIRES it is permanently inert (404).
export async function GET(request){
  if(!ownerAiBootstrapAuthorized(request.url,process.env))
    return reply({error:'NOT_FOUND'},404)
  try{
    const config=getAppConfig()
    const result=await registerClientTelegramWebhook(process.env,{config})
    if(result.webhookRegistered!==true||result.ownerAiCommandsReady!==true||
       result.mode!=='shared_practice')
      return reply({ok:false,error:'OWNER_AI_MENU_NOT_VERIFIED'},503)
    return reply({
      ok:true,webhookVerified:true,ownerAiCommandsReady:true,
      practiceBotVerified:true,clientSendsUnchanged:true,
      providerReceipt:'Telegram setWebhook and getMyCommands confirmed; owner conversation not yet tested',
    })
  }catch(error){
    const safe=new Set([
      'TELEGRAM_NOT_CONFIGURED','TELEGRAM_BOT_IDENTITY_MISMATCH',
      'TELEGRAM_OWNER_PAIRING_REQUIRED','TELEGRAM_WEBHOOK_ALREADY_IN_USE',
      'TELEGRAM_OWNER_MENU_UNAVAILABLE','TELEGRAM_PROVIDER_UNAVAILABLE',
    ])
    return reply({ok:false,error:safe.has(error?.code)?error.code:'OWNER_AI_SETUP_UNAVAILABLE'},503)
  }finally{
    await closeDatabase().catch(()=>{})
  }
}
