import {ownerMaterialRequest} from '@/lib/clients/material-library-http'
import {privateJson} from '@/lib/clients/delivery-http'
import {readOwnerAudioBinary} from '@/lib/clients/owner-audio-binary'
import {uploadMaterialOwnerAudio} from '@/lib/clients/material-library'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=60

// First-party Safari upload for <=3MB. No guest uploads or client recordings.
export async function POST(request,{params}){
 return ownerMaterialRequest(request,async({config})=>{
  const {id}=await params
  return privateJson(await uploadMaterialOwnerAudio(config,id,
    await readOwnerAudioBinary(request)))
 })
}
