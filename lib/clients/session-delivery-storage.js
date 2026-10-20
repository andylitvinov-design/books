import 'server-only'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { AppError } from '../assessments/contracts.js'
import { transaction } from '../app/database.js'
import { PRIVATE_MEDIA_BUCKET, SESSION_MEDIA_TYPES, validUuid } from './delivery-model.js'
import { getOwnerSession, attachSessionAsset, getSessionAsset, markUnpublishedSessionAssetRemoved } from './session-delivery-service.js'
import {configuredVideoUploadStore,createVideoUploadUrl,createVideoReadUrl,videoObjectOrigin,inspectUploadedVideo,verifyUploadedVideoHeader,deletePrivateVideo} from './private-video-object-store.js'
import {OWNER_AUDIO_MIME_TYPES,OWNER_AUDIO_PROXY_MAX_BYTES} from './owner-audio-upload.js'
import {OWNER_PHOTO_MIME_TYPES,OWNER_PHOTO_PROXY_MAX_BYTES} from './owner-photo-upload.js'

const fail = () => { throw new AppError('MEDIA_UNAVAILABLE',404) }
function client(config) {
  if(!config.secretKey) throw new AppError('MEDIA_STORAGE_NOT_CONFIGURED',503)
  return createClient(config.supabaseUrl,config.secretKey,{
    auth:{persistSession:false,autoRefreshToken:false},
    global:{headers:{'x-client-info':'hh-private-delivery/1'},fetch:(input,init)=>{
      const headers=new Headers(init?.headers)
      // Modern secret keys are API keys, not user JWTs. Storage SDK versions
      // may still add their key as Bearer; normalize only that exact fallback.
      if(config.secretKey.startsWith('sb_secret_')&&headers.get('authorization')==='Bearer '+config.secretKey)headers.delete('authorization')
      if(new URL(typeof input==='string'?input:input.url||String(input)).origin!==new URL(config.supabaseUrl).origin)throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
      return fetch(input,{...init,headers,redirect:'error'})
    }},
  })
}
// Refuse to request microphone permission unless authorized PRIVATE storage is ready.
export async function checkPrivateMediaStorage(config) {
  const {data,error}=await client(config).storage.getBucket(PRIVATE_MEDIA_BUCKET)
  if(error||!data||data.public!==false)throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
  return true
}
function definition(mime,kind) {
  const type=SESSION_MEDIA_TYPES[mime]
  if(!type||type.kind!==kind) throw new AppError('MEDIA_TYPE_NOT_ALLOWED',415)
  return type
}
export async function createPrivateMediaIntent(config,store,clientId,sessionId,{mime,kind,scope='client',bytes,intentId=null}={}) {
  const info=definition(mime,kind)
  const external=kind==='video'?configuredVideoUploadStore():null
  // Videos are external-only by default: never silently fill the 1 GB
  // Supabase Free bucket. A short-lived Supabase MP4 pilot requires
  // deliberate, explicit server-side opt-in.
  if(kind==='video'&&!external&&process.env.HH_CLIENT_VIDEO_SUPABASE_UPLOADS_ALLOWED!=='true')
    throw new AppError('MEDIA_STORAGE_NOT_CONFIGURED',503)
  const provider=external?.provider||'supabase'
  const maxAllowed=external?200_000_000:info.max
  if(!['client','practitioner'].includes(scope) || !Number.isSafeInteger(bytes)||bytes<128||bytes>maxAllowed)
    throw new AppError('MEDIA_SIZE_NOT_ALLOWED',413)
  if(intentId!==null&&!validUuid(intentId))fail()
  const session=await getOwnerSession(config,store,clientId,sessionId)
  if(session.status==='archived') fail()
  // Cap draft photos without counting retained previous report revisions.
  if(kind==='image') {
    const assets=new Map(session.assets.map(asset=>[asset.id,asset]))
    if(session.draft.media.filter(item=>assets.get(item.assetId)?.kind==='image').length>=12)
      throw new AppError('SESSION_PHOTO_LIMIT',413)
  }
  const storage=provider==='supabase'?client(config).storage.from(PRIVATE_MEDIA_BUCKET):null
  if(intentId){
    const existing=await transaction(config,null,async db=>(await db.query('select * from app_private.client_delivery_assets where id=$1',[intentId])).rows[0],{server:true})
    if(existing){
      if(existing.legacy_client_id!==clientId||existing.session_id!==sessionId||existing.scope!==scope||existing.mime!==mime||existing.asset_kind!==kind||existing.max_bytes!==bytes||!['pending','ready'].includes(existing.status))fail()
      // A resumed upload must never switch storage provider or gain a fresh 24h window.
      if((existing.storage_provider||'supabase')!==provider)fail()
      if(existing.status==='pending'&&Date.now()-new Date(existing.created_at).getTime()>21*60*60*1000)throw new AppError('MEDIA_INTENT_EXPIRED',409)
      if(external){
        // An already finalized object must never get another PUT URL.
        if(existing.status==='ready')return {assetId:existing.id,provider:'external',mime,maxBytes:bytes,ready:true}
        return {assetId:existing.id,objectKey:existing.object_key,provider:'external',
          uploadUrl:createVideoUploadUrl(provider,existing.object_key,process.env,mime),mime,maxBytes:bytes,ready:false}
      }
      const {data,error}=await storage.createSignedUploadUrl(existing.object_key)
      if(error||!data?.token)throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
      return {assetId:existing.id,objectKey:existing.object_key,token:data.token,bucket:PRIVATE_MEDIA_BUCKET,supabaseUrl:config.supabaseUrl,publishableKey:config.publishableKey,mime,maxBytes:bytes,ready:existing.status==='ready'}
    }
  }
  const current=await transaction(config,null,async db=>(await db.query(
    "select count(*)::integer as n from app_private.client_delivery_assets where session_id=$1 and status='pending' and created_at > now()-interval '2 hours'",
    [sessionId])).rows[0].n,{server:true})
  if(current>=8) throw new AppError('MEDIA_PENDING_LIMIT',429)
  // Pin the declared complete file size in the existing per-intent bound.
  // A truncated object must never become a playable/publishable asset.
  const id=intentId||randomUUID(),objectKey=randomUUID()+'/'+randomUUID()+'.'+info.ext
  // Sign before creating an intent so a bad R2/S3 config never leaves a pending row.
  const uploadUrl=external?createVideoUploadUrl(provider,objectKey,process.env,mime):null
  let token=null
  if(!external){
    const {data,error}=await storage.createSignedUploadUrl(objectKey)
    if(error||!data?.token)throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
    token=data.token
  }
  await transaction(config,null,db=>db.query(
    external?
      "insert into app_private.client_delivery_assets(id,legacy_client_id,session_id,asset_kind,scope,object_key,mime,max_bytes,status,storage_provider) values($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9)":
      "insert into app_private.client_delivery_assets(id,legacy_client_id,session_id,asset_kind,scope,object_key,mime,max_bytes,status) values($1,$2,$3,$4,$5,$6,$7,$8,'pending')",
    external?[id,clientId,sessionId,kind,scope,objectKey,mime,bytes,provider]:
      [id,clientId,sessionId,kind,scope,objectKey,mime,bytes]),{server:true})
  if(external)return {assetId:id,objectKey,provider:'external',uploadUrl,mime,maxBytes:maxAllowed}
  return {assetId:id,objectKey,token,bucket:PRIVATE_MEDIA_BUCKET,
    supabaseUrl:config.supabaseUrl,publishableKey:config.publishableKey,mime,maxBytes:info.max}
}
const startsWith = (bytes,pattern) => pattern.every((value,index)=>bytes[index]===value)
// Small owner audio is uploaded from the SAME ORIGIN. It prevents iOS Safari
// cross-origin Storage/CSP/network failures without granting the client any
// Storage write credential or allowing Vercel to receive large recordings.
// The intent is still pinned to an immutable client/session/scope/byte count.
export async function uploadPrivateOwnerAudio(config,store,clientId,sessionId,assetId,{mime,body}={}) {
  if(!validUuid(assetId))fail()
  const session=await getOwnerSession(config,store,clientId,sessionId)
  if(session.status==='archived')fail()
  if(!Buffer.isBuffer(body)||body.length<128||body.length>OWNER_AUDIO_PROXY_MAX_BYTES ||
    !OWNER_AUDIO_MIME_TYPES.includes(mime))throw new AppError('MEDIA_SIZE_NOT_ALLOWED',413)
  const asset=await transaction(config,null,async db=>(await db.query(
    'select * from app_private.client_delivery_assets where id=$1 and session_id=$2 and legacy_client_id=$3',
    [assetId,sessionId,clientId])).rows[0],{server:true})
  if(!asset || !['pending','ready'].includes(asset.status)||
    asset.asset_kind!=='audio'||(asset.storage_provider||'supabase')!=='supabase'||
    asset.mime!==mime||Number(asset.max_bytes)!==body.length)fail()
  if(asset.status==='ready')return {uploaded:true,already:true}
  const storage=client(config).storage.from(PRIVATE_MEDIA_BUCKET)
  const {error}=await storage.upload(asset.object_key,new Blob([body],{type:mime}),
    {contentType:mime,upsert:false,cacheControl:'0'})
  if(error) {
    // A prior upload can have succeeded even if iPhone missed the reply.
    // Never overwrite it. Only accept a pre-existing object that matches
    // the exact immutable intent; canonical completion still sniffs bytes.
    const {data:info,error:infoError}=await storage.info(asset.object_key)
    const actualMime=(info?.content_type||info?.contentType||info?.mimetype||
      info?.metadata?.mimetype||'').split(';')[0].toLowerCase()
    if(!infoError && Number(info?.size??info?.metadata?.size)===body.length &&
      (actualMime===mime||(mime==='audio/x-m4a'&&actualMime==='audio/mp4')))
      return {uploaded:true,already:true}
    throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
  }
  return {uploaded:true}
}

function headerMatches(buffer,mime) {
  if(buffer.length<12) return false
  if(mime==='image/jpeg') return startsWith(buffer,[0xff,0xd8,0xff])
  if(mime==='image/png') return startsWith(buffer,[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])
  if(mime==='image/webp') return String.fromCharCode(...buffer.subarray(0,4))==='RIFF' &&
    String.fromCharCode(...buffer.subarray(8,12))==='WEBP'
  const mp4=String.fromCharCode(...buffer.subarray(4,8))==='ftyp'
  if(mime==='application/pdf') return String.fromCharCode(...buffer.subarray(0,5))==='%PDF-'
  if(mime==='video/mp4'||mime==='audio/mp4'||mime==='audio/x-m4a') return mp4
  if(mime==='video/quicktime') {
    const atom=String.fromCharCode(...buffer.subarray(4,8))
    const atomBytes=new DataView(buffer.buffer,buffer.byteOffset,buffer.byteLength).getUint32(0)
    return atomBytes>=8 && ['ftyp','moov','mdat','wide','free','skip'].includes(atom)
  }
  if(mime==='audio/webm') return startsWith(buffer,[0x1a,0x45,0xdf,0xa3])
  if(mime==='audio/mpeg') return startsWith(buffer,[0x49,0x44,0x33]) ||
    (buffer[0]===0xff&&(buffer[1]&0xe0)===0xe0)
  return false
}
// iPhone/Safari sometimes cannot PUT to Supabase's cross-origin signed-upload
// endpoint even after the owner was granted an intent. Reuse the proven
// first-party audio path for EXIF-free, already compressed report photographs.
// The owner cookie, client/session and immutable upload-intent checks are all
// required before a private object is written.
export async function uploadPrivateOwnerPhoto(config,store,clientId,sessionId,assetId,{mime,body}={}) {
  if(!validUuid(assetId))fail()
  if(!OWNER_PHOTO_MIME_TYPES.includes(mime))throw new AppError('MEDIA_TYPE_NOT_ALLOWED',415)
  if(!Buffer.isBuffer(body)||body.length<128||body.length>OWNER_PHOTO_PROXY_MAX_BYTES)
    throw new AppError('MEDIA_SIZE_NOT_ALLOWED',413)
  if(!headerMatches(body,mime))throw new AppError('MEDIA_TYPE_NOT_ALLOWED',415)
  const session=await getOwnerSession(config,store,clientId,sessionId)
  if(session.status==='archived')fail()
  const asset=await transaction(config,null,async db=>(await db.query(
    'select * from app_private.client_delivery_assets where id=$1 and session_id=$2 and legacy_client_id=$3',
    [assetId,sessionId,clientId])).rows[0],{server:true})
  if(!asset||!['pending','ready'].includes(asset.status)||
    asset.asset_kind!=='image'||(asset.storage_provider||'supabase')!=='supabase'||
    asset.mime!==mime||Number(asset.max_bytes)!==body.length)fail()
  if(asset.status==='ready')return {uploaded:true,already:true}
  const storage=client(config).storage.from(PRIVATE_MEDIA_BUCKET)
  const {error}=await storage.upload(asset.object_key,new Blob([body],{type:mime}),
    {contentType:mime,upsert:false,cacheControl:'0'})
  if(error){
    // A dropped Safari response must not cause an overwrite or a second
    // attachment. Finalization will still sniff the stored bytes.
    const {data:info,error:infoError}=await storage.info(asset.object_key)
    const actualMime=(info?.content_type||info?.contentType||info?.mimetype||
      info?.metadata?.mimetype||'').split(';')[0].toLowerCase()
    if(!infoError&&Number(info?.size??info?.metadata?.size)===body.length&&actualMime===mime)
      return {uploaded:true,already:true}
    throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
  }
  return {uploaded:true}
}

async function sniff(storage,path,mime,supabaseUrl) {
  const {data,error}=await storage.createSignedUrl(path,60)
  if(error||!data?.signedUrl) throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
  const url=new URL(data.signedUrl)
  if(url.protocol!=='https:'||url.origin!==new URL(supabaseUrl).origin)
    throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
  const response=await fetch(url,{headers:{Range:'bytes=0-31'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)})
  if(!response.ok||!response.body) throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
  const reader=response.body.getReader()
  try {
    const header=new Uint8Array(32);let count=0
    while(count<12){
      const chunk=await reader.read()
      if(chunk.done)break
      const bytes=chunk.value.subarray(0,32-count);header.set(bytes,count);count+=bytes.length
    }
    if(!headerMatches(header.subarray(0,count),mime)) throw new AppError('MEDIA_TYPE_NOT_ALLOWED',415)
  } finally { await reader.cancel().catch(()=>{}) }
}
export async function completePrivateMedia(config,store,clientId,sessionId,assetId,{durationSeconds=null,reviewFirst=false}={}) {
  if(!validUuid(assetId)) fail()
  await getOwnerSession(config,store,clientId,sessionId)
  const asset=await transaction(config,null,async db=>(await db.query(
    'select * from app_private.client_delivery_assets where id=$1 and session_id=$2 and legacy_client_id=$3',
    [assetId,sessionId,clientId])).rows[0],{server:true})
  if(!asset||asset.status==='removed') fail()
  if(asset.status==='ready') return attachSessionAsset(config,store,clientId,sessionId,assetId,{reviewFirst})
  if(asset.status!=='pending') fail()
  const provider=asset.storage_provider||'supabase'
  let size,mime
  if(provider==='supabase'){
    const storage=client(config).storage.from(PRIVATE_MEDIA_BUCKET)
    const {data,error}=await storage.info(asset.object_key)
    if(error||!data) throw new AppError('MEDIA_UPLOAD_NOT_FOUND',409)
    size=Number(data.size ?? data.metadata?.size ?? 0)
    mime=(data.content_type||data.contentType||data.mimetype||data.metadata?.mimetype||'').split(';')[0].toLowerCase()
  }else if(['r2','s3_ca'].includes(provider)){
    const inspected=await inspectUploadedVideo(provider,asset.object_key)
    size=inspected.bytes
    mime=inspected.mime
  }else fail()
  if(!Number.isSafeInteger(size)||size<128||size!==asset.max_bytes) throw new AppError('MEDIA_SIZE_NOT_ALLOWED',413)
  if(mime!==asset.mime && !(asset.mime==='audio/x-m4a'&&mime==='audio/mp4'))
    throw new AppError('MEDIA_TYPE_NOT_ALLOWED',415)
  if(provider==='supabase')
    await sniff(client(config).storage.from(PRIVATE_MEDIA_BUCKET),asset.object_key,asset.mime,config.supabaseUrl)
  else await verifyUploadedVideoHeader(provider,asset.object_key,size)
  const duration=durationSeconds===null?null:Number(durationSeconds)
  if(duration!==null&&(!Number.isInteger(duration)||duration<0||duration>14400))
    throw new AppError('INVALID_MEDIA_DURATION',400)
  await transaction(config,null,async db=>{
    const done=await db.query(
      "update app_private.client_delivery_assets set status='ready',bytes=$4,duration_seconds=$5,ready_at=now() where id=$1 and session_id=$2 and legacy_client_id=$3 and status='pending' returning id",
      [assetId,sessionId,clientId,size,duration])
    if(!done.rowCount) {
      const existing=(await db.query('select status from app_private.client_delivery_assets where id=$1',
        [assetId])).rows[0]
      if(existing?.status!=='ready') fail()
    }
  },{server:true})
  return attachSessionAsset(config,store,clientId,sessionId,assetId,{reviewFirst})
}
export async function privateMediaPlayback(config,clientId,sessionId,assetId) {
  const asset=await getSessionAsset(config,clientId,sessionId,assetId)
  const provider=asset.storage_provider||'supabase'
  if(provider!=='supabase'){
    if(!['r2','s3_ca'].includes(provider))fail()
    // Never send an external Storage bearer to a browser, including the owner.
    return {url:'/api/admin/clients/'+clientId+'/sessions/'+sessionId+'/media/'+assetId,
      mime:asset.mime,kind:asset.asset_kind,expiresIn:300}
  }
  const {data,error}=await client(config).storage.from(PRIVATE_MEDIA_BUCKET)
    .createSignedUrl(asset.object_key,300)
  if(error||!data?.signedUrl) throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
  return {url:data.signedUrl,mime:asset.mime,kind:asset.asset_kind,expiresIn:300}
}


// Permanently delete a discarded audio/video take only after the owner-only
// session service confirms it is not referenced by any published revision.
export async function deleteUnpublishedPrivateMedia(config,store,clientId,sessionId,assetId) {
  const removed=await markUnpublishedSessionAssetRemoved(config,store,clientId,sessionId,assetId)
  try {
    if(removed.provider==='supabase'){
      const {error}=await client(config).storage.from(PRIVATE_MEDIA_BUCKET).remove([removed.objectKey])
      if(error)throw error
    } else if(['r2','s3_ca'].includes(removed.provider))
      await deletePrivateVideo(removed.provider,removed.objectKey)
    else fail()
  }catch{
    // A removed tombstone remains for the owner's regular cleanup operation.
    throw new AppError('MEDIA_CLEANUP_RETRY_REQUIRED',503)
  }
  await transaction(config,null,db=>db.query(
    "delete from app_private.client_delivery_assets where id=$1 and legacy_client_id=$2 and session_id=$3 and status='removed'",
    [assetId,clientId,sessionId]),{server:true})
  return {removed:true}
}

// Owner-requested housekeeping only. A full day exceeds the signed upload
// window, so a discarded token cannot recreate an object after deletion.
// Claim before deleting: finalize and cleanup compete on pending status, and
// ready assets (including those referenced by an old publication) never qualify.
export async function cleanupPendingSessionMedia(config,store,clientId,sessionId) {
  await getOwnerSession(config,store,clientId,sessionId)
  const storage=client(config).storage.from(PRIVATE_MEDIA_BUCKET)
  const claimed=await transaction(config,null,async db=>(await db.query(
    "update app_private.client_delivery_assets set status='removed' where id in (select id from app_private.client_delivery_assets where legacy_client_id=$1 and session_id=$2 and ((status='pending' and ready_at is null) or status='removed') and created_at < now()-interval '24 hours' order by created_at limit 30 for update skip locked) and ((status='pending' and ready_at is null) or status='removed') returning object_key,storage_provider",
    [clientId,sessionId])).rows,{server:true})
  if(!claimed.length)return {removed:0}
  try{
    const native=claimed.filter(row=>!row.storage_provider||row.storage_provider==='supabase')
    if(native.length){
      const {error}=await storage.remove(native.map(row=>row.object_key))
      if(error)throw error
    }
    for(const row of claimed.filter(row=>row.storage_provider&&row.storage_provider!=='supabase'))
      await deletePrivateVideo(row.storage_provider,row.object_key)
  }catch{
    // Tombstones survive partial failures; 404 deletion is idempotent on retry.
    throw new AppError('MEDIA_CLEANUP_RETRY_REQUIRED',503)
  }
  await transaction(config,null,db=>db.query(
    "delete from app_private.client_delivery_assets where legacy_client_id=$1 and session_id=$2 and status='removed' and object_key=any($3::text[])",
    [clientId,sessionId,claimed.map(row=>row.object_key)]),{server:true})
  return {removed:claimed.length}
}

// A client receives only this app's authenticated route, never a Storage bearer URL.
// Each new GET/HEAD/Range request must be authorized by its calling route.
export async function privateMediaStream(config,clientId,sessionId,assetId,request) {
  const asset=await getSessionAsset(config,clientId,sessionId,assetId)
  return privateMediaObjectStream(config,asset,request)
}

// Used only after a private route authorizes the exact session/account.
// A generic approved teaching video can be stored ONCE in the same private bucket.
export async function privateMediaObjectStream(config,asset,request) {
  const headers={'Cache-Control':'private, no-store, max-age=0, must-revalidate',
    'X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow, noarchive',
    'Referrer-Policy':'no-referrer','Content-Type':asset.mime,'Accept-Ranges':'bytes',
    ...(asset.mime==='application/pdf'?{'Content-Disposition':'attachment; filename="session-material.pdf"'}:{})}
  const range=request.headers.get('range')
  let requested=null
  if(range){
    const match=/^bytes=(\d*)-(\d*)$/.exec(range)
    const start=match?.[1],end=match?.[2]
    if(!match||(!start&&!end)||[start,end].filter(Boolean).some(n=>!Number.isSafeInteger(Number(n)))||
      (start&&end&&Number(start)>Number(end))||(!start&&Number(end)===0)||(start&&Number(start)>=asset.bytes))
      return new Response(null,{status:416,headers:{...headers,'Content-Range':'bytes */'+asset.bytes,'Content-Length':'0'}})
    requested={start:start?Number(start):Math.max(0,asset.bytes-Number(end)),end:start?(end?Math.min(Number(end),asset.bytes-1):asset.bytes-1):asset.bytes-1}
  }
  const provider=asset.storage_provider||'supabase'
  let sourceUrl,expectedOrigin
  if(provider==='supabase'){
    const {data,error}=await client(config).storage.from(PRIVATE_MEDIA_BUCKET).createSignedUrl(asset.object_key,60)
    if(error||!data?.signedUrl)throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
    sourceUrl=data.signedUrl
    expectedOrigin=new URL(config.supabaseUrl).origin
  }else if(['r2','s3_ca'].includes(provider)){
    sourceUrl=createVideoReadUrl(provider,asset.object_key,request.method==='HEAD'?'HEAD':'GET')
    expectedOrigin=videoObjectOrigin(provider)
  }else fail()
  const url=new URL(sourceUrl)
  if(url.protocol!=='https:'||url.origin!==expectedOrigin)throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
  const upstream=await fetch(url,{method:request.method==='HEAD'?'HEAD':'GET',headers:range?{Range:range}:{},
    cache:'no-store',redirect:'error',signal:request.signal})
  if(![200,206,416].includes(upstream.status)){await upstream.body?.cancel().catch(()=>{});throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)}
  if(upstream.status===416){await upstream.body?.cancel().catch(()=>{});return new Response(null,{status:416,headers:{...headers,'Content-Range':'bytes */'+asset.bytes,'Content-Length':'0'}})}
  const length=upstream.headers.get('content-length'),contentRange=upstream.headers.get('content-range')
  const reject=async()=>{await upstream.body?.cancel().catch(()=>{});throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)}
  if(upstream.status===206){
    const match=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(contentRange||'')
    if(!requested||!match||Number(match[1])!==requested.start||Number(match[2])!==requested.end||Number(match[3])!==asset.bytes)return reject()
    if(length!==null&&(!/^\d+$/.test(length)||Number(length)!==requested.end-requested.start+1))return reject()
    headers['Content-Range']=contentRange
  }else if(length!==null&&(!/^\d+$/.test(length)||Number(length)!==asset.bytes))return reject()
  if(length!==null)headers['Content-Length']=length
  if(request.method==='HEAD'){await upstream.body?.cancel().catch(()=>{});return new Response(null,{status:upstream.status,headers})}
  return new Response(upstream.body,{status:upstream.status,headers})
}

// Private catalog reuses the exact same verified, non-public media pipeline.
export const privateStorageClient = client
export const sniffPrivateMedia = sniff
