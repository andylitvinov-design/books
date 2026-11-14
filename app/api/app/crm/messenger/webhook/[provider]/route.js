import { NextResponse,after } from 'next/server'
import { getAppConfig } from '@/lib/app/config'
import {channelTransportReady} from '@/lib/crm/messenger-policy'
import {consumeRate} from '@/lib/app/database'
import { PRIVATE_HEADERS, safeError } from '@/lib/app/http'
import { MESSENGER_CHANNELS } from '@/lib/crm/messenger-policy'
import { operationHash } from '@/lib/app/crypto'
import { telegramPromptFailureEvidence } from '@/lib/crm/telegram-prompt-diagnostics.mjs'
import { verifyMessengerWebhook,verifyMessengerChallenge,normalizeMessengerUpdates,ingestMessengerUpdate,processTelegramDiagnostic,processWhatsAppAccountLink,processWhatsAppDiagnostic } from '@/lib/crm/messenger-webhook'
import { sendTelegramDiagnosticPrompt, sendWhatsAppDiagnosticPrompt, ensureTelegramInlineWebhookUpdates, acknowledgeTelegramInlineCallback, sendTelegramCompanionMessage, sendHolisticBusinessRequestReply, sendHolisticBusinessWelcomePhoto } from '@/lib/crm/messenger-provider'
import { telegramPresentationOnStart } from '@/lib/crm/telegram-presentation.mjs'
import {processTelegramCompanion} from '@/lib/crm/telegram-companion-service'
import {processTelegramAiV3,finishTelegramAiV3} from '@/lib/crm/telegram-ai-diagnostic-v3-service'
import {shouldBootstrapTelegramNativeMenu} from '@/lib/crm/telegram-companion-native-commands.mjs'
import { receiveOwnerTelegramVideoWebhook } from '@/lib/practitioners/owner-telegram-video-service'
import {processTelegramBusinessConversation} from '@/lib/crm/telegram-business-service'
import {processTelegramBusinessSecretary,gateTelegramBusinessSecretaryOptOut} from '@/lib/crm/telegram-secretary-service'
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
    // Durable STOP gate for the account secretary, including contacts who
    // have never ordered. This signed update is not a CRM lead.
    if(provider==='telegram'){
      const stop=await gateTelegramBusinessSecretaryOptOut(body,config)
      if(stop.blocked)return NextResponse.json({ok:true},{headers:PRIVATE_HEADERS})
    }
    // Separate signed Business-chat service intake: only public service-code
    // messages and explicit short replies, never ordinary personal text or
    // diagnostic/Companion updates. Confirmation persists before acknowledgement.
    if(provider==='telegram'){
      const business=await processTelegramBusinessConversation(body,config)
      if(business.handled){
        if(business.reply){
          try{
            await consumeRate(config,{op:'hh-tg-business-intent-message',
              connectionId:business.connectionId,chatId:business.to,
              messageId:business.messageId},1,7*86400)
            // Reserve bounded receipt/STOP capacity beyond the 3 dialogue
            // prompts. Abuse still uses event-idempotency and the global cap.
            if(business.terminal){
              await consumeRate(config,{op:'hh-tg-business-terminal-chat',
                connectionId:business.connectionId,chatId:business.to},4,86400)
            }else{
              await consumeRate(config,{op:'hh-tg-business-intent-chat',
                connectionId:business.connectionId,chatId:business.to},3,86400)
            }
            await consumeRate(config,{op:'hh-tg-business-intent-global'},100,86400)
            // The first client-authored service enquiry shows the fixed avatar
            // as its own Telegram message before any reply, never as a caption.
            // Unknown photo acceptance cannot block the actual service dialogue
            // or cause an automatic duplicate send on webhook retry.
            if(business.welcomePhoto===true){
              try{await sendHolisticBusinessWelcomePhoto({
                connectionId:business.connectionId,to:business.to,
              })}catch{console.error('HH_TG_BUSINESS_WELCOME_PHOTO_NOT_CONFIRMED')}
            }
            await sendHolisticBusinessRequestReply({connectionId:business.connectionId,
              to:business.to,text:business.reply})
          }catch{
            // Provider acceptance is not delivery; never re-send blindly.
            console.error('HH_TG_BUSINESS_REPLY_NOT_CONFIRMED')
          }
        }
        return NextResponse.json({ok:true},{headers:PRIVATE_HEADERS})
      }
      // After the existing consent/format/STOP workflow, respond to explicit
      // product lookup questions using only reviewed first-party sources.
      const secretary=await processTelegramBusinessSecretary(body,config)
      if(secretary.handled){
        if(secretary.reply){
          try{
            await consumeRate(config,{op:'hh-tg-secretary-reply',
              connectionId:secretary.connectionId,chatId:secretary.to,
              messageId:secretary.messageId},1,7*86400)
            await consumeRate(config,{op:'hh-tg-secretary-chat',
              connectionId:secretary.connectionId,chatId:secretary.to},15,86400)
            await consumeRate(config,{op:'hh-tg-secretary-global'},100,86400)
            await sendHolisticBusinessRequestReply({
              connectionId:secretary.connectionId,to:secretary.to,
              text:secretary.reply,buttons:secretary.buttons||[],
            })
          }catch{
            // Unknown send state never triggers an automatic duplicate retry.
            console.error('HH_TG_SECRETARY_REPLY_NOT_CONFIRMED')
          }
        }
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
      if(provider==='whatsapp'){
        const proof=await processWhatsAppAccountLink(event,config)
        if(proof.handled||!channelTransportReady('whatsapp'))continue
        if(event.type==='incoming'){
          const intake=await processWhatsAppDiagnostic(event,config)
          if(intake.handled&&intake.reply){
            // Consent/CRM state are committed before one reply attempt.
            // Uncertain provider outcomes must not automatically repeat.
            try{await sendWhatsAppDiagnosticPrompt({
              to:intake.to,text:intake.reply,keyboard:intake.keyboard,locale:intake.locale
            })}catch{console.error('HH_CRM_WA_PROMPT_SEND_UNCONFIRMED')}
          }
          // No contact is created from an unconsented generic message.
          continue
        }
      }
      if(provider==='telegram'){
        if(event.type==='callback_ignored'){
          try{await acknowledgeTelegramInlineCallback({
            callbackId:event.callbackId,to:event.userId,
            messageId:event.callbackMessageId})}catch{}
          continue
        }
        const companion=await processTelegramCompanion(event,config)
        if(companion.handled){
          // Client-initiated bootstrap of native Telegram Menu. Never do this
          // for callbacks, diagnostic deep links, media, STOP or owner video.
          // The signed webhook + committed Companion session are already
          // verified, and all Bot API calls run after the reply is committed.
          if(companion.text&&!event.callbackId&&shouldBootstrapTelegramNativeMenu(
             event,process.env.HH_CRM_MSG_TELEGRAM_USERNAME)){
            after(async()=>{
              try{
                // Across serverless instances, at most one bootstrap attempt
                // per rolling hour. Existing daily 09:00 cron remains fallback.
                await consumeRate(config,{op:'hh-crm-tg-native-menu-on-first-home'},1,3600)
                const {ensureTelegramCompanionNativeMenu}=await import(
                  '@/lib/crm/messenger-provider')
                const status=await ensureTelegramCompanionNativeMenu(process.env)
                if(status.ready)console.info('HH_CRM_TG_COMMAND_MENU_READY',{
                  source:'first_home',changedScopes:status.changedScopes||0})
                else console.error('HH_CRM_TG_COMMAND_MENU_NOT_READY',{reason:status.reason})
              }catch(error){
                if(error?.code!=='RATE_LIMITED')
                  console.error('HH_CRM_TG_COMMAND_MENU_SETUP_FAILED')
              }
            })
          }
          if(event.callbackId){
            try{await acknowledgeTelegramInlineCallback({
              callbackId:event.callbackId,to:event.userId,
              messageId:event.callbackMessageId})}catch{}
          }
          if(companion.text){
            try{await sendTelegramCompanionMessage({
              to:companion.to,text:companion.text,
              markup:companion.markup,locale:companion.locale,photo:companion.photo===true,
              presentation:companion.presentationFirstStart===true})
            }catch(error){
              const evidence=telegramPromptFailureEvidence(event.eventId,error,
                value=>operationHash(value,config))
              console.error('HH_CRM_TG_HOME_SEND_FAILED',evidence)
            }
          }
          continue
        }
        const diagnosticEvent=companion.reviewRequested
          ?{...event,rawText:'/start hhreview_'+companion.reviewLocale,inlineAction:null}
          :event
        // The V3 interviewer reuses this signed CRM bot and takes priority ONLY
        // for explicitly started or already active V3 diagnostic sessions.
        const aiIntake=await processTelegramAiV3(diagnosticEvent,config)
        if(aiIntake.handled){
          if(event.callbackId){
            try{await acknowledgeTelegramInlineCallback({
              callbackId:event.callbackId,to:event.userId,
              messageId:event.callbackMessageId})}catch{}
          }
          if(aiIntake.reply){
            try{await sendTelegramDiagnosticPrompt({
              to:aiIntake.to,text:aiIntake.reply,keyboard:aiIntake.keyboard,
              locale:aiIntake.locale,approvedPilotGuest:aiIntake.approvedPilotGuest,
            })}catch(error){
              const evidence=telegramPromptFailureEvidence(event.eventId,error,
                value=>operationHash(value,config))
              console.error('HH_CRM_TG_V3_PROMPT_SEND_FAILED',evidence)
            }
          }
          if(aiIntake.generate)after(async()=>{
            try{
              const ready=await finishTelegramAiV3(config,aiIntake.generate)
              if(ready?.reply)await sendTelegramDiagnosticPrompt({
                to:ready.to,text:ready.reply,keyboard:ready.keyboard,
                locale:ready.locale,approvedPilotGuest:ready.approvedPilotGuest,
              })
            }catch{
              // Never log client text, credentials, model prompt or Telegram IDs.
              console.error('HH_CRM_TG_V3_AI_AFTER_FAILED')
            }
          })
          continue
        }
        const intake=await processTelegramDiagnostic(diagnosticEvent,config)
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
              approvedPilotGuest:intake.approvedPilotGuest===true,locale:intake.locale,
                webAppUrl:intake.webAppUrl||null,
                presentation:intake.presentationFirstStart===true && telegramPresentationOnStart(event.rawText)})}catch(error){
              // Never repeat a prompt after an unknown Telegram result.
              // Log only allowlisted reason and server-secret HMAC correlation.
              const evidence=telegramPromptFailureEvidence(event.eventId,error,
                value=>operationHash(value,config))
              console.error('HH_CRM_TG_PROMPT_SEND_FAILED',evidence)
            }
          }
          continue
        }
        // Diagnostic buttons must never fall through to ordinary CRM ingestion.
        if(event.callbackId)continue
      }
      await ingestMessengerUpdate(provider,event,config)
    }
    return NextResponse.json({ok:true},{headers:PRIVATE_HEADERS})
  }catch(error){
    const safe=safeError(error)
    return NextResponse.json({ok:false},{status:safe.status>=500?503:400,headers:PRIVATE_HEADERS})
  }
}
