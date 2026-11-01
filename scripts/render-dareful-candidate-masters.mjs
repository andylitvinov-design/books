#!/usr/bin/env node
/**
 * Read-only candidate renderer on a hosted CI runner. Converts four curated
 * official Dareful HLS sources into REAL 5s H.264 MP4 draft clips. Not a still
 * frame animation, hotlink, stock mirror, final license release or catalog edit.
 * Review the resulting GitHub artifact before adding approved files to /public.
 */
import {readFileSync,mkdirSync,writeFileSync,statSync} from "node:fs";
import {resolve,join,dirname} from "node:path";
import {spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {CANDIDATE_FILE,validateCandidateManifest} from "./preview-dareful-candidates.mjs";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const output=resolve(root,"artifacts/dareful-wave-masters");
const license="https://creativecommons.org/licenses/by/4.0/";
function run(bin,args,encoding="utf8"){
 const result=spawnSync(bin,args,{cwd:root,encoding,timeout:180000,maxBuffer:10*1024*1024});
 if(result.error||result.status!==0)throw Error(bin+"_failed: "+String(result.stderr||result.error||"").slice(-800));
 return result.stdout;
}
function verifyMp4(path){
 const probe=JSON.parse(run("ffprobe",["-v","error","-show_streams","-show_format","-of","json",path]));
 const video=probe.streams?.find(v=>v.codec_type==="video");
 const duration=Number(probe.format?.duration);
 if(video?.codec_name!=="h264"||video.width!==1080||video.height!==1920||
   !Number.isFinite(duration)||duration<4.8||duration>5.2||
   statSync(path).size<20000)throw Error("video_draft_failed_codec_motion_baseline");
 // Fast physical-motion guard: comparing actual decoded luma frames, never an
 // image repeated as MP4. Very gentle scenes are reported, not auto-approved.
 const pixels=run("ffmpeg",["-hide_banner","-loglevel","error","-nostdin",
   "-i",path,"-vf","fps=1,scale=64:112,format=gray","-frames:v","5",
   "-pix_fmt","gray","-f","rawvideo","pipe:1"],null);
 const plane=64*112,n=Math.floor(pixels.length/plane);
 if(n<4)throw Error("not_enough_decoded_video_frames");
 let diff=0;
 for(let i=0;i<plane;i++)diff+=Math.abs(pixels[i]-pixels[(n-1)*plane+i]);
 const motionScore=Number((diff/plane).toFixed(3));
 if(motionScore===0)throw Error("static_or_repeated_frames_are_not_unique_footage");
 return {width:video.width,height:video.height,codec:video.codec_name,
   durationSeconds:duration,motionScore,motionRequiresEditorialReview:motionScore<0.4};
}
export function validateDraftMediaSource(source,manifest){
 if(manifest.approvedForPublication!==false||manifest.licenseUrl!==license||
   source.visualReviewRequired!==true||!manifest.sources.some(s=>s.id===source.id))
   throw Error("draft_cannot_bypass_individual_rights_review");
 const url=new URL(source.mediaUrl);
 if(url.protocol!=="https:"||url.hostname!=="stream.mux.com"||url.username||url.password||
   url.search||url.hash||!/^\/[A-Za-z0-9]+\.m3u8$/.test(url.pathname)||
   source.sourcePage!=="https://dareful.com/"+source.id+"/")throw Error("untrusted_video_source");
 return true;
}
export function renderCandidateDrafts(){
 const manifest=JSON.parse(readFileSync(CANDIDATE_FILE,"utf8"));
 validateCandidateManifest(manifest);
 mkdirSync(output,{recursive:true});
 const approved=JSON.parse(readFileSync(resolve(root,"data/video-catalog/scene-taxonomy.json"),"utf8")).scenes;
 const reserved=new Set(approved.map(s=>s.id));
 const results=[];
 for(const source of manifest.sources){
   validateDraftMediaSource(source,manifest);
   if(reserved.has(source.id))throw Error("candidate_already_registered_"+source.id);
   const mp4=join(output,source.id+".mp4");
   const poster=join(output,source.id+".jpg");
   run("ffmpeg",["-hide_banner","-loglevel","error","-nostdin","-y",
     "-rw_timeout","18000000","-i",source.mediaUrl,
     "-vf","fps=24,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,eq=saturation=0.92,format=yuv420p,fade=t=in:st=0:d=0.22,fade=t=out:st=4.6:d=0.4",
     "-t","5","-an","-c:v","libx264","-preset","veryfast","-crf","27",
     "-pix_fmt","yuv420p","-threads","2","-movflags","+faststart",
     "-metadata","comment=Joel Holland / Dareful / CC BY 4.0 / adapted; "+source.sourcePage,mp4]);
   const details=verifyMp4(mp4);
   run("ffmpeg",["-hide_banner","-loglevel","error","-nostdin","-y",
     "-ss","2","-i",mp4,"-frames:v","1","-vf","scale=540:-2",
     "-q:v","3",poster]);
   const sha256=createHash("sha256").update(readFileSync(mp4)).digest("hex");
   results.push({id:source.id,mp4:source.id+".mp4",poster:source.id+".jpg",
     sha256,bytes:statSync(mp4).size,...details,
     ownerApproved:false,sourcePage:source.sourcePage,
     license,creator:"Joel Holland / Dareful",
     rawStockRedistributed:false,status:"editorial_draft_not_published"});
 }
 const report={version:1,status:"DRAFT_REAL_MOVING_VIDEO_NOT_PUBLISHED",
   qualityGate:"Actual decoded frames + H.264 physical output, manual editorial and license attribution still required",
   sourceCount:results.length,
   approvedForPublication:false,clipMetadata:results};
 writeFileSync(join(output,"report.json"),JSON.stringify(report,null,2)+"\n");
 writeFileSync(join(output,"README.md"),
   "# Video Studio · reviewed-source moving MP4 drafts\n\n"+
   "These are edited 5-second H.264 drafts, not live videos, and are not listed in public catalog.\n"+
   "Review the footage, attribution and final suitability before owner approval.\n"+
   "Creator: Joel Holland / Dareful. License: "+license+"\n");
 return {drafts:results.length,dir:output,readyForEditorReview:true,published:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(renderCandidateDrafts(),null,2))}
 catch(e){console.error("Draft real MP4 rendering failed: "+e.message);process.exitCode=1}
}
