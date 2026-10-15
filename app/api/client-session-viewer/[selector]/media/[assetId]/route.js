import { privateDelivery,privateJson,smallJson } from '@/lib/clients/delivery-http'
import { authorizeSessionGuest,readSessionViewerCookie } from '@/lib/clients/session-delivery-access'
import { privateMediaPlayback } from '@/lib/clients/session-delivery-storage'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function POST(request,{params}) {
  const {selector,assetId}=await params
  return privateDelivery(async({config,store})=>{
    await smallJson(request,512)
    const access=await authorizeSessionGuest(config,store,selector,readSessionViewerCookie(request.cookies,selector))
    if(!access.session.media.some(item=>item.assetId===assetId&&item.scope==='client'))
      return privateJson({error:'SESSION_UNAVAILABLE'},404)
    return privateJson(await privateMediaPlayback(config,access.clientId,access.sessionId,assetId))
  })
}
