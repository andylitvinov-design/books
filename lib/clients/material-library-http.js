import 'server-only'
import {requireAdminRequest} from '../prescriptions/admin.js'
import {getAppConfig} from '../app/config.js'
import {privateJson,privateError,smallJson} from './delivery-http.js'

// Owner access is independent of the gated client-delivery feature so that
// general YouTube education can be curated before private playback is activated.
export async function ownerMaterialRequest(request,handler,{body=false}={}){
  if(!await requireAdminRequest())return privateJson({error:'MATERIAL_UNAVAILABLE'},404)
  try{
    const config=getAppConfig()
    const data=body?await smallJson(request,4096):undefined
    return await handler({config,data})
  }catch(error){return privateError(error)}
}
