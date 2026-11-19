import 'server-only';
import {createHash,randomUUID} from 'node:crypto';
import {transaction} from '../app/database.js';
import {AppError} from '../assessments/contracts.js';
import {privateStorageClient,sniffPrivateMedia} from '../clients/session-delivery-storage.js';
import {
 OWNER_VIDEO_BUCKET,OWNER_VIDEO_MAX_BYTES,OWNER_VIDEO_MAX_CLIPS,OWNER_VIDEO_MAX_TOTAL_BYTES,
 ownerVideoFile,ownerVideoId,ownerVideoReview
} from './owner-video-contract.mjs';

const TABLE='app_private.owner_video_library_v1';
const fail=(code,status=400)=>{throw new AppError(code,status)};
const view=row=>({id:row.id,title:row.title,category:row.category,tags:row.tags,
 bytes:Number(row.bytes),status:row.status,createdAt:row.created_at,
 sha256:row.sha256||null,qualityScore:row.quality_score??null,
 rightsConfirmed:row.rights_confirmed===true,sourceType:row.source_type||null,
 sourcePage:row.source_page||null,
 // Reviewed is still PRIVATE. Public/broadcast rendering has a separate rights gate.
 generatorEligible:false});
async function storage(config){
 if(!config.secretKey)fail('VIDEO_LIBRARY_STORAGE_DISABLED',503);
 const client=privateStorageClient(config);
 const {data,error}=await client.storage.getBucket(OWNER_VIDEO_BUCKET);
 if(error||!data||data.public!==false)fail('VIDEO_LIBRARY_STORAGE_DISABLED',503);
 return client.storage.from(OWNER_VIDEO_BUCKET);
}
async function record(config,id){
 let uuid;try{uuid=ownerVideoId(id)}catch{fail('VIDEO_ID_INVALID',400)}
 return transaction(config,null,async db=>(await db.query(
  `select * from ${TABLE} where id=$1`,[uuid])).rows[0],{server:true});
}
export async function listOwnerVideoLibrary(config){
 await storage(config);
 const rows=await transaction(config,null,async db=>(await db.query(
  `select * from ${TABLE} order by created_at desc limit 15`)).rows,{server:true});
 return {items:rows.map(view),maxClips:OWNER_VIDEO_MAX_CLIPS,
  maxFileBytes:OWNER_VIDEO_MAX_BYTES,maxTotalBytes:OWNER_VIDEO_MAX_TOTAL_BYTES,
  usedBytes:rows.reduce((n,x)=>n+Number(x.bytes),0)};
}
export async function prepareOwnerVideoLibrary(config,input){
 let data;try{data=ownerVideoFile(input)}catch{fail('VIDEO_UPLOAD_INVALID',400)}
 const bucket=await storage(config);
 return transaction(config,null,async db=>{
  await db.query('select pg_advisory_xact_lock(16111926)');
  const current=(await db.query(`select count(*)::integer as n,
   coalesce(sum(bytes),0)::bigint as used,
   count(*) filter(where status='pending' and created_at > now()-interval '2 hours')::integer as pending
   from ${TABLE}`)).rows[0];
  if(Number(current.n)>=OWNER_VIDEO_MAX_CLIPS||
     Number(current.used)+data.bytes>OWNER_VIDEO_MAX_TOTAL_BYTES)
   fail('VIDEO_LIBRARY_QUOTA',413);
  if(Number(current.pending)>=2)fail('VIDEO_UPLOAD_IN_PROGRESS',429);
  const id=randomUUID(),objectKey='video-library/'+id+'.mp4';
  const {data:sign,error}=await bucket.createSignedUploadUrl(objectKey);
  if(error||!sign?.token)fail('VIDEO_LIBRARY_STORAGE_DISABLED',503);
  await db.query(`insert into ${TABLE}(id,object_key,title,category,tags,bytes,mime,status)
    values($1,$2,$3,$4,$5,$6,'video/mp4','pending')`,
    [id,objectKey,data.title,data.category,data.tags,data.bytes]);
  return {assetId:id,bucket:OWNER_VIDEO_BUCKET,path:objectKey,token:sign.token,
   mime:data.mime,bytes:data.bytes,supabaseUrl:config.supabaseUrl,
   publishableKey:config.publishableKey};
 },{server:true});
}
/** Never trust a file extension or upload metadata as proof of actual bytes. */
async function verifyPrivateVideoBytes(bucket,row,config){
 const {data:info,error}=await bucket.info(row.object_key);
 if(error||!info)fail('VIDEO_UPLOAD_MISSING',409);
 const bytes=Number(info.size??info.metadata?.size);
 const mime=String(info.content_type||info.contentType||info.mimetype||
  info.metadata?.mimetype||'').split(';')[0].toLowerCase();
 if(bytes!==Number(row.bytes)||bytes>OWNER_VIDEO_MAX_BYTES||mime!=='video/mp4')
  fail('VIDEO_UPLOAD_INVALID',415);
 await sniffPrivateMedia(bucket,row.object_key,'video/mp4',config.supabaseUrl);
 const {data:signed,error:signError}=await bucket.createSignedUrl(row.object_key,60);
 if(signError||!signed?.signedUrl)fail('VIDEO_UPLOAD_UNAVAILABLE',503);
 const url=new URL(signed.signedUrl);
 if(url.origin!==new URL(config.supabaseUrl).origin||url.protocol!=='https:')
  fail('VIDEO_UPLOAD_UNAVAILABLE',503);
 const response=await fetch(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(25000)});
 if(!response.ok||!response.body)fail('VIDEO_UPLOAD_UNAVAILABLE',503);
 const hash=createHash('sha256');let total=0;
 try{
  for await(const chunk of response.body){
   total+=chunk.byteLength;
   if(total>Number(row.bytes)||total>OWNER_VIDEO_MAX_BYTES)fail('VIDEO_UPLOAD_INVALID',415);
   hash.update(chunk);
  }
 }finally{await response.body?.cancel?.().catch(()=>{})}
 if(total!==Number(row.bytes))fail('VIDEO_UPLOAD_INVALID',415);
 return hash.digest('hex');
}
export async function completeOwnerVideoLibrary(config,input){
 const row=await record(config,input?.assetId);
 if(!row)fail('VIDEO_UPLOAD_NOT_FOUND',404);
 if(['ready','reviewed'].includes(row.status))return {item:view(row)};
 if(row.status!=='pending')fail('VIDEO_UPLOAD_NOT_READY',409);
 const bucket=await storage(config);
 const sha=await verifyPrivateVideoBytes(bucket,row,config);
 const next=await transaction(config,null,async db=>{
  // One clip per exact content hash: a portrait crop is not a new original.
  const exists=(await db.query(`select id from ${TABLE} where sha256=$1 and id<>$2 limit 1`,
    [sha,row.id])).rows[0];
  if(exists)fail('VIDEO_DUPLICATE_FILE',409);
  return (await db.query(`update ${TABLE} set status='ready',sha256=$2,updated_at=now()
    where id=$1 and status='pending' returning *`,[row.id,sha])).rows[0];
 },{server:true});
 return {item:view(next||await record(config,row.id))};
}
export async function previewOwnerVideoLibrary(config,input){
 const row=await record(config,input?.assetId);
 if(!row||!['ready','reviewed'].includes(row.status))fail('VIDEO_UPLOAD_NOT_READY',409);
 const {data,error}=await (await storage(config)).createSignedUrl(row.object_key,180);
 if(error||!data?.signedUrl)fail('VIDEO_UPLOAD_UNAVAILABLE',503);
 return {assetId:row.id,url:data.signedUrl,expiresSeconds:180};
}
export async function reviewOwnerVideoLibrary(config,input){
 let decision;try{decision=ownerVideoReview(input)}catch{fail('VIDEO_REVIEW_REQUIRED',400)}
 const row=await record(config,input?.assetId);
 if(!row||!['ready','reviewed'].includes(row.status))fail('VIDEO_UPLOAD_NOT_READY',409);
 const next=await transaction(config,null,async db=>(await db.query(`update ${TABLE}
  set status='reviewed',quality_score=$2,rights_confirmed=true,source_type=$3,
   source_page=$4,people_cleared=true,updated_at=now()
  where id=$1 and status in ('ready','reviewed') returning *`,
  [row.id,decision.qualityScore,decision.sourceType,decision.sourcePage])).rows[0],{server:true});
 return {item:view(next)};
}
export async function removeOwnerVideoLibrary(config,input){
 if(input?.confirmed!==true)fail('VIDEO_DELETE_CONFIRMATION_REQUIRED',400);
 const row=await record(config,input.assetId);
 if(!row)fail('VIDEO_UPLOAD_NOT_FOUND',404);
 const bucket=await storage(config);
 if(!/^video-library\/[0-9a-f-]{36}\.mp4$/.test(row.object_key))
  fail('VIDEO_DELETE_DENIED',403);
 const {error}=await bucket.remove([row.object_key]);
 if(error)fail('VIDEO_DELETE_FAILED',503);
 await transaction(config,null,db=>db.query(`delete from ${TABLE} where id=$1`,[row.id]),{server:true});
 return {removed:row.id};
}
