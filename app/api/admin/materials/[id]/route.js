import {ownerMaterialRequest} from '@/lib/clients/material-library-http'
import {privateJson} from '@/lib/clients/delivery-http'
import {completeMaterialUpload} from '@/lib/clients/material-library'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function POST(request,{params}){
  const {id}=await params
  return ownerMaterialRequest(request,async({config,data})=>{
    if(data.action!=='complete')return privateJson({error:'INVALID_ACTION'},400)
    return privateJson({material:await completeMaterialUpload(config,id)})
  },{body:true})
}
