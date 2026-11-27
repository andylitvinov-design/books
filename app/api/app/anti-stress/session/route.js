import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {consumeRate} from '@/lib/app/database'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {readAntiStressSession,antiStressStorageEnabled} from '@/lib/app/anti-stress-runs'
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
  if(!antiStressStorageEnabled())throw new AppError('ANTI_STRESS_UNAVAILABLE',503)
  await consumeRate(config,{op:'anti-stress-session-read',actor:actor.id},60,3600)
  const url=new URL(request.url),locale=url.searchParams.get('locale')||'en'
  if(!['en','ru','es'].includes(locale))throw new AppError('ANTI_STRESS_INVALID',400)
  const view=url.searchParams.get('view')||'result'
  if(!['result','protocol','log'].includes(view))throw new AppError('ANTI_STRESS_INVALID',400)
  const session=await readAntiStressSession(config,actor,url.searchParams.get('runId'),url.searchParams.get('sessionId'),locale,view)
  return auth.apply(NextResponse.json(session,{headers:PRIVATE_HEADERS}))
 }catch(error){
  const safe=safeError(error),response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(response):response
 }
}
