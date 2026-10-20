import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {practitionerEmailAllowed} from '@/lib/app/practitioner-access'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {registerClientTelegramWebhook,verifyClientBot} from '@/lib/app/client-telegram-transport'
import {telegramClientLinkReady,telegramClientSendReady,validClientBotUsername} from '@/lib/app/client-telegram-policy'
import {createMessengerNotificationRepository} from '@/lib/app/messenger-notification-repository'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

// A read-only owner diagnostic: only environment KEY NAMES and booleans are returned.
function readiness(env=process.env){
 const required=['HH_CLIENT_TG_BOT_TOKEN','HH_CLIENT_TG_BOT_USERNAME',
   'HH_CLIENT_TG_WEBHOOK_SECRET','HH_CLIENT_TG_LINK_ENABLED']
 const missingKeys=required.filter(key=>{
  if(key==='HH_CLIENT_TG_LINK_ENABLED')return env[key]!=='true'
  if(key==='HH_CLIENT_TG_BOT_TOKEN')
    return typeof env[key]!=='string'||env[key].length<20
  if(key==='HH_CLIENT_TG_BOT_USERNAME')
    return !validClientBotUsername(env[key])
  if(key==='HH_CLIENT_TG_WEBHOOK_SECRET')
    return typeof env[key]!=='string'||!/^[A-Za-z0-9_-]{32,256}$/.test(env[key])
  return true
 })
 return {configured:telegramClientLinkReady(env),sendingEnabled:telegramClientSendReady(env),
   missingKeys,webhookVerified:false}
}
async function handler(request){
 let auth
 try{
  const config=getAppConfig()
  requestOrigin(request,config)
  if(request.method==='POST')requireSameOrigin(request,config)
  auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  if(request.headers.get('x-hh-account-id')!==actor.id)
    throw new AppError('ACCOUNT_CHANGED',409)
  if(!practitionerEmailAllowed(actor))throw new AppError('ACCESS_DENIED',403)

  if(request.method==='GET'){
   const state=readiness()
   // Only this verified owner's account, never imported CRM recipients.
   const own=await createMessengerNotificationRepository(config).state(actor)
   state.ownerLinked=own.channels?.telegram?.status==='connected'
   if(state.configured){
    try{await verifyClientBot(process.env,{requireWebhook:true});state.webhookVerified=true}
    catch{/* Genuine external readiness failure; do not reveal bot secrets. */}
   }
   return auth.apply(NextResponse.json(state,{headers:PRIVATE_HEADERS}))
  }

  // A server-side owner action only; cannot hijack another bot's webhook.
  const status=await registerClientTelegramWebhook()
  return auth.apply(NextResponse.json({...status,configured:true,
    webhookVerified:true,sendingEnabled:telegramClientSendReady(),missingKeys:[]},
    {headers:PRIVATE_HEADERS}))
 }catch(error){
  const safe=safeError(error)
  const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(response):response
 }
}
export const GET=handler
export const POST=handler
