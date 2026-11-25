import {NextResponse} from 'next/server'
import {getAppConfig,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {consumeRate} from '@/lib/app/database'
import {deliverPersonalVideoTelegram} from '@/lib/app/personal-video-messenger'
import {AppError} from '@/lib/assessments/contracts'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const maxDuration=60

export async function POST(request,{params}){
 let auth
 try{
  const config=getAppConfig()
  requireSameOrigin(request,config)
  auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  if(request.headers.has('x-hh-account-id')&&request.headers.get('x-hh-account-id')!==actor.id)
   throw new AppError('ACCOUNT_CHANGED',403)
  await consumeRate(config,{op:'personal-video-telegram-delivery',accountId:actor.id},6,3600)
  const {id}=await params
  const body=await readBody(request,1024)
  if(!body||typeof body!=='object'||Array.isArray(body)||
   Object.keys(body).some(k=>!['channel','automatic','consent','locale'].includes(k))||
   body.channel!=='telegram')
   throw new AppError('INVALID_DELIVERY_REQUEST',400)
  const data=await deliverPersonalVideoTelegram(config,actor,id,{
   automatic:body.automatic===true,consent:body.consent===true,locale:body.locale||'en'})
  return auth.apply(NextResponse.json(data,{headers:PRIVATE_HEADERS}))
 }catch(error){
  const safe=safeError(error)
  const result=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(result):result
 }
}
