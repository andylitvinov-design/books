import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { practitionerEmailAllowed } from '@/lib/app/practitioner-access'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { AppError, onlyKeys } from '@/lib/assessments/contracts'
import { createCrmRepository, crmEnabled } from '@/lib/crm/repository'
import { MESSENGER_CHANNELS } from '@/lib/crm/messenger-policy'
import { verifyMessengerBusiness, ensureTelegramWebhook, sendOneMessengerMessage } from '@/lib/crm/messenger-provider'
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
      const threadId=new URL(request.url).searchParams.get('thread')
      data=await repo.withOwner(actor,store=>store.listMessengerThreads(threadId))
    }else{
      const body=await readBody(request,4096)
      onlyKeys(body,['action','payload'])
      const {action,payload}=body
      if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new AppError('INVALID_BODY',400)
      if(action==='connect'){
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
          const contactId=await store.messengerContactId(payload.threadId)
          const rows=await store.listFollowups()
          if(!rows.some(r=>r.id===payload.id&&r.contactId===contactId&&r.status==='open'))
            throw new AppError('NOT_FOUND',404)
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
            data=await repo.withOwner(actor,store=>
              store.finalizeMessengerReply(reservation.id,reservation.channel,'blocked'))
          }else{
            let status='unknown',providerId=null
            try{
              const accepted=await sendOneMessengerMessage({channel:reservation.channel,to:reservation.to,text:reservation.text})
              status=accepted.status
              providerId=accepted.providerId
            }catch(e){if(e?.code==='PROVIDER_REJECTED')status='failed'}
            try{data=await repo.withOwner(actor,store=>
              store.finalizeMessengerReply(reservation.id,reservation.channel,status,providerId))}
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
