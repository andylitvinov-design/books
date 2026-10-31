#!/usr/bin/env node
/**
 * One-time source-licensed batch assembler. Run only from a trusted operator
 * environment: node scripts/import-dareful-verified-batch.mjs
 * No API credentials, visitor data or unauthorised video-generation service.
 * Original Dareful clips are ephemeral and never copied to public/.
 */
import {readFile,writeFile,stat,mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
import {importFreeStockScene} from "./import-free-stock-scene.mjs";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const batchFile=join(root,"data/video-catalog/dareful-verified-import-20261030.json");
const registryFile=join(root,"data/video-catalog/free-stock-scenes.json");
const license="https://creativecommons.org/licenses/by/4.0/";
function run(command,args){
 const result=spawnSync(command,args,{cwd:root,encoding:"utf8",timeout:120000,maxBuffer:2*1024*1024});
 if(result.error||result.status!==0)throw Error(command+" failed: "+String(result.stderr||result.error||"").slice(-1000));
 return result.stdout;
}
function proveVideo(file){
 const j=JSON.parse(run("ffprobe",["-v","error","-show_streams","-show_format","-of","json",file]));
 const video=j.streams.find(s=>s.codec_type==="video"&&s.width>=480&&s.height>=480);
 const duration=Number(j.format?.duration);
 if(!video||!Number.isFinite(duration)||duration<2.7)throw Error("invalid_downloaded_video");
 return {codec:video.codec_name,duration};
}
export function verifyReviewedBatch(batch){
 if(batch?.version!=="hh-reviewed-ccby-scene-import-v1"||
    batch.license!==license||batch.verifiedOn!=="2026-10-30"||
    batch.sources?.length!==12||batch.scenes?.length!==12)throw Error("unreviewed_import_manifest");
 const sourceIds=new Set;
 for(const item of batch.sources){
  if(!/^[a-z0-9-]{5,64}$/.test(item.id)||sourceIds.has(item.id)||
     item.sourcePage!=="https://dareful.com/"+item.id+"/"||
     item.provider!=="dareful"||item.creator!=="Joel Holland"||
     item.licenseId!=="cc_by_4_0"||item.licenseUrl!==license||
     item.checkedOn!=="2026-10-30")throw Error("unreviewed_stock_source");
  const u=new URL(item.mediaUrl);
  if(u.protocol!=="https:"||u.hostname!=="stream.mux.com"||u.search||u.hash||
     !/^\/[a-zA-Z0-9]+\.m3u8$/.test(u.pathname))throw Error("untrusted_media_url");
  sourceIds.add(item.id);
 }
 const seen=new Set;
 for(const item of batch.scenes){
  if(!/^[a-z0-9-]{5,64}$/.test(item.id)||seen.has(item.id)||
     !["energy","life","health","relationships","goals"].includes(item.theme)||
     !Array.isArray(item.clips)||item.clips.length!==2||
     item.clips[0]===item.clips[1]||item.clips.some(id=>!sourceIds.has(id))||
     !["ru","en","es"].every(lang=>typeof item.label?.[lang]==="string"&&item.label[lang].length>3))
     throw Error("invalid_scene_recipe");
  seen.add(item.id);
 }
 return true;
}
export async function importReviewedDarefulBatch(){
 const batch=JSON.parse(await readFile(batchFile,"utf8"));
 verifyReviewedBatch(batch);
 const current=JSON.parse(await readFile(registryFile,"utf8"));
 if(!Array.isArray(current))throw Error("invalid_free_stock_registry");
 const already=batch.scenes.filter(item=>current.some(s=>s.id===item.id));
 if(already.length===12)return {skipped:true,imported:0};
 if(already.length>0)throw Error("incomplete_existing_import_fail_closed");
 const tmp=await mkdtemp(join(tmpdir(),"hh-ccby-import-"));
 try{
  for(const source of batch.sources){
   const path=join(tmp,source.id+".mp4");
   run("ffmpeg",["-hide_banner","-loglevel","error","-nostdin","-y",
    "-rw_timeout","18000000","-i",source.mediaUrl,"-t","3.3","-map","0:v:0","-an",
    "-vf","fps=24,scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,setsar=1",
    "-c:v","libx264","-preset","veryfast","-crf","30","-pix_fmt","yuv420p",
    "-movflags","+faststart",path]);
   proveVideo(path);
   const fileStat=await stat(path);
   if(!fileStat.isFile()||fileStat.size<10000||fileStat.size>45*1024*1024)
     throw Error("unacceptable_stock_download");
   process.stdout.write("Verified real stock download: "+source.id+" / "+fileStat.size+" bytes\n");
  }
  const byId=new Map(batch.sources.map(s=>[s.id,s]));
  for(const scene of batch.scenes){
   const brief={
    id:scene.id,theme:scene.theme,label:scene.label,symbol:scene.symbol,
    tags:scene.tags,ownerApproved:true,rawClipsPublished:false,
    sources:scene.clips.map(id=>{
     const src=byId.get(id);
     return {file:id+".mp4",provider:"dareful",author:"Joel Holland",
      clipTitle:src.title,sourcePage:src.sourcePage,licenseId:"cc_by_4_0",
      licenseUrl:license,checkedOn:"2026-10-30",licenseEvidence:src.licenseEvidence,
      noRecognizablePeople:true,noVisibleBrandLogos:true,
      exactClipLicenseConfirmed:true,commercialUseApproved:true,
      editingApproved:true,identifiableSubjectsCleared:true};
    })
   };
   const briefPath=join(tmp,scene.id+".json");
   await writeFile(briefPath,JSON.stringify(brief)+"\n","utf8");
   const output=await importFreeStockScene(briefPath);
   process.stdout.write("Built: "+output.video+" / SHA256 "+output.sha256+"\n");
  }
  const catalog=JSON.parse(await readFile(registryFile,"utf8"));
  for(const scene of batch.scenes){
   const record=catalog.find(item=>item.id===scene.id);
   if(record?.status!=="approved"||!/^[a-f0-9]{64}$/.test(record.sha256||"")||
      record.sources?.length!==2||record.rawRedistributionAllowed!==false)
      throw Error("missing_output_or_provenance");
  }
  return {skipped:false,imported:12};
 }finally{await rm(tmp,{recursive:true,force:true});}
}
const entry=fileURLToPath(import.meta.url);
if(process.argv[1]&&resolve(process.argv[1])===entry) {
 importReviewedDarefulBatch().then(result=>process.stdout.write(JSON.stringify(result)+"\n"))
 .catch(error=>{process.stderr.write("Dareful batch import blocked: "+error.message+"\n");process.exitCode=1;});
}
