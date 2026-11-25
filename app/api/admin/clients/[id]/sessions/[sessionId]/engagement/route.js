import {ownerDelivery,privateJson} from '@/lib/clients/delivery-http'
import {getOwnerSession} from '@/lib/clients/session-delivery-service'
import {readOwnerShareEngagement} from '@/lib/clients/session-engagement'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export async function GET(request,{params}) {
  const {id,sessionId}=await params
  return ownerDelivery(request,async({config,store})=>{
    await getOwnerSession(config,store,id,sessionId)
    return privateJson(await readOwnerShareEngagement(config,id,sessionId))
  })
}
