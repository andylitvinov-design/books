import "server-only";
import {createHash} from "node:crypto";
import {AppError} from "@/lib/assessments/contracts";
import {createPrivateStorageClient,checkPrivateMediaStorage}
  from "@/lib/clients/session-delivery-storage";
import {getVideoJob,reserveVideoAiArchive,completeVideoAiArchive,failVideoAiArchive}
  from "@/lib/mandala/video-ai-repository";
import {fetchVideoAiContent} from "@/lib/mandala/video-ai-heygen.mjs";

const BUCKET="hh-client-private-media";
const MAX_BYTES=12_000_000;
function storage(config){
  if(!config.secretKey)throw new AppError("VIDEO_ARCHIVE_NOT_CONFIGURED",503);
  return createPrivateStorageClient(config).storage.from(BUCKET);
}
export function privateVideoArchiveEnabled(env=process.env){
  return env.HH_VIDEO_PRIVATE_ARCHIVE_ENABLED==="true" &&
    env.HH_PERSONAL_VIDEO_CLOUD_SAVE_ENABLED==="true";
}
async function boundedMp4(response){
  const contentLength=Number(response.headers.get("content-length"));
  if(Number.isFinite(contentLength)&&contentLength>MAX_BYTES)
    throw new AppError("VIDEO_TOO_LARGE",413);
  const reader=response.body?.getReader();
  if(!reader)throw new AppError("VIDEO_NOT_AVAILABLE",503);
  const chunks=[];let length=0;
  try{
    for(;;){
      const {value,done}=await reader.read();
      if(done)break;
      length+=value.byteLength;
      if(length>MAX_BYTES)throw new AppError("VIDEO_TOO_LARGE",413);
      chunks.push(Buffer.from(value));
    }
  }finally{reader.releaseLock();}
  const data=Buffer.concat(chunks,length);
  if(data.length<1024||data.toString("ascii",4,8)!=="ftyp")
    throw new AppError("INVALID_VIDEO_ASSET",415);
  return {data,bytes:length,sha256:createHash("sha256").update(data).digest("hex")};
}
/** Explicitly chosen PRIVATE persistence; never publishes a public URL. */
export async function archiveVideoAiJob(config,actor,jobId,{key}={}){
  if(!privateVideoArchiveEnabled())throw new AppError("VIDEO_ARCHIVE_DISABLED",503);
  const job=await getVideoJob(config,actor,jobId);
  if(job.status!=="completed"||!job.external_id)
    throw new AppError("VIDEO_NOT_READY",409);
  await checkPrivateMediaStorage(config);
  const reserved=await reserveVideoAiArchive(config,actor,jobId);
  if(reserved.existing)return {jobId,archived:true,existing:true};
  let uploaded=false;
  try{
    const content=await fetchVideoAiContent(job.external_id,{key});
    const asset=await boundedMp4(content);
    const {error}=await storage(config).upload(reserved.key,asset.data,{
      contentType:"video/mp4",upsert:false,cacheControl:"0",
    });
    if(error)throw new AppError("VIDEO_STORAGE_UNAVAILABLE",503);
    uploaded=true;
    return await completeVideoAiArchive(config,actor,jobId,{
      key:reserved.key,bytes:asset.bytes,sha256:asset.sha256,
    });
  }catch(error){
    // Prevent an orphan from eating client quota after DB/network failure.
    if(uploaded)await storage(config).remove([reserved.key]).catch(()=>{});
    await failVideoAiArchive(config,actor,jobId).catch(()=>{});
    throw error;
  }
}
export async function signedPrivateVideoAsset(config,actor,job){
  if(job.storage_state!=="ready"||typeof job.storage_path!=="string"||
    !job.storage_path.startsWith("ai-videos/"+actor.id+"/"+job.id+"/"))
    throw new AppError("VIDEO_NOT_READY",409);
  const {data,error}=await storage(config).createSignedUrl(job.storage_path,60);
  if(error||!data?.signedUrl)throw new AppError("VIDEO_STORAGE_UNAVAILABLE",503);
  const url=new URL(data.signedUrl);
  if(url.protocol!=="https:"||
    url.origin!==new URL(config.supabaseUrl).origin)
    throw new AppError("VIDEO_STORAGE_UNAVAILABLE",503);
  return url.href;
}
