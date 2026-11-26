import {NextResponse} from 'next/server'
import {getAppConfig,requireSameOrigin,requestOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {consumeRate} from '@/lib/app/database'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {readClarityClocks,writeClarityClock,clarityLogicalClockEnabled} from '@/lib/app/clarity-logical-clock-store'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const preferredRegion='yul1'
async function handle(request,write){
 let auth
 try{
  const config=getAppConfig()
  if(write)requireSameOrigin(request,config);else requestOrigin(request,config)
  auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  if(request.headers.get('x-hh-account-id')!==actor.id)throw new AppError('ACCOUNT_CHANGED',409)
  if(!clarityLogicalClockEnabled())throw new AppError('CLARITY_CLOCK_UNAVAILABLE',503)
  const input=write?await readBody(request,1024):null
  await consumeRate(config,{op:'clarity-logical-clock',actor:actor.id},450,3600)
  const result=write?await writeClarityClock(config,actor,input):await readClarityClocks(config,actor)
  return auth.apply(NextResponse.json(result,{headers:PRIVATE_HEADERS}))
 }catch(error){
  const safe=safeError(error)
  const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(response):response
 }
}
export const GET=request=>handle(request,false)
export const POST=request=>handle(request,true)
