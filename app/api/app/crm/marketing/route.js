import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { practitionerEmailAllowed } from '@/lib/app/practitioner-access'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { AppError, onlyKeys } from '@/lib/assessments/contracts'
import { crmEnabled } from '@/lib/crm/repository'
import { withMarketingOwner, createMarketingStore } from '@/lib/crm/marketing-repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function handle(request) {
  let auth
  try {
    if (!crmEnabled()) throw new AppError('CRM_UNAVAILABLE',503)
    const config=getAppConfig()
    requestOrigin(request,config)
    if (request.method !== 'GET') requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    if(request.headers.get('x-hh-account-id')!==actor.id) throw new AppError('ACCOUNT_CHANGED',409)
    if(!practitionerEmailAllowed(actor)) throw new AppError('ACCESS_DENIED',403)
    const data=await withMarketingOwner(config,actor,async(db)=>{
      const store=createMarketingStore(db,actor)
      if(request.method==='GET') {
        const days=new URL(request.url).searchParams.get('days') || '30'
        if(!['7','30','90'].includes(days)) throw new AppError('INVALID_MARKETING_PERIOD',400)
        return store.overview(Number(days))
      }
      const body=await readBody(request,2048)
      onlyKeys(body,['action','payload'])
      if(body.action==='record_lead') return store.recordLead(body.payload)
      if(body.action==='update_stage') return store.updateStage(body.payload)
      if(body.action==='record_milestone') return store.recordMilestone(body.payload)
      throw new AppError('INVALID_MARKETING_ACTION',400)
    })
    return auth.apply(NextResponse.json(data,{headers:PRIVATE_HEADERS}))
  } catch(error) {
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
export const GET=handle
export const POST=handle
