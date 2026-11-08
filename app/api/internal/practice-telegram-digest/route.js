import {NextResponse,after} from 'next/server'
import {getAppConfig} from '@/lib/app/config'
import {closeDatabase} from '@/lib/app/database'
import {cronAuthorized} from '@/lib/app/housekeeping-cron'
import {torontoReportDue} from '@/lib/practitioners/owner-telegram-report-hours.mjs'
import {PRIVATE_HEADERS} from '@/lib/app/http'
import {practiceTelegramConfigured} from '@/lib/practitioners/daily-telegram-transport.mjs'
import {deliverDailyPracticeDigest} from '@/lib/practitioners/daily-telegram-digest'
import {ensureOwnerTelegramPairing,resolvedOwnerTelegramEnv} from '@/lib/practitioners/telegram-owner-pairing'
import {registerClientTelegramWebhook,verifyClientBot,ownerAiMenuReady} from '@/lib/app/client-telegram-transport'
import {masterAnalyticsTelegramReady,scheduledMasterAnalyticsDigests} from '@/lib/practitioners/master-analytics-service'

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
  const ownerDue=torontoReportDue('operations')
  const masterDue=torontoReportDue('revenue')
  // Native Telegram Menu is independent of daily sending and customer consent.
  // Refresh only on the EXISTING 09:00 Toronto CRON_SECRET slot. The adapter
  // verifies getMe + the same signed webhook and preserves all older commands.
  if(masterDue&&process.env.VERCEL_ENV==='production'&&
     process.env.HH_CRM_TG_COMPANION_ENABLED==='true'){
    after(async()=>{
      try{
        const {ensureTelegramCompanionNativeMenu}=await import('@/lib/crm/messenger-provider')
        const status=await ensureTelegramCompanionNativeMenu(process.env)
        if(status.ready)console.info('HH_CRM_TG_COMMAND_MENU_READY',{
          source:'morning_cron',changedScopes:status.changedScopes||0})
        else console.error('HH_CRM_TG_COMMAND_MENU_NOT_READY',{reason:status.reason})
      }catch{console.error('HH_CRM_TG_COMMAND_MENU_SETUP_FAILED')}
    })
  }
  // Reuse the EXISTING 09:00 Toronto cron slot: a separate daily greeting
  // only for Telegram chats that explicitly opted in. Never a new scheduler.
  if(masterDue&&process.env.VERCEL_ENV==='production'&&
     process.env.HH_CRM_TG_COMPANION_ENABLED==='true'&&
     process.env.HH_CRM_TG_COMPANION_DAILY_ENABLED==='true'){
    try{
      const config=getAppConfig()
      const {deliverTelegramCompanionDaily}=await import('@/lib/crm/telegram-companion-service')
      await deliverTelegramCompanionDaily(config,process.env,{limit:5})
    }catch{
      // Keep existing owner/practitioner reports independent.
      console.error('HH_CRM_TG_COMPANION_DAILY_FAILED')
    }finally{
      await closeDatabase()
    }
  }
  if(!ownerDue&&!masterDue)
    return NextResponse.json({status:'not_due'},{headers:PRIVATE_HEADERS})
  if(process.env.VERCEL_ENV==='preview')
    return NextResponse.json({error:'NOT_AVAILABLE'},{status:404,headers:PRIVATE_HEADERS})
  if(!process.env.HH_PRACTICE_TG_BOT_TOKEN)
    return NextResponse.json({status:'token_missing'},{headers:PRIVATE_HEADERS})
  try{
    const config=getAppConfig()
    // Preserve the previously existing 09:00 slot for *other* practitioners'
    // separately opted-in analytics. It must never invoke the owner's 15:00
    // statistics report or consume that report's private delivery receipt.
    if(masterDue){
      if(!masterAnalyticsTelegramReady(process.env))
        return NextResponse.json({status:'master_schedule_disabled'},{headers:PRIVATE_HEADERS})
      try{
        const result=await scheduledMasterAnalyticsDigests(config,{env:process.env})
        return NextResponse.json(result,{headers:PRIVATE_HEADERS})
      }catch{
        console.error('HH_MASTER_ANALYTICS_SCHEDULE_FAILED')
        return NextResponse.json({error:'MASTER_DELIVERY_FAILED'},
          {status:503,headers:PRIVATE_HEADERS})
      }
    }
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
    return NextResponse.json(await deliverDailyPracticeDigest(config,{env,technicalDigest:true}),
      {headers:PRIVATE_HEADERS})
  }catch{
    console.error('HH_PRACTICE_TELEGRAM_DIGEST_FAILED')
    return NextResponse.json({error:'DELIVERY_FAILED'},
      {status:503,headers:PRIVATE_HEADERS})
  }finally{
    await closeDatabase()
  }
}
