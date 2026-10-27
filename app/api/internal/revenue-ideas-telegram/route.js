import {NextResponse} from 'next/server'
import {getAppConfig} from '@/lib/app/config'
import {closeDatabase} from '@/lib/app/database'
import {cronAuthorized} from '@/lib/app/housekeeping-cron'
import {PRIVATE_HEADERS} from '@/lib/app/http'
import {torontoReportDue} from '@/lib/practitioners/owner-telegram-report-hours.mjs'
import {practiceTelegramConfigured} from '@/lib/practitioners/daily-telegram-transport.mjs'
import {deliverDailyRevenueIdeas} from '@/lib/practitioners/revenue-telegram-delivery'
import {ensureOwnerTelegramPairing,resolvedOwnerTelegramEnv} from '@/lib/practitioners/telegram-owner-pairing'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const maxDuration=60

export async function GET(request){
  if(!cronAuthorized(request,process.env))
    return NextResponse.json({error:'UNAUTHORIZED'},{status:401,headers:PRIVATE_HEADERS})
  if(process.env.VERCEL_ENV==='preview')
    return NextResponse.json({error:'NOT_AVAILABLE'},{status:404,headers:PRIVATE_HEADERS})
  if(!torontoReportDue('revenue'))
    return NextResponse.json({status:'not_due'},{headers:PRIVATE_HEADERS})
  if(!process.env.HH_PRACTICE_TG_BOT_TOKEN)
    return NextResponse.json({status:'token_missing'},{headers:PRIVATE_HEADERS})
  try{
    const config=getAppConfig()
    const pairing=await ensureOwnerTelegramPairing(config)
    if(!['paired','already_configured'].includes(pairing.status))
      return NextResponse.json(pairing,{headers:PRIVATE_HEADERS})
    const env=await resolvedOwnerTelegramEnv(config)
    if(!practiceTelegramConfigured(env))
      return NextResponse.json({status:'paired',delivery_enabled:false},{headers:PRIVATE_HEADERS})
    return NextResponse.json(await deliverDailyRevenueIdeas(config,{env}),{headers:PRIVATE_HEADERS})
  }catch{
    console.error('HH_REVENUE_TELEGRAM_DELIVERY_FAILED')
    return NextResponse.json({error:'DELIVERY_FAILED'},{status:503,headers:PRIVATE_HEADERS})
  }finally{
    await closeDatabase()
  }
}
