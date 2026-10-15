import { privateDelivery,privateJson,smallJson } from '@/lib/clients/delivery-http'
import { authorizeCabinetRequest } from '@/lib/clients/session'
import { getPublishedClientSession } from '@/lib/clients/session-delivery-service'
import { privateMediaPlayback } from '@/lib/clients/session-delivery-storage'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function POST(request,{params}) {
  const {selector,sessionId,assetId}=await params
  return privateDelivery(async({config,store})=>{
    await smallJson(request,512)
    const access=await authorizeCabinetRequest(selector)
    if(!access) return privateJson({error:'SESSION_UNAVAILABLE'},404)
    const session=await getPublishedClientSession(config,store,access.client.id,sessionId)
    if(!session.media.some(item=>item.assetId===assetId&&item.scope==='client'))
      return privateJson({error:'SESSION_UNAVAILABLE'},404)
    return privateJson(await privateMediaPlayback(config,access.client.id,sessionId,assetId))
  })
}
