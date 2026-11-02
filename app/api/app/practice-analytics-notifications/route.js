import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {AppError,onlyKeys} from '@/lib/assessments/contracts'
import {
 readMasterAnalyticsState,writeMasterAnalyticsState,masterAnalyticsPreview,
 sendMasterAnalyticsDigest,
} from '@/lib/practitioners/master-analytics-service'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

async function handle(request){
 let auth
 try{
  const config=getAppConfig()
  requestOrigin(request,config)
  if(request.method==='POST')requireSameOrigin(request,config)
  auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  if(request.headers.get('x-hh-account-id')!==actor.id)
    throw new AppError('ACCOUNT_CHANGED',409)
  let value
  if(request.method==='GET'){
   value=await readMasterAnalyticsState(config,actor)
  }else if(request.method==='POST'){
   const input=await readBody(request,1024)
   if(input?.action==='preview'){
    onlyKeys(input,['action'])
    value=await masterAnalyticsPreview(config,actor)
   }else if(input?.action==='send_now'){
    onlyKeys(input,['action'])
    const state=await readMasterAnalyticsState(config,actor)
    if(!state.approved||state.channel!=='telegram'||!state.telegramVerified||
       !['daily','weekly'].includes(state.frequency))
      throw new AppError('CHANNEL_NOT_VERIFIED',409)
    value=await sendMasterAnalyticsDigest(config,state.practitionerId,{kind:'manual'})
   }else{
    value=await writeMasterAnalyticsState(config,actor,input)
   }
  }else{
   return auth.apply(NextResponse.json({error:'METHOD_NOT_ALLOWED'},
     {status:405,headers:PRIVATE_HEADERS}))
  }
  return auth.apply(NextResponse.json(value,{headers:PRIVATE_HEADERS}))
 }catch(error){
  const safe=safeError(error)
  const response=NextResponse.json({error:safe.code},
    {status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(response):response
 }
}
export const GET=handle
export const POST=handle
