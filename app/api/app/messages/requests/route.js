import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {createPractitionerRepository} from '@/lib/practitioners/repository'
import {practitionerEmailAllowed} from '@/lib/app/practitioner-access'
import {createCrmRepository,crmEnabled} from '@/lib/crm/repository'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'

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
    const query=new URL(request.url).searchParams
    if([...query.keys()].some(key=>key!=='view')||query.getAll('view').length>1||
       (query.has('view')&&query.get('view')!=='owner'))throw new AppError('INVALID_QUERY',400)
    const ownerAuthorized=practitionerEmailAllowed(actor)
    // Fast, authenticated, read-only bootstrap: the external CRM inbox must not
    // disappear while the independent practitioner requests query is loading.
    // No contact, conversation, email, message or Telegram identity is returned.
    if(query.get('view')==='owner')return auth.apply(NextResponse.json({
      accountId:actor.id,ownerMessenger:crmEnabled()&&ownerAuthorized,
    },{headers:PRIVATE_HEADERS}))
    const workspace=await createPractitionerRepository(config).getMyPractice(actor)
    // The existing CRM messenger is a separate, owner-only inbox.
    // A temporary business-enquiry query error must not conceal Telegram chats.
    let businessEnquiries=[],businessUnavailable=false
    const ownerMessenger=crmEnabled()&&ownerAuthorized
    if(ownerMessenger){
      try{
        businessEnquiries=await createCrmRepository(config).withOwner(
          actor,store=>store.listBusinessEnquiries())
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
