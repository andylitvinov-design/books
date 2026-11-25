import { ownerDelivery, privateJson } from '@/lib/clients/delivery-http'
import { getOwnerSession } from '@/lib/clients/session-delivery-service'
import { privateMediaStream } from '@/lib/clients/session-delivery-storage'
import {streamReadyMaterial} from '@/lib/clients/material-library'

export const runtime='nodejs'
export const dynamic='force-dynamic'

// Every media request is authorized against the practitioner session. Preview
// URLs are first-party GET/HEAD/Range endpoints, never public Storage links.
async function handle(request,{params},play=false) {
  const {id,sessionId,assetId}=await params
  return ownerDelivery(request,async({config,store})=>{
    const session=await getOwnerSession(config,store,id,sessionId)
    // A reusable catalog asset is playable only when this owner has attached
    // it in this consultation draft or its published revision.
    const catalog=[...(session.draft?.plan?.materials||[]),...(session.published?.plan?.materials||[])]
    if(catalog.some(item=>item.id===assetId&&['image','video'].includes(item.kind))){
      if(play)return privateJson({url:new URL(request.url).pathname,expiresIn:300})
      return streamReadyMaterial(config,assetId,request)
    }
    const asset=session.assets.find(row=>row.id===assetId&&row.status==='ready')
    const referenced=[...(session.draft?.media||[]),...(session.published?.media||[])]
      .some(item=>item.assetId===assetId)
    if(!asset||!referenced||!['image','audio','video','pdf'].includes(asset.kind))
      return new Response(null,{status:404,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex'}})
    if(play) return privateJson({url:new URL(request.url).pathname,expiresIn:300})
    return privateMediaStream(config,id,sessionId,assetId,request)
  },{body:play})
}
export const GET=(request,context)=>handle(request,context)
export const HEAD=(request,context)=>handle(request,context)
export const POST=(request,context)=>handle(request,context,true)
