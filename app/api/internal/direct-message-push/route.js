import {NextResponse} from 'next/server'
import {getAppConfig} from '@/lib/app/config'
import {cronAuthorized} from '@/lib/app/housekeeping-cron'
import {PRIVATE_HEADERS} from '@/lib/app/http'
import {closeDatabase} from '@/lib/app/database'
import {recoverDirectMessagePush} from '@/lib/app/direct-message-push'

export const runtime='nodejs'
export const preferredRegion='yul1'
export const dynamic='force-dynamic'
export const revalidate=0
export const maxDuration=45

// An existing CRON_SECRET, not a public or account-authenticated endpoint.
// Web Push is delivered only to devices which explicitly enabled message alerts.
export async function GET(request){
  if(!cronAuthorized(request,process.env))
    return NextResponse.json({error:'UNAUTHORIZED'},{status:401,headers:PRIVATE_HEADERS})
  if(process.env.VERCEL_ENV==='preview')
    return NextResponse.json({error:'NOT_AVAILABLE'},{status:404,headers:PRIVATE_HEADERS})
  try{
    const config=getAppConfig()
    return NextResponse.json(await recoverDirectMessagePush(config),{headers:PRIVATE_HEADERS})
  }catch{
    console.error('HH_DIRECT_PUSH_RECOVERY_FAILED')
    return NextResponse.json({error:'SERVICE_UNAVAILABLE'},
      {status:503,headers:PRIVATE_HEADERS})
  }finally{
    await closeDatabase()
  }
}
