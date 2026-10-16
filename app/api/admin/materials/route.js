import {ownerMaterialRequest} from '@/lib/clients/material-library-http'
import {privateJson} from '@/lib/clients/delivery-http'
import {listPractitionerMaterials,createYouTubeMaterial,createMaterialUploadIntent} from '@/lib/clients/material-library'
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
    return privateJson({error:'INVALID_ACTION'},400)
  },{body:true})
}
