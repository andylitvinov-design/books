import 'server-only'
import {AppError} from '../assessments/contracts.js'
import {transaction} from '../app/database.js'
import {PRIVATE_MEDIA_BUCKET} from '../clients/delivery-model.js'
import {privateStorageClient} from '../clients/session-delivery-storage.js'
import {createVideoReadUrl} from '../clients/private-video-object-store.js'
import {PRESENTATION_BUCKET} from '../practitioners/presentation-contract.js'
import {ownerRuYoutubeAccessToken} from '../practitioners/owner-telegram-video-service.js'
import {uploadUnlistedRu,verifyUploadedRu} from '../practitioners/owner-telegram-video-youtube.mjs'

const TABLE='app_private.youtube_owner_publication_requests'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_BYTES=50_000_000
const SUPPORTED=new Set(['video/mp4','video/quicktime','video/webm'])
const refusal=(code,status=409)=>{throw new AppError(code,status)}
const validId=value=>typeof value==='string'&&UUID.test(value)
const cleanTitle=value=>{
 if(typeof value!=='string'||value.length>100||value.includes('\0')||/[\r\n]/.test(value))refusal('INVALID_VIDEO_TITLE',400)
 const title=value.trim()
 if(title.length<1)refusal('INVALID_VIDEO_TITLE',400)
 return title
}
const sizeValid=bytes=>Number.isSafeInteger(Number(bytes))&&Number(bytes)>=1024&&Number(bytes)<=MAX_BYTES
const view=row=>({
 id:row.id,sourceType:row.source_type,sourceId:row.source_id,
 title:row.title,mime:row.mime,bytes:Number(row.expected_bytes),
 state:row.state,videoId:row.youtube_video_id||null,
 error:row.error_code||null,createdAt:row.created_at,updatedAt:row.updated_at
})
async function manager(config,actor,fn){
 return transaction(config,actor,async db=>{
   await db.query("select set_config('hh.youtube_publication_manager','1',true)")
   return fn(db)
 },actor?{}:{server:true})
}
async function ownerMaterial(db,id){
 const row=(await db.query(
   "select m.id,m.title,m.object_key,m.storage_provider,m.mime,m.bytes "+
   "from app_private.practitioner_materials m where m.id=$1 and "+
   "m.kind='video' and m.status='ready' and m.bytes between 1024 and 50000000 "+
   "and not exists (select 1 from app_private.client_delivery_assets a "+
   "where a.object_key=m.object_key)",[id])).rows[0]
 if(!row||!SUPPORTED.has(row.mime)||!sizeValid(row.bytes)||!row.object_key||
   !['supabase','r2','s3_ca'].includes(row.storage_provider))refusal('VIDEO_SOURCE_NOT_ELIGIBLE',404)
 return {...row,bytes:Number(row.bytes),sourceType:'owner_material'}
}
async function masterVideo(db,id,ownerAuthId=null){
 const row=(await db.query(
   "select v.id,v.practitioner_id,v.owner_auth_user_id,v.object_key,v.mime,v.expected_bytes,"+
   "p.status as practitioner_status "+
   "from app_private.practitioner_presentation_uploads v "+
   "join app.practitioners p on p.id=v.practitioner_id "+
   "where v.id=$1 and v.status='ready' "+(ownerAuthId?"and v.owner_auth_user_id=$2 ":"")+
   "and p.trusted_auth_user_id=v.owner_auth_user_id "+
   "and p.active=true and p.status not in ('suspended','rejected','archived')",
   ownerAuthId?[id,ownerAuthId]:[id])).rows[0]
 if(!row||!SUPPORTED.has(row.mime)||!sizeValid(row.expected_bytes)||!row.object_key||
   !row.object_key.startsWith(row.owner_auth_user_id.toLowerCase()+'/'))
   refusal('VIDEO_SOURCE_NOT_ELIGIBLE',404)
 return {...row,bytes:Number(row.expected_bytes),sourceType:'practitioner_presentation'}
}
async function sourceFor(db,row){
 const source=row.source_type==='owner_material'
   ?await ownerMaterial(db,row.source_id):await masterVideo(db,row.source_id,row.source_owner_auth_user_id)
 if(source.mime!==row.mime||source.bytes!==Number(row.expected_bytes))
   refusal('VIDEO_SOURCE_CHANGED',409)
 if(row.source_type==='practitioner_presentation'&&source.practitioner_id!==row.practitioner_id)
   refusal('VIDEO_SOURCE_CHANGED',409)
 return source
}

export async function submitMasterVideoToOwner(config,actor,{
 assetId,title,rightsConfirmed=false,privacyConfirmed=false
}={}){
 if(!validId(assetId)||rightsConfirmed!==true||privacyConfirmed!==true)
   refusal('VIDEO_CREATOR_CONSENT_REQUIRED',400)
 const name=cleanTitle(title)
 return manager(config,actor,async db=>{
   const source=await masterVideo(db,assetId,actor.id)
   const existing=(await db.query(
     'select * from '+TABLE+" where source_type='practitioner_presentation' and source_id=$1",
     [assetId])).rows[0]
   if(existing){
     if(existing.source_owner_auth_user_id!==actor.id)refusal('VIDEO_SOURCE_NOT_ELIGIBLE',403)
     return view(existing)
   }
   const row=(await db.query(
     'insert into '+TABLE+
     "(source_type,source_id,practitioner_id,source_owner_auth_user_id,title,mime,expected_bytes,state,creator_consented_at) "+
     "values('practitioner_presentation',$1,$2,$3,$4,$5,$6,'requested',now()) "+
     'returning *',
     [source.id,source.practitioner_id,actor.id,name,source.mime,source.bytes])).rows[0]
   return view(row)
 })
}
export async function masterVideoRequestStatus(config,actor,assetId){
 if(!validId(assetId))refusal('INVALID_VIDEO_ASSET',400)
 return manager(config,actor,async db=>{
   const row=(await db.query(
     'select * from '+TABLE+
     " where source_type='practitioner_presentation' and source_id=$1 and source_owner_auth_user_id=$2",
     [assetId,actor.id])).rows[0]
   return row?view(row):null
 })
}
export async function withdrawMasterVideo(config,actor,assetId){
 if(!validId(assetId))refusal('INVALID_VIDEO_ASSET',400)
 return manager(config,actor,async db=>{
   const row=(await db.query(
     'update '+TABLE+
     " set state='declined',error_code='CREATOR_WITHDREW',updated_at=now() "+
     "where source_type='practitioner_presentation' and source_id=$1 "+
     "and source_owner_auth_user_id=$2 and state='requested' returning *",
     [assetId,actor.id])).rows[0]
   if(!row)refusal('VIDEO_ALREADY_APPROVED_OR_NOT_FOUND',409)
   return view(row)
 })
}
export async function listOwnerYoutubeCandidates(config){
 return manager(config,null,async db=>{
   const [materials,requests]=await Promise.all([
     db.query(
       "select m.id,m.title,m.mime,m.bytes from app_private.practitioner_materials m "+
       "where m.kind='video' and m.status='ready' and m.bytes between 1024 and 50000000 "+
       "and m.mime in ('video/mp4','video/quicktime','video/webm') "+
       "and not exists(select 1 from app_private.client_delivery_assets a "+
       "where a.object_key=m.object_key) order by m.created_at desc limit 40"
     ),
     db.query('select * from '+TABLE+' order by created_at desc limit 100')
   ])
   return {
     materials:materials.rows.map(row=>({
       id:row.id,title:row.title,mime:row.mime,bytes:Number(row.bytes),
       sourceType:'owner_material'
     })),
     requests:requests.rows.map(view),
   }
 })
}
export async function ownerApprovePublication(config,{
 requestId=null,sourceId=null,sourceType=null,title=null,
 rightsConfirmed=false,privacyConfirmed=false
}={}){
 if(rightsConfirmed!==true||privacyConfirmed!==true)
   refusal('OWNER_PUBLICATION_APPROVAL_REQUIRED',400)
 return manager(config,null,async db=>{
   if(requestId!==null){
     if(!validId(requestId))refusal('INVALID_PUBLICATION_REQUEST',400)
     const row=(await db.query('select * from '+TABLE+' where id=$1 for update',[requestId])).rows[0]
     if(!row||row.source_type!=='practitioner_presentation')
       refusal('PUBLICATION_NOT_FOUND',404)
     if(row.state!=='requested')return {request:view(row),start:false}
     await sourceFor(db,row)
     const approved=(await db.query(
       'update '+TABLE+" set state='approved',owner_approved_at=now(),updated_at=now() "+
       'where id=$1 and state=\'requested\' returning *',[requestId])).rows[0]
     return {request:view(approved),start:true}
   }
   if(sourceType!=='owner_material'||!validId(sourceId))
     refusal('INVALID_PUBLICATION_REQUEST',400)
   const source=await ownerMaterial(db,sourceId)
   const name=cleanTitle(title||source.title)
   const existing=(await db.query(
     'select * from '+TABLE+" where source_type='owner_material' and source_id=$1 for update",
     [sourceId])).rows[0]
   if(existing)return {request:view(existing),start:false}
   const inserted=(await db.query(
     'insert into '+TABLE+
     "(source_type,source_id,title,mime,expected_bytes,state,creator_consented_at,owner_approved_at) "+
     "values('owner_material',$1,$2,$3,$4,'approved',now(),now()) returning *",
     [sourceId,name,source.mime,source.bytes])).rows[0]
   return {request:view(inserted),start:true}
 })
}
export async function ownerDeclinePublication(config,id){
 if(!validId(id))refusal('INVALID_PUBLICATION_REQUEST',400)
 return manager(config,null,async db=>{
   const row=(await db.query('update '+TABLE+
     " set state='declined',updated_at=now() where id=$1 and state='requested' returning *",[id])).rows[0]
   if(!row)refusal('PUBLICATION_NOT_PENDING',409)
   return view(row)
 })
}

async function obtainMedia(config,source){
 let bytes
 if(source.sourceType==='practitioner_presentation'){
   const storage=privateStorageClient(config).storage.from(PRESENTATION_BUCKET)
   const {data,error}=await storage.download(source.object_key)
   if(error||!data||data.size!==source.bytes)refusal('VIDEO_STORAGE_UNAVAILABLE',503)
   bytes=Buffer.from(await data.arrayBuffer())
 }else if(source.storage_provider==='supabase'){
   const storage=privateStorageClient(config).storage.from(PRIVATE_MEDIA_BUCKET)
   const {data,error}=await storage.download(source.object_key)
   if(error||!data||data.size!==source.bytes)refusal('VIDEO_STORAGE_UNAVAILABLE',503)
   bytes=Buffer.from(await data.arrayBuffer())
 }else{
   // Short-lived signed server-to-server read. Never expose this URL to a client.
   const url=createVideoReadUrl(source.storage_provider,source.object_key)
   const response=await fetch(url,{
     cache:'no-store',credentials:'omit',redirect:'error',
     signal:AbortSignal.timeout(60000)
   })
   if(!response.ok)refusal('VIDEO_STORAGE_UNAVAILABLE',503)
   const advertised=Number(response.headers.get('content-length'))
   if(advertised!==source.bytes)refusal('VIDEO_STORAGE_UNAVAILABLE',503)
   bytes=Buffer.from(await response.arrayBuffer())
 }
 if(bytes.length!==source.bytes||bytes.length>MAX_BYTES)
   refusal('VIDEO_STORAGE_UNAVAILABLE',503)
 return bytes
}
async function updateReceipt(config,id,state,{videoId=null,error=null}={}){
 return manager(config,null,async db=>(await db.query(
   'update '+TABLE+' set state=$2,youtube_video_id=coalesce($3,youtube_video_id),'+
   'error_code=$4,updated_at=now() where id=$1 and state in (\'publishing\',\'uncertain\') returning *',
   [id,state,videoId,error])).rows[0])
}
async function finalize(config,id,videoId){
 return manager(config,null,async db=>(await db.query(
   'update '+TABLE+" set state='uploaded',error_code=null,updated_at=now() "+
   "where id=$1 and state='uncertain' and youtube_video_id=$2 returning *",
   [id,videoId])).rows[0])
}
export async function uploadOwnerApprovedPublication(config,id){
 if(!validId(id))refusal('INVALID_PUBLICATION_REQUEST',400)
 const data=await manager(config,null,async db=>{
   const row=(await db.query(
     'update '+TABLE+" set state='publishing',updated_at=now() "+
     "where id=$1 and state='approved' and owner_approved_at is not null returning *",
     [id])).rows[0]
   if(!row)return null
   return {row,source:await sourceFor(db,row)}
 })
 if(!data)return {state:'not_approved'}
 let started=false,recordedId=null
 try{
   const media=await obtainMedia(config,data.source)
   const token=await ownerRuYoutubeAccessToken(config)
   const provider=await uploadUnlistedRu(media,token,{
     title:data.row.title,mediaMime:data.row.mime,
     onBeginUpload:async()=>{
       started=true
       await updateReceipt(config,id,'uncertain',{error:'UPLOAD_IN_PROGRESS'})
     },
     onUploaded:async videoId=>{
       recordedId=videoId
       await updateReceipt(config,id,'uncertain',{videoId,error:'READBACK_PENDING'})
     }
   })
   const final=await finalize(config,id,provider.id)
   return {state:final?'uploaded':'already_reconciled',videoId:provider.id}
 }catch{
   // The exact media operation might have succeeded despite a provider timeout.
   // Even without an ID never silently create another YouTube upload.
   await updateReceipt(config,id,'uncertain',{videoId:recordedId,
     error:recordedId?'READBACK_PENDING':started?'UPLOAD_OUTCOME_UNKNOWN':'UPLOAD_NOT_STARTED'}).catch(()=>{})
   return {state:'uncertain',hasVideoId:Boolean(recordedId)}
 }
}
export async function verifyOwnerPublication(config,id){
 if(!validId(id))refusal('INVALID_PUBLICATION_REQUEST',400)
 const row=await manager(config,null,async db=>(await db.query(
   'select * from '+TABLE+" where id=$1 and state='uncertain' and youtube_video_id is not null",
   [id])).rows[0])
 if(!row)return {state:'no_known_pending_id'}
 try{
   const token=await ownerRuYoutubeAccessToken(config)
   const details=await verifyUploadedRu(row.youtube_video_id,token)
   const final=await finalize(config,id,details.id)
   return {state:final?'uploaded':'already_reconciled',videoId:details.id}
 }catch{return {state:'pending'}}
}
export async function reconcileOwnerYoutubePublications(config,{env=process.env}={}){
 if(env.VERCEL_ENV==='preview'||env.HH_OWNER_VIDEO_ENABLED!=='true')
   return {state:'disabled'}
 const rows=await manager(config,null,async db=>(await db.query(
   'select id from '+TABLE+
   " where state='uncertain' and youtube_video_id is not null "+
   "and updated_at<now()-interval '3 minutes' order by updated_at asc limit 3")).rows)
 const results=[]
 for(const row of rows)results.push(await verifyOwnerPublication(config,row.id))
 return {state:'checked',count:results.length,confirmed:results.filter(x=>x.state==='uploaded').length}
}
