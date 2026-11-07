#!/usr/bin/env node
/**
 * Offline editorial and technical quality gate over 25 individually sourced
 * Dareful/Joel Holland CC BY 4.0 source candidates. Requires network to read
 * official HLS streams; never writes to public/, a catalogue or any live app.
 * Output: 720x1280, 24fps 5s H264 MOVING draft + 3x3 contact sheet + report.
 * No user data, paid generation, source mirror or blind approval.
 */
import {readFileSync,writeFileSync,mkdirSync,existsSync,statSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {resolve,join,dirname} from "node:path";
import {fileURLToPath} from "node:url";


const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const retryMode=process.env.HH_CINEMATIC_RETRY_ZERO==="1";
const retryIds=new Set([
 "tropical-forest-aerial","fall-autumn-landscape-2","ocean-beach-sunset",
 "stream-water-nature","heavenly-sky-landscape","koolau-mountains-aerial",
 "crashing-waves-sea","coastal-aerial-ocean","beach-sand-waves",
 "flying-over-field"
]);
const output=resolve(root,retryMode
 ?"artifacts/cinematic-dareful-wave2-retry-20261105"
 :"artifacts/cinematic-dareful-wave2-20261105");
const allowed=new Set(["--check","--json"]);
if(process.argv.slice(2).some(a=>!allowed.has(a)))throw Error("unexpected_review_option");
const license="https://creativecommons.org/licenses/by/4.0/";
const manifest=JSON.parse(readFileSync(resolve(root,
  "data/video-catalog/dareful-cinematic-hd-candidates-wave2-20261105.json"),"utf8"));
if(manifest.schemaVersion!=="hh-dareful-cinematic-wave2-v1"||
  manifest.approvedForPublication!==false||manifest.sourceCount!==25||
  manifest.licenseUrl!==license||!Array.isArray(manifest.sources)||manifest.sources.length!==25)
  throw Error("unsafe_candidate_manifest");
const current=JSON.parse(readFileSync(resolve(root,"data/video-catalog/free-stock-scenes.json"),"utf8"));
const usedPages=new Set(current.flatMap(x=>(x.sources||[]).map(y=>y.sourcePage)));
const oldWaves=["dareful-verified-candidate-wave-20261101.json",
"dareful-verified-candidate-wave2-20261101.json",
"dareful-verified-candidate-wave3-20261103.json"];
for(const wave of oldWaves){
  const p=JSON.parse(readFileSync(resolve(root,"data/video-catalog/"+wave),"utf8"));
  for(const x of p.sources)usedPages.add(x.sourcePage);
}
const names=new Set(),streams=new Set(),candidates=[];
for(const x of manifest.sources){
  const exact="https://dareful.com/";
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x.id||"")||
     !x.sourcePage?.startsWith(exact)||!/^https:\/\/dareful\.com\/[a-z0-9-]+\/$/.test(x.sourcePage)||
     !/^https:\/\/stream\.mux\.com\/[A-Za-z0-9]+\.m3u8$/.test(x.mediaUrl||"")||
     x.licenseUrl!==license||x.licenseId!=="cc_by_4_0"||x.creator!=="Joel Holland"||
     x.approvedForPublication!==false||x.visualReviewRequired!==true||
     !Number.isInteger(x.durationSeconds)||x.durationSeconds<5||
     names.has(x.id)||streams.has(x.mediaUrl)||usedPages.has(x.sourcePage))
    throw Error("source_identity_or_rights_not_verified_"+x.id);
  if(!["ru","en","es"].every(l=>String(x.suggestedNames?.[l]||"").trim())||
     !Array.isArray(x.visualTags)||x.visualTags.length<2)
    throw Error("missing_visual_tags_or_locales_"+x.id);
  names.add(x.id);streams.add(x.mediaUrl);usedPages.add(x.sourcePage);candidates.push(x);
}
const cli=(bin,args,{timeout=120000,binary=false}={})=>{
 const p=spawnSync(bin,args,{cwd:root,timeout,encoding:binary?null:"utf8",maxBuffer:7e6});
 if(p.error||p.status!==0)throw Error(bin+"_failed: "+String(p.stderr||p.error).slice(-250));
 return p.stdout;
};
const hash=bytes=>createHash("sha256").update(bytes).digest("hex");
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
function metrics(movie,width=720,height=1280){
 const info=JSON.parse(cli("ffprobe",["-v","error","-show_streams","-show_format","-of","json",movie]));
 const video=info.streams.find(s=>s.codec_type==="video");
 const duration=Number(info.format?.duration);
 const [num,den]=String(video?.avg_frame_rate||"0/0").split("/").map(Number);
 const fps=den>0?num/den:0;
 if(video?.codec_name!=="h264"||video.width!==width||video.height!==height||
    video.pix_fmt!=="yuv420p"||fps<23.9||fps>24.1||
    duration<4.85||duration>5.15||statSync(movie).size<65000)
   throw Error("technical_codec_duration_or_size_rejected");
 const raw=cli("ffmpeg",["-hide_banner","-loglevel","error","-nostdin",
   "-i",movie,"-vf","fps=1,scale=48:84,format=gray","-frames:v","5",
   "-pix_fmt","gray","-f","rawvideo","pipe:1"],{binary:true,timeout:40000});
 const size=48*84,frames=Math.floor(raw.length/size);
 if(frames<4)throw Error("not_enough_decodable_frames");
 let minMean=255,maxMean=0,maxContrast=0,move=0,maxEdge=0;
 for(let t=0;t<frames;t++){
   const frame=raw.subarray(t*size,(t+1)*size);
   let sum=0,sumSq=0,edge=0;
   for(let k=0;k<size;k++){
     const px=frame[k];sum+=px;sumSq+=px*px;
     if(k%48!==47)edge+=Math.abs(px-frame[k+1]);
   }
   const mean=sum/size,contrast=Math.sqrt(Math.max(0,sumSq/size-mean*mean));
   minMean=Math.min(minMean,mean);maxMean=Math.max(maxMean,mean);
   maxContrast=Math.max(maxContrast,contrast);maxEdge=Math.max(maxEdge,edge/size);
   if(t>0){const prior=raw.subarray((t-1)*size,t*size);
     let delta=0;for(let k=0;k<size;k++)delta+=Math.abs(prior[k]-frame[k]);
     move+=delta/size;
   }
 }
 const motion=Number((move/(frames-1)).toFixed(3));
 const contrast=Number(maxContrast.toFixed(2)),edge=Number(maxEdge.toFixed(2));
 const mean=Number(((minMean+maxMean)/2).toFixed(2));
 let score=20; // Native HD, 24fps, real decoded physical H264 already required.
 if(contrast>=14)score+=20;
 if(motion>=1.25)score+=20;else if(motion>=0.50)score+=12;
 if(edge>=2.3)score+=15;else if(edge>=1.2)score+=8;
 if(minMean>=27&&maxMean<=230)score+=15;
 if(statSync(movie).size>=150000)score+=10;
 return {width:video.width,height:video.height,codec:video.codec_name,
   fps:24,durationSeconds:duration,bytes:statSync(movie).size,
   motion,contrast,edge,mean,score,
   autoQualityPass:score>=65&&motion>=0.40&&contrast>=12&&edge>=1.2,
   // Even score 100 is NOT editorial approval. All files need review.
   ownerApproval:false};
}
function dHash(file){
 const p=cli("ffmpeg",["-hide_banner","-loglevel","error","-nostdin","-ss","2",
   "-i",file,"-vf","scale=9:8,format=gray","-frames:v","1","-f","rawvideo",
   "pipe:1"],{binary:true,timeout:20000});
 if(p.length<72)throw Error("missing_perceptual_frame");
 let bits=0n;
 for(let i=0;i<8;i++)for(let j=0;j<8;j++)
   if(p[i*9+j]>p[i*9+j+1])bits|=1n<<BigInt(i*8+j);
 return bits;
}
function distance(a,b){
 let v=a^b,n=0;while(v){n+=Number(v&1n);v>>=1n;}return n;
}
mkdirSync(output,{recursive:true});
const reviews=[],signatures=[];
for(const source of candidates){
 if(retryMode&&!retryIds.has(source.id))continue;
 const mp4=join(output,source.id+".mp4");
 const jpg=join(output,source.id+".jpg");
 const contact=join(output,source.id+"-contact.jpg");
 const landscape=join(output,source.id+"-landscape.mp4");
 const landscapeContact=join(output,source.id+"-landscape-contact.jpg");
 try{
   const start=retryMode?0:clamp(Math.floor((source.durationSeconds-5)*0.28),0,Math.max(0,source.durationSeconds-6));
   cli("ffmpeg",["-hide_banner","-loglevel","error","-nostdin","-y",
     "-rw_timeout","25000000","-ss",String(start),"-i",source.mediaUrl,
     "-vf","fps=24,scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,setsar=1,format=yuv420p",
     "-t","5","-an","-c:v","libx264","-preset","veryfast","-crf","25",
     "-pix_fmt","yuv420p","-threads","2","-movflags","+faststart",
     "-metadata","comment=Joel Holland / Dareful / CC BY 4.0 / adapted; "+source.sourcePage,
     mp4],{timeout:120000});
   // A second native-aspect landscape version avoids misleading sharpness
   // claims when a 1920x1080 original is deeply cropped to 9:16.
   cli("ffmpeg",["-hide_banner","-loglevel","error","-nostdin","-y",
     "-rw_timeout","25000000","-ss",String(start),"-i",source.mediaUrl,
     "-vf","fps=24,scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,format=yuv420p",
     "-t","5","-an","-c:v","libx264","-preset","veryfast","-crf","23",
     "-pix_fmt","yuv420p","-threads","2","-movflags","+faststart",
     "-metadata","comment=Joel Holland / Dareful / CC BY 4.0 / landscape adapted; "+source.sourcePage,
     landscape],{timeout:150000});
   cli("ffmpeg",["-hide_banner","-loglevel","error","-nostdin","-y",
     "-ss","2","-i",mp4,"-frames:v","1","-vf","scale=360:640","-q:v","3",jpg],{timeout:25000});
   cli("ffmpeg",["-hide_banner","-loglevel","error","-nostdin","-y",
     "-i",mp4,"-vf","fps=1.8,scale=240:426,tile=3x3:nb_frames=9",
     "-frames:v","1","-q:v","4",contact],{timeout:25000});
   cli("ffmpeg",["-hide_banner","-loglevel","error","-nostdin","-y",
     "-i",landscape,"-vf","fps=1.8,scale=426:240,tile=3x3:nb_frames=9",
     "-frames:v","1","-q:v","4",landscapeContact],{timeout:25000});
   const quality=metrics(mp4);
   const landscapeQuality=metrics(landscape,1280,720);
   const signature=dHash(mp4);
   const nearest=signatures.length?Math.min(...signatures.map(x=>distance(x.sig,signature))):64;
   signatures.push({id:source.id,sig:signature});
   const perceptualDuplicate=nearest<5;
   const passed=(quality.autoQualityPass||landscapeQuality.autoQualityPass)&&!perceptualDuplicate;
   const record={id:source.id,sourcePage:source.sourcePage,
     license,creator:"Joel Holland / Dareful",attributionRequired:true,
     outputFormat:"720x1280 portrait + 1280x720 landscape H264 24fps five seconds",
     sourceActualOriginalFrameSizeUnverified:true,
     portraitCropFromLandscapeOriginal:true,notNativePortraitHD:true,
     originalLicensedSource:true,mediaUrlVerifiedHost:"stream.mux.com",
     editorialApproval:false,readyForPublication:false,
     visualReviewRequired:true,qualityStatus:passed?"technical_pass_needs_editor":"technical_or_similarity_reject",
     quality:{...quality,sha256:hash(readFileSync(mp4)),minimumDhashDistance:nearest},
     landscapeQuality:{...landscapeQuality,sha256:hash(readFileSync(landscape))},
     visualTags:source.visualTags,suggestedNames:source.suggestedNames,
     outputs:{mp4:source.id+".mp4",jpg:source.id+".jpg",contactSheet:source.id+"-contact.jpg",
       landscapeMp4:source.id+"-landscape.mp4",landscapeContact:source.id+"-landscape-contact.jpg"},
     suggestedTheme:source.suggestedTheme||null,
     sourceRightsCaveat:"CC BY 4.0 requires creator/source URL, licence link and crop notice; faces/logos/privacy remain unverified"};
   reviews.push(record);
   process.stdout.write(source.id+" "+record.qualityStatus+" score="+quality.score+"\n");
 }catch(e){
   reviews.push({id:source.id,sourcePage:source.sourcePage,
     readyForPublication:false,editorialApproval:false,
     qualityStatus:"unavailable_or_decode_failed",error:String(e.message||e).slice(0,350)});
   process.stdout.write(source.id+" blocked: "+String(e.message||e).slice(0,120)+"\n");
 }
}
const ok=reviews.filter(x=>x.qualityStatus==="technical_pass_needs_editor").length;
const report={schemaVersion:"hh-cinematic-hd-wave2-review-v1",
  reviewedSourceCandidates:reviews.length,technicalPass:ok,blockedOrNeedsReshoot:reviews.length-ok,
  runMode:retryMode?"retry_only_failed_ten_from_seek_zero":"initial_25",
  publicationStatus:"ALL_UNAPPROVED_REVIEW_ONLY",
  addedToProduction:0,individualReviewStillMandatory:true,license,
  criteria:"actual decoded H264/720x1280/24fps/5s, measurable motion, tonal contrast, edges, SHA256 and dHash deduplication",
  noPaidServices:true,noUserData:true,sources:reviews};
writeFileSync(join(output,"report.json"),JSON.stringify(report,null,2)+"\n");
writeFileSync(join(output,"README.md"),
  "# HD moving footage editorial review (NOT RELEASED)\n\n"+
  "Each generated asset is a five-second excerpt of third-party Joel Holland/Dareful CC BY 4.0 licensed stock with portrait-crop and landscape variants.\n"+
  "This review is not owner approval, release permission for people/marks, or a stock mirror.\n"+
  "Only visually approved technically verified real footage can be considered for later import; score alone grants NO publication approval.\n"+
  "Contact sheets plus actual MP4 are mandatory to assess cropping, semantic suitability and quality.\n"+
  "Credit Joel Holland / Dareful, source URL, CC BY 4.0 and note crop/changes.\n");
process.stdout.write(JSON.stringify({status:report.publicationStatus,technicalPass:ok,needsReview:reviews.length},null,2)+"\n");
if(ok===0)process.exitCode=1;
