import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {practitionerEmailAllowed} from '@/lib/app/practitioner-access'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {registerClientTelegramWebhook} from '@/lib/app/client-telegram-transport'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export async function POST(request){
 let auth
 try{
  const config=getAppConfig()
  requestOrigin(request,config);requireSameOrigin(request,config)
  auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  if(request.headers.get('x-hh-account-id')!==actor.id)
   throw new AppError('ACCOUNT_CHANGED',409)
  if(!practitionerEmailAllowed(actor))throw new AppError('ACCESS_DENIED',403)
  // Explicit owner-triggered action; no webhook overwrite of unrelated bots.
  const status=await registerClientTelegramWebhook()
  return auth.apply(NextResponse.json(status,{headers:PRIVATE_HEADERS}))
 }catch(error){
  const safe=safeError(error)
  const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(response):response
 }
}
