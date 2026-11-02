import 'server-only'
import { randomUUID } from 'node:crypto'
import { AppError } from '../assessments/contracts.js'
import { transaction } from '../app/database.js'
import { SESSION_MEDIA_TYPES, PRIVATE_MEDIA_BUCKET, validUuid } from './delivery-model.js'
import { parseSessionYouTubeUrl } from './youtube-resource.js'
import { checkPrivateMediaStorage, privateStorageClient, sniffPrivateMedia, privateMediaObjectStream } from './session-delivery-storage.js'
import { configuredVideoUploadStore, createVideoUploadUrl, inspectUploadedVideo, verifyUploadedVideoHeader } from './private-video-object-store.js'
import {OWNER_AUDIO_MIME_TYPES,OWNER_AUDIO_PROXY_MAX_BYTES} from './owner-audio-upload.js'

const invalid=(code='MATERIAL_UNAVAILABLE',status=404)=>{throw new AppError(code,status)}
function text(value,max,required=false){
  if(typeof value!=='string'||value.length>max||value.includes('\0')) invalid('INVALID_MATERIAL',400)
  const normalized=value.trim()
  if(required&&!normalized)invalid('INVALID_MATERIAL',400)
  return normalized
}
const summary=row=>({
  id:row.id,kind:row.kind,title:row.title,description:row.description||'',
  ...(row.kind==='youtube'?{url:row.url}:{mime:row.mime}),
})
const ownerSummary=row=>({
  ...summary(row),
  publicLocale:row.public_locale||'en',
  publishedAt:row.published_at?new Date(row.published_at).toISOString():null,
  ...(row.source_asset_id?{sourceAssetId:row.source_asset_id}:{}),
})
export async function listPractitionerMaterials(config){
  return transaction(config,null,async db=>(await db.query(
    "select m.id,m.kind,m.title,m.description,m.url,m.mime,m.public_locale,m.published_at,a.id as source_asset_id from app_private.practitioner_materials m left join app_private.client_delivery_assets a on a.object_key=m.object_key and m.kind='video' where m.status='ready' order by m.created_at desc limit 300"
  )).rows.map(ownerSummary),{server:true})
}
export async function createYouTubeMaterial(config,{title,description='',url}={}){
  const canonical=parseSessionYouTubeUrl(url)
  if(!canonical)invalid('INVALID_YOUTUBE_URL',400)
  const name=text(title,140,true),detail=text(description,500)
  // Reusing the same clip must never create multiple copies after a retry or
  // two simultaneous report-editor saves. This lock is scoped by video ID.
  return transaction(config,null,async db=>{
    await db.query('select pg_advisory_xact_lock(hashtextextended($1,0))',['hh-library:'+canonical.id])
    const existing=(await db.query(
      "select id,kind,title,description,url from app_private.practitioner_materials where kind='youtube' and status='ready' and url=$1 order by created_at asc limit 1",
      [canonical.url])).rows[0]
    if(existing)return {...summary(existing),existing:true}
    const id=randomUUID()
    await db.query(
      "insert into app_private.practitioner_materials(id,kind,title,description,url,status,ready_at) values($1,'youtube',$2,$3,$4,'ready',now())",
      [id,name,detail,canonical.url])
    return {id,kind:'youtube',title:name,description:detail,url:canonical.url,existing:false}
  },{server:true})
}
// Reuse an already finalized, explicitly educational private session video.
// Only the owner endpoint may call this after authenticating the exact session
// and checking that the video was marked "additional" or "meditation" there.
// No bearer URLs, transcripts or client identifiers enter the shared catalog.
export async function reuseSessionVideoMaterial(config,{
  clientId,sessionId,assetId,title,approvedForReuse=false,
}={}){
  if(!approvedForReuse||![clientId,sessionId,assetId].every(validUuid))
    invalid('SESSION_VIDEO_NOT_REUSABLE',403)
  const name=text(title,140,true)
  return transaction(config,null,async db=>{
    const video=(await db.query(
      "select id,object_key,mime,bytes,storage_provider from app_private.client_delivery_assets where id=$1 and session_id=$2 and legacy_client_id=$3 and status='ready' and scope='client' and asset_kind='video'",
      [assetId,sessionId,clientId])).rows[0]
    const bytes=Number(video?.bytes)
    if(!video||!['video/mp4','video/quicktime'].includes(video.mime)||
      !Number.isSafeInteger(bytes)||bytes<128||bytes>200000000||
      !['supabase','r2','s3_ca'].includes(video.storage_provider))
      invalid('SESSION_VIDEO_NOT_REUSABLE',409)
    // The existing verified private object is shared by reference, not
    // moved/copied/deleted: confirmed ready objects are not retention-cleaned.
    // Any future deletion of ready assets must check practitioner references.
    await db.query('select pg_advisory_xact_lock(hashtextextended($1,0))',
      ['hh-library-object:'+video.object_key])
    const existing=(await db.query(
      "select id,kind,title,description,mime from app_private.practitioner_materials where object_key=$1 and kind='video' and status='ready' limit 1",
      [video.object_key])).rows[0]
    if(existing)return {...summary(existing),existing:true}
    const id=randomUUID()
    await db.query(
      "insert into app_private.practitioner_materials(id,kind,title,description,mime,object_key,storage_provider,expected_bytes,bytes,status,ready_at) values($1,'video',$2,'',$3,$4,$5,$6,$6,'ready',now())",
      [id,name,video.mime,video.object_key,video.storage_provider,bytes])
    return {id,kind:'video',title:name,description:'',mime:video.mime,existing:false}
  },{server:true})
}

function typeInfo(mime,kind){
  const type=SESSION_MEDIA_TYPES[mime]
  if(!type||type.kind!==kind||!['image','video','audio'].includes(kind))
    invalid('MEDIA_TYPE_NOT_ALLOWED',415)
  return type
}
async function uploadCredentials(config,row){
  if(row.status==='ready')return {assetId:row.id,ready:true}
  if(row.storage_provider!=='supabase')return {
    assetId:row.id,provider:'external',uploadUrl:createVideoUploadUrl(row.storage_provider,row.object_key,process.env,row.mime),
    mime:row.mime,maxBytes:row.expected_bytes,ready:false,
  }
  const storage=privateStorageClient(config).storage.from(PRIVATE_MEDIA_BUCKET)
  const {data,error}=await storage.createSignedUploadUrl(row.object_key)
  if(error||!data?.token)invalid('MEDIA_STORAGE_UNAVAILABLE',503)
  return {assetId:row.id,objectKey:row.object_key,token:data.token,bucket:PRIVATE_MEDIA_BUCKET,
    supabaseUrl:config.supabaseUrl,publishableKey:config.publishableKey,
    mime:row.mime,maxBytes:row.expected_bytes,ready:false}
}
export async function createMaterialUploadIntent(config,{intentId=null,title,description='',kind,mime,bytes}={}){
  const name=text(title,140,true),detail=text(description,500)
  const info=typeInfo(mime,kind)
  const external=kind==='video'?configuredVideoUploadStore():null
  // Materials have their own opt-in, independent of private client recordings.
  if(kind==='video'&&!external&&process.env.HH_MATERIAL_VIDEO_SUPABASE_UPLOADS_ALLOWED!=='true')
    invalid('VIDEO_STORAGE_NOT_CONFIGURED',503)
  const provider=external?.provider||'supabase'
  const limit=external?200_000_000:info.max
  if(!Number.isSafeInteger(bytes)||bytes<128||bytes>limit)invalid('MEDIA_SIZE_NOT_ALLOWED',413)
  if(intentId!==null&&!validUuid(intentId))invalid('INVALID_MATERIAL',400)
  if(provider==='supabase')await checkPrivateMediaStorage(config)
  const id=intentId||randomUUID()
  const existing=await transaction(config,null,async db=>(await db.query(
    'select * from app_private.practitioner_materials where id=$1',[id]
  )).rows[0],{server:true})
  if(existing){
    if(existing.title!==name||existing.description!==detail||existing.kind!==kind||
      existing.mime!==mime||Number(existing.expected_bytes)!==bytes||
      existing.storage_provider!==provider||existing.status!=='pending'||
      Date.now()-new Date(existing.created_at).getTime()>21*60*60*1000)
      invalid('MEDIA_INTENT_EXPIRED',409)
    return uploadCredentials(config,existing)
  }
  const objectKey=randomUUID()+'/'+randomUUID()+'.'+info.ext
  // Verify provider signing before committing the pending row.
  if(external)createVideoUploadUrl(provider,objectKey,process.env,mime)
  const pending=await transaction(config,null,async db=>{
    const count=(await db.query(
      "select count(*)::integer as n from app_private.practitioner_materials where status='pending' and created_at>now()-interval '2 hours'"
    )).rows[0].n
    if(count>=40)invalid('MEDIA_PENDING_LIMIT',429)
    return (await db.query(
      "insert into app_private.practitioner_materials(id,kind,title,description,mime,object_key,storage_provider,expected_bytes,status) values($1,$2,$3,$4,$5,$6,$7,$8,'pending') returning *",
      [id,kind,name,detail,mime,objectKey,provider,bytes]
    )).rows[0]
  },{server:true})
  return uploadCredentials(config,pending)
}
// First-party iPhone upload of a small general educational recording. A
// separate owner-only upload intent has already pinned MIME, exact size,
// object key and kind. No private consultation recording enters this catalog.
export async function uploadMaterialOwnerAudio(config,id,{mime,body}={}){
 if(!validUuid(id))invalid()
 if(!OWNER_AUDIO_MIME_TYPES.includes(mime))invalid('MEDIA_TYPE_NOT_ALLOWED',415)
 if(!Buffer.isBuffer(body)||body.length<128||body.length>OWNER_AUDIO_PROXY_MAX_BYTES)
  invalid('MEDIA_SIZE_NOT_ALLOWED',413)
 const row=await transaction(config,null,async db=>(await db.query(
  'select * from app_private.practitioner_materials where id=$1',[id])).rows[0],{server:true})
 if(!row||row.kind!=='audio'||row.mime!==mime||
   row.storage_provider!=='supabase'||Number(row.expected_bytes)!==body.length||
   !['pending','ready'].includes(row.status))invalid()
 if(row.status==='ready')return {uploaded:true,already:true}
 const storage=privateStorageClient(config).storage.from(PRIVATE_MEDIA_BUCKET)
 const {error}=await storage.upload(row.object_key,new Blob([body],{type:mime}),
  {contentType:mime,upsert:false,cacheControl:'0'})
 if(error){
  // Safari can lose the final acknowledgement; never overwrite an object.
  const {data:info,error:infoError}=await storage.info(row.object_key)
  const actualMime=(info?.content_type||info?.contentType||info?.mimetype||
    info?.metadata?.mimetype||'').split(';')[0].toLowerCase()
  if(!infoError&&Number(info?.size??info?.metadata?.size)===body.length&&
    (actualMime===mime||(mime==='audio/x-m4a'&&actualMime==='audio/mp4')))
    return {uploaded:true,already:true}
  invalid('MEDIA_STORAGE_UNAVAILABLE',503)
 }
 return {uploaded:true}
}
export async function completeMaterialUpload(config,id){
  if(!validUuid(id))invalid()
  const row=await transaction(config,null,async db=>(await db.query(
    'select * from app_private.practitioner_materials where id=$1',[id]
  )).rows[0],{server:true})
  if(!row||row.kind==='youtube')invalid()
  if(row.status==='ready')return summary(row)
  if(row.status!=='pending')invalid()
  let actualSize,mime
  if(row.storage_provider==='supabase'){
    const storage=privateStorageClient(config).storage.from(PRIVATE_MEDIA_BUCKET)
    const {data,error}=await storage.info(row.object_key)
    if(error||!data)invalid('MEDIA_UPLOAD_NOT_FOUND',409)
    actualSize=Number(data.size??data.metadata?.size??0)
    mime=(data.content_type||data.contentType||data.mimetype||data.metadata?.mimetype||'').split(';')[0].toLowerCase()
  }else{
    const inspected=await inspectUploadedVideo(row.storage_provider,row.object_key)
    actualSize=inspected.bytes;mime=inspected.mime
  }
  if(!Number.isSafeInteger(actualSize)||actualSize!==Number(row.expected_bytes))
    invalid('MEDIA_SIZE_NOT_ALLOWED',413)
  if(mime!==row.mime)invalid('MEDIA_TYPE_NOT_ALLOWED',415)
  if(row.storage_provider==='supabase')
    await sniffPrivateMedia(privateStorageClient(config).storage.from(PRIVATE_MEDIA_BUCKET),row.object_key,row.mime,config.supabaseUrl)
  else await verifyUploadedVideoHeader(row.storage_provider,row.object_key,actualSize)
  await transaction(config,null,db=>db.query(
    "update app_private.practitioner_materials set status='ready',bytes=$2,ready_at=now() where id=$1 and status='pending'",
    [id,actualSize]),{server:true})
  return summary({...row,status:'ready',bytes:actualSize})
}
export async function selectedMaterialSnapshots(db,ids=[]){
  if(!Array.isArray(ids)||ids.length>24||new Set(ids).size!==ids.length||
    ids.some(id=>!validUuid(id)))invalid('INVALID_SESSION_MATERIALS',400)
  if(!ids.length)return []
  const rows=(await db.query(
    "select id,kind,title,description,url,mime from app_private.practitioner_materials where id=any($1::uuid[]) and status='ready'",
    [ids])).rows
  if(rows.length!==ids.length)invalid('MATERIAL_UNAVAILABLE',409)
  const byId=new Map(rows.map(row=>[row.id,row]))
  return ids.map(id=>summary(byId.get(id)))
}
export async function getReadyMaterial(config,id){
  if(!validUuid(id))invalid()
  const row=await transaction(config,null,async db=>(await db.query(
    "select * from app_private.practitioner_materials where id=$1 and status='ready'",
    [id])).rows[0],{server:true})
  if(!row||!['image','video','audio'].includes(row.kind)||!row.bytes)invalid()
  const bytes=typeof row.bytes==='string'&&/^[1-9]\d*$/.test(row.bytes)?Number(row.bytes):row.bytes
  if(!Number.isSafeInteger(bytes)||bytes<=0||bytes>200_000_000)invalid()
  return {...row,bytes}
}
export async function streamReadyMaterial(config,id,request){
  const row=await getReadyMaterial(config,id)
  return privateMediaObjectStream(config,row,request)
}

 
// Only explicitly published, public YouTube resources may leave the owner library.
// Never hand out R2/S3/Supabase private object keys or client-session recordings.
export async function listPublicLibraryVideos(config,locale){
  if(!['en','ru','es'].includes(locale))return []
  return transaction(config,null,async db=>{
    const rows=(await db.query(
      "select id,title,description,url,public_locale,published_at from app_private.practitioner_materials where kind='youtube' and status='ready' and public_locale=$1 and published_at is not null order by published_at desc,id desc limit 60",
      [locale]
    )).rows
    return rows.flatMap(row=>{
      const safe=parseSessionYouTubeUrl(row.url)
      return safe?[{
        id:row.id,title:row.title,description:row.description||'',
        youtubeId:safe.id,url:safe.url,locale:row.public_locale,
        publishedAt:new Date(row.published_at).toISOString(),
      }]:[]
    })
  },{server:true})
}
export async function setLibraryMaterialPublication(config,id,{publish=false,locale='en'}={}){
  if(!validUuid(id))invalid()
  if(typeof publish!=='boolean'||!['en','ru','es'].includes(locale))
    invalid('INVALID_PUBLICATION',400)
  return transaction(config,null,async db=>{
    const row=(await db.query(
      "update app_private.practitioner_materials set public_locale=$2,published_at=case when $3::boolean then coalesce(published_at,now()) else null end where id=$1 and kind='youtube' and status='ready' returning id,kind,title,description,url,mime,public_locale,published_at",
      [id,locale,publish]
    )).rows[0]
    if(!row)invalid('MATERIAL_UNAVAILABLE',404)
    return ownerSummary(row)
  },{server:true})
}
