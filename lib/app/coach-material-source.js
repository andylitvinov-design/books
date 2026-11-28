import 'server-only'
import {operationHash} from './crypto.js'
import {videoPhotoPrefix} from './client-video-photo-contract.mjs'

const iso=value=>{
 const n=value instanceof Date?value.getTime():Date.parse(value)
 return Number.isFinite(n)?new Date(n).toISOString():null
}

// Proof about one current owner-held material version. No file bytes,
// thumbnail, storage URL, provider identifier or path enters the projection.
export async function readCoachMaterialVersion(db,config,actor,material){
 let source
 if(material.kind==='photo'){
  const {createPrivateStorageClient}=await import('../clients/session-delivery-storage.js')
  const portrait=material.id==='portrait'
  const name=portrait?'portrait.jpg':material.id+'.jpg'
  const prefix=portrait?'support-photo/'+actor.id:videoPhotoPrefix(actor.id).slice(0,-1)
  const {data,error}=await createPrivateStorageClient(config).storage.from('hh-client-private-media')
   .list(prefix,{limit:5,search:name})
  if(error)return null
  const object=data?.find(row=>row.name===name)
  const updated=iso(object?.updated_at)
  if(typeof object?.id!=='string'||!object.id||!updated)return null
  source=[object.id,updated,typeof object.metadata?.eTag==='string'?object.metadata.eTag:'']
 }else{
  const table=material.kind==='video'?'app_private.personal_videos':'app_private.client_live_photos_v1'
  const {rows:[row]}=await db.query('select ready_at from '+table+
   " where account_id=$1 and id=$2 and status='ready'",[actor.id,material.id])
  const ready=iso(row?.ready_at)
  if(!ready)return null
  source=[ready]
 }
 return operationHash({purpose:'coach-material-version-v1',accountId:actor.id,material,source},config).slice(0,24)
}
