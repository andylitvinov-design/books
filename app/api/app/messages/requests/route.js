import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {createPractitionerRepository} from '@/lib/practitioners/repository'
import {practitionerEmailAllowed} from '@/lib/app/practitioner-access'
import {createCrmRepository,crmEnabled} from '@/lib/crm/repository'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'

export const runtime='nodejs'
export const preferredRegion='yul1'
export const dynamic='force-dynamic'
export const revalidate=0

// Reuse the already-authorized practitioner inbox and the owner's CRM;
// never combine unrelated customers, nor infer a lead from a button click.
export async function GET(request){
  let auth
  try{
    const config=getAppConfig()
    requestOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    const workspace=await createPractitionerRepository(config).getMyPractice(actor)
    const ownerAuthorized=practitionerEmailAllowed(actor)
    let businessEnquiries=[],ownerMessenger=false,businessUnavailable=false
    if(crmEnabled()&&ownerAuthorized){
      try{
        businessEnquiries=await createCrmRepository(config).withOwner(
          actor,store=>store.listBusinessEnquiries())
        ownerMessenger=true
      }catch{
        // Do not mislabel an unavailable CRM as an empty business inbox.
        businessUnavailable=true
      }
    }
    // The existing repository scopes incoming requests to this practitioner.
    // CRM business enquiries require a separate owner-scoped DB transaction.
    return auth.apply(NextResponse.json({
      accountId:actor.id,
      hasPractice:Boolean(workspace.practitioner),
      requests:workspace.requests||[],
      services:(workspace.services||[]).map(s=>({
        id:s.id,copy:s.copy,localizedCopy:s.localizedCopy,draftCopy:s.draftCopy,
      })),
      businessEnquiries,ownerMessenger,ownerAuthorized,businessUnavailable,
      freeExpressV2Enabled:process.env.HH_FREE_EXPRESS_V2_ENABLED==='true',
    },{headers:PRIVATE_HEADERS}))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},
      {status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
