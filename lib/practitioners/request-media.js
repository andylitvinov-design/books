import 'server-only'
import {randomUUID} from 'node:crypto'
import {AppError,requireUUID} from '../assessments/contracts.js'
import {transaction as defaultTransaction} from '../app/database.js'
import {privateStorageClient,sniffPrivateMedia} from '../clients/session-delivery-storage.js'
import {DIRECT_MEDIA_BUCKET,directMediaSpec} from './direct-message-policy.mjs'
import {authorizedRequestParticipant} from './client-messages.js'

const fail=(code,status=400)=>{throw new AppError(code,status)}
export const ORDER_AUDIO_PROXY_MAX_BYTES=3_000_000
function audioSpec(mime,bytes){
  let info
  try{info=directMediaSpec(mime,bytes)}
  catch(e){fail(e.message,e.message==='MEDIA_SIZE_NOT_ALLOWED'?413:415)}
  if(info.kind!=='audio')fail('MEDIA_TYPE_NOT_ALLOWED',415)
  return info
}
async function bucket(config){
  const storage=privateStorageClient(config).storage
  const {data,error}=await storage.getBucket(DIRECT_MEDIA_BUCKET)
  if(error||data?.public!==false)fail('MEDIA_STORAGE_UNAVAILABLE',503)
  return storage.from(DIRECT_MEDIA_BUCKET)
}
function canonicalMime(data){
  return String(data?.content_type||data?.contentType||data?.mimetype||
    data?.metadata?.mimetype||'').split(';')[0].toLowerCase()
}
export function createRequestMedia(config,{transaction=defaultTransaction}={}){
  async function ownAsset(actor,assetId,{ready=false}={}){
    requireUUID(assetId)
    return transaction(config,actor,async db=>{
      const row=(await db.query(`select * from app.practitioner_request_media
        where id=$1 and uploader_account_id=$2`,[assetId,actor.id])).rows[0]
      if(!row)fail('NOT_FOUND',404)
      const scope=await authorizedRequestParticipant(db,actor,row.request_id)
      if(ready&&!scope.canReply)fail('CONVERSATION_CLOSED',409)
      return row
    })
  }
  return {
    async intent(actor,{requestId,mime,bytes}){
      requireUUID(requestId)
      const info=audioSpec(mime,bytes)
      const store=await bucket(config)
      return transaction(config,actor,async db=>{
        const scope=await authorizedRequestParticipant(db,actor,requestId)
        if(!scope.canReply)fail('CONVERSATION_CLOSED',409)
        const pending=(await db.query(`select count(*)::int as n
          from app.practitioner_request_media where uploader_account_id=$1
          and status='pending' and created_at>now()-interval '2 hours'`,[actor.id])).rows[0]?.n||0
        if(pending>=3)fail('MEDIA_PENDING_LIMIT',429)
        const id=randomUUID()
        const objectKey='orders/'+actor.id+'/'+id+'.'+info.extension
        const {data,error}=await store.createSignedUploadUrl(objectKey)
        if(error||!data?.token)fail('MEDIA_STORAGE_UNAVAILABLE',503)
        await db.query(`insert into app.practitioner_request_media
          (id,request_id,uploader_account_id,mime,expected_bytes,object_key)
          values($1,$2,$3,$4,$5,$6)`,
          [id,scope.requestId,actor.id,mime,bytes,objectKey])
        return {assetId:id,objectKey,bucket:DIRECT_MEDIA_BUCKET,
          supabaseUrl:config.supabaseUrl,publishableKey:config.publishableKey,
          token:data.token,mime}
      })
    },
    async upload(actor,assetId,{mime,body}){
      const row=await ownAsset(actor,assetId,{ready:true})
      if(row.status==='ready')return {uploaded:true,already:true,assetId}
      if(row.status!=='pending'||Date.now()-new Date(row.created_at).getTime()>2*3600000)
        fail('MEDIA_INTENT_EXPIRED',409)
      if(!Buffer.isBuffer(body)||body.length>ORDER_AUDIO_PROXY_MAX_BYTES||
         body.length!==row.expected_bytes||mime!==row.mime)
        fail('MEDIA_SIZE_NOT_ALLOWED',413)
      audioSpec(mime,body.length)
      const store=await bucket(config)
      const {error}=await store.upload(row.object_key,new Blob([body],{type:mime}),
        {contentType:mime,upsert:false,cacheControl:'0'})
      if(error){
        // Retry after an uncertain network result never overwrites a stored file.
        const {data,error:infoError}=await store.info(row.object_key)
        if(infoError||Number(data?.size??data?.metadata?.size)!==body.length||
           canonicalMime(data)!==mime)fail('MEDIA_STORAGE_UNAVAILABLE',503)
        return {uploaded:true,already:true,assetId}
      }
      return {uploaded:true,already:false,assetId}
    },
    async complete(actor,assetId){
      const row=await ownAsset(actor,assetId,{ready:true})
      if(row.status==='ready')return {assetId,ready:true}
      if(row.status!=='pending'||Date.now()-new Date(row.created_at).getTime()>2*3600000)
        fail('MEDIA_INTENT_EXPIRED',409)
      const store=await bucket(config)
      const {data,error}=await store.info(row.object_key)
      if(error||!data)fail('MEDIA_UPLOAD_NOT_FOUND',409)
      if(Number(data.size??data.metadata?.size)!==row.expected_bytes)
        fail('MEDIA_SIZE_NOT_ALLOWED',413)
      if(canonicalMime(data)!==row.mime)fail('MEDIA_TYPE_NOT_ALLOWED',415)
      // Validate actual stored bytes, not only the browser's declared MIME.
      await sniffPrivateMedia(store,row.object_key,row.mime,config.supabaseUrl)
      await transaction(config,actor,async db=>{
        const scope=await authorizedRequestParticipant(db,actor,row.request_id)
        if(!scope.canReply)fail('CONVERSATION_CLOSED',409)
        await db.query(`update app.practitioner_request_media set status='ready',
          ready_at=now() where id=$1 and uploader_account_id=$2
          and status='pending'`,[row.id,actor.id])
      })
      return {assetId,ready:true}
    },
    async read(actor,assetId){
      requireUUID(assetId)
      const row=await transaction(config,actor,async db=>{
        const a=(await db.query(`select a.request_id,a.object_key,a.mime,a.status,a.message_id,
          m.visibility,m.request_id as message_request_id
          from app.practitioner_request_media a
          join app.practitioner_request_messages m on m.id=a.message_id
          where a.id=$1`,[assetId])).rows[0]
        if(!a||a.status!=='ready'||a.visibility!=='participants'||
           a.request_id!==a.message_request_id)fail('NOT_FOUND',404)
        await authorizedRequestParticipant(db,actor,a.request_id)
        return a
      })
      const store=await bucket(config)
      const {data,error}=await store.createSignedUrl(row.object_key,60)
      if(error||!data?.signedUrl)fail('MEDIA_STORAGE_UNAVAILABLE',503)
      const url=new URL(data.signedUrl)
      if(url.protocol!=='https:'||url.origin!==new URL(config.supabaseUrl).origin)
        fail('MEDIA_STORAGE_UNAVAILABLE',503)
      return {url:url.href,mime:row.mime}
    },
  }
}
