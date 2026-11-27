import {NextResponse} from 'next/server'
import {getAppConfig,requireSameOrigin,requestOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {consumeRate} from '@/lib/app/database'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {readCoachArchiveQuality,runCoachArchiveQuality,revokeCoachArchiveQuality,validateArchiveQualityRequest} from '@/lib/app/coach-archive-quality'
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
  let result
  if(write){
   const input=validateArchiveQualityRequest(await readBody(request,2048))
   await consumeRate(config,{op:input.action==='revoke'?'coach-archive-quality-revoke':'coach-archive-quality-write',actor:actor.id},input.action==='revoke'?120:30,3600)
   result=input.action==='review'?await runCoachArchiveQuality(config,actor,input):await revokeCoachArchiveQuality(config,actor,input)
  }else{
   const p=new URL(request.url).searchParams
   if([...p.keys()].length!==1||p.getAll('protocolId').length!==1)throw new AppError('COACH_QUALITY_REQUEST_INVALID',400)
   await consumeRate(config,{op:'coach-archive-quality-read',actor:actor.id},90,3600)
   result=await readCoachArchiveQuality(config,actor,p.get('protocolId'))
  }
  return auth.apply(NextResponse.json(result,{headers:PRIVATE_HEADERS}))
 }catch(error){
  const e=safeError(error),response=NextResponse.json({error:e.code},{status:e.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(response):response
 }
}
export const GET=request=>handle(request,false)
export const POST=request=>handle(request,true)
