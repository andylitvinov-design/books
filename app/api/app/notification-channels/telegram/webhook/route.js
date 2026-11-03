import {NextResponse,after} from 'next/server'
import {getAppConfig} from '@/lib/app/config'
import {PRIVATE_HEADERS} from '@/lib/app/http'
import {verifyClientTelegramSecret} from '@/lib/app/client-telegram-policy'
import {receiveClientTelegramWebhook} from '@/lib/app/client-telegram-webhook'
import {receiveOwnerAiTelegramWebhook} from '@/lib/practitioners/owner-ai-telegram-service'
import {parseOwnerAiUpdate} from '@/lib/practitioners/owner-ai-telegram.mjs'
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
   const audio=await receiveOwnerTelegramAudioWebhook(config,update)
  if(audio.handled){
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
        if(!result.handled)await receiveClientTelegramWebhook(config,update)
      }catch{
        // No secrets, update text, client data or chat ID in logs.
        console.error('HH_OWNER_AI_AFTER_DELIVERY_FAILED')
      }
    })
    return NextResponse.json({ok:true},{headers:PRIVATE_HEADERS})
  }
  const owner=await receiveOwnerAiTelegramWebhook(config,update)
  if(!owner.handled)await receiveClientTelegramWebhook(config,update)
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
