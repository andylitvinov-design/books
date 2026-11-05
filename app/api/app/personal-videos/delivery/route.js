import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {consumeRate} from '@/lib/app/database'
import {videoDeliveryState,beginVideoTelegramLink,setVideoTelegramAutomatic} from '@/lib/app/personal-video-messenger'
import {AppError} from '@/lib/assessments/contracts'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

async function handle(request){
 let auth
 try{
  const config=getAppConfig()
  if(request.method==='POST')requireSameOrigin(request,config)
  else requestOrigin(request,config)
  auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  if(request.headers.has('x-hh-account-id')&&request.headers.get('x-hh-account-id')!==actor.id)
   throw new AppError('ACCOUNT_CHANGED',403)
  await consumeRate(config,{op:'personal-video-messenger-settings',accountId:actor.id},
   request.method==='POST'?12:60,3600)
  let data
  if(request.method==='GET') data=await videoDeliveryState(config,actor)
  else{
   const body=await readBody(request,2048)
   if(!body||typeof body!=='object'||Array.isArray(body)||
     Object.keys(body).some(k=>!['action','locale','enabled','consent'].includes(k)))
     throw new AppError('INVALID_DELIVERY_REQUEST',400)
   if(body.action==='connect'&&body.consent===true&&typeof body.locale==='string')
    data=await beginVideoTelegramLink(config,actor,body.locale)
   else if(body.action==='automatic'&&typeof body.enabled==='boolean'&&
    (!body.enabled||body.consent===true))
    data=await setVideoTelegramAutomatic(config,actor,body)
   else throw new AppError('INVALID_DELIVERY_REQUEST',400)
  }
  return auth.apply(NextResponse.json(data,{headers:PRIVATE_HEADERS}))
 }catch(error){
  const safe=safeError(error)
  const result=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(result):result
 }
}
export const GET=handle
export const POST=handle
