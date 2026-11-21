import {NextResponse} from 'next/server'
import {getAppConfig} from '@/lib/app/config'
import {cronAuthorized} from '@/lib/app/housekeeping-cron'
import {PRIVATE_HEADERS} from '@/lib/app/http'
import {transaction,closeDatabase} from '@/lib/app/database'
import {recoverDirectMessagePush} from '@/lib/app/direct-message-push'
import {commandCenterTick} from '@/lib/command-center/dispatcher.mjs'

export const runtime='nodejs'
export const preferredRegion='yul1'
export const dynamic='force-dynamic'
export const revalidate=0
export const maxDuration=300

// Existing five-minute Vercel cron; no additional paid schedules.
// When expressly enabled, CC claims one unique ten-minute slot and at most one
// bounded read-only task. Failures cannot interfere with message push delivery.
export async function GET(request){
  if(!cronAuthorized(request,process.env))
    return NextResponse.json({error:'UNAUTHORIZED'},{status:401,headers:PRIVATE_HEADERS})
  if(process.env.VERCEL_ENV==='preview')
    return NextResponse.json({error:'NOT_AVAILABLE'},{status:404,headers:PRIVATE_HEADERS})
  try{
    const config=getAppConfig()
    const pushed=await recoverDirectMessagePush(config)
    if(process.env.VERCEL_ENV==='production'&&process.env.HH_CC_TICK_ENABLED==='true'){
      try{
        const cc=await commandCenterTick({config,transaction})
        if(cc.status==='unconfirmed')console.error('HH_CC_TICK_UNCONFIRMED')
      }catch{console.error('HH_CC_TICK_UNAVAILABLE')}
    }
    // Optional AI video recovery shares this already scheduled, authenticated
    // five-minute invocation. Both bot identity and separate owner-approved
    // render budget are required; command-center and ordinary push stay intact.
    if(process.env.VERCEL_ENV==='production' &&
       process.env.HH_AI_TELEGRAM_QUEUE_ENABLED==='true' &&
       process.env.HH_AI_TELEGRAM_RENDER_BUDGET_APPROVED==='true'){
      try{
        const {aiVideoBotIdentityReady}=await import('@/lib/app/telegram-ai-account-boundary')
        if(aiVideoBotIdentityReady()){
          const {runTelegramAiQueues}=await import('@/lib/app/telegram-ai-worker')
          await runTelegramAiQueues(config,{messages:2,videos:1,deliveries:2})
        }
      }catch{console.error('HH_AI_VIDEO_EXISTING_CRON_RECOVERY_FAILED')}
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
