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
export const maxDuration=45

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
    return NextResponse.json(pushed,{headers:PRIVATE_HEADERS})
  }catch{
    console.error('HH_DIRECT_PUSH_RECOVERY_FAILED')
    return NextResponse.json({error:'SERVICE_UNAVAILABLE'},
      {status:503,headers:PRIVATE_HEADERS})
  }finally{
    await closeDatabase()
  }
}
