import 'server-only'
import {randomUUID} from 'node:crypto'
import {AppError,requireUUID} from '../assessments/contracts.js'
import {transaction} from './database.js'
import {openSealed,operationHash,seal} from './crypto.js'
import {privateVideoUploadUrl} from '../mandala/signed-private-video-upload.mjs'
import {personalVideoCloudEnabled} from './personal-video-cloud-policy.mjs'
import {createPrivateStorageClient,checkPrivateMediaStorage} from '../clients/session-delivery-storage.js'

const BUCKET='hh-client-private-media'
const MAX_VIDEO_BYTES=12_000_000
const UPLOAD_TTL_MS=2*60*60*1000
const INITIAL_TOKEN_ISSUE_MS=15*60*1000
const MAX_USER_VIDEOS=3
const MAX_USER_BYTES=36_000_000
const MAX_GLOBAL_BYTES=180_000_000
const THEMES=new Set(['money','relationships','energy','goals','health','life','gift'])
const ASPECTS=new Set(['portrait','square','landscape'])
const DURATIONS=new Set([10,15,20,25,30,60])
const NAME=/^[a-z0-9-]{2,64}$/

function requireEnabled(actor){
  if(!personalVideoCloudEnabled(actor)) throw new AppError('FEATURE_UNAVAILABLE',503)
}
function validInput(input){
  if(!input || typeof input!=='object' || Array.isArray(input) ||
    Object.keys(input).some(key=>!['theme','sceneId','aspect','duration','bytes','consent','fingerprint'].includes(key)) ||
    input.consent!==true || !THEMES.has(input.theme) ||
    typeof input.sceneId!=='string'||!NAME.test(input.sceneId) ||
    !ASPECTS.has(input.aspect)||!DURATIONS.has(input.duration) ||
    !Number.isSafeInteger(input.bytes)||input.bytes<1024||input.bytes>MAX_VIDEO_BYTES||
    (input.fingerprint!==undefined&&(typeof input.fingerprint!=='string'||input.fingerprint.length!==64||!/^[a-f0-9]{64}$/.test(input.fingerprint))))
    throw new AppError('INVALID_VIDEO_UPLOAD',400)
  return {theme:input.theme,sceneId:input.sceneId,aspect:input.aspect,
    duration:input.duration,bytes:input.bytes,fingerprint:input.fingerprint}
}
function view(row){
  return {id:row.id,theme:row.theme,sceneId:row.scene_id,aspect:row.aspect,
    duration:row.duration_seconds,bytes:row.bytes,mime:'video/mp4',
    status:row.status,createdAt:row.created_at,readyAt:row.ready_at}
}
function storageClient(config){
  if(!config.secretKey)throw new AppError('MEDIA_STORAGE_NOT_CONFIGURED',503)
  return createPrivateStorageClient(config).storage.from(BUCKET)
}
function deny(){throw new AppError('NOT_FOUND',404)}
// A signed upload stays usable at Supabase for 2h even after cancellation.
// Reap both cancelled and never-completed attempts only after 3h and after
// a successful storage removal; never release their quota while a token lives.
async function reapOwnExpiredUploads(config,actor){
  const candidates=await transaction(config,actor,async db=>(await db.query(
    "select id,object_key from app_private.personal_videos where account_id=$1 and ((status='deleted' and released_at is null and created_at<now()-interval '3 hours') or (status='pending' and created_at<now()-interval '3 hours')) order by created_at limit 5",
    [actor.id])).rows)
  if(!candidates.length)return
  const storage=storageClient(config)
  for(const file of candidates){
    const {error}=await storage.remove([file.object_key])
    if(error)continue
    await transaction(config,actor,db=>db.query(
      "update app_private.personal_videos set status='deleted',deleted_at=coalesce(deleted_at,now()),released_at=now(),upload_checkpoint=null where id=$1 and account_id=$2 and created_at<now()-interval '3 hours' and ((status='deleted' and released_at is null) or status='pending')",
      [file.id,actor.id]))
  }
}

export async function listPersonalVideos(config,actor){
  requireEnabled(actor)
  await reapOwnExpiredUploads(config,actor)
  return transaction(config,actor,async db=>{
    const r=await db.query("select * from app_private.personal_videos where account_id=$1 and status<>'deleted' order by created_at desc limit 40",[actor.id])
    return r.rows.map(view)
  })
}
export async function createPersonalVideoUpload(config,actor,input){
  requireEnabled(actor)
  const info=validInput(input)
  const fingerprint=info.fingerprint&&operationHash(
    {kind:'personal_video_upload_v1',accountId:actor.id,file:info.fingerprint},config)
  await reapOwnExpiredUploads(config,actor)
  await checkPrivateMediaStorage(config)
  const reservation=await transaction(config,actor,async db=>{
    // Serialize quota and reuse decisions across concurrent requests.
    await db.query('select pg_advisory_xact_lock(598228614)')
    if(fingerprint){
      const prior=(await db.query(
        "select id,bytes from app_private.personal_videos where account_id=$1 and upload_fingerprint=$2 and status in ('pending','ready','deleting')",
        [actor.id,fingerprint])).rows[0]
      if(prior){
        if(prior.bytes!==info.bytes)throw new AppError('MEDIA_SIZE_NOT_ALLOWED',413)
        return {id:prior.id,resumed:true}
      }
    }
    const id=randomUUID()
    const key='personal-videos/'+actor.id+'/'+id+'/master.mp4'
    const owner=(await db.query(
      "select count(*)::int n,coalesce(sum(bytes),0)::bigint total from app_private.personal_videos where account_id=$1 and (status<>'deleted' or released_at is null)",
      [actor.id])).rows[0]
    // Owner RLS hides other users; the private SECURITY DEFINER aggregate
    // observes the actual global reservation after the advisory lock.
    const global=(await db.query(
      "select app_private.personal_video_reserved_global_bytes() total")).rows[0]
    const daily=(await db.query(
      "select count(*)::int n from app_private.personal_videos where account_id=$1 and created_at>now()-interval '1 day'",
      [actor.id])).rows[0]
    if(daily.n>=6)throw new AppError('VIDEO_DAILY_LIMIT',429)
    if(owner.n>=MAX_USER_VIDEOS||Number(owner.total)+info.bytes>MAX_USER_BYTES||
      Number(global.total)+info.bytes>MAX_GLOBAL_BYTES)
      throw new AppError('VIDEO_STORAGE_QUOTA',413)
    const consentId=randomUUID()
    await db.query("insert into app.consent_events(id,account_id,purpose,policy_version,resource_id,accepted) values($1,$2,'personal_video_cloud_save_v1','1.0',$3,true)",
      [consentId,actor.id,id])
    await db.query(
      "insert into app_private.personal_videos(id,account_id,consent_event_id,theme,scene_id,aspect,duration_seconds,bytes,object_key,upload_fingerprint) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [id,actor.id,consentId,info.theme,info.sceneId,info.aspect,info.duration,info.bytes,key,fingerprint||null])
    return {id,resumed:false}
  })
  return transaction(config,actor,async db=>{
    const row=await ownedRow(db,actor,reservation.id,true)
    if(row.status==='ready')return {id:row.id,alreadyReady:true}
    const issuedAt=new Date(row.created_at).getTime()
    if(row.status!=='pending'||Date.now()-issuedAt>=UPLOAD_TTL_MS)
      throw new AppError('VIDEO_UPLOAD_EXPIRED',409)
    const context=checkpointContext(actor,row.id)
    let checkpoint=openSealed(row.upload_checkpoint,context,config)
    if(!checkpoint){
      // Tokens issued late must expire before the existing 3h quota cleanup.
      if(Date.now()-issuedAt>=INITIAL_TOKEN_ISSUE_MS)throw new AppError('VIDEO_UPLOAD_EXPIRED',409)
      const result=await storageClient(config).createSignedUploadUrl(row.object_key,{upsert:false})
        .catch(()=>null)
      if(result?.error||!result?.data?.token)throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
      checkpoint={token:result.data.token,uploadUrl:null}
      await writeUploadCheckpoint(db,actor,row.id,seal(checkpoint,context,config))
    }
    return {id:row.id,objectKey:row.object_key,token:checkpoint.token,bucket:BUCKET,
      supabaseUrl:config.supabaseUrl,publishableKey:config.publishableKey,maxBytes:MAX_VIDEO_BYTES,
      issuedAt,expiresIn:7200,resumed:reservation.resumed,uploadUrl:checkpoint.uploadUrl}
  }).catch(async error=>{
    if(!fingerprint&&error?.code==='MEDIA_STORAGE_UNAVAILABLE'){
      await transaction(config,actor,db=>db.query(
        "update app_private.personal_videos set status='deleted',deleted_at=now(),released_at=now() where id=$1 and account_id=$2 and status='pending' and upload_checkpoint is null",
        [reservation.id,actor.id])).catch(()=>{})
    }
    throw error
  })
}
function checkpointContext(actor,id){
  return {accountId:actor.id,recordId:id,field:'personal_video_upload'}
}
async function ownedRow(db,actor,id,lock=false){
  try{requireUUID(id)}catch{deny()}
  const row=(await db.query(
    'select * from app_private.personal_videos where id=$1 and account_id=$2'+(lock?' for update':''),
    [id,actor.id])).rows[0]
  if(!row)deny()
  return row
}
async function writeUploadCheckpoint(db,actor,id,sealed){
  await db.query('update app_private.personal_videos set upload_checkpoint=$3 where id=$1 and account_id=$2',
    [id,actor.id,sealed])
}
export async function checkpointPersonalVideoUpload(config,actor,id,input){
  requireEnabled(actor)
  if(!input||typeof input.uploadUrl!=='string'||input.uploadUrl.length>2048||
    (input.previousUploadUrl!==null&&(typeof input.previousUploadUrl!=='string'||input.previousUploadUrl.length>2048)))
    throw new AppError('INVALID_VIDEO_UPLOAD',400)
  let uploadUrl,previousUploadUrl
  try{
    uploadUrl=privateVideoUploadUrl(input.uploadUrl,config.supabaseUrl)
    previousUploadUrl=input.previousUploadUrl===null?null:
      privateVideoUploadUrl(input.previousUploadUrl,config.supabaseUrl)
  }catch{throw new AppError('INVALID_VIDEO_UPLOAD',400)}
  return transaction(config,actor,async db=>{
    const row=await ownedRow(db,actor,id,true)
    const context=checkpointContext(actor,id)
    if(row.status!=='pending'||Date.now()-new Date(row.created_at).getTime()>=UPLOAD_TTL_MS)
      throw new AppError('VIDEO_UPLOAD_EXPIRED',409)
    const checkpoint=openSealed(row.upload_checkpoint,context,config)
    if(!checkpoint)throw new AppError('VIDEO_UPLOAD_EXPIRED',409)
    // Preserve the first live location if another tab already checkpointed it.
    if(checkpoint.uploadUrl!==previousUploadUrl&&checkpoint.uploadUrl)
      return {uploadUrl:checkpoint.uploadUrl}
    await writeUploadCheckpoint(db,actor,id,seal({...checkpoint,uploadUrl},context,config))
    return {uploadUrl}
  })
}
async function owned(config,actor,id){
  return transaction(config,actor,db=>ownedRow(db,actor,id))
}
async function verifyMp4Header(config,storage,key){
  const {data,error}=await storage.createSignedUrl(key,45)
  if(error||!data?.signedUrl)throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
  const url=new URL(data.signedUrl)
  if(url.protocol!=='https:'||url.origin!==new URL(config.supabaseUrl).origin)
    throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
  const r=await fetch(url,{headers:{Range:'bytes=0-31'},redirect:'error',
    cache:'no-store',signal:AbortSignal.timeout(12000)})
  if(!r.ok||!r.body)throw new AppError('MEDIA_UPLOAD_NOT_FOUND',409)
  const reader=r.body.getReader()
  try{
    let bytes=new Uint8Array(0)
    while(bytes.length<12){
      const part=await reader.read()
      if(part.done)break
      const next=new Uint8Array(Math.min(32,bytes.length+part.value.length))
      next.set(bytes)
      next.set(part.value.subarray(0,32-bytes.length),bytes.length)
      bytes=next
    }
    if(bytes.length<12||String.fromCharCode(...bytes.slice(4,8))!=='ftyp')
      throw new AppError('MEDIA_TYPE_NOT_ALLOWED',415)
  }finally{await reader.cancel().catch(()=>{})}
}
export async function completePersonalVideoUpload(config,actor,id){
  requireEnabled(actor)
  const row=await owned(config,actor,id)
  if(row.status==='ready')return view(row)
  if(row.status!=='pending'||Date.now()-new Date(row.created_at).getTime()>=UPLOAD_TTL_MS)
    throw new AppError('VIDEO_UPLOAD_EXPIRED',409)
  const storage=storageClient(config)
  const {data,error}=await storage.info(row.object_key)
  if(error||!data)throw new AppError('MEDIA_UPLOAD_NOT_FOUND',409)
  const size=Number(data.size??data.metadata?.size)
  const mime=(data.content_type||data.contentType||data.mimetype||data.metadata?.mimetype||'').split(';')[0].toLowerCase()
  if(size!==row.bytes)throw new AppError('MEDIA_SIZE_NOT_ALLOWED',413)
  if(mime!=='video/mp4')throw new AppError('MEDIA_TYPE_NOT_ALLOWED',415)
  await verifyMp4Header(config,storage,row.object_key)
  return transaction(config,actor,async db=>{
    const r=await db.query(
      "update app_private.personal_videos set status='ready',ready_at=now(),upload_checkpoint=null where id=$1 and account_id=$2 and status='pending' returning *",
      [id,actor.id])
    if(r.rowCount)return view(r.rows[0])
    // Another finalizer can win while both requests validate the same upload.
    const committed=(await db.query(
      "select * from app_private.personal_videos where id=$1 and account_id=$2 and status='ready'",
      [id,actor.id])).rows[0]
    if(!committed)deny()
    return view(committed)
  })
}
export async function personalVideoReadUrl(config,actor,id,{download=false}={}){
  requireEnabled(actor)
  const row=await owned(config,actor,id)
  if(row.status!=='ready')deny()
  const options=download?{download:'holistic-house-personal.mp4'}:undefined
  const {data,error}=await storageClient(config).createSignedUrl(row.object_key,60,options)
  if(error||!data?.signedUrl)throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
  const url=new URL(data.signedUrl)
  if(url.protocol!=='https:'||url.origin!==new URL(config.supabaseUrl).origin)
    throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
  return {url:url.toString(),expiresIn:60}
}
export async function deletePersonalVideo(config,actor,id){
  requireEnabled(actor)
  const row=await owned(config,actor,id)
  if(row.status==='deleted')return {deleted:true}
  if(!['ready','pending','deleting','failed'].includes(row.status))deny()
  await transaction(config,actor,db=>db.query(
    "update app_private.personal_videos set status='deleting',upload_checkpoint=null where id=$1 and account_id=$2 and status in ('pending','ready','deleting','failed')",
    [id,actor.id]))
  const {error}=await storageClient(config).remove([row.object_key])
  if(error && ![404,400].includes(Number(error.statusCode||error.status)))
    throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
  await transaction(config,actor,db=>db.query(
    "update app_private.personal_videos set status='deleted',deleted_at=now(),released_at=null where id=$1 and account_id=$2 and status='deleting'",
    [id,actor.id]))
  // The 2h upload token could reintroduce this same object after DELETE.
  // Reserve quota and perform a second server-side remove after 3h, on next owner activity.
  // Never claim a signed token can be revoked before it expires.
  return {deleted:true}
}
export const PERSONAL_VIDEO_LIMITS=Object.freeze({
  maxBytes:MAX_VIDEO_BYTES,maxReady:MAX_USER_VIDEOS,maxUserBytes:MAX_USER_BYTES,
  maxGlobalBytes:MAX_GLOBAL_BYTES,
})
