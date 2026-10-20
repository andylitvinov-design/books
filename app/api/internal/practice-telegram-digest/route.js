import { NextResponse } from 'next/server'
import { getAppConfig } from '@/lib/app/config'
import { closeDatabase } from '@/lib/app/database'
import { cronAuthorized } from '@/lib/app/housekeeping-cron'
import { PRIVATE_HEADERS } from '@/lib/app/http'
import {
  practiceTelegramConfigured,
  deliverDailyPracticeDigest,
} from '@/lib/practitioners/daily-telegram-digest'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const maxDuration=30

// Scheduled by the existing Holistic House Vercel project, without a phone or Mac.
// Requires the same production CRON_SECRET as the existing housekeeping job.
export async function GET(request){
  if(!cronAuthorized(request,process.env))
    return NextResponse.json({error:'UNAUTHORIZED'},{status:401,headers:PRIVATE_HEADERS})
  if(process.env.VERCEL_ENV==='preview')
    return NextResponse.json({error:'NOT_AVAILABLE'},{status:404,headers:PRIVATE_HEADERS})
  if(!practiceTelegramConfigured(process.env))
    return NextResponse.json({status:'disabled'},{status:200,headers:PRIVATE_HEADERS})
  try{
    const config=getAppConfig()
    const result=await deliverDailyPracticeDigest(config)
    // Neither the Telegram text nor client/recipient identifiers appear in the HTTP receipt.
    return NextResponse.json(result,{status:200,headers:PRIVATE_HEADERS})
  }catch{
    console.error('HH_PRACTICE_TELEGRAM_DIGEST_FAILED')
    return NextResponse.json({error:'DELIVERY_FAILED'},{status:503,headers:PRIVATE_HEADERS})
  }finally{
    await closeDatabase()
  }
}
