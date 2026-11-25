import {privateDelivery,privateJson,smallJson} from '@/lib/clients/delivery-http'
import {authorizeSessionGuest,readSessionViewerCookie} from '@/lib/clients/session-delivery-access'
import {readShareEngagementConsent,writeShareEngagement} from '@/lib/clients/session-engagement'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export async function GET(request,{params}) {
  const {selector}=await params
  return privateDelivery(async({config,store})=>{
    const credential=readSessionViewerCookie(request.cookies,selector)
    const access=await authorizeSessionGuest(config,store,selector,credential)
    const accepted=await readShareEngagementConsent(config,access,credential.id)
    return privateJson({accepted})
  })
}
export async function POST(request,{params}) {
  const {selector}=await params
  return privateDelivery(async({config,store})=>{
    const credential=readSessionViewerCookie(request.cookies,selector)
    const access=await authorizeSessionGuest(config,store,selector,credential)
    const command=await smallJson(request,512)
    if(!await store?.consumeAccessAttempt('session-engagement:'+credential.id,240,3600))
      return privateJson({error:'RATE_LIMITED'},429)
    return privateJson(await writeShareEngagement(config,access,credential.id,command))
  })
}
