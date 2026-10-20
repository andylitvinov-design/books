import {NextResponse} from 'next/server'
import {getAppConfig} from '@/lib/app/config'
import {closeDatabase} from '@/lib/app/database'
import {cronAuthorized} from '@/lib/app/housekeeping-cron'
import {PRIVATE_HEADERS} from '@/lib/app/http'
import {practiceTelegramConfigured} from '@/lib/practitioners/daily-telegram-transport.mjs'
import {deliverArchivedCouncilReports} from '@/lib/practitioners/council-telegram-delivery'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const maxDuration=60

export async function GET(request){
  if(!cronAuthorized(request,process.env))
    return NextResponse.json({error:'UNAUTHORIZED'},{status:401,headers:PRIVATE_HEADERS})
  if(process.env.VERCEL_ENV==='preview')
    return NextResponse.json({error:'NOT_AVAILABLE'},{status:404,headers:PRIVATE_HEADERS})
  if(!practiceTelegramConfigured(process.env))
    return NextResponse.json({status:'disabled'},{status:200,headers:PRIVATE_HEADERS})
  try{
    return NextResponse.json(await deliverArchivedCouncilReports(getAppConfig()),
      {status:200,headers:PRIVATE_HEADERS})
  }catch{
    console.error('HH_COUNCIL_ARCHIVE_DELIVERY_FAILED')
    return NextResponse.json({error:'DELIVERY_FAILED'},
      {status:503,headers:PRIVATE_HEADERS})
  }finally{
    await closeDatabase()
  }
}
