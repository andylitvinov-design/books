import {ownerMaterialRequest} from '@/lib/clients/material-library-http'
import {privateJson} from '@/lib/clients/delivery-http'
import {requireSameOrigin} from '@/lib/app/config'
import {listOwnerTelegramAudio,editOwnerTelegramAudio,getOwnerTelegramAudioPreview} from '@/lib/practitioners/owner-telegram-audio-service'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export async function GET(request){
  return ownerMaterialRequest(request,async({config})=>{
    const preview=new URL(request.url).searchParams.get('preview')
    if(preview!==null){
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(preview))
        return privateJson({error:'OWNER_AUDIO_INVALID_PREVIEW'},400)
      return privateJson(await getOwnerTelegramAudioPreview(config,preview))
    }
    return privateJson(await listOwnerTelegramAudio(config))
  })
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
