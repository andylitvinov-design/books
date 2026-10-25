import {ownerMaterialRequest} from '@/lib/clients/material-library-http'
import {privateJson} from '@/lib/clients/delivery-http'
import {requireSameOrigin} from '@/lib/app/config'
import {listOwnerTelegramAudio,editOwnerTelegramAudio} from '@/lib/practitioners/owner-telegram-audio-service'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export async function GET(request){
  return ownerMaterialRequest(request,async({config})=>
    privateJson(await listOwnerTelegramAudio(config)))
}
export async function PATCH(request){
  return ownerMaterialRequest(request,async({config,data})=>{
    requireSameOrigin(request,config)
    if(data?.action!=='move'||
       !data||Object.keys(data).some(key=>!['action','id','title','folder'].includes(key)))
      return privateJson({error:'OWNER_AUDIO_INVALID_EDIT'},400)
    return privateJson({file:await editOwnerTelegramAudio(config,data)})
  },{body:true})
}
