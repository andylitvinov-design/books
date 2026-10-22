import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {practitionerEmailAllowed} from '@/lib/app/practitioner-access'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {registerClientTelegramWebhook,verifyClientBot,ownerAiMenuReady} from '@/lib/app/client-telegram-transport'
import {telegramClientLinkReady,telegramClientSendReady,validClientBotUsername,
  telegramClientBotMode,telegramClientBotUsername} from '@/lib/app/client-telegram-policy'
import {createMessengerNotificationRepository} from '@/lib/app/messenger-notification-repository'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

// A read-only owner diagnostic: only environment KEY NAMES and booleans are returned.
function readiness(env=process.env){
 const mode=telegramClientBotMode(env)
 const required=env.HH_CLIENT_TG_USE_PRACTICE_BOT==='true' &&
    !env.HH_CLIENT_TG_BOT_TOKEN&&!env.HH_CLIENT_TG_BOT_USERNAME
   ?['HH_PRACTICE_TG_BOT_TOKEN','HH_PRACTICE_TG_ENABLED',
     'HH_CLIENT_TG_WEBHOOK_SECRET','HH_CLIENT_TG_LINK_ENABLED']
   :['HH_CLIENT_TG_BOT_TOKEN','HH_CLIENT_TG_BOT_USERNAME',
     'HH_CLIENT_TG_WEBHOOK_SECRET','HH_CLIENT_TG_LINK_ENABLED']
 const missingKeys=required.filter(key=>{
  if(key==='HH_CLIENT_TG_LINK_ENABLED'||key==='HH_PRACTICE_TG_ENABLED')
    return env[key]!=='true'
  if(key==='HH_CLIENT_TG_BOT_TOKEN'||key==='HH_PRACTICE_TG_BOT_TOKEN')
    return !/^\d{6,16}:[A-Za-z0-9_-]{25,}$/.test(env[key]||'')
  if(key==='HH_CLIENT_TG_BOT_USERNAME')return !validClientBotUsername(env[key])
  if(key==='HH_CLIENT_TG_WEBHOOK_SECRET')
    return typeof env[key]!=='string'||!/^[A-Za-z0-9_-]{32,256}$/.test(env[key])
  return true
 })
 return {configured:telegramClientLinkReady(env),sendingEnabled:telegramClientSendReady(env),
   missingKeys,webhookVerified:false,botMode:mode,
   botUsername:mode?telegramClientBotUsername(env):null,
   usingExistingPracticeBot:mode==='shared_practice',
   ownerAiEnabled:mode==='shared_practice'&&env.HH_OWNER_AI_TG_ENABLED==='true',
   ownerAiGeminiReady:Boolean(env.HH_COUNCIL_GEMINI_API_KEY)&&
     env.HH_COUNCIL_GEMINI_FREE_TIER_CONFIRMED==='true',
   ownerAiMistralReady:Boolean(env.HH_COUNCIL_OPENROUTER_API_KEY),
   ownerAiCommandsReady:false}
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
    try{await verifyClientBot(process.env,{requireWebhook:true});state.webhookVerified=true;
        state.ownerAiCommandsReady=await ownerAiMenuReady(config)}
    catch{/* Genuine external readiness failure; do not reveal bot secrets. */}
   }
   return auth.apply(NextResponse.json(state,{headers:PRIVATE_HEADERS}))
  }

  // A server-side owner action only; cannot hijack another bot's webhook.
  const status=await registerClientTelegramWebhook(process.env,{config})
  return auth.apply(NextResponse.json({...status,configured:true,
    webhookVerified:true,sendingEnabled:telegramClientSendReady(),missingKeys:[],
    ownerAiEnabled:process.env.HH_OWNER_AI_TG_ENABLED==='true',
    ownerAiCommandsReady:status.ownerAiCommandsReady===true,
    botMode:telegramClientBotMode(),usingExistingPracticeBot:telegramClientBotMode()==='shared_practice'},
    {headers:PRIVATE_HEADERS}))
 }catch(error){
  const safe=safeError(error)
  const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(response):response
 }
}
export const GET=handler
export const POST=handler
