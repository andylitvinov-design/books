import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { practitionerEmailAllowed } from '@/lib/app/practitioner-access'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { AppError, onlyKeys } from '@/lib/assessments/contracts'
import { createCrmRepository, crmEnabled } from '@/lib/crm/repository'
import { MESSENGER_CHANNELS } from '@/lib/crm/messenger-policy'
import { verifyMessengerBusiness, ensureTelegramWebhook, sendOneMessengerMessage, sendHolisticBusinessRequestReply, inspectTelegramBotIdentity } from '@/lib/crm/messenger-provider'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
async function handle(request){
  let auth
  try{
    if(!crmEnabled())throw new AppError('CRM_UNAVAILABLE',503)
    const config=getAppConfig()
    requestOrigin(request,config)
    if(request.method==='POST')requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    if(request.headers.get('x-hh-account-id')!==actor.id)throw new AppError('ACCOUNT_CHANGED',409)
    if(!practitionerEmailAllowed(actor))throw new AppError('ACCESS_DENIED',403)
    const repo=createCrmRepository(config)
    let data
    if(request.method==='GET'){
      const params=new URL(request.url).searchParams
      const allowed=['thread','threadsBefore','messagesBefore']
      if([...params.keys()].some(key=>!allowed.includes(key))||
         allowed.some(key=>params.getAll(key).length>1))
        throw new AppError('INVALID_MESSENGER_CURSOR',400)
      data=await repo.withOwner(actor,store=>store.listMessengerThreads(
        params.get('thread'),{threadsBefore:params.get('threadsBefore'),messagesBefore:params.get('messagesBefore')}
      ))
    }else{
      const body=await readBody(request,4096)
      onlyKeys(body,['action','payload'])
      const {action,payload}=body
      if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new AppError('INVALID_BODY',400)
      if(action==='verify_telegram'){
        // Read-only owner preflight; no pilot chat, webhook registration,
        // customer message or new CRM row is required.
        onlyKeys(payload,['channel'])
        if(payload.channel!=='telegram')throw new AppError('INVALID_CHANNEL',400)
        data=await inspectTelegramBotIdentity()
      }else if(action==='sync_telegram_business_updates'){
        // A connected owner can repair old message-only webhook subscriptions.
        // Never replace another application's webhook, expose credentials,
        // send a client message, or bypass the Telegram Business access scope.
        onlyKeys(payload,['channel'])
        if(payload.channel!=='telegram')throw new AppError('INVALID_CHANNEL',400)
        const preflight=await inspectTelegramBotIdentity()
        if(preflight.webhookState!=='connected')throw new AppError('TELEGRAM_WEBHOOK_NOT_OWNED',409)
        if(preflight.businessCapable!==true)throw new AppError('TELEGRAM_BUSINESS_NOT_ENABLED',409)
        await ensureTelegramWebhook(process.env,{ownerVerifiedSync:true})
        const checked=await inspectTelegramBotIdentity()
        if(checked.webhookState!=='connected'||checked.businessUpdatesReady!==true)
          throw new AppError('TELEGRAM_BUSINESS_SUBSCRIPTION_UNVERIFIED',503)
        data=checked
      }else if(action==='connect'){
        onlyKeys(payload,['channel'])
        if(!MESSENGER_CHANNELS.includes(payload.channel))throw new AppError('INVALID_CHANNEL',400)
        const externalId=await verifyMessengerBusiness(payload.channel)
        if(payload.channel==='telegram')await ensureTelegramWebhook()
        data=await repo.withOwner(actor,store=>store.connectMessengerChannel(payload.channel,externalId))
      }else if(action==='read'){
        onlyKeys(payload,['threadId'])
        data=await repo.withOwner(actor,store=>store.readMessengerThread(payload.threadId))
      }else if(action==='note'){
        onlyKeys(payload,['threadId','noteId','text'])
        data=await repo.withOwner(actor,store=>store.addMessengerNote(payload))
      }else if(action==='set_human_takeover'){
        onlyKeys(payload,['threadId','enabled'])
        data=await repo.withOwner(actor,store=>store.setMessengerHumanTakeover(payload))
      }else if(action==='set_stage'){
        onlyKeys(payload,['threadId','lifecycle','expectedRevision'])
        data=await repo.withOwner(actor,async store=>{
          const id=await store.messengerContactId(payload.threadId)
          return store.setLifecycle({id,lifecycle:payload.lifecycle,expectedRevision:payload.expectedRevision})
        })
      }else if(action==='create_followup'){
        onlyKeys(payload,['threadId','id','kind','dueOn'])
        data=await repo.withOwner(actor,async store=>{
          const contactId=await store.messengerContactId(payload.threadId)
          return store.createFollowup({id:payload.id,contactId,kind:payload.kind,dueOn:payload.dueOn})
        })
      }else if(action==='complete_followup'){
        onlyKeys(payload,['threadId','id','expectedRevision'])
        data=await repo.withOwner(actor,async store=>{
          const belongs=await store.messengerFollowupBelongsToThread(payload.threadId,payload.id)
          if(!belongs) throw new AppError('NOT_FOUND',404)
          return store.changeFollowup({id:payload.id,action:'complete',expectedRevision:payload.expectedRevision})
        })
      }else if(action==='send'){
        onlyKeys(payload,['threadId','requestId','text','purpose'])
        const reservation=await repo.withOwner(actor,store=>store.reserveMessengerReply(payload))
        if(reservation.duplicate){
          data={id:reservation.id,status:reservation.status,duplicate:true}
        }else{
          // Recheck the latest suppression, account state and reply window
          // after the reservation transaction but BEFORE the provider request.
          const dispatch=await repo.withOwner(actor,store=>store.checkMessengerReplyReady(reservation.id))
          if(!dispatch.allowed){
            const blocked=await repo.withOwner(actor,store=>
              store.finalizeMessengerReply(reservation.id,reservation.channel,'blocked',null,
                {code:dispatch.reason,stage:'eligibility'}))
            data={...blocked,reason:dispatch.reason}
          }else{
            let status='unknown',providerId=null,failure=null
            try{
              // The signed Business thread carries an owner-encrypted connection
              // ID. Recheck official can_reply before sending FROM @holistichouse;
              // never send a Business customer reply from the ordinary bot.
              const accepted=reservation.businessConnectionId
                ?await sendHolisticBusinessRequestReply({
                    connectionId:reservation.businessConnectionId,
                    to:reservation.to,text:reservation.text})
                :await sendOneMessengerMessage({channel:reservation.channel,
                    to:reservation.to,text:reservation.text,
                    approvedPilotGuest:dispatch.approvedPilotGuest===true,
                    approvedPublicDiagnostic:dispatch.approvedPublicDiagnostic===true})
              status=accepted.status
              providerId=accepted.providerId
            }catch(e){
              if(e?.code==='PROVIDER_REJECTED')status='failed'
              // Preserve only allowlisted machine codes; never expose provider bodies.
              failure={code:e?.code,stage:'provider'}
            }
            try{data=await repo.withOwner(actor,store=>
              store.finalizeMessengerReply(reservation.id,reservation.channel,status,providerId,failure))}
            catch{data={id:reservation.id,status:'unknown'}}
          }
          data={...data,duplicate:false}
        }
      }else throw new AppError('INVALID_ACTION',400)
    }
    return auth.apply(NextResponse.json(data,{headers:PRIVATE_HEADERS}))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
export const GET=handle
export const POST=handle
