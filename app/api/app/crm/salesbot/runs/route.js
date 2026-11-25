import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {practitionerEmailAllowed} from '@/lib/app/practitioner-access'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {AppError,onlyKeys} from '@/lib/assessments/contracts'
import {createCrmRepository,crmEnabled} from '@/lib/crm/repository'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
// Authenticated owner-only INTERNAL workflow history and human review.
// This endpoint has no provider transport, advertising, auto-send or checkout.
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
      if(new URL(request.url).search)throw new AppError('INVALID_SALESBOT_QUERY',400)
      data=await repo.withOwner(actor,store=>store.listInternalSalesbotRuns())
      return auth.apply(NextResponse.json({items:data,mode:'internal_only',
        sendsEnabled:false},{headers:PRIVATE_HEADERS}))
    }
    const body=await readBody(request,4096)
    onlyKeys(body,['action','id','expectedRevision','choiceId'])
    if(body.action==='resume'){
      data=await repo.withOwner(actor,store=>store.resumeInternalSalesbotRun({
        id:body.id,expectedRevision:body.expectedRevision,choiceId:body.choiceId,
      }))
    }else if(body.action==='create_owner_followup'){
      if('choiceId'in body||'expectedRevision'in body)
        throw new AppError('INVALID_SALESBOT_RUN_COMMAND',400)
      data=await repo.withOwner(actor,store=>store.createInternalSalesbotHandoff({id:body.id}))
    }else throw new AppError('INVALID_SALESBOT_RUN_ACTION',400)
    return auth.apply(NextResponse.json({...data,mode:'internal_only',
      sendsEnabled:false},{headers:PRIVATE_HEADERS}))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},
      {status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
export const GET=handle
export const POST=handle
