import {NextResponse} from 'next/server'
import {getAppConfig} from '@/lib/app/config'
import {closeDatabase} from '@/lib/app/database'
import {cronAuthorized} from '@/lib/app/housekeeping-cron'
import {PRIVATE_HEADERS} from '@/lib/app/http'
import {practiceTelegramConfigured} from '@/lib/practitioners/daily-telegram-transport.mjs'
import {deliverDailyPracticeDigest} from '@/lib/practitioners/daily-telegram-digest'
import {ensureOwnerTelegramPairing,resolvedOwnerTelegramEnv} from '@/lib/practitioners/telegram-owner-pairing'
import {registerClientTelegramWebhook,verifyClientBot,ownerAiMenuReady} from '@/lib/app/client-telegram-transport'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const maxDuration=60

// Vercel's existing daily CRON_SECRET authenticates this route.
// Before any send, safely establish the owner's private chat from a recent /start.
// Does not modify another webhook, acknowledge any update or send while OFF.
export async function GET(request){
  if(!cronAuthorized(request,process.env))
    return NextResponse.json({error:'UNAUTHORIZED'},{status:401,headers:PRIVATE_HEADERS})
  if(process.env.VERCEL_ENV==='preview')
    return NextResponse.json({error:'NOT_AVAILABLE'},{status:404,headers:PRIVATE_HEADERS})
  if(!process.env.HH_PRACTICE_TG_BOT_TOKEN)
    return NextResponse.json({status:'token_missing'},{headers:PRIVATE_HEADERS})
  try{
    const config=getAppConfig()
    const pairing=await ensureOwnerTelegramPairing(config)
    if(!['paired','already_configured'].includes(pairing.status))
      return NextResponse.json(pairing,{headers:PRIVATE_HEADERS})
    const env=await resolvedOwnerTelegramEnv(config)
    // Daily idempotent safety net for the owner AI menu. Never overwrite a
    // different webhook or let menu setup block existing daily digests.
    if(env.HH_OWNER_AI_TG_ENABLED==='true'&&env.HH_CLIENT_TG_USE_PRACTICE_BOT==='true'){
      try{
        let ready=false
        try{
          await verifyClientBot(env,{requireWebhook:true})
          ready=await ownerAiMenuReady(config,env)
        }catch{/* Unconfigured/not-ready: registration verifies identity again. */}
        if(!ready)await registerClientTelegramWebhook(env,{config})
      }catch{/* No auto-retries/owner message; existing digest continues. */}
    }
    if(!practiceTelegramConfigured(env))
      return NextResponse.json({status:'paired',delivery_enabled:false},
        {headers:PRIVATE_HEADERS})
    return NextResponse.json(await deliverDailyPracticeDigest(config,{env}),
      {headers:PRIVATE_HEADERS})
  }catch{
    console.error('HH_PRACTICE_TELEGRAM_DIGEST_FAILED')
    return NextResponse.json({error:'DELIVERY_FAILED'},
      {status:503,headers:PRIVATE_HEADERS})
  }finally{
    await closeDatabase()
  }
}
