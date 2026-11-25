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

// Exact contact lookup for a follow-up on an older CRM page. A guessed UUID
// cannot cross owner boundaries: authentication, hh_crm_backend and FORCE RLS
// are applied again by withOwner/getContactById.
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
    const input=await readBody(request,256)
    onlyKeys(input,['contactId'])
    const contact=await createCrmRepository(config).withOwner(actor,
      store=>store.getContactById(input.contactId))
    return auth.apply(NextResponse.json({contact},{headers:PRIVATE_HEADERS}))
  } catch(error) {
    const safe=safeError(error)
    const result=NextResponse.json({error:safe.code},
      {status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(result):result
  }
}
