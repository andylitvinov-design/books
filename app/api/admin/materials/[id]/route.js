import {ownerMaterialRequest} from '@/lib/clients/material-library-http'
import {privateJson} from '@/lib/clients/delivery-http'
import {completeMaterialUpload,setLibraryMaterialPublication} from '@/lib/clients/material-library'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function POST(request,{params}){
  const {id}=await params
  return ownerMaterialRequest(request,async({config,data})=>{
    if(data.action==='complete')return privateJson({material:await completeMaterialUpload(config,id)})
    if(data.action==='publish-library'){
      if(data.reviewed!==true)return privateJson({error:'PUBLICATION_APPROVAL_REQUIRED'},400)
      return privateJson({material:await setLibraryMaterialPublication(config,id,{
        publish:true,locale:data.locale,
      })})
    }
    if(data.action==='unpublish-library')return privateJson({
      material:await setLibraryMaterialPublication(config,id,{
        publish:false,locale:data.locale||'en',
      }),
    })
    return privateJson({error:'INVALID_ACTION'},400)
  },{body:true})
}
