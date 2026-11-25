import {NextResponse} from 'next/server'
import {getAppConfig} from '@/lib/app/config'
import {cronAuthorized} from '@/lib/app/housekeeping-cron'
import {PRIVATE_HEADERS} from '@/lib/app/http'
import {transaction,closeDatabase} from '@/lib/app/database'
import {recoverDirectMessagePush} from '@/lib/app/direct-message-push'
import {commandCenterTick} from '@/lib/command-center/dispatcher.mjs'
import {dispatchDaybookDaily} from '@/lib/app/daybook-daily-dispatch'
import {dispatchDaybookWeekly} from '@/lib/app/daybook-weekly-dispatch'
import {dispatchReikiHints} from '@/lib/app/reiki-hints-dispatch'

export const runtime='nodejs'
export const preferredRegion='yul1'
export const dynamic='force-dynamic'
export const revalidate=0
export const maxDuration=45

// Existing five-minute Vercel cron; no additional paid schedules.
// When expressly enabled, CC claims one unique ten-minute slot and at most one
// bounded read-only task. Failures cannot interfere with message push delivery.
export async function GET(request){
  if(!cronAuthorized(request,process.env))
    return NextResponse.json({error:'UNAUTHORIZED'},{status:401,headers:PRIVATE_HEADERS})
  if(process.env.VERCEL_ENV==='preview')
    return NextResponse.json({error:'NOT_AVAILABLE'},{status:404,headers:PRIVATE_HEADERS})
  const started=Date.now()
  try{
    const config=getAppConfig()
    const pushed=await recoverDirectMessagePush(config)
    // Reuse this protected five-minute cron; no new scheduled jobs or services.
    // Separate production approval + per-account verified Telegram/goal consent.
    if(process.env.VERCEL_ENV==='production'&&process.env.HH_DAYBOOK_DAILY_SEND_APPROVED==='true'){
      try{pushed.daybookDaily=await dispatchDaybookDaily(config)}
      catch{console.error('HH_DAYBOOK_DAILY_DISPATCH_FAILED')}
    }
    if(process.env.VERCEL_ENV==='production'&&process.env.HH_DAYBOOK_WEEKLY_SEND_APPROVED==='true'){
      try{pushed.daybookWeekly=await dispatchDaybookWeekly(config)}
      catch{console.error('HH_DAYBOOK_WEEKLY_DISPATCH_FAILED')}
    }
    if(process.env.VERCEL_ENV==='production'&&process.env.HH_CC_TICK_ENABLED==='true'){
      try{
        const cc=await commandCenterTick({config,transaction})
        if(cc.status==='unconfirmed')console.error('HH_CC_TICK_UNCONFIRMED')
      }catch{console.error('HH_CC_TICK_UNAVAILABLE')}
    }
    // Preserve the existing cron budget and leave other dispatchers unchanged.
    if(process.env.VERCEL_ENV==='production'&&process.env.HH_REIKI_HINTS_SEND_APPROVED==='true'&&Date.now()-started<25000){
      try{pushed.reikiHints=await dispatchReikiHints(config)}
      catch{console.error('HH_REIKI_HINTS_DISPATCH_FAILED')}
    }
    return NextResponse.json(pushed,{headers:PRIVATE_HEADERS})
  }catch{
    console.error('HH_DIRECT_PUSH_RECOVERY_FAILED')
    return NextResponse.json({error:'SERVICE_UNAVAILABLE'},
      {status:503,headers:PRIVATE_HEADERS})
  }finally{
    await closeDatabase()
  }
}
