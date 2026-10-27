import { NextResponse,after } from 'next/server'
import { getAppConfig } from '@/lib/app/config'
import { PRIVATE_HEADERS, safeError } from '@/lib/app/http'
import { MESSENGER_CHANNELS } from '@/lib/crm/messenger-policy'
import { verifyMessengerWebhook,verifyMessengerChallenge,normalizeMessengerUpdates,ingestMessengerUpdate,processTelegramDiagnostic,processWhatsAppDiagnostic } from '@/lib/crm/messenger-webhook'
import { sendTelegramDiagnosticPrompt,sendWhatsAppDiagnosticPrompt, ensureTelegramInlineWebhookUpdates, acknowledgeTelegramInlineCallback } from '@/lib/crm/messenger-provider'
import { receiveOwnerTelegramVideoWebhook } from '@/lib/practitioners/owner-telegram-video-service'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const maxDuration=120
const rejected=()=>new NextResponse('Unauthorized',{status:401,headers:PRIVATE_HEADERS})
export async function GET(request,{params}){
  const {provider}=await params
  if(!MESSENGER_CHANNELS.includes(provider))return new NextResponse('Not Found',{status:404})
  const challenge=verifyMessengerChallenge(provider,request.url)
  return challenge===null?rejected():new NextResponse(challenge,{status:200,headers:{'Cache-Control':'no-store','Content-Type':'text/plain; charset=utf-8'}})
}
export async function POST(request,{params}){
  const {provider}=await params
  if(!MESSENGER_CHANNELS.includes(provider))return new NextResponse('Not Found',{status:404})
  let raw
  try{
    const length=Number(request.headers.get('content-length')||0)
    if(length>65536)return new NextResponse('Payload too large',{status:413})
    const data=await request.arrayBuffer()
    if(data.byteLength>65536)return new NextResponse('Payload too large',{status:413})
    raw=Buffer.from(data)
  }catch{return new NextResponse('Invalid body',{status:400})}
  if(!verifyMessengerWebhook(provider,raw,request.headers))return rejected()
  try{
    const config=getAppConfig()
    const body=JSON.parse(raw.toString('utf8'))
    if(provider==='telegram'){
      const video=await receiveOwnerTelegramVideoWebhook(config,body,{channel:'crm'})
      if(video.handled){
        // The verified private owner command may be the first update needing
        // callback_query delivery for the one-time YouTube publish button.
        if(/^\/(?:video(?:_done|_retry|_cancel)?(?:@[A-Za-z0-9_]+)?|start(?:@[A-Za-z0-9_]+)?\s+video)$/i.test(String(body.message?.text||'').trim()))
          await ensureTelegramInlineWebhookUpdates().catch(()=>{})
        if(video.background)after(async()=>{
          try{await video.background()}
          catch{console.error('HH_OWNER_VIDEO_CRM_AFTER_FAILED')}
        })
        return NextResponse.json({ok:true},{headers:PRIVATE_HEADERS})
      }
    }
    const updates=normalizeMessengerUpdates(provider,body)
    // A previously registered bot may subscribe to 'message' only. Upgrade
    // the SAME already-owned signed webhook before its next inline prompt.
    // Never replace a foreign webhook or drop Telegram's pending updates.
    if(provider==='telegram'&&updates.some(event=>event.type==='incoming'&&!event.callbackId))
      await ensureTelegramInlineWebhookUpdates()
    for(const event of updates){
      if(provider==='telegram'){
        if(event.type==='callback_ignored'){
          try{await acknowledgeTelegramInlineCallback({
            callbackId:event.callbackId,to:event.userId,
            messageId:event.callbackMessageId})}catch{}
          continue
        }
        const intake=await processTelegramDiagnostic(event,config)
        if(intake.handled){
          if(event.callbackId){
            // Acknowledge only after the encrypted stage transition commits.
            try{await acknowledgeTelegramInlineCallback({
              callbackId:event.callbackId,to:event.userId,
              messageId:event.callbackMessageId})}catch{}
          }
          if(intake.reply){
            // CRM and consent were committed before contacting the provider.
            // Unknown provider results are NOT automatically retried (no duplicate prompts).
            try{await sendTelegramDiagnosticPrompt({to:intake.to,text:intake.reply,keyboard:intake.keyboard,
              approvedPilotGuest:intake.approvedPilotGuest===true,locale:intake.locale})}catch{ /* leave intake in CRM for owner manual follow-up */ }
          }
          continue
        }
      }
      if(provider==='whatsapp'&&event.type==='incoming'){
        const intake=await processWhatsAppDiagnostic(event,config)
        if(intake.handled){
          if(intake.reply){
            // Never retry an ambiguous provider send. Consent and CRM intake
            // were committed before this single Cloud API attempt.
            try{await sendWhatsAppDiagnosticPrompt({
              to:intake.to,text:intake.reply,keyboard:intake.keyboard,locale:intake.locale,
            })}catch{ /* owner can follow up in the same CRM Messages thread */ }
          }
          continue
        }
      }
      await ingestMessengerUpdate(provider,event,config)
    }
    return NextResponse.json({ok:true},{headers:PRIVATE_HEADERS})
  }catch(error){
    const safe=safeError(error)
    return NextResponse.json({ok:false},{status:safe.status>=500?503:400,headers:PRIVATE_HEADERS})
  }
}
