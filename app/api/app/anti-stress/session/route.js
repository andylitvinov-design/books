import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {consumeRate} from '@/lib/app/database'
import {PRIVATE_HEADERS,safeError,readBody} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {readAntiStressSession,antiStressStorageEnabled,listAntiStressRuns,readAntiStressRunSummary,editOwnedAntiStressMeditation} from '@/lib/app/anti-stress-runs'
import {readOwnedCrossModeMemory,ownerCrossModeShareOptions} from '@/lib/app/anti-stress-private-memory'
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
  if(url.searchParams.get('view')==='continuity'){
   if([...url.searchParams.keys()].some(k=>!['view','exclude','locale'].includes(k)||url.searchParams.getAll(k).length!==1))throw new AppError('ANTI_STRESS_INVALID',400)
   const memory=await readOwnedCrossModeMemory(config,actor,url.searchParams.get('exclude'),locale)
   return auth.apply(NextResponse.json({...memory,shareOptions:ownerCrossModeShareOptions(memory,actor,url.searchParams.get('exclude'))},{headers:PRIVATE_HEADERS}))
  }
  if(url.searchParams.get('view')==='run'){
   if([...url.searchParams.keys()].some(k=>!['view','runId','locale'].includes(k)||url.searchParams.getAll(k).length!==1))throw new AppError('ANTI_STRESS_INVALID',400)
   const run=await readAntiStressRunSummary(config,actor,url.searchParams.get('runId'))
   return auth.apply(NextResponse.json({run},{headers:PRIVATE_HEADERS}))
  }
  if(url.searchParams.get('view')==='catalog'){
   const catalog=await listAntiStressRuns(config,actor,url.searchParams.get('before'))
   return auth.apply(NextResponse.json(catalog,{headers:PRIVATE_HEADERS}))
  }
  const view=url.searchParams.get('view')||'result'
  if(!['result','protocol','log'].includes(view))throw new AppError('ANTI_STRESS_INVALID',400)
  const session=await readAntiStressSession(config,actor,url.searchParams.get('runId'),url.searchParams.get('sessionId'),locale,view)
  return auth.apply(NextResponse.json(session,{headers:PRIVATE_HEADERS}))
 }catch(error){
  const safe=safeError(error),response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(response):response
 }
}

export async function PATCH(request){
 let auth
 try{
  const config=getAppConfig();requestOrigin(request,config)
  auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  if(request.headers.get('x-hh-account-id')!==actor.id)throw new AppError('ACCOUNT_CHANGED',409)
  if(!antiStressStorageEnabled())throw new AppError('ANTI_STRESS_UNAVAILABLE',503)
  await consumeRate(config,{op:'anti-stress-meditation-edit',actor:actor.id},20,3600)
  const body=await readBody(request,65536)
  const ids=typeof body.runId==='string'&&typeof body.protocolId==='string'
  if(body.type==='owner_request'){
   if(!ids||Object.keys(body).some(k=>!['runId','protocolId','type','expectedRevision','expectedReviewRevision','locale','ownerConfirmed','storageConsent','readyToRead'].includes(k))||body.expectedRevision!==0||!Number.isSafeInteger(body.expectedReviewRevision)||body.expectedReviewRevision<1||!['en','ru','es'].includes(body.locale)||body.ownerConfirmed!==true||body.storageConsent!==true||body.readyToRead!==true)throw new AppError('ANTI_STRESS_INVALID',400)
  }else if(!ids||!['save','decline'].includes(body.type)||Object.keys(body).some(k=>!['runId','protocolId','type','expectedRevision','body'].includes(k))||!Number.isSafeInteger(body.expectedRevision)||body.expectedRevision<1||(body.type==='save'&&(typeof body.body!=='string'||body.body.length>12000||!body.body.trim()))||(body.type==='decline'&&body.body!==undefined))throw new AppError('ANTI_STRESS_INVALID',400)
  const meditation=await editOwnedAntiStressMeditation(config,actor,body)
  return auth.apply(NextResponse.json({meditation},{headers:PRIVATE_HEADERS}))
 }catch(error){
  const safe=safeError(error),response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(response):response
 }
}
