import { ownerDelivery } from '@/lib/clients/delivery-http'
import { getOwnerSession } from '@/lib/clients/session-delivery-service'
import { privateMediaStream } from '@/lib/clients/session-delivery-storage'

export const runtime='nodejs'
export const dynamic='force-dynamic'

// Practitioner preview uses a same-origin authenticated stream, never a public
// Storage URL. Image and video requests are scoped to this one client and session.
async function handle(request,{params}) {
  const {id,sessionId,assetId}=await params
  return ownerDelivery(request,async({config,store})=>{
    const session=await getOwnerSession(config,store,id,sessionId)
    if(!session.assets.some(asset=>asset.id===assetId&&asset.status==='ready'&&['image','video'].includes(asset.kind)))
      return new Response(null,{status:404,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex'}})
    return privateMediaStream(config,id,sessionId,assetId,request)
  })
}
export const GET=handle
export const HEAD=handle
