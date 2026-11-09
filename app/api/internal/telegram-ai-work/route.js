import {NextResponse} from 'next/server'
import {getAppConfig} from '@/lib/app/config'
import {cronAuthorized} from '@/lib/app/housekeeping-cron'
import {closeDatabase} from '@/lib/app/database'
import {PRIVATE_HEADERS} from '@/lib/app/http'
import {runTelegramAiQueues} from '@/lib/app/telegram-ai-worker'
import {aiQueueEnabled,aiQueueMetrics} from '@/lib/app/telegram-ai-queue'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const maxDuration=300

export async function GET(request){
 if(!cronAuthorized(request,process.env))
  return NextResponse.json({error:'UNAUTHORIZED'},{status:401,headers:PRIVATE_HEADERS})
 if(!aiQueueEnabled()||process.env.VERCEL_ENV!=='production'||
   process.env.HH_AI_TELEGRAM_RENDER_BUDGET_APPROVED!=='true')
  return NextResponse.json({status:'disabled'},{headers:PRIVATE_HEADERS})
 try{
  const config=getAppConfig()
  const result=await runTelegramAiQueues(config,{messages:4,videos:1,deliveries:3})
  const metrics=await aiQueueMetrics(config)
  return NextResponse.json({...result,...metrics},{headers:PRIVATE_HEADERS})
 }catch{
  return NextResponse.json({error:'WORKER_UNAVAILABLE'},{status:503,headers:PRIVATE_HEADERS})
 }finally{await closeDatabase()}
}
export const POST=GET