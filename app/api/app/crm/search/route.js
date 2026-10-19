import { NextResponse } from 'next/server'
import { getAppConfig,requestOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { practitionerEmailAllowed } from '@/lib/app/practitioner-access'
import { PRIVATE_HEADERS,safeError } from '@/lib/app/http'
import { AppError } from '@/lib/assessments/contracts'
import { createCrmRepository,crmEnabled } from '@/lib/crm/repository'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

export async function GET(request) {
 let auth
 try {
  if(!crmEnabled())throw new AppError('CRM_UNAVAILABLE',503)
  const config=getAppConfig()
  requestOrigin(request,config)
  auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  if(request.headers.get('x-hh-account-id')!==actor.id)
   throw new AppError('ACCOUNT_CHANGED',409)
  if(!practitionerEmailAllowed(actor))throw new AppError('ACCESS_DENIED',403)
  const params=new URL(request.url).searchParams
  if([...params.keys()].some(k=>!['q','stage'].includes(k))||
     params.getAll('q').length!==1||params.getAll('stage').length>1)
   throw new AppError('INVALID_CONTACT_SEARCH',400)
  const data=await createCrmRepository(config).withOwner(actor,
   store=>store.searchContacts(params.get('q'),params.get('stage')||'all'))
  return auth.apply(NextResponse.json(data,{headers:PRIVATE_HEADERS}))
 }catch(error) {
  const safe=safeError(error)
  const result=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(result):result
 }
}
