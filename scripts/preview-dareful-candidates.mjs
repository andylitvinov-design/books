#!/usr/bin/env node
/**
 * Copyright-safe editorial previews of a fixed, pending Dareful wave.
 * Downloads NO files into public/ and does NOT approve/publish clip masters.
 * Prints eight sampled frames per source, credits and a review-needed report.
 * Only exact official Dareful clip pages and stream.mux.com HLS URLs are trusted.
 */
import {readFile,mkdir,writeFile,stat} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {resolve,dirname,join} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {createHash} from "node:crypto";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
export const CANDIDATE_FILE=join(root,"data/video-catalog/dareful-verified-candidate-wave-20261101.json");
export const CANDIDATE_WAVE2_FILE=join(root,"data/video-catalog/dareful-verified-candidate-wave2-20261101.json");
const output=join(root,"artifacts","dareful-wave-previews");
const license="https://creativecommons.org/licenses/by/4.0/";
function vettedUrl(value,host,pattern){
 try{
  const u=new URL(value);
  return u.protocol==="https:"&&u.hostname===host&&!u.search&&!u.hash&&
    !u.username&&!u.password&&pattern.test(u.pathname);
 }catch{return false;}
}
export function validateCandidateManifest(data){
 if(!data||data.version!=="hh-dareful-source-candidates-v1"||
    data.approvedForPublication!==false||data.licenseUrl!==license||
    !Array.isArray(data.sources)||!data.sources.length||data.sources.length>16)
  throw Error("not_an_unapproved_licensed_candidate_manifest");
 const seen=new Set();
 for(const source of data.sources){
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(source.id||"")||seen.has(source.id)||
    source.visualReviewRequired!==true||!Number.isFinite(source.durationSeconds)||source.durationSeconds<9||
    source.sourcePage!=="https://dareful.com/"+source.id+"/"||
    !vettedUrl(source.sourcePage,"dareful.com",/^\/[a-z0-9-]+\/$/)||
    !vettedUrl(source.mediaUrl,"stream.mux.com",/^\/[A-Za-z0-9]+\.m3u8$/))
    throw Error("untrusted_or_unreviewed_video_source_"+(source?.id||"unknown"));
  if(!["ru","en","es"].every(lang=>typeof source.suggestedNames?.[lang]==="string"&&
    source.suggestedNames[lang].trim().length>3))
    throw Error("missing_video_translation_"+source.id);
  seen.add(source.id);
 }
 return true;
}
function ffmpegPreview(source,destination){
 const command=spawnSync("ffmpeg",[
  "-hide_banner","-loglevel","error","-nostdin","-rw_timeout","18000000",
  "-i",source.mediaUrl,"-t","9","-map","0:v:0","-an",
  "-vf","fps=1,scale=360:640:force_original_aspect_ratio=increase,crop=360:640,tile=3x3:nb_frames=9",
  "-frames:v","1","-q:v","4","-y",destination
 ],{cwd:root,encoding:"utf8",timeout:90000,maxBuffer:250000});
 return command.status===0?null:String(command.stderr||command.error||"preview_failed").slice(0,500);
}
export async function previewCandidates({sourceFile=CANDIDATE_FILE,directory=output}={}){
 const manifest=JSON.parse(await readFile(sourceFile,"utf8"));
 validateCandidateManifest(manifest);
 await mkdir(directory,{recursive:true});
 const results=[];
 for(const source of manifest.sources){
  const destination=join(directory,source.id+".jpg");
  let error=ffmpegPreview(source,destination);
  let size=0,sha256=null;
  if(!error){
   try{
     const bytes=await readFile(destination);
     size=bytes.byteLength;
     if(size<5000)throw Error("preview_is_empty");
     sha256=createHash("sha256").update(bytes).digest("hex");
   }catch(e){error=String(e.message||e);}
  }
  results.push({id:source.id,sourcePage:source.sourcePage,licenseUrl:license,
    author:"Joel Holland / Dareful",contactSheet:error?null:source.id+".jpg",
    bytes:size,sha256,status:error?"download_or_decode_failed":"contact_sheet_needs_human_review",
    error:error||null,approved:false});
  process.stdout.write(source.id+": "+(error?"BLOCKED "+error:"9-frame JPG prepared")+"\n");
 }
 const report={version:1,status:"PREVIEW_ONLY_NOT_IMPORTED",
   disclaimer:"Contact sheets do not prove permission to use people, brands or safety-sensitive visual details. Review before approval.",
   license,attribution:"Joel Holland / Dareful; CC BY 4.0; images adapted into contact sheets",
   images:results,approvedForPublication:false};
 await writeFile(join(directory,"report.json"),JSON.stringify(report,null,2)+"\n");
 await writeFile(join(directory,"README.md"),
   "# Dareful footage editorial review — NOT PUBLISHED\n\n"+
   "These are contact sheets of nine real-video frames, **not approved masters**.\n"+
   "Check each for recognizable people, logos, suitability, actual movement and duplicated content.\n"+
   "All media remains pending until reviewed and subsequently imported through the licensed importer.\n\n"+
   "License: "+license+"\nCreator: Joel Holland / Dareful (modified contact sheet).\n\n"+
   results.map(r=>"- "+r.id+" — "+r.status+" — "+r.sourcePage).join("\n")+"\n");
 return {readyForReview:results.filter(r=>!r.error).length,failed:results.filter(r=>r.error).length,output:directory};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 previewCandidates(process.argv.includes("--wave2")?{sourceFile:CANDIDATE_WAVE2_FILE,directory:join(root,"artifacts","dareful-wave2-previews")}:undefined).then(value=>console.log(JSON.stringify(value)))
   .catch(error=>{console.error("Dareful preview rejected: "+error.message);process.exitCode=1});
}
