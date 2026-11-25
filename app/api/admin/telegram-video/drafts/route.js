import {ownerMaterialRequest} from '@/lib/clients/material-library-http'
import {privateJson} from '@/lib/clients/delivery-http'
import {listOwnerTelegramVideoDrafts} from '@/lib/practitioners/owner-telegram-video-service'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export async function GET(request){
 return ownerMaterialRequest(request,async({config})=>
   privateJson(await listOwnerTelegramVideoDrafts(config)))
}
