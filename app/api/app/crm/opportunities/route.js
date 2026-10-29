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

// Deliberately POST-only: no contact IDs or signed cursors in URLs/analytics.
// No external sends, payment, appointment confirmation or implicit identity merge.
export async function POST(request){
  let auth
  try{
    if(!crmEnabled())throw new AppError('CRM_UNAVAILABLE',503)
    const config=getAppConfig()
    requestOrigin(request,config)
    requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    if(request.headers.get('x-hh-account-id')!==actor.id)
      throw new AppError('ACCOUNT_CHANGED',409)
    if(!practitionerEmailAllowed(actor))throw new AppError('ACCESS_DENIED',403)
    const body=await readBody(request,2048)
    onlyKeys(body,['action','payload'])
    if(!['list','create','change'].includes(body.action)||
      body.payload===null||
      (body.payload!==undefined&&(typeof body.payload!=='object'||Array.isArray(body.payload))))
      throw new AppError('INVALID_OPPORTUNITY',400)
    const data=await createCrmRepository(config).withOwner(actor,async store=>{
      if(body.action==='list')return store.listOpportunities(body.payload||{})
      if(body.action==='create')return store.createOpportunity(body.payload)
      return store.changeOpportunity(body.payload)
    })
    return auth.apply(NextResponse.json(data,{headers:PRIVATE_HEADERS}))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
