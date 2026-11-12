// Browser-only private MP4 upload, sharing the existing signed Supabase token.
// Large iPhone files use TUS 6 MiB chunks; never upload before account auth,
// verified MP4 and explicit consent in the calling UI.
export const PRIVATE_VIDEO_CHUNK_BYTES=6*1024*1024;
export const PRIVATE_VIDEO_RESUMABLE_THRESHOLD=6*1024*1024;
const MAX_BYTES=12_000_000;
const SIGNED_TOKEN_LIFETIME_MS=2*60*60*1000;
const VIDEO_KEY=/^personal-videos\/[a-f0-9-]{36}\/[a-f0-9-]{36}\/master\.mp4$/i;
const PROJECT_HOST=/^([a-z0-9]{16,32})\.supabase\.co$/;
function fail(code){const error=new Error(code);error.code=code;return error;}
function validBlob(file){
 if(typeof Blob==="undefined"||!(file instanceof Blob)||
   !Number.isSafeInteger(file.size)||file.size<1024||file.size>MAX_BYTES)
  throw fail("INVALID_VIDEO_UPLOAD");
}
function targetFromUrl(supabaseUrl){
 let url;
 try{url=new URL(supabaseUrl)}catch{throw fail("INVALID_STORAGE_DESTINATION");}
 const match=url.hostname.match(PROJECT_HOST);
 if(url.protocol!=="https:"||url.port||url.username||url.password||
   url.pathname!=="/"||url.search||url.hash||!match)
  throw fail("INVALID_STORAGE_DESTINATION");
 return {
  apiOrigin:url.origin,
  storageOrigin:"https://"+match[1]+".storage.supabase.co",
 };
}
function checkedUploadUrl(value,storageOrigin,apiOrigin){
 if(typeof value!=="string"||!value)throw fail("INVALID_STORAGE_UPLOAD_URL");
 let candidate;
 try{candidate=new URL(value,storageOrigin);}catch{throw fail("INVALID_STORAGE_UPLOAD_URL");}
 if(candidate.protocol!=="https:"||
   ![storageOrigin,apiOrigin].includes(candidate.origin)||
   !candidate.pathname.startsWith("/storage/v1/upload/resumable/")||
   candidate.username||candidate.password||candidate.hash)
  throw fail("INVALID_STORAGE_UPLOAD_URL");
 return candidate.href;
}
function checkedOffset(raw,size){
 if(typeof raw!=="string"||!/^\d+$/.test(raw))throw fail("INVALID_UPLOAD_OFFSET");
 const offset=Number(raw);
 if(!Number.isSafeInteger(offset)||offset<0||offset>size)throw fail("INVALID_UPLOAD_OFFSET");
 return offset;
}
function encode(value){return btoa(value);}
function common(token){return {"Tus-Resumable":"1.0.0","x-signature":token};}
async function positionAt(url,token,size,fetchImpl,signal){
 const response=await fetchImpl(url,{
  method:"HEAD",headers:common(token),redirect:"error",cache:"no-store",signal
 });
 if(response.status===404||response.status===410)throw fail("PRIVATE_UPLOAD_URL_EXPIRED");
 if(!response.ok)throw fail("PRIVATE_UPLOAD_INTERRUPTED");
 return checkedOffset(response.headers.get("Upload-Offset"),size);
}
export function needsPrivateVideoChunks(size){
 return Number.isFinite(size)&&size>PRIVATE_VIDEO_RESUMABLE_THRESHOLD;
}
export async function uploadSignedPrivateVideoChunks({
 supabaseUrl,bucket,objectKey,token,file,previousUploadUrl=null,
 onUploadUrl=()=>{},onProgress=()=>{},fetchImpl=fetch,signal
}){
 validBlob(file);
 if(bucket!=="hh-client-private-media"||!VIDEO_KEY.test(objectKey)||
   typeof token!=="string"||!token||token.length>4096)
  throw fail("INVALID_VIDEO_UPLOAD");
 const {apiOrigin,storageOrigin}=targetFromUrl(supabaseUrl);
 const endpoint=storageOrigin+"/storage/v1/upload/resumable";
 let location=null,offset=0;
 if(previousUploadUrl){
  location=checkedUploadUrl(previousUploadUrl,storageOrigin,apiOrigin);
  try{offset=await positionAt(location,token,file.size,fetchImpl,signal);}
  catch(error){
   if(error?.code!=="PRIVATE_UPLOAD_URL_EXPIRED")throw error;
   location=null;
  }
 }
 if(!location){
  const metadata=[
   ["bucketName",bucket],["objectName",objectKey],
   ["contentType","video/mp4"],["cacheControl","3600"]
  ].map(([key,value])=>key+" "+encode(value)).join(",");
  const response=await fetchImpl(endpoint,{
   method:"POST",headers:{
    ...common(token),"Upload-Length":String(file.size),"Upload-Metadata":metadata
   },redirect:"error",cache:"no-store",signal
  });
  if(response.status!==201)throw fail("PRIVATE_RESUMABLE_START_FAILED");
  location=checkedUploadUrl(response.headers.get("Location"),storageOrigin,apiOrigin);
  onUploadUrl(location);
 }
 onProgress(offset,file.size);
 let recoveries=0;
 while(offset<file.size){
  const end=Math.min(offset+PRIVATE_VIDEO_CHUNK_BYTES,file.size);
  let response;
  try{
   response=await fetchImpl(location,{
    method:"PATCH",headers:{
     ...common(token),"Upload-Offset":String(offset),
     "Content-Type":"application/offset+octet-stream"
    },body:file.slice(offset,end,"video/mp4"),
    redirect:"error",cache:"no-store",signal
   });
  }catch{
   if(signal?.aborted||++recoveries>2)throw fail("PRIVATE_UPLOAD_INTERRUPTED");
   const recovered=await positionAt(location,token,file.size,fetchImpl,signal);
   if(recovered<offset)throw fail("INVALID_UPLOAD_OFFSET");
   offset=recovered;onProgress(offset,file.size);continue;
  }
  if(response.status===409){
   if(++recoveries>2)throw fail("PRIVATE_UPLOAD_INTERRUPTED");
   const recovered=await positionAt(location,token,file.size,fetchImpl,signal);
   if(recovered<=offset)throw fail("PRIVATE_UPLOAD_INTERRUPTED");
   offset=recovered;onProgress(offset,file.size);continue;
  }
  if(response.status!==204)throw fail("PRIVATE_UPLOAD_FAILED");
  const updated=checkedOffset(response.headers.get("Upload-Offset"),file.size);
  if(updated<=offset||updated>end)throw fail("INVALID_UPLOAD_OFFSET");
  offset=updated;recoveries=0;onProgress(offset,file.size);
 }
 return {uploadedBytes:offset,uploadUrl:location};
}

// A retry of the SAME video retains its existing signed reservation, so
// temporary iPhone connectivity cannot silently consume another quota slot.
export async function savePrivateMp4({
 file,details,request,sessionRef,onProgress=()=>{},fetchImpl=fetch
}){
 validBlob(file);
 if(typeof request!=="function"||!sessionRef||typeof sessionRef!=="object"||
   !details||typeof details!=="object")throw fail("INVALID_VIDEO_UPLOAD");
 const header=new Uint8Array(await file.slice(0,12).arrayBuffer());
 if(header.length<12||String.fromCharCode(...header.slice(4,8))!=="ftyp")
  throw fail("MEDIA_TYPE_NOT_ALLOWED");
 const signature=JSON.stringify(details);
 let session=sessionRef.current;
 if(session&&(session.file!==file||session.signature!==signature))
  session=null;
 if(!session){
  const created=await request("personal-videos",{
   ...details,bytes:file.size,consent:true
  },"POST");
  if(!created||typeof created.id!=="string"||typeof created.token!=="string"||
    typeof created.objectKey!=="string")throw fail("MEDIA_STORAGE_UNAVAILABLE");
  session={file,signature,created,issuedAt:Date.now(),uploadUrl:null};
  sessionRef.current=session;
 }else{
  // A previous PATCH/PUT might have succeeded even if confirmation timed out.
  try{
   await request("personal-videos/"+session.created.id,undefined,"POST");
   onProgress(file.size,file.size);
   return session.created.id;
  }catch(error){
   if(error?.code!=="MEDIA_UPLOAD_NOT_FOUND")throw error;
  }
 }
 if(Date.now()-session.issuedAt>=SIGNED_TOKEN_LIFETIME_MS)
  throw fail("PRIVATE_UPLOAD_EXPIRED");
 if(needsPrivateVideoChunks(file.size)){
  await uploadSignedPrivateVideoChunks({
   supabaseUrl:session.created.supabaseUrl,bucket:session.created.bucket,
   objectKey:session.created.objectKey,token:session.created.token,file,
   previousUploadUrl:session.uploadUrl,fetchImpl,onProgress,
   onUploadUrl:url=>{session.uploadUrl=url;}
  });
 }else{
  const {createClient}=await import("@supabase/supabase-js");
  const supabase=createClient(session.created.supabaseUrl,session.created.publishableKey,{
   auth:{persistSession:false,autoRefreshToken:false}
  });
  const {error}=await supabase.storage.from(session.created.bucket).uploadToSignedUrl(
   session.created.objectKey,session.created.token,file,{contentType:"video/mp4",upsert:false}
  );
  if(error)throw fail("PRIVATE_UPLOAD_FAILED");
  onProgress(file.size,file.size);
 }
 // Only the server's verified storage metadata + MP4 header mark the video READY.
 await request("personal-videos/"+session.created.id,undefined,"POST");
 return session.created.id;
}
