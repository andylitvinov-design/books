import {ownerMaterialRequest} from '@/lib/clients/material-library-http'
import {getOwnerTelegramAudioFile} from '@/lib/practitioners/owner-telegram-audio-service'

// The path contains a media UUID, never a storage path, signed token, or API key.
// Every GET, HEAD and Range must pass the same owner-admin authentication gate.
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

async function serve(request,{params}){
  const {id}=await params
  return ownerMaterialRequest(request,({config})=>
    getOwnerTelegramAudioFile(config,id,request))
}

export {serve as GET,serve as HEAD}
