import 'server-only'
import {randomUUID} from 'node:crypto'
import {AppError,requireUUID} from '../assessments/contracts.js'
import {transaction} from './database.js'
import {createPrivateStorageClient,checkPrivateMediaStorage} from '../clients/session-delivery-storage.js'

const BUCKET='hh-client-private-media'
const MAX_VIDEO_BYTES=12_000_000
const MAX_USER_VIDEOS=3
const MAX_USER_BYTES=36_000_000
const MAX_GLOBAL_BYTES=180_000_000
const THEMES=new Set(['money','relationships','energy','goals'])
const ASPECTS=new Set(['portrait','square','landscape'])
const DURATIONS=new Set([10,20,30,60])
const NAME=/^[a-z0-9-]{2,64}$/
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i

export function personalVideoCloudEnabled(env=process.env){
  return env.HH_PERSONAL_VIDEO_CLOUD_SAVE_ENABLED==='true'
}
function requireEnabled(){
  if(!personalVideoCloudEnabled()) throw new AppError('FEATURE_UNAVAILABLE',503)
}
function validInput(input){
  if(!input || typeof input!=='object' || Array.isArray(input) ||
    Object.keys(input).some(key=>!['theme','sceneId','aspect','duration','bytes','consent'].includes(key)) ||
    input.consent!==true || !THEMES.has(input.theme) ||
    typeof input.sceneId!=='string'||!NAME.test(input.sceneId) ||
    !ASPECTS.has(input.aspect)||!DURATIONS.has(input.duration) ||
    !Number.isSafeInteger(input.bytes)||input.bytes<1024||input.bytes>MAX_VIDEO_BYTES)
    throw new AppError('INVALID_VIDEO_UPLOAD',400)
  return {theme:input.theme,sceneId:input.sceneId,aspect:input.aspect,
    duration:input.duration,bytes:input.bytes}
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

export async function listPersonalVideos(config,actor){
  requireEnabled()
  return transaction(config,actor,async db=>{
    const r=await db.query("select * from app_private.personal_videos where account_id=$1 and status='ready' order by created_at desc limit 40",[actor.id])
    return r.rows.map(view)
  })
}
export async function createPersonalVideoUpload(config,actor,input){
  requireEnabled()
  const info=validInput(input)
  const id=randomUUID()
  const key='personal-videos/'+actor.id+'/'+id+'/master.mp4'
  await checkPrivateMediaStorage(config)
  await transaction(config,actor,async db=>{
    // Serialize quota reservations across concurrent Vercel functions/requests.
    await db.query('select pg_advisory_xact_lock(598228614)')
    const owner=(await db.query(
      "select count(*)::int n,coalesce(sum(bytes),0)::bigint total from app_private.personal_videos where account_id=$1 and (status='ready' or (status='pending' and created_at>now()-interval '2 hours'))",
      [actor.id])).rows[0]
    const global=(await db.query(
      "select coalesce(sum(bytes),0)::bigint total from app_private.personal_videos where status='ready' or (status='pending' and created_at>now()-interval '2 hours')")).rows[0]
    if(owner.n>=MAX_USER_VIDEOS||Number(owner.total)+info.bytes>MAX_USER_BYTES||
      Number(global.total)+info.bytes>MAX_GLOBAL_BYTES)
      throw new AppError('VIDEO_STORAGE_QUOTA',413)
    const consentId=randomUUID()
    await db.query("insert into app.consent_events(id,account_id,purpose,policy_version,resource_id,accepted) values($1,$2,'personal_video_cloud_save_v1','1.0',$3,true)",
      [consentId,actor.id,id])
    await db.query(
      "insert into app_private.personal_videos(id,account_id,consent_event_id,theme,scene_id,aspect,duration_seconds,bytes,object_key) values($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [id,actor.id,consentId,info.theme,info.sceneId,info.aspect,info.duration,info.bytes,key])
  })
  try{
    const storage=storageClient(config)
    // Supabase token validity is fixed at 2h. Never issue a reusable key or upsert.
    const {data,error}=await storage.createSignedUploadUrl(key)
    if(error||!data?.token)throw new Error('upload_url_unavailable')
    return {id,objectKey:key,token:data.token,bucket:BUCKET,
      supabaseUrl:config.supabaseUrl,publishableKey:config.publishableKey,
      maxBytes:MAX_VIDEO_BYTES,expiresIn:7200}
  }catch{
    await transaction(config,actor,db=>db.query(
      "update app_private.personal_videos set status='failed' where id=$1 and account_id=$2 and status='pending'",
      [id,actor.id])).catch(()=>{})
    throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
  }
}
async function owned(config,actor,id,{lock=false}={}){
  if(!uuid.test(id||''))deny()
  return transaction(config,actor,async db=>{
    const row=(await db.query("select * from app_private.personal_videos where id=$1 and account_id=$2"+(lock?' for update':''),
      [id,actor.id])).rows[0]
    if(!row)deny()
    return row
  })
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
  requireEnabled()
  const row=await owned(config,actor,id)
  if(row.status==='ready')return view(row)
  if(row.status!=='pending'||Date.now()-new Date(row.created_at).getTime()>2*60*60*1000)
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
      "update app_private.personal_videos set status='ready',ready_at=now() where id=$1 and account_id=$2 and status='pending' returning *",
      [id,actor.id])
    if(r.rowCount===0)deny()
    return view(r.rows[0])
  })
}
export async function personalVideoReadUrl(config,actor,id){
  requireEnabled()
  const row=await owned(config,actor,id)
  if(row.status!=='ready')deny()
  const {data,error}=await storageClient(config).createSignedUrl(row.object_key,60)
  if(error||!data?.signedUrl)throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
  const url=new URL(data.signedUrl)
  if(url.protocol!=='https:'||url.origin!==new URL(config.supabaseUrl).origin)
    throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
  return {url:url.toString(),expiresIn:60}
}
export async function deletePersonalVideo(config,actor,id){
  requireEnabled()
  const row=await owned(config,actor,id)
  if(row.status==='deleted')return {deleted:true}
  if(!['ready','pending','deleting','failed'].includes(row.status))deny()
  await transaction(config,actor,db=>db.query(
    "update app_private.personal_videos set status='deleting' where id=$1 and account_id=$2 and status in ('pending','ready','deleting','failed')",
    [id,actor.id]))
  const {error}=await storageClient(config).remove([row.object_key])
  if(error && ![404,400].includes(Number(error.statusCode||error.status)))
    throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
  await transaction(config,actor,db=>db.query(
    "update app_private.personal_videos set status='deleted',deleted_at=now() where id=$1 and account_id=$2 and status='deleting'",
    [id,actor.id]))
  // A previously issued upload token remains valid until 2h expiry:
  // cleanup needs a separate follow-up; do not promise immediate revocation.
  return {deleted:true}
}
export const PERSONAL_VIDEO_LIMITS=Object.freeze({
  maxBytes:MAX_VIDEO_BYTES,maxReady:MAX_USER_VIDEOS,maxUserBytes:MAX_USER_BYTES,
  maxGlobalBytes:MAX_GLOBAL_BYTES,
})
