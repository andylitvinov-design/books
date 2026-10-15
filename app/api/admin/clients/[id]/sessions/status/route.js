import {privateJson} from '@/lib/clients/delivery-http'
import {deliveryEnabled,validUuid} from '@/lib/clients/delivery-model'
import {getAppConfig} from '@/lib/app/config'
import {getPrescriptionStore} from '@/lib/prescriptions/store'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {checkPrivateMediaStorage} from '@/lib/clients/session-delivery-storage'

export const runtime='nodejs'
export const dynamic='force-dynamic'

// Mobile recorder preflight: check owner session, feature gate and actual
// private bucket BEFORE prompting iOS Safari for microphone/camera access.
export async function GET(request,{params}) {
  const {id}=await params
  if(!await requireAdminRequest())return privateJson({ready:false,error:'ADMIN_SIGN_IN_REQUIRED'},401)
  if(!validUuid(id))return privateJson({ready:false,error:'SESSION_UNAVAILABLE'},404)
  if(!deliveryEnabled())return privateJson({ready:false,error:'SESSION_UNAVAILABLE'},503)
  try {
    const config=getAppConfig()
    if(!config.secretKey)
      return privateJson({ready:false,error:'MEDIA_STORAGE_NOT_CONFIGURED'},503)
    const store=getPrescriptionStore()
    const client=await store?.findClientById(id)
    if(!client||client.status!=='active')
      return privateJson({ready:false,error:'SESSION_UNAVAILABLE'},404)
    await checkPrivateMediaStorage(config)
    return privateJson({ready:true})
  }catch{
    return privateJson({ready:false,error:'MEDIA_STORAGE_UNAVAILABLE'},503)
  }
}
