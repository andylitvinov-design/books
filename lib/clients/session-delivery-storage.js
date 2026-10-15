import 'server-only'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { AppError } from '../assessments/contracts.js'
import { transaction } from '../app/database.js'
import { PRIVATE_MEDIA_BUCKET, SESSION_MEDIA_TYPES, validUuid } from './delivery-model.js'
import { getOwnerSession, attachSessionAsset, getSessionAsset } from './session-delivery-service.js'

const fail = () => { throw new AppError('MEDIA_UNAVAILABLE',404) }
function client(config) {
  if(!config.secretKey) throw new AppError('MEDIA_STORAGE_NOT_CONFIGURED',503)
  return createClient(config.supabaseUrl,config.secretKey,{
    auth:{persistSession:false,autoRefreshToken:false},
    global:{headers:{'x-client-info':'hh-private-delivery/1'}},
  })
}
function definition(mime,kind) {
  const type=SESSION_MEDIA_TYPES[mime]
  if(!type||type.kind!==kind) throw new AppError('MEDIA_TYPE_NOT_ALLOWED',415)
  return type
}
export async function createPrivateMediaIntent(config,store,clientId,sessionId,{mime,kind,scope='client',bytes}={}) {
  const info=definition(mime,kind)
  if(!['client','practitioner'].includes(scope) || !Number.isSafeInteger(bytes)||bytes<128||bytes>info.max)
    throw new AppError('MEDIA_SIZE_NOT_ALLOWED',413)
  const session=await getOwnerSession(config,store,clientId,sessionId)
  if(session.status==='archived') fail()
  const current=await transaction(config,null,async db=>(await db.query(
    "select count(*)::integer as n from app_private.client_delivery_assets where session_id=$1 and status='pending' and created_at > now()-interval '2 hours'",
    [sessionId])).rows[0].n,{server:true})
  if(current>=8) throw new AppError('MEDIA_PENDING_LIMIT',429)
  const id=randomUUID(),objectKey=randomUUID()+'/'+randomUUID()+'.'+info.ext
  const storage=client(config).storage.from(PRIVATE_MEDIA_BUCKET)
  const {data,error}=await storage.createSignedUploadUrl(objectKey)
  if(error || !data?.token) throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
  await transaction(config,null,db=>db.query(
    "insert into app_private.client_delivery_assets(id,legacy_client_id,session_id,asset_kind,scope,object_key,mime,max_bytes,status) values($1,$2,$3,$4,$5,$6,$7,$8,'pending')",
    [id,clientId,sessionId,kind,scope,objectKey,mime,info.max]),{server:true})
  return {assetId:id,objectKey,token:data.token,bucket:PRIVATE_MEDIA_BUCKET,
    supabaseUrl:config.supabaseUrl,publishableKey:config.publishableKey,mime,maxBytes:info.max}
}
const startsWith = (bytes,pattern) => pattern.every((value,index)=>bytes[index]===value)
function headerMatches(buffer,mime) {
  if(buffer.length<12) return false
  const mp4=String.fromCharCode(...buffer.subarray(4,8))==='ftyp'
  if(mime==='video/mp4'||mime==='audio/mp4'||mime==='audio/x-m4a') return mp4
  if(mime==='audio/webm') return startsWith(buffer,[0x1a,0x45,0xdf,0xa3])
  if(mime==='audio/mpeg') return startsWith(buffer,[0x49,0x44,0x33]) ||
    (buffer[0]===0xff&&(buffer[1]&0xe0)===0xe0)
  return false
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
    const first=await reader.read()
    if(!headerMatches(new Uint8Array(first.value||[]),mime)) throw new AppError('MEDIA_TYPE_NOT_ALLOWED',415)
  } finally { await reader.cancel().catch(()=>{}) }
}
export async function completePrivateMedia(config,store,clientId,sessionId,assetId,{durationSeconds=null}={}) {
  if(!validUuid(assetId)) fail()
  await getOwnerSession(config,store,clientId,sessionId)
  const asset=await transaction(config,null,async db=>(await db.query(
    'select * from app_private.client_delivery_assets where id=$1 and session_id=$2 and legacy_client_id=$3',
    [assetId,sessionId,clientId])).rows[0],{server:true})
  if(!asset||asset.status==='removed') fail()
  if(asset.status==='ready') return attachSessionAsset(config,store,clientId,sessionId,assetId)
  if(asset.status!=='pending') fail()
  const storage=client(config).storage.from(PRIVATE_MEDIA_BUCKET)
  const {data,error}=await storage.info(asset.object_key)
  if(error||!data) throw new AppError('MEDIA_UPLOAD_NOT_FOUND',409)
  const size=Number(data.size ?? data.metadata?.size ?? 0)
  const mime=(data.content_type||data.contentType||data.mimetype||data.metadata?.mimetype||'').split(';')[0].toLowerCase()
  if(!Number.isSafeInteger(size)||size<128||size>asset.max_bytes) throw new AppError('MEDIA_SIZE_NOT_ALLOWED',413)
  if(mime!==asset.mime && !(asset.mime==='audio/x-m4a'&&mime==='audio/mp4'))
    throw new AppError('MEDIA_TYPE_NOT_ALLOWED',415)
  await sniff(storage,asset.object_key,asset.mime,config.supabaseUrl)
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
  return attachSessionAsset(config,store,clientId,sessionId,assetId)
}
export async function privateMediaPlayback(config,clientId,sessionId,assetId) {
  const asset=await getSessionAsset(config,clientId,sessionId,assetId)
  const {data,error}=await client(config).storage.from(PRIVATE_MEDIA_BUCKET)
    .createSignedUrl(asset.object_key,300)
  if(error||!data?.signedUrl) throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
  return {url:data.signedUrl,mime:asset.mime,kind:asset.asset_kind,expiresIn:300}
}
