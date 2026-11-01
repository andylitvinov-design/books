import {ownerMaterialRequest} from '@/lib/clients/material-library-http'
import {getOwnerTelegramVideoDraftFile} from '@/lib/practitioners/owner-telegram-video-service'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
// The URL carries only an opaque UUID; every request rechecks owner auth.
async function serve(request,{params}){
 const {id}=await params
 return ownerMaterialRequest(request,({config})=>
   getOwnerTelegramVideoDraftFile(config,id,request))
}
export {serve as GET,serve as HEAD}
