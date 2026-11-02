import { ownerDelivery,privateJson } from '@/lib/clients/delivery-http'
import { createPrivateMediaIntent,completePrivateMedia,privateMediaPlayback,cleanupPendingSessionMedia,deleteUnpublishedPrivateMedia } from '@/lib/clients/session-delivery-storage'
import { getOwnerSession } from '@/lib/clients/session-delivery-service'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function POST(request,{params}) {
  const {id,sessionId}=await params
  return ownerDelivery(request,async({config,store,data})=>{
    switch(data.action) {
      case 'cleanup':return privateJson(await cleanupPendingSessionMedia(config,store,id,sessionId))
      case 'intent':return privateJson(await createPrivateMediaIntent(config,store,id,sessionId,data),201)
      case 'complete':return privateJson(await completePrivateMedia(config,store,id,sessionId,data.assetId,{durationSeconds:data.durationSeconds,reviewFirst:data.reviewFirst===true}))
      case 'delete':return privateJson(await deleteUnpublishedPrivateMedia(config,store,id,sessionId,data.assetId))
       case 'play':
        await getOwnerSession(config,store,id,sessionId)
        return privateJson(await privateMediaPlayback(config,id,sessionId,data.assetId))
      default:return privateJson({error:'INVALID_ACTION'},400)
    }
  },{body:true})
}

