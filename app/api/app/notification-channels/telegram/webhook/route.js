import {NextResponse,after} from 'next/server'
import {getAppConfig} from '@/lib/app/config'
import {PRIVATE_HEADERS} from '@/lib/app/http'
import {verifyClientTelegramSecret,telegramClientBotUsername} from '@/lib/app/client-telegram-policy'
import {receiveClientTelegramWebhook} from '@/lib/app/client-telegram-webhook'
import {receiveSubscriberAiTelegramUpdate,drainSubscriberAiOutbox,answerSubscriberAiCallback} from '@/lib/app/subscriber-ai-telegram'
import {dispatchPractitionerMessagePush} from '@/lib/app/client-message-push'
import {dispatchClientTelegramNotification} from '@/lib/app/client-telegram-dispatch'
import {receiveOwnerAiTelegramWebhook} from '@/lib/practitioners/owner-ai-telegram-service'
import {parseOwnerAiUpdate} from '@/lib/practitioners/owner-ai-telegram.mjs'
import {parseOwnerRouterUpdate} from '@/lib/practitioners/owner-telegram-router.mjs'
import {receiveOwnerTelegramRouterWebhook} from '@/lib/practitioners/owner-telegram-router-service'
import {receiveOwnerTelegramAudioWebhook} from '@/lib/practitioners/owner-telegram-audio-service'
import {receiveOwnerTelegramVideoWebhook} from '@/lib/practitioners/owner-telegram-video-service'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
// Independent free-model calls plus one real synthesis run within a bounded webhook.
export const maxDuration=300

export async function POST(request){
 if(!verifyClientTelegramSecret(request.headers.get('x-telegram-bot-api-secret-token')))
  return new NextResponse('Unauthorized',{status:401,headers:PRIVATE_HEADERS})
 if(Number(request.headers.get('content-length')||0)>8192)
  return new NextResponse('Too large',{status:413,headers:PRIVATE_HEADERS})
 let update
 try{
  const payload=await request.arrayBuffer()
  if(payload.byteLength>8192)return new NextResponse('Too large',{status:413,headers:PRIVATE_HEADERS})
  update=JSON.parse(Buffer.from(payload).toString('utf8'))
 }catch{return new NextResponse('Invalid update',{status:400,headers:PRIVATE_HEADERS})}
 try{
  const config=getAppConfig()
   // Verified Dot webhook serves owner-only video before ordinary audio inbox.
   // Outside an active video collection it declines and audio handling is unchanged.
   const video=await receiveOwnerTelegramVideoWebhook(config,update,{channel:'practice'})
   if(video.handled){
     if(video.background)after(async()=>{
       try{await video.background()}
       catch{console.error('HH_OWNER_VIDEO_DOT_AFTER_FAILED')}
     })
     return NextResponse.json({ok:true},{headers:PRIVATE_HEADERS})
   }
   // A plain owner text or Telegram voice is kept as a private, encrypted
   // routing draft. No model or Commander task runs until one of two buttons
   // is explicitly selected. Existing video and active audio /combine have
   // their own earlier or fallback handlers.
   if(parseOwnerRouterUpdate(update)){
     after(async()=>{
       try{
         const routed=await receiveOwnerTelegramRouterWebhook(config,update)
         if(routed.handled)return
         const originalAudio=await receiveOwnerTelegramAudioWebhook(config,update)
         if(originalAudio.handled){
           if(originalAudio.background)await originalAudio.background()
           return
         }
         const owner=await receiveOwnerAiTelegramWebhook(config,update)
         if(!owner.handled){
           const client=await receiveClientTelegramWebhook(config,update)
           if(client.relayMessageId)await Promise.allSettled([
             dispatchPractitionerMessagePush(config,client.relayMessageId),
             dispatchClientTelegramNotification(config,client.relayMessageId),
           ])
         }
       }catch{
         // Never log text, speech, Telegram bot tokens, callback payload or chat IDs.
         console.error('HH_OWNER_ROUTER_AFTER_FAILED')
       }
     })
     return NextResponse.json({ok:true},{headers:PRIVATE_HEADERS})
   }
   const audio=await receiveOwnerTelegramAudioWebhook(config,update)
  if(audio.handled){
    if(audio.background)after(async()=>{
      try{await audio.background()}
      catch{console.error('HH_OWNER_AUDIO_DOT_AFTER_FAILED')}
    })
    if(audio.retry)return NextResponse.json({ok:false},{status:503,headers:PRIVATE_HEADERS})
    return NextResponse.json({ok:true},{headers:PRIVATE_HEADERS})
  }
  // Do not keep Telegram waiting for several independent provider replies
  // and one real synthesis. The signed, owner-private update is already
  // authenticated by this webhook; numeric owner pairing is rechecked inside.
  // Next.js after() keeps work alive up to maxDuration after the quick 200.
  if(parseOwnerAiUpdate(update)){
    after(async()=>{
      try{
        const result=await receiveOwnerAiTelegramWebhook(config,update)
        if(!result.handled){
          const client=await receiveClientTelegramWebhook(config,update)
          if(client.relayMessageId)await Promise.allSettled([
            dispatchPractitionerMessagePush(config,client.relayMessageId),
            dispatchClientTelegramNotification(config,client.relayMessageId),
          ])
        }
      }catch{
        // No secrets, update text, client data or chat ID in logs.
        console.error('HH_OWNER_AI_AFTER_DELIVERY_FAILED')
      }
    })
    return NextResponse.json({ok:true},{headers:PRIVATE_HEADERS})
  }
  const owner=await receiveOwnerAiTelegramWebhook(config,update)
  if(!owner.handled){
    let videoIngress=null,receiveVideoAi=null
    // The current verified client bot has ONE webhook. Explicit /video
    // commands are considered before a generic Subscriber AI chat reply,
    // but AFTER owner video/audio/AI and never for /start account linking.
    if(process.env.HH_AI_TELEGRAM_QUEUE_ENABLED==='true'&&
       process.env.VERCEL_ENV==='production'){
      const {aiVideoBotIdentityReady}=await import('@/lib/app/telegram-ai-account-boundary')
      if(aiVideoBotIdentityReady()){
        const {parseTelegramVideoClientIngress}=await import('@/lib/app/telegram-ai-client-ingress.mjs')
        const event=parseTelegramVideoClientIngress(update,telegramClientBotUsername())
        if(event){
          const {aiQueueEnabled,receiveTelegramAiUpdate}=await import('@/lib/app/telegram-ai-queue')
          if(aiQueueEnabled()){videoIngress=event;receiveVideoAi=receiveTelegramAiUpdate}
        }
      }
    }
    if(videoIngress&&!videoIngress.stop){
      const ai=await receiveVideoAi(config,videoIngress)
      if(ai.handled){
        if(ai.queued||ai.consented||ai.consentRequired)
          after(async()=>{
            try{
              const {runTelegramAiQueues}=await import('@/lib/app/telegram-ai-worker')
              // Heavy MP4 rendering is confined to the existing budget-gated
              // private recovery worker, never the signed HTTP webhook.
              await runTelegramAiQueues(config,{messages:2,videos:0,deliveries:3})
            }catch{console.error('HH_AI_CLIENT_VIDEO_QUEUE_AFTER_FAILED')}
          })
        return NextResponse.json({ok:true},{headers:PRIVATE_HEADERS})
      }
    }
    // Client AI is independent of owner/CRM and never steals an unconsented
    // verification /start, global /stop or ordinary practitioner Reply.
    const subscriber=await receiveSubscriberAiTelegramUpdate(config,update)
    if(subscriber.queued||subscriber.callbackId)after(async()=>{
      try{
        if(subscriber.callbackId)await answerSubscriberAiCallback(subscriber.callbackId)
        await drainSubscriberAiOutbox(config)
      }catch{console.error('HH_SUBSCRIBER_AI_DELIVERY_FAILED')}
    })
    // Global /stop must revoke both the optional video queue and existing
    // client/subscriber chat; never consume it exclusively.
    if(videoIngress?.stop&&receiveVideoAi)await receiveVideoAi(config,videoIngress)
    if(!subscriber.handled){
      const customer=await receiveClientTelegramWebhook(config,update)
    if(customer.relayMessageId){
      const id=customer.relayMessageId
      after(async()=>{await Promise.allSettled([
        dispatchPractitionerMessagePush(config,id),
        dispatchClientTelegramNotification(config,id),
      ])})
      }
    }
  }
  // No account existence, token status, or chat ID is returned to Telegram.
  return NextResponse.json({ok:true},{headers:PRIVATE_HEADERS})
 }catch{
  // Telegram may retry only if the server couldn't commit; link token is one-use.
  return NextResponse.json({ok:false},{status:503,headers:PRIVATE_HEADERS})
 }
}
export async function GET(){
 return new NextResponse('Not Found',{status:404,headers:PRIVATE_HEADERS})
}
