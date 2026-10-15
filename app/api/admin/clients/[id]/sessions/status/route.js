import {privateJson} from '@/lib/clients/delivery-http'
import {deliveryEnabled,validUuid} from '@/lib/clients/delivery-model'
import {getAppConfig} from '@/lib/app/config'
import {getPrescriptionStore} from '@/lib/prescriptions/store'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {checkPrivateMediaStorage} from '@/lib/clients/session-delivery-storage'
import {configuredVideoUploadStore} from '@/lib/clients/private-video-object-store'

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
    // Only metadata for the authorized owner. Never return bucket, object key,
    // upload URL or credential. Audio/PDF/photo remain available when optional
    // external video is misconfigured, so return a separate video readiness flag.
    let videoProvider='unavailable',videoLimitBytes=0,videoReady=false
    try{
      const external=configuredVideoUploadStore()
      if(external){videoProvider=external.provider;videoLimitBytes=200_000_000;videoReady=true}
      else if(process.env.HH_CLIENT_VIDEO_SUPABASE_UPLOADS_ALLOWED==='true'){
        // Legacy opt-in only: not the default for sensitive/large MP4 files.
        videoProvider='supabase';videoLimitBytes=45_000_000;videoReady=true
      }
    }catch{
      // Invalid external configuration must fail closed for video, without
      // blocking audio, PDFs or photos stored in existing private Supabase.
    }
    return privateJson({ready:true,videoReady,videoProvider,videoLimitBytes})
  }catch{
    return privateJson({ready:false,error:'MEDIA_STORAGE_UNAVAILABLE'},503)
  }
}
