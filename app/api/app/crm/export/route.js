import { NextResponse } from 'next/server'
import { getAppConfig,requestOrigin,requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { practitionerEmailAllowed } from '@/lib/app/practitioner-access'
import { PRIVATE_HEADERS,readBody,safeError } from '@/lib/app/http'
import { AppError,onlyKeys } from '@/lib/assessments/contracts'
import { createCrmRepository,crmEnabled } from '@/lib/crm/repository'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

export async function POST(request) {
 let auth
 try {
  if(!crmEnabled())throw new AppError('CRM_UNAVAILABLE',503)
  const config=getAppConfig()
  requestOrigin(request,config)
  requireSameOrigin(request,config)
  auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  if(request.headers.get('x-hh-account-id')!==actor.id)
   throw new AppError('ACCOUNT_CHANGED',409)
  if(!practitionerEmailAllowed(actor))throw new AppError('ACCESS_DENIED',403)
  const body=await readBody(request,1024)
  onlyKeys(body,['format','scope'])
  if(body.format!=='csv'||body.scope!=='business_contacts')
   throw new AppError('INVALID_EXPORT_REQUEST',400)
  const output=await createCrmRepository(config).withOwner(actor,
   store=>store.exportOwnerBusinessContacts())
  const stamp=new Date().toISOString().slice(0,10)
  // No records, names or email addresses are written to logs or response headers.
  return auth.apply(new NextResponse('\ufeff'+output.csv,{
   status:200,headers:{
    ...PRIVATE_HEADERS,
    'Content-Type':'text/csv; charset=utf-8',
    'Content-Disposition':'attachment; filename="holistic-house-crm-'+stamp+'.csv"',
    'X-Content-Type-Options':'nosniff',
   },
  }))
 }catch(error){
  const safe=safeError(error)
  const result=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(result):result
 }
}
