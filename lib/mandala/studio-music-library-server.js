import "server-only";
import {randomUUID} from "node:crypto";
import {AppError} from "../assessments/contracts.js";
import {transaction} from "../app/database.js";
import {privateStorageClient,sniffPrivateMedia} from "../clients/session-delivery-storage.js";
import {
 STUDIO_MUSIC_BUCKET,STUDIO_MUSIC_MAX_TOTAL_BYTES,STUDIO_MUSIC_MAX_TRACKS,
 studioMusicFileInfo,studioMusicTitle,studioMusicCategory,
 studioMusicApproval,studioMusicAssetId
} from "./studio-music-contract.mjs";

const TABLE="app_private.studio_music_assets_v1";
const fail=(code,status=400)=>{throw new AppError(code,status)};
const view=row=>({id:row.id,title:row.title,category:row.category,
 mime:row.mime,bytes:Number(row.bytes),status:row.status,
 qualityScore:row.quality_score??null,rightsConfirmed:row.rights_confirmed===true,
 createdAt:row.created_at,publishedAt:row.published_at??null});
async function bucket(config){
 if(!config.secretKey)fail("MUSIC_STORAGE_UNAVAILABLE",503);
 const client=privateStorageClient(config);
 const {data,error}=await client.storage.getBucket(STUDIO_MUSIC_BUCKET);
 if(error||!data||data.public!==false)fail("MUSIC_STORAGE_UNAVAILABLE",503);
 return client.storage.from(STUDIO_MUSIC_BUCKET);
}
async function asset(config,id){
 const uuid=studioMusicAssetId(id);
 return transaction(config,null,async db=>(await db.query(
  "select * from "+TABLE+" where id=$1",[uuid])).rows[0],{server:true});
}
export async function listOwnerStudioMusic(config){
 await bucket(config);
 const rows=await transaction(config,null,async db=>(await db.query(
  "select * from "+TABLE+" order by created_at desc limit 70")).rows,{server:true});
 return {items:rows.map(view),maxTracks:STUDIO_MUSIC_MAX_TRACKS,
  maxLibraryBytes:STUDIO_MUSIC_MAX_TOTAL_BYTES,
  usedBytes:rows.reduce((n,r)=>n+Number(r.bytes),0)};
}
export async function prepareOwnerStudioMusic(config,input){
 let parsed,title,category;
 try{
  parsed=studioMusicFileInfo(input?.filename,input?.mime,input?.bytes);
  title=studioMusicTitle(input?.title);
  category=studioMusicCategory(input?.category);
 }catch{fail("MUSIC_UPLOAD_INVALID",400)}
 const store=await bucket(config);
 return transaction(config,null,async db=>{
  // Serialise quota reservations across browser tabs and retries.
  await db.query("select pg_advisory_xact_lock(46120326)");
  const limits=(await db.query("select count(*)::integer as n,coalesce(sum(bytes),0)::bigint as used, count(*) filter(where status='pending' and created_at>now()-interval '2 hours')::integer as waiting from "+TABLE)).rows[0];
  if(limits.n>=STUDIO_MUSIC_MAX_TRACKS||
    Number(limits.used)+parsed.bytes>STUDIO_MUSIC_MAX_TOTAL_BYTES)
    fail("MUSIC_LIBRARY_QUOTA",413);
  if(limits.waiting>=3)fail("MUSIC_UPLOAD_IN_PROGRESS",429);
  const id=randomUUID(),objectKey="originals/"+id+"."+parsed.ext;
  const {data,error}=await store.createSignedUploadUrl(objectKey);
  if(error||!data?.token)fail("MUSIC_STORAGE_UNAVAILABLE",503);
  await db.query("insert into "+TABLE+
   "(id,object_key,title,category,mime,bytes,status) values($1,$2,$3,$4,$5,$6,'pending')",
   [id,objectKey,title,category,parsed.mime,parsed.bytes]);
  return {assetId:id,bucket:STUDIO_MUSIC_BUCKET,path:objectKey,
   token:data.token,mime:parsed.mime,bytes:parsed.bytes,
   supabaseUrl:config.supabaseUrl,publishableKey:config.publishableKey};
 },{server:true});
}
export async function completeOwnerStudioMusic(config,input){
 const row=await asset(config,input?.assetId);
 if(!row)fail("MUSIC_UPLOAD_NOT_FOUND",404);
 if(row.status==="ready"||row.status==="published")return {item:view(row)};
 if(row.status!=="pending")fail("MUSIC_UPLOAD_NOT_READY",409);
 const store=await bucket(config);
 const {data,error}=await store.info(row.object_key);
 if(error||!data)fail("MUSIC_UPLOAD_MISSING",409);
 const bytes=Number(data.size??data.metadata?.size);
 const mime=String(data.content_type||data.contentType||
    data.mimetype||data.metadata?.mimetype||"").split(";")[0].toLowerCase();
 if(bytes!==Number(row.bytes)||mime!==row.mime)fail("MUSIC_UPLOAD_INVALID",415);
 await sniffPrivateMedia(store,row.object_key,row.mime,config.supabaseUrl);
 const updated=await transaction(config,null,async db=>(await db.query(
  "update "+TABLE+" set status='ready',updated_at=now() where id=$1 and status='pending' returning *",
  [row.id])).rows[0],{server:true});
 return {item:view(updated||await asset(config,row.id))};
}
export async function ownerStudioMusicPreview(config,input){
 const row=await asset(config,input?.assetId);
 if(!row||!["ready","published"].includes(row.status))fail("MUSIC_UPLOAD_NOT_READY",409);
 const {data,error}=await (await bucket(config)).createSignedUrl(row.object_key,300);
 if(error||!data?.signedUrl)fail("MUSIC_STORAGE_UNAVAILABLE",503);
 return {id:row.id,url:data.signedUrl};
}
export async function publishOwnerStudioMusic(config,input){
 let reviewed;
 try{reviewed=studioMusicApproval(input)}catch{fail("MUSIC_REVIEW_REQUIRED",400)}
 const row=await asset(config,input?.assetId);
 if(!row)fail("MUSIC_UPLOAD_NOT_FOUND",404);
 if(row.status!=="ready"&&row.status!=="published")fail("MUSIC_UPLOAD_NOT_READY",409);
 await bucket(config);
 const updated=await transaction(config,null,async db=>(await db.query(
  "update "+TABLE+" set status='published',quality_score=$2,rights_confirmed=$3,published_at=coalesce(published_at,now()),updated_at=now() where id=$1 and status in ('ready','published') returning *",
  [row.id,reviewed.qualityScore,reviewed.rightsConfirmed])).rows[0],{server:true});
 return {item:view(updated)};
}
export async function retireOwnerStudioMusic(config,input){
 const row=await asset(config,input?.assetId);
 if(!row)fail("MUSIC_UPLOAD_NOT_FOUND",404);
 const updated=await transaction(config,null,async db=>(await db.query(
  "update "+TABLE+" set status='retired',updated_at=now() where id=$1 and status in ('ready','published') returning *",
  [row.id])).rows[0],{server:true});
 if(!updated)fail("MUSIC_UPLOAD_NOT_READY",409);
 return {item:view(updated)};
}
export async function listPublishedStudioMusic(config){
 const rows=await transaction(config,null,async db=>(await db.query(
  "select id,title,category,mime,bytes,quality_score,created_at from "+TABLE+
   " where status='published' and rights_confirmed=true and quality_score>=4 order by published_at desc limit 60"
 )).rows,{server:true});
 return {items:rows.map(row=>({id:row.id,title:row.title,category:row.category,
  mime:row.mime,bytes:Number(row.bytes),qualityScore:row.quality_score}))};
}
export async function signedPublishedStudioMusic(config,input){
 const row=await asset(config,input?.assetId);
 if(!row||row.status!=="published"||!row.rights_confirmed||row.quality_score<4)
  fail("MUSIC_NOT_PUBLISHED",404);
 const {data,error}=await (await bucket(config)).createSignedUrl(row.object_key,180);
 if(error||!data?.signedUrl)fail("MUSIC_STORAGE_UNAVAILABLE",503);
 return {id:row.id,url:data.signedUrl,title:row.title,mime:row.mime,
  bytes:Number(row.bytes),expiresSeconds:180};
}
