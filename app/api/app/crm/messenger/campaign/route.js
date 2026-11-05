import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { practitionerEmailAllowed } from '@/lib/app/practitioner-access'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { AppError, onlyKeys } from '@/lib/assessments/contracts'
import { crmEnabled, createCrmRepository } from '@/lib/crm/repository'
import { sendOneMessengerMessage } from '@/lib/crm/messenger-provider'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const maxDuration=60

// All marketing sends are manual, owner-authorized, one small free Telegram batch
// per click. No cron, paid provider, forced replay, or marketing without opt-in.
async function handle(request){
  let auth
  try{
    if(!crmEnabled())throw new AppError('CRM_UNAVAILABLE',503)
    const config=getAppConfig()
    requestOrigin(request,config)
    if(request.method==='POST')requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    if(request.headers.get('x-hh-account-id')!==actor.id)
      throw new AppError('ACCOUNT_CHANGED',409)
    if(!practitionerEmailAllowed(actor))throw new AppError('ACCESS_DENIED',403)
    const repo=createCrmRepository(config)
    let data
    if(request.method==='GET'){
      if(new URL(request.url).search)throw new AppError('INVALID_QUERY',400)
      data=await repo.withOwner(actor,store=>store.listTelegramCampaigns())
    }else{
      const body=await readBody(request,2048)
      onlyKeys(body,['action','payload'])
      if(!body.payload||typeof body.payload!=='object'||Array.isArray(body.payload))
        throw new AppError('INVALID_BODY',400)
      if(body.action==='create'){
        onlyKeys(body.payload,['templateId','locale','sender'])
        data=await repo.withOwner(actor,store=>store.createDraft({
          templateId:body.payload.templateId,locale:body.payload.locale,
          channel:'telegram',segment:'all_opted_in',sender:body.payload.sender,
        }))
      }else if(body.action==='stats'){
        onlyKeys(body.payload,['campaignId'])
        data=await repo.withOwner(actor,store=>store.telegramCampaignStats(body.payload.campaignId))
      }else if(body.action==='dispatch'){
        onlyKeys(body.payload,['campaignId','confirmed'])
        if(body.payload.confirmed!==true)throw new AppError('CAMPAIGN_CONFIRMATION_REQUIRED',403)
        const campaignId=body.payload.campaignId
        // Validate the exact saved template before any provider request.
        await repo.withOwner(actor,store=>store.telegramCampaignStats(campaignId))
        const results=[]
        for(let i=0;i<3;i++){
          const reserved=await repo.withOwner(actor,store=>store.reserveNextTelegramCampaign(campaignId))
          if(!reserved)break
          const ready=await repo.withOwner(actor,store=>store.checkTelegramCampaignDispatch(reserved.id))
          let status='blocked',providerId=null
          if(ready.allowed){
            status='unknown'
            try{
              const receipt=await sendOneMessengerMessage({
                channel:'telegram',to:ready.to,text:ready.text,approvedMarketingSubscriber:true,
              })
              status=receipt.status
              providerId=receipt.providerId
            }catch(error){
              if(error?.code==='PROVIDER_REJECTED')status='failed'
              // Unknown network responses are never retried, preventing double delivery.
            }
          }
          const result=await repo.withOwner(actor,store=>
            store.finalizeMessengerReply(reserved.id,'telegram',status,providerId))
          results.push({id:reserved.id,status:result.status})
        }
        const summary=await repo.withOwner(actor,store=>store.telegramCampaignStats(campaignId))
        data={results,summary}
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
