import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {consumeRate} from '@/lib/app/database'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {readClarityCourseClock,clarityClockStorageEnabled} from '@/lib/app/clarity-course-clock-store'
import {clarityClockSummary} from '@/lib/coaching/clarity-course-clock.mjs'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const preferredRegion='yul1'
export async function GET(request){
 let auth
 try{
  const config=getAppConfig();requestOrigin(request,config)
  auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  if(request.headers.get('x-hh-account-id')!==actor.id)throw new AppError('ACCOUNT_CHANGED',409)
  if(!clarityClockStorageEnabled())throw new AppError('CLARITY_CLOCK_UNAVAILABLE',503)
  await consumeRate(config,{op:'clarity-logical-clock-read',actor:actor.id},60,3600)
  const clock=await readClarityCourseClock(config,actor)
  return auth.apply(NextResponse.json({clock:clock?clarityClockSummary(clock,Date.now()):null},{headers:PRIVATE_HEADERS}))
 }catch(error){
  const safe=safeError(error)
  const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(response):response
 }
}
// No POST: browser claims are never trusted clock events.
