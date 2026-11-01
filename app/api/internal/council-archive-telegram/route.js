import {NextResponse} from 'next/server'
import {getAppConfig} from '@/lib/app/config'
import {closeDatabase} from '@/lib/app/database'
import {cronAuthorized} from '@/lib/app/housekeeping-cron'
import {councilOneShotAuthorized} from '@/lib/practitioners/council-one-shot-guard.mjs'
import {torontoReportDue} from '@/lib/practitioners/owner-telegram-report-hours.mjs'
import {ownerAiProviderReadiness} from '@/lib/practitioners/owner-ai-provider-settings'
import {PRIVATE_HEADERS} from '@/lib/app/http'
import {practiceTelegramConfigured} from '@/lib/practitioners/daily-telegram-transport.mjs'
import {deliverArchivedCouncilReports} from '@/lib/practitioners/council-telegram-delivery'
import {ensureOwnerTelegramPairing,resolvedOwnerTelegramEnv} from '@/lib/practitioners/telegram-owner-pairing'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
// Bounded provider GET/inference and one missed-day recovery may exceed 60s.
// No additional cron invocation or paid provider calls are authorized.
export const maxDuration=120

export async function GET(request){
  const manual=councilOneShotAuthorized(request,process.env)
  if(!cronAuthorized(request,process.env)&&!manual)
    return NextResponse.json({error:'UNAUTHORIZED'},{status:401,headers:PRIVATE_HEADERS})
  if(!manual&&!torontoReportDue('strategy'))
    return NextResponse.json({status:'not_due'},{headers:PRIVATE_HEADERS})
  if(process.env.VERCEL_ENV==='preview')
    return NextResponse.json({error:'NOT_AVAILABLE'},{status:404,headers:PRIVATE_HEADERS})
  if(!process.env.HH_PRACTICE_TG_BOT_TOKEN)
    return NextResponse.json({status:'token_missing'},{headers:PRIVATE_HEADERS})
  try{
    const config=getAppConfig()
    if(manual&&new URL(request.url).searchParams.get('mode')==='probe'){
      // Authenticated provider GET metadata only. No AI inference or Bot API send.
      const env=await resolvedOwnerTelegramEnv(config)
      const readiness=await ownerAiProviderReadiness(config,env)
      return NextResponse.json({status:'provider_probe_only',
        telegramReady:practiceTelegramConfigured(env),providers:readiness},
        {headers:PRIVATE_HEADERS})
    }
    const paired=await ensureOwnerTelegramPairing(config)
    if(!['paired','already_configured'].includes(paired.status))
      return NextResponse.json(paired,{headers:PRIVATE_HEADERS})
    const env=await resolvedOwnerTelegramEnv(config)
    if(!practiceTelegramConfigured(env))
      return NextResponse.json({status:'paired',delivery_enabled:false},
        {headers:PRIVATE_HEADERS})
    return NextResponse.json(await deliverArchivedCouncilReports(config,{env,strategyOnly:!manual}),
      {headers:PRIVATE_HEADERS})
  }catch{
    console.error('HH_COUNCIL_ARCHIVE_DELIVERY_FAILED')
    return NextResponse.json({error:'DELIVERY_FAILED'},
      {status:503,headers:PRIVATE_HEADERS})
  }finally{
    await closeDatabase()
  }
}
