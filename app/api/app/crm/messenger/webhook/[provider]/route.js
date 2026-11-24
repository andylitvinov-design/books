import {telegramSupportUnavailable} from '@/lib/crm/telegram-support-quiz.mjs'
import { NextResponse,after } from 'next/server'
import { getAppConfig } from '@/lib/app/config'
import {AppError} from '@/lib/assessments/contracts'
import {channelTransportReady,telegramBotBusinessId,telegramBusinessTransportReady} from '@/lib/crm/messenger-policy'
import {consumeRate} from '@/lib/app/database'
import { PRIVATE_HEADERS, safeError } from '@/lib/app/http'
import { MESSENGER_CHANNELS } from '@/lib/crm/messenger-policy'
import { operationHash } from '@/lib/app/crypto'
import { telegramPromptFailureEvidence } from '@/lib/crm/telegram-prompt-diagnostics.mjs'
import { verifyMessengerWebhook,verifyMessengerChallenge,normalizeMessengerUpdates,ingestMessengerUpdate,processTelegramDiagnostic,processWhatsAppAccountLink,processWhatsAppDiagnostic } from '@/lib/crm/messenger-webhook'
import { sendTelegramDiagnosticPrompt, sendWhatsAppDiagnosticPrompt, ensureTelegramInlineWebhookUpdates, acknowledgeTelegramInlineCallback, sendTelegramCompanionMessage, sendHolisticBusinessRequestReply, sendHolisticBusinessWelcomePhoto, acknowledgeHolisticBusinessWelcomeCallback, assertHolisticBusinessConnection } from '@/lib/crm/messenger-provider'
import { telegramPresentationOnStart } from '@/lib/crm/telegram-presentation.mjs'
import {processTelegramCompanion} from '@/lib/crm/telegram-companion-service'
import {processTelegramAiV3,finishTelegramAiV3,finishTelegramFreePackagePhoto,finishTelegramWaveVoiceV3,bindTelegramWaveVoiceOffer,deliverTelegramWaveVoiceV3} from '@/lib/crm/telegram-ai-diagnostic-v3-service'
import {finalizeTelegramV3Service,notifyOwnerTelegramV3Service} from '@/lib/crm/telegram-v3-service-finalizer'
import {notifyOwnerAliFreePackage} from '@/lib/crm/telegram-free-package-owner-notice'
import {shouldBootstrapTelegramNativeMenu} from '@/lib/crm/telegram-companion-native-commands.mjs'
import { receiveOwnerTelegramVideoCrmFallback } from '@/lib/practitioners/owner-telegram-video-crm-fallback'
import {processTelegramBusinessConversation} from '@/lib/crm/telegram-business-service'
import {captureTelegramBotLead,captureTelegramBusinessLead} from '@/lib/crm/telegram-lead-capture'
import {captureTelegramBusinessInbox,setTelegramBusinessReplyState,telegramBotHumanTakeover} from '@/lib/crm/telegram-business-inbox'
import {telegramBusinessReplyFailure,telegramBusinessReplyCrmState} from '@/lib/crm/telegram-delivery-status.mjs'
import {captureTelegramLeadBestEffort} from '@/lib/crm/telegram-lead-capture-policy.mjs'
import {captureWhatsAppFirstContact,recordWhatsAppInboundReceipt} from '@/lib/crm/whatsapp-lead-capture'
import {whatsappHumanTakeoverActive} from '@/lib/crm/whatsapp-human-takeover'
import {archiveWhatsAppAliAcceptedReply} from '@/lib/crm/whatsapp-ali-reply-archive'
import {telegramBusinessMessageFromUpdate} from '@/lib/assist/telegram-business-request.mjs'
import {parseHiTelegramRating} from '@/lib/holistic-support/hi-learning-policy.mjs'
import {insertHiLearningQuality} from '@/lib/holistic-support/hi-learning-store'
import {processTelegramBusinessSecretary,gateTelegramBusinessSecretaryOptOut,secretaryStopped} from '@/lib/crm/telegram-secretary-service'
import {telegramBusinessWelcomeMenu,telegramBusinessWelcomeClick,telegramBusinessWelcomeTopic} from '@/lib/crm/telegram-business-welcome-menu.mjs'
import {composeTelegramSecretaryClarification} from '@/lib/crm/telegram-secretary-offers.mjs'

import {notifyConfirmedTelegramBusinessOwner} from '@/lib/crm/telegram-business-owner-notice'
import {processWhatsAppSecretary} from '@/lib/crm/whatsapp-secretary-service'
import {finalizeWhatsAppService,notifyOwnerWhatsAppService} from '@/lib/crm/whatsapp-service-finalizer'
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
    // Quality feedback is separate from Business ordering; never infer consent
    // from a service request or collect ordinary Telegram messages.
    if(provider==='telegram'&&process.env.HH_LEARNING_OBSERVATORY_ENABLED==='true'){
      const event=telegramBusinessMessageFromUpdate(body)
      const rating=event?parseHiTelegramRating(event.text):null
      if(rating){
        try{
          // Existing HMAC rate bucket deduplicates retried signed Telegram updates;
          // raw Telegram identifiers never reach the learning tables.
          await consumeRate(config,{op:'hi-learning-tg-update',connection:event.connectionId,
            updateId:event.updateId},1,86400)
          await consumeRate(config,{op:'hi-learning-tg-chat',connection:event.connectionId,
            chatId:event.chatId},3,86400)
          await consumeRate(config,{op:'hi-learning-tg-global'},80,86400)
          const result=await insertHiLearningQuality(config,{
            channel:'telegram',locale:rating.locale,signal:rating.signal,consent:true,
          },{trustedTelegram:true})
          if(result.saved){
            const thanks=rating.locale==='ru'?'Спасибо. Сохранена только анонимная оценка, без текста сообщения.':
              rating.locale==='es'?'Gracias. Solo se guardó la valoración anónima, sin el mensaje.':
              'Thank you. Only the anonymous rating was saved, not your message.'
            await sendHolisticBusinessRequestReply({connectionId:event.connectionId,
              to:event.chatId,text:thanks})
          }
        }catch{
          // Do not log Telegram text, IDs, credentials, or quality records.
          console.error('HH_TG_LEARNING_FEEDBACK_UNAVAILABLE')
        }
        return NextResponse.json({ok:true},{headers:PRIVATE_HEADERS})
      }
    }
    if(provider==='telegram'){
      const video=await receiveOwnerTelegramVideoCrmFallback(config,body)
      if(video.handled){
        // The verified private owner command may be the first update needing
        // callback_query delivery for the one-time YouTube publish button.
        if(/^\/(?:video(?:_done|_retry|_cancel)?(?:@[A-Za-z0-9_]+)?|start(?:@[A-Za-z0-9_]+)?\s+video)$/i.test(String(body.message?.text||'').trim()))
          await ensureTelegramInlineWebhookUpdates().catch(()=>{})
        return NextResponse.json({ok:true},{headers:PRIVATE_HEADERS})
      }
    }
    // Business callback buttons are distinct from ordinary bot callbacks.
    // A signed click is an informational choice, never a booking or consent.
    if(provider==='telegram'&&String(body.callback_query?.data||'').startsWith('hhbw1:')){
      const click=telegramBusinessWelcomeClick(body,telegramBotBusinessId(process.env))
      if(click&&telegramBusinessTransportReady(process.env)){
        let inbox=null
        try{
          await assertHolisticBusinessConnection({connectionId:click.connectionId,to:click.chatId})
          await acknowledgeHolisticBusinessWelcomeCallback(click.callbackId).catch(()=>{})
          if(!await secretaryStopped(click,config)){
            inbox=await captureTelegramBusinessInbox(body,config)
            if(inbox.matched&&inbox.recorded&&!inbox.humanActive){
              await consumeRate(config,{op:'hh-tg-business-welcome-topic',connectionId:click.connectionId,
                chatId:click.chatId,messageId:click.messageId,topic:click.topic},1,86400)
              await consumeRate(config,{op:'hh-tg-business-welcome-chat',connectionId:click.connectionId,chatId:click.chatId},8,86400)
              await consumeRate(config,{op:'hh-tg-secretary-global'},100,86400)
              if(!await secretaryStopped(click,config)){
                const plan=telegramBusinessWelcomeTopic(click.locale,click.topic)
                await setTelegramBusinessReplyState(config,inbox,'send_pending')
                await sendHolisticBusinessRequestReply({connectionId:click.connectionId,to:click.chatId,...plan})
                await setTelegramBusinessReplyState(config,inbox,'provider_accepted')
              }
            }
          }
        }catch(error){
          const failure=telegramBusinessReplyFailure(error)
          try{await setTelegramBusinessReplyState(config,inbox,telegramBusinessReplyCrmState(failure))}catch{}
          console.error('HH_TG_BUSINESS_WELCOME_TOPIC_FAILED:'+failure)
        }
      }
      return NextResponse.json({ok:true},{headers:PRIVATE_HEADERS})
    }
    // Durable STOP gate for the account secretary, including contacts who
    // have never ordered. This signed update is not a CRM lead.
    if(provider==='telegram'){
      const stop=await gateTelegramBusinessSecretaryOptOut(body,config)
      if(stop.blocked)return NextResponse.json({ok:true},{headers:PRIVATE_HEADERS})
    }
    // A first verified Business contact becomes an unqualified CRM lead before
    // optional service/FAQ dialogue; no unconsented message body is stored.
    const businessLead=provider==='telegram'
      ?await captureTelegramLeadBestEffort(
        ()=>captureTelegramBusinessLead(body,config),
        ()=>console.error('HH_TG_BUSINESS_LEAD_CAPTURE_UNAVAILABLE')):null
    // The signed Business connection gets its own private thread in the same
    // CRM inbox; before owner handoff only neutral metadata is saved.
    let telegramBusinessInbox=null
    if(provider==='telegram'){
      telegramBusinessInbox=await captureTelegramBusinessInbox(body,config,businessLead)
      // A confirmed human reply takes precedence over AI service/FAQ scripts.
      if(telegramBusinessInbox.humanActive)return NextResponse.json({ok:true},{headers:PRIVATE_HEADERS})
      // crm_msg_ingest rejects duplicate signed provider events durably, even
      // after the 24h SQL rate-limit window expires. Never reply a second time
      // to an old update (or reply before its CRM receipt was persisted).
      if(telegramBusinessInbox.matched&&telegramBusinessInbox.recorded!==true)
        return NextResponse.json({ok:true},{headers:PRIVATE_HEADERS})
    }
    // Separate signed Business-chat service intake: only public service-code
    // messages and explicit short replies, never ordinary personal text or
    // diagnostic/Companion updates. Confirmation persists before acknowledgement.
    if(provider==='telegram'){
      const business=await processTelegramBusinessConversation(body,config)
      if(business.handled){
        // The signed Telegram Business CRM confirmation is already committed.
        // Notify only the paired, consented owner bot; a provider failure must
        // never change the client's reply or turn an enquiry into a booking.
        if(business.terminal)after(async()=>{
          try{
            const notice=await notifyConfirmedTelegramBusinessOwner(config,body)
            if(notice.attempted>0&&notice.accepted!==1)
              console.error('HH_TG_BUSINESS_OWNER_NOTICE_UNCONFIRMED')
          }catch{
            console.error('HH_TG_BUSINESS_OWNER_NOTICE_FAILED')
          }
        })
        if(business.reply){
          let providerAccepted=false
          try{
            await consumeRate(config,{op:'hh-tg-business-intent-message',
              connectionId:business.connectionId,chatId:business.to,
              messageId:business.messageId},1,86400)
            // Reserve bounded receipt/STOP capacity beyond the 3 dialogue
            // prompts. Abuse still uses event-idempotency and the global cap.
            if(business.terminal){
              await consumeRate(config,{op:'hh-tg-business-terminal-chat',
                connectionId:business.connectionId,chatId:business.to},4,86400)
            }else{
              await consumeRate(config,{op:'hh-tg-business-intent-chat',
                connectionId:business.connectionId,chatId:business.to},
                business.serviceKey==='ai_secretary'?16:
                  business.serviceKey==='personal_review'?8:3,86400)
            }
            await consumeRate(config,{op:'hh-tg-business-intent-global'},100,86400)
            await setTelegramBusinessReplyState(config,telegramBusinessInbox,'send_pending',business)
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
              to:business.to,text:business.reply,buttons:business.buttons||[]})
            providerAccepted=true
          }catch(error){
            // Keep the inbound item actionable in Messages. Unknown outcomes
            // remain non-retryable so a slow Telegram response cannot duplicate.
            const failure=telegramBusinessReplyFailure(error)
            const state=telegramBusinessReplyCrmState(failure)
            try{await setTelegramBusinessReplyState(config,telegramBusinessInbox,state,business)}
            catch{console.error('HH_TG_BUSINESS_REPLY_STATE_UNAVAILABLE')}
            console.error('HH_TG_BUSINESS_REPLY_FAILED:'+failure)
          }
          if(providerAccepted)try{await setTelegramBusinessReplyState(config,telegramBusinessInbox,'provider_accepted',business)}
            catch{console.error('HH_TG_BUSINESS_REPLY_STATE_UNAVAILABLE')}
        }else if(business.failure){
          const state=telegramBusinessReplyCrmState(business.failure)
          try{await setTelegramBusinessReplyState(config,telegramBusinessInbox,state,business)}
          catch{console.error('HH_TG_BUSINESS_REPLY_STATE_UNAVAILABLE')}
          console.error('HH_TG_BUSINESS_REPLY_FAILED:'+business.failure)
        }else try{await setTelegramBusinessReplyState(config,telegramBusinessInbox,'processed',business)}
          catch{console.error('HH_TG_BUSINESS_REPLY_STATE_UNAVAILABLE')}
        return NextResponse.json({ok:true},{headers:PRIVATE_HEADERS})
      }
      // After the existing consent/format/STOP workflow, respond to explicit
      // product lookup questions using only reviewed first-party sources.
      const secretary=await processTelegramBusinessSecretary(body,config,process.env,{
        // A verified, non-suppressed existing CRM contact replied after Ali's
        // one-time welcome. New contacts still use the original greeting.
        allowClarification:telegramBusinessInbox?.matched===true&&
          telegramBusinessInbox.recorded===true&&
          businessLead?.created!==true&&businessLead?.suppressed!==true,
      })
      if(secretary.handled){
        if(secretary.reply){
          let providerAccepted=false
          try{
            await consumeRate(config,{op:'hh-tg-secretary-reply',
              connectionId:secretary.connectionId,chatId:secretary.to,
              messageId:secretary.messageId},1,86400)
            await consumeRate(config,{op:'hh-tg-secretary-chat',
              connectionId:secretary.connectionId,chatId:secretary.to},15,86400)
            await consumeRate(config,{op:'hh-tg-secretary-global'},100,86400)
            // Bounded generic clarifications prevent an endless echo loop.
            if(secretary.kind==='clarify')
              await consumeRate(config,{op:'hh-tg-secretary-clarify-chat',
                connectionId:secretary.connectionId,chatId:secretary.to},12,86400)
            // Telemetry failures do not silence otherwise permitted messages.
            try{await setTelegramBusinessReplyState(config,telegramBusinessInbox,'send_pending')}
            catch{console.error('HH_TG_SECRETARY_REPLY_STATE_UNAVAILABLE')}
            await sendHolisticBusinessRequestReply({
              connectionId:secretary.connectionId,to:secretary.to,
              text:secretary.reply,buttons:secretary.buttons||[],
            })
            providerAccepted=true
          }catch(error){
            // Unknown Telegram acceptance is never blindly retried.
            const failure=telegramBusinessReplyFailure(error)
            try{await setTelegramBusinessReplyState(config,telegramBusinessInbox,telegramBusinessReplyCrmState(failure))}
            catch{console.error('HH_TG_SECRETARY_REPLY_STATE_UNAVAILABLE')}
            console.error('HH_TG_SECRETARY_REPLY_FAILED:'+failure)
          }
          if(providerAccepted)try{await setTelegramBusinessReplyState(config,telegramBusinessInbox,'provider_accepted')}
            catch{console.error('HH_TG_SECRETARY_REPLY_STATE_UNAVAILABLE')}
        }
        return NextResponse.json({ok:true},{headers:PRIVATE_HEADERS})
      }
      // Unknown first customer message should not disappear into a silent chat.
      // Reply at most once, only after the first CRM contact commit.
      if(businessLead?.created){
        let providerAccepted=false
        try{
          const welcome=telegramBusinessWelcomeMenu(businessLead.locale)
          const fallback=composeTelegramSecretaryClarification('hi',welcome.locale)
          let inlineReady=false
          try{
            await ensureTelegramInlineWebhookUpdates(process.env,{businessVerified:true})
            inlineReady=true
          }catch{console.error('HH_TG_BUSINESS_WELCOME_INLINE_UNAVAILABLE')}
          // Neutral acknowledgement only, not an approved booking or paid order.
          try{await setTelegramBusinessReplyState(config,telegramBusinessInbox,'send_pending')}
          catch{console.error('HH_TG_BUSINESS_FIRST_REPLY_STATE_UNAVAILABLE')}
          // Send one first-party thematic photo BEFORE the text. Photo failure
          // never blocks the actual reply, nor retries an ambiguous provider send.
          try{await sendHolisticBusinessWelcomePhoto({connectionId:businessLead.connectionId,
            to:businessLead.chatId,generalWelcome:true})}
          catch{console.error('HH_TG_BUSINESS_WELCOME_PHOTO_NOT_CONFIRMED')}
          await sendHolisticBusinessRequestReply({connectionId:businessLead.connectionId,
            to:businessLead.chatId,...(inlineReady?{text:welcome.text,welcomeLocale:welcome.locale}:
              {text:fallback.text,buttons:fallback.buttons})})
          providerAccepted=true
        }catch(error){
          const failure=telegramBusinessReplyFailure(error)
          try{await setTelegramBusinessReplyState(config,telegramBusinessInbox,telegramBusinessReplyCrmState(failure))}
          catch{console.error('HH_TG_BUSINESS_FIRST_REPLY_STATE_UNAVAILABLE')}
          console.error('HH_TG_BUSINESS_FIRST_REPLY_FAILED:'+failure)
        }
        if(providerAccepted)try{await setTelegramBusinessReplyState(config,telegramBusinessInbox,'provider_accepted')}
          catch{console.error('HH_TG_BUSINESS_FIRST_REPLY_STATE_UNAVAILABLE')}
      }
    }

    const updates=normalizeMessengerUpdates(provider,body)
    // Never silence a valid client reply because the independent, encrypted
    // first-contact CRM receipt has a temporary persistence failure. Preserve
    // Telegram's retry by returning 503 AFTER normal dialogue processing.
    let botLeadCapturePendingRetry=false
    // A previously registered bot may subscribe to 'message' only. Upgrade
    // the SAME already-owned signed webhook before its next inline prompt.
    // Never replace a foreign webhook or drop Telegram's pending updates.
    if(provider==='telegram'&&updates.some(event=>event.type==='incoming'&&!event.callbackId)){
      try{await ensureTelegramInlineWebhookUpdates()}
      catch{console.error('HH_TG_INLINE_WEBHOOK_SYNC_UNAVAILABLE')}
    }
    for(const event of updates){
      if(provider==='whatsapp'){
        let waCaptureSuppressed=false
        // The same signed Meta message must first create a CRM contact and
        // replyable thread even when the client has not chosen a service or
        // consented to AI diagnostics. Never store unconsented message text.
        if(event.type==='incoming'){
          try{
            const first=await captureWhatsAppFirstContact(event,config)
            waCaptureSuppressed=first.suppressed===true
          }catch{
            console.error('HH_CRM_WA_FIRST_CONTACT_UNAVAILABLE')
            throw new AppError('WHATSAPP_CRM_CONTACT_UNCONFIRMED',503)
          }
        }
        const proof=await processWhatsAppAccountLink(event,config)
        if(proof.handled||!channelTransportReady('whatsapp')){
          if(proof.handled&&event.type==='incoming'&&!waCaptureSuppressed)
            await recordWhatsAppInboundReceipt(event,config)
          continue
        }
        if(event.type==='incoming'){
          if(waCaptureSuppressed)continue
          // When the owner takes this WhatsApp thread, Ali must not speak
          // over the human. Preserve one neutral CRM receipt for the inbound.
          // STOP deliberately bypasses the pause and remains suppressible.
          if(await whatsappHumanTakeoverActive(event,config)){
            await recordWhatsAppInboundReceipt(event,config)
            continue
          }
          // Reuse the verified public Secretary catalogue, not a second AI
          // provider. Never intercept consent, STOP or an active private intake.
          const secretary=await processWhatsAppSecretary(event,config)
          if(secretary.handled){
            // Each accepted WhatsApp update is reflected in the operator CRM,
            // but outside explicit intake only a neutral receipt is retained.
            if(!waCaptureSuppressed)
              await recordWhatsAppInboundReceipt(event,config)
            if(secretary.reply&&!(await whatsappHumanTakeoverActive(event,config))){
              try{
                await consumeRate(config,{op:'hh-wa-secretary-chat',
                  peer:operationHash({business:event.accountId,peer:event.userId},config)},12,86400)
                await consumeRate(config,{op:'hh-wa-secretary-global'},100,86400)
                const accepted=await sendWhatsAppDiagnosticPrompt({to:secretary.to,text:secretary.reply,
                  locale:secretary.locale})
                // Provider acceptance is not delivery. Archive only when a
                // prior private CRM consent exists; no second Meta send.
                if(accepted?.status==='accepted'&&accepted.providerId)try{
                  await archiveWhatsAppAliAcceptedReply(event,config,secretary.reply,accepted.providerId)
                }catch{console.error('HH_CRM_WA_ALI_REPLY_ARCHIVE_UNCONFIRMED')}
              }catch{console.error('HH_CRM_WA_SECRETARY_SEND_UNCONFIRMED')}
            }
            continue
          }
          const intake=await processWhatsAppDiagnostic(event,config)
          if(intake.serviceFinalize){
            try{
              const finished=await finalizeWhatsAppService(config,intake.serviceFinalize)
              intake.reply=finished.message
              if(finished.saved)after(async()=>{
                try{await notifyOwnerWhatsAppService(config,finished)}
                catch{console.error('HH_CRM_WA_OWNER_NOTICE_UNCONFIRMED')}
              })
            }catch{
              intake.reply=event.diagnosticLocale==='ru'
                ?'Не удалось подтвердить сохранение заявки. Напишите /retry_request.'
                :'Unable to confirm saving your request. Send /retry_request.'
              console.error('HH_CRM_WA_SERVICE_FINALIZE_UNCONFIRMED')
            }
          }else if(intake.serviceFinalizeFailed){
            intake.reply=intake.locale==='ru'
              ?'Пока не удалось подтвердить заявку. Напишите /retry_request.'
              :intake.locale==='es'
                ?'Aún no puedo confirmar la solicitud. Envía /retry_request.'
                :'I cannot confirm your request yet. Send /retry_request.'
          }
          // If intake stored an explicitly consented message, the original
          // provider event already exists and this idempotent receipt is a no-op.
          // Otherwise retain a neutral touchpoint, never personal text/media.
          if(!waCaptureSuppressed)
            await recordWhatsAppInboundReceipt(event,config)
          if(intake.handled&&intake.reply&&!(await whatsappHumanTakeoverActive(event,config))){
            // Consent/CRM state are committed before one reply attempt.
            // Uncertain provider outcomes must not automatically repeat.
            try{
              const accepted=await sendWhatsAppDiagnosticPrompt({
                to:intake.to,text:intake.reply,keyboard:intake.keyboard,locale:intake.locale
              })
              if(accepted?.status==='accepted'&&accepted.providerId)try{
                await archiveWhatsAppAliAcceptedReply(event,config,intake.reply,accepted.providerId)
              }catch{console.error('HH_CRM_WA_ALI_REPLY_ARCHIVE_UNCONFIRMED')}
            }catch{console.error('HH_CRM_WA_PROMPT_SEND_UNCONFIRMED')}
          }
          // Every verified, connected inbound has a contact and at least
          // a neutral message receipt, independent of the chosen scenario.
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
        // A signed first customer message is visible in CRM even when the
        // voluntary diagnostic has not yet reached /agree. No raw text is stored.
        // The customer must appear in the CRM inbox before any bot reply.
        // On a transient persistence failure Telegram retries the signed
        // update; do not return a false 200 success and silently lose a lead.
        if(event.type==='incoming'&&!event.callbackId){
          try{await captureTelegramBotLead(event,config)}
          catch{
            console.error('HH_TG_BOT_LEAD_CAPTURE_UNAVAILABLE')
            botLeadCapturePendingRetry=true
          }
        }
        // After the owner manually replies in CRM, keep later client messages
        // encrypted in the same inbox and do NOT let AI interrupt the human.
        // STOP and explicit bot/menu restarts remain serviced normally.
        if(event.type==='incoming'&&!event.callbackId&&!event.stop&&
          !/^(?:стоп|stop|остановить|parar|detener)$/i.test(String(event.rawText||'').trim())&&
          !/^\/(?:ai|start)(?:@[A-Za-z0-9_]+)?(?:\s|$)/i.test(String(event.rawText||'').trim())&&
          await telegramBotHumanTakeover(event,config)){
          await ingestMessengerUpdate('telegram',event,config)
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
        const diagnosticEvent=companion.assistantStart
          ?{...event,rawText:companion.assistantStart,inlineAction:null}
          :companion.businessStart
            ?{...event,rawText:companion.businessStart,inlineAction:null}
            :companion.supportStart
              ?{...event,rawText:companion.supportStart,inlineAction:null}
              :companion.reviewRequested
                ?{...event,rawText:'/start hhreview_'+companion.reviewLocale,inlineAction:null}
                :event
        // The V3 interviewer reuses this signed CRM bot and takes priority ONLY
        // for explicitly started or already active V3 diagnostic sessions.
        const aiIntake=await processTelegramAiV3(diagnosticEvent,config)
        if(aiIntake.handled){
          if(aiIntake.serviceFinalize){
            try{
              const finished=await finalizeTelegramV3Service(config,aiIntake.serviceFinalize)
              if(finished.saved){
                // Do not claim "request submitted" until after the existing
                // protected practitioner CRM service enquiry transaction commits.
                aiIntake.reply=finished.message
                after(async()=>{
                  try{await notifyOwnerTelegramV3Service(config,finished)}
                  catch{console.error('HH_TG_V3_SERVICE_NOTICE_NOT_CONFIRMED')}
                })
              }else aiIntake.reply=finished.message||null
            }catch{
              aiIntake.reply=aiIntake.locale==='ru'
                ?'Не удалось подтвердить сохранение в CRM. Отправьте /retry_request — новая заявка не создастся.'
                :aiIntake.locale==='es'
                  ?'No pude confirmar la solicitud en CRM. Envía /retry_request para volver a comprobarlo.'
                  :'CRM request not yet confirmed. Send /retry_request to check again without duplicates.'
              console.error('HH_TG_V3_SERVICE_FINALIZE_NOT_CONFIRMED')
            }
          }
          if(event.callbackId){
            try{await acknowledgeTelegramInlineCallback({
              callbackId:event.callbackId,to:event.userId,
              messageId:event.callbackMessageId})}catch{}
          }
          if(aiIntake.reply){
            try{
              const delivered=await sendTelegramDiagnosticPrompt({
                to:aiIntake.to,text:aiIntake.reply,keyboard:aiIntake.keyboard,
                locale:aiIntake.locale,approvedPilotGuest:aiIntake.approvedPilotGuest,
                serviceWelcome:aiIntake.serviceWelcome===true,
                freeWelcomePhoto:aiIntake.freeWelcomePhoto===true,
                welcomePhotoKey:aiIntake.welcomePhotoKey||null,
              })
              if(aiIntake.voiceOffer)await bindTelegramWaveVoiceOffer(
                config,aiIntake.voiceOffer,delivered.providerId)
            }catch(error){
              const evidence=telegramPromptFailureEvidence(event.eventId,error,
                value=>operationHash(value,config))
              console.error('HH_CRM_TG_V3_PROMPT_SEND_FAILED',evidence)
            }
          }
          if(aiIntake.ownerProgress)after(async()=>{
            try{await notifyOwnerAliFreePackage(config,aiIntake.ownerProgress)}
            catch{console.error('HH_ALI_FREE_STAGE_NOTICE_UNCONFIRMED')}
          })
          if(aiIntake.photoVerify)after(async()=>{
            try{
              const ready=await finishTelegramFreePackagePhoto(config,aiIntake.photoVerify)
              if(ready?.reply){
                try{
                  await sendTelegramDiagnosticPrompt({
                    to:ready.to,text:ready.reply,keyboard:ready.keyboard,
                    locale:ready.locale,approvedPilotGuest:ready.approvedPilotGuest})
                }catch{console.error('HH_ALI_FREE_PHOTO_ACK_UNCONFIRMED')}
              }
              if(ready?.ownerProgress){
                try{await notifyOwnerAliFreePackage(config,ready.ownerProgress)}
                catch{console.error('HH_ALI_FREE_PHOTO_OWNER_NOTICE_UNCONFIRMED')}
              }
            }catch{console.error('HH_ALI_FREE_PHOTO_PROCESS_UNCONFIRMED')}
          })
          if(aiIntake.generate)after(async()=>{
            try{
              const ready=aiIntake.generate.voiceNote
                ?await finishTelegramWaveVoiceV3(config,aiIntake.generate)
                :await finishTelegramAiV3(config,aiIntake.generate)
              if(ready?.reply){
                if(aiIntake.generate.voiceNote){
                  // Final consent + STOP check and ONE send under the same
                  // signed session lock; never reply after a committed revoke.
                  await deliverTelegramWaveVoiceV3(config,aiIntake.generate,
                    ready,sendTelegramDiagnosticPrompt)
                }else await sendTelegramDiagnosticPrompt({
                  to:ready.to,text:ready.reply,keyboard:ready.keyboard,
                  locale:ready.locale,approvedPilotGuest:ready.approvedPilotGuest,
                })
              }
              if(ready?.ownerProgress){
                try{await notifyOwnerAliFreePackage(config,ready.ownerProgress)}
                catch{console.error('HH_ALI_FREE_ANSWER_OWNER_NOTICE_UNCONFIRMED')}
              }
            }catch{
              // Never log client text, credentials, model prompt or Telegram IDs.
              console.error('HH_CRM_TG_V3_AI_AFTER_FAILED')
            }
          })
          continue
        }
        // A completed Support quiz must NEVER disappear into a fallback router.
        // When V3 consented AI is disabled, show a safe public website route.
        if(companion.supportStart){
          if(event.callbackId){
            try{await acknowledgeTelegramInlineCallback({
              callbackId:event.callbackId,to:event.userId,
              messageId:event.callbackMessageId})}catch{}
          }
          try{await sendTelegramCompanionMessage({
            to:String(event.userId),text:telegramSupportUnavailable(
              companion.supportLocale,companion.supportDigits),
            locale:companion.supportLocale,
          })}catch{console.error('HH_CRM_TG_SUPPORT_FALLBACK_NOT_CONFIRMED')}
          continue
        }
        // A selected Menu journey must not disappear into generic CRM handling.
        // If V3 is unavailable, only verified first-party links are offered.
        if(companion.assistantStart||companion.businessStart){
          const lang=companion.assistantLocale||companion.businessLocale||'en'
          const isBusiness=Boolean(companion.businessStart)
          if(event.callbackId){
            try{await acknowledgeTelegramInlineCallback({
              callbackId:event.callbackId,to:event.userId,
              messageId:event.callbackMessageId})}catch{}
          }
          const text=isBusiness
            ?(lang==='ru'?'💼 Бизнес-услуги доступны здесь: ':'💼 Business consulting is here: ')+
              'https://holistichouse.vercel.app/'+lang+'/services/business-consulting'
            :(lang==='ru'?'💬 Диалог с Ali сейчас недоступен в Telegram. Откройте чат на сайте: ':
              '💬 Ali chat is temporarily unavailable in Telegram. Open it on the website: ')+
              'https://holistichouse.vercel.app/'+lang+'/app/messages?section=ai'
          try{await sendTelegramCompanionMessage({
            to:String(event.userId),text,locale:lang,
          })}catch{console.error('HH_CRM_TG_MENU_HANDOFF_FALLBACK_UNCONFIRMED')}
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
        if(companion.reviewRequested){
          if(event.callbackId){
            try{await acknowledgeTelegramInlineCallback({
              callbackId:event.callbackId,to:event.userId,
              messageId:event.callbackMessageId})}catch{}
          }
          const lang=companion.reviewLocale||'en'
          try{await sendTelegramCompanionMessage({
            to:String(event.userId),locale:lang,
            text:(lang==='ru'?'🧭 Бесплатная диагностика доступна здесь: ':
              '🧭 Free personal review is available here: ')+
              'https://holistichouse.vercel.app/'+lang+'/services/free-situation-review',
          })}catch{console.error('HH_CRM_TG_DIAGNOSTIC_FALLBACK_UNCONFIRMED')}
          continue
        }
        // Diagnostic buttons cannot become generic CRM events. Non-text
        // unhandled voice/photo/sticker stays a NEUTRAL receipt, never a
        // fabricated transcript or an implicit photo/diagnostic consent.
        if(event.callbackId)continue
      }
      const archived=await ingestMessengerUpdate(provider,event,config)
      // After Companion, V3, legacy interview and human takeover had their
      // chance, reply to EACH newly archived signed Bot turn. CRM replay
      // receipts prevent duplicates across retries and serverless instances.
      if(provider==='telegram'&&event?.type==='incoming'&&archived===true&&
         !event.callbackId&&typeof event.rawText==='string'){
        const raw=event.rawText
        const locale=/[а-яё]/iu.test(raw)?'ru':
          /[¡¿áéíóúñ]|\b(?:hola|gracias|qué|que|cómo|dónde)\b/iu.test(raw)?'es':
          event.language?.startsWith('ru')?'ru':event.language?.startsWith('es')?'es':'en'
        const mediaKind=event.isTelegramVoice?'voice':
          event.photoFileId?'photo':!raw?'media':null
        const clarified=composeTelegramSecretaryClarification(raw,locale,{mediaKind})
        if(clarified?.text)try{
          await consumeRate(config,{op:'hh-tg-bot-clarify-chat',to:event.userId},12,86400)
          await consumeRate(config,{op:'hh-tg-bot-clarify-global'},100,86400)
          await sendTelegramDiagnosticPrompt({
            to:String(event.userId),text:clarified.text,locale,
          })
        }catch{
          // Never retry unknown Telegram acceptance and risk duplicates.
          console.error('HH_TG_BOT_CLARIFY_SEND_UNCONFIRMED')
        }
      }
    }
    // If the contact write failed, Telegram retries this signed update. The
    // committed Companion/V3 stages and provider event hashes prevent a
    // duplicate bot response; a later attempt can still create the CRM lead.
    if(botLeadCapturePendingRetry)throw new AppError('TELEGRAM_CRM_CONTACT_UNCONFIRMED',503)
    return NextResponse.json({ok:true},{headers:PRIVATE_HEADERS})
  }catch(error){
    const safe=safeError(error)
    if(provider==='telegram')console.error('HH_TG_SIGNED_WEBHOOK_PROCESSING_FAILED',{
      code:/^[A-Z0-9_]{2,48}$/.test(String(safe.code||''))?safe.code:'UNKNOWN',
    })
    return NextResponse.json({ok:false},{status:safe.status>=500?503:400,headers:PRIVATE_HEADERS})
  }
}
