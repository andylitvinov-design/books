import { privateDelivery,privateJson,smallJson } from '@/lib/clients/delivery-http'
import { authorizeSessionGuest,readSessionViewerCookie } from '@/lib/clients/session-delivery-access'
import { privateMediaStream } from '@/lib/clients/session-delivery-storage'
import {streamReadyMaterial} from '@/lib/clients/material-library'
import { GRANULES_GUIDE_ID } from '@/lib/clients/shared-education-model'
import { sharedGranulesGuideReady,streamSharedGranulesGuide } from '@/lib/clients/shared-education-video'
export const runtime='nodejs'
export const dynamic='force-dynamic'
async function handle(request,{params}) {
  const {selector,assetId}=await params
  return privateDelivery(async({config,store})=>{
    if(request.method==='POST')await smallJson(request,512)
    const access=await authorizeSessionGuest(config,store,selector,readSessionViewerCookie(request.cookies,selector))
    const library=access.session.plan?.materials?.some(
      item=>item.id===assetId&&['image','video'].includes(item.kind))
    if(library){
      if(request.method==='POST')return privateJson({url:'/api/client-session-viewer/'+selector+'/media/'+assetId,expiresIn:300})
      return streamReadyMaterial(config,assetId,request)
    }
    const sharedGuide=assetId===GRANULES_GUIDE_ID&&sharedGranulesGuideReady()
    if(!sharedGuide&&!access.session.media.some(item=>item.assetId===assetId&&item.scope==='client'))
      return privateJson({error:'SESSION_UNAVAILABLE'},404)
    if(request.method==='POST')return privateJson({url:'/api/client-session-viewer/'+selector+'/media/'+assetId,expiresIn:300})
    return sharedGuide?streamSharedGranulesGuide(config,request):
      privateMediaStream(config,access.clientId,access.sessionId,assetId,request)
  })
}
export const POST=handle
export const GET=handle
export const HEAD=handle
