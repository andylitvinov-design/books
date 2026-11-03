import { privateDelivery,privateJson,smallJson } from '@/lib/clients/delivery-http'
import { authorizeCabinetRequest } from '@/lib/clients/session'
import { getPublishedClientSession } from '@/lib/clients/session-delivery-service'
import { privateMediaStream } from '@/lib/clients/session-delivery-storage'
import {streamReadyMaterial} from '@/lib/clients/material-library'
import { GRANULES_GUIDE_ID } from '@/lib/clients/shared-education-model'
import { sharedGranulesGuideReady,streamSharedGranulesGuide } from '@/lib/clients/shared-education-video'
export const runtime='nodejs'
export const dynamic='force-dynamic'
async function handle(request,{params}) {
  const {selector,sessionId,assetId}=await params
  return privateDelivery(async({config,store})=>{
    if(request.method==='POST')await smallJson(request,512)
    const access=await authorizeCabinetRequest(selector)
    if(!access) return privateJson({error:'SESSION_UNAVAILABLE'},404)
    const session=await getPublishedClientSession(config,store,access.client.id,sessionId)
    const library=session.plan?.materials?.some(
      item=>item.id===assetId&&['image','video'].includes(item.kind))
    if(library){
      if(request.method==='POST')return privateJson({url:'/api/client/'+selector+'/sessions/'+sessionId+'/media/'+assetId,expiresIn:300})
      return streamReadyMaterial(config,assetId,request)
    }
    const sharedGuide=assetId===GRANULES_GUIDE_ID&&sharedGranulesGuideReady()
    if(!sharedGuide&&!session.media.some(item=>item.assetId===assetId&&item.scope==='client'))
      return privateJson({error:'SESSION_UNAVAILABLE'},404)
    if(request.method==='POST')return privateJson({url:'/api/client/'+selector+'/sessions/'+sessionId+'/media/'+assetId,expiresIn:300})
    return sharedGuide?streamSharedGranulesGuide(config,request):
      privateMediaStream(config,access.client.id,sessionId,assetId,request)
  })
}
export const POST=handle
export const GET=handle
export const HEAD=handle
