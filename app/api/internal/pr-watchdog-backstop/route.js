import {NextResponse} from 'next/server'
import {cronAuthorized} from '@/lib/app/housekeeping-cron'
import {PRIVATE_HEADERS} from '@/lib/app/http'
import {runWatchdogBackstop} from '@/lib/automation/github-watchdog-backstop.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const maxDuration=30

// Vercel's CRON_SECRET provides the independent, authenticated 10-minute clock.
// A separate repo-scoped fine-grained token with Actions:write is required;
// keep it in Vercel production environment, never in browser or source code.
export async function GET(request){
  if (!cronAuthorized(request,process.env))
    return NextResponse.json({error:'UNAUTHORIZED'},{status:401,headers:PRIVATE_HEADERS})
  if (process.env.VERCEL_ENV!=='production')
    return NextResponse.json({error:'NOT_AVAILABLE'},{status:404,headers:PRIVATE_HEADERS})
  const outcome=await runWatchdogBackstop({token:process.env.HH_PR_CRON_DISPATCH_TOKEN})
  return NextResponse.json(outcome.body,{status:outcome.status,headers:PRIVATE_HEADERS})
}
