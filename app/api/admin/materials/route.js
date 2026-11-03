import {ownerMaterialRequest} from '@/lib/clients/material-library-http'
import {privateJson} from '@/lib/clients/delivery-http'
import {listPractitionerMaterials,createYouTubeMaterial,createMaterialUploadIntent,reuseSessionVideoMaterial} from '@/lib/clients/material-library'
import {getOwnerSession} from '@/lib/clients/session-delivery-service'
import {getPrescriptionStore} from '@/lib/prescriptions/store'
import {validUuid} from '@/lib/clients/delivery-model'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request){
  return ownerMaterialRequest(request,async({config})=>privateJson({
    materials:await listPractitionerMaterials(config),
  }))
}
export async function POST(request){
  return ownerMaterialRequest(request,async({config,data})=>{
    if(data.action==='youtube')return privateJson({
      material:await createYouTubeMaterial(config,data),
    },201)
    if(data.action==='intent')return privateJson({
      intent:await createMaterialUploadIntent(config,data),
    },201)
    if(data.action==='reuse-session-video'){
      if(data.approvedForReuse!==true||
        ![data.clientId,data.sessionId,data.assetId].every(validUuid))
        return privateJson({error:'SESSION_VIDEO_NOT_REUSABLE'},403)
      const store=getPrescriptionStore()
      if(!store)return privateJson({error:'MATERIAL_UNAVAILABLE'},503)
      // Verify the exact owner client/session and only already attached,
      // explicitly supplementary videos. Never promote personal or hidden notes.
      const session=await getOwnerSession(config,store,data.clientId,data.sessionId)
      const reusable=[...(session.draft?.media||[]),...(session.published?.media||[])]
        .some(item=>item.assetId===data.assetId&&item.scope==='client'&&
          ['additional','meditation'].includes(item.role))
      const asset=(session.assets||[]).find(item=>item.id===data.assetId)
      if(!reusable||asset?.kind!=='video'||asset.status!=='ready'||asset.scope!=='client')
        return privateJson({error:'SESSION_VIDEO_NOT_REUSABLE'},409)
      return privateJson({material:await reuseSessionVideoMaterial(config,data)},201)
    }

    return privateJson({error:'INVALID_ACTION'},400)
  },{body:true})
}
