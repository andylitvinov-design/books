#!/usr/bin/env node
/**
 * Offline editorial and technical quality gate over 16 individually reviewed
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
import {validateCandidateManifest} from "./preview-dareful-candidates.mjs";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const output=resolve(root,"artifacts/hd-dareful-review-20261104");
const waveNames=[
  "data/video-catalog/dareful-verified-candidate-wave-20261101.json",
  "data/video-catalog/dareful-verified-candidate-wave2-20261101.json",
  "data/video-catalog/dareful-verified-candidate-wave3-20261103.json",
];
const allowed=new Set(["--check","--json"]);
if(process.argv.slice(2).some(arg=>!allowed.has(arg)))throw Error("unexpected_quality_review_option");
const license="https://creativecommons.org/licenses/by/4.0/";
const names=new Set(),hls=new Set(),candidates=[];
const verified=JSON.parse(readFileSync(resolve(root,"data/video-catalog/free-stock-scenes.json"),"utf8"));
const publishedPages=new Set(verified.flatMap(x=>(x.sources||[]).map(y=>y.sourcePage)));
for(const filename of waveNames){
 const manifest=JSON.parse(readFileSync(resolve(root,filename),"utf8"));
 validateCandidateManifest(manifest);
 for(const source of manifest.sources){
   if(names.has(source.id)||hls.has(source.mediaUrl)||publishedPages.has(source.sourcePage))
     throw Error("duplicate_or_already_published_footage_"+source.id);
   names.add(source.id);hls.add(source.mediaUrl);
   candidates.push(source);
 }
}
if(candidates.length!==16)throw Error("expected_16_unapproved_sources");
const cli=(bin,args,{timeout=120000,binary=false}={})=>{
 const p=spawnSync(bin,args,{cwd:root,timeout,encoding:binary?null:"utf8",maxBuffer:7e6});
 if(p.error||p.status!==0)throw Error(bin+"_failed: "+String(p.stderr||p.error).slice(-250));
 return p.stdout;
};
const hash=bytes=>createHash("sha256").update(bytes).digest("hex");
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
function metrics(movie){
 const info=JSON.parse(cli("ffprobe",["-v","error","-show_streams","-show_format","-of","json",movie]));
 const video=info.streams.find(s=>s.codec_type==="video");
 const duration=Number(info.format?.duration);
 const [num,den]=String(video?.avg_frame_rate||"0/0").split("/").map(Number);
 const fps=den>0?num/den:0;
 if(video?.codec_name!=="h264"||video.width!==720||video.height!==1280||
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
 const mp4=join(output,source.id+".mp4");
 const jpg=join(output,source.id+".jpg");
 const contact=join(output,source.id+"-contact.jpg");
 try{
   const start=clamp(Math.floor((source.durationSeconds-5)*0.28),0,Math.max(0,source.durationSeconds-6));
   cli("ffmpeg",["-hide_banner","-loglevel","error","-nostdin","-y",
     "-rw_timeout","25000000","-ss",String(start),"-i",source.mediaUrl,
     "-vf","fps=24,scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,setsar=1,format=yuv420p",
     "-t","5","-an","-c:v","libx264","-preset","veryfast","-crf","25",
     "-pix_fmt","yuv420p","-threads","2","-movflags","+faststart",
     "-metadata","comment=Joel Holland / Dareful / CC BY 4.0 / adapted; "+source.sourcePage,
     mp4],{timeout:120000});
   cli("ffmpeg",["-hide_banner","-loglevel","error","-nostdin","-y",
     "-ss","2","-i",mp4,"-frames:v","1","-vf","scale=360:640","-q:v","3",jpg],{timeout:25000});
   cli("ffmpeg",["-hide_banner","-loglevel","error","-nostdin","-y",
     "-i",mp4,"-vf","fps=1.8,scale=240:426,tile=3x3:nb_frames=9",
     "-frames:v","1","-q:v","4",contact],{timeout:25000});
   const quality=metrics(mp4);
   const signature=dHash(mp4);
   const nearest=signatures.length?Math.min(...signatures.map(x=>distance(x.sig,signature))):64;
   signatures.push({id:source.id,sig:signature});
   const perceptualDuplicate=nearest<5;
   const passed=quality.autoQualityPass&&!perceptualDuplicate;
   const record={id:source.id,sourcePage:source.sourcePage,
     license,creator:"Joel Holland / Dareful",attributionRequired:true,
     outputFormat:"720x1280 H264 24fps five seconds",
     originalLicensedSource:true,mediaUrlVerifiedHost:"stream.mux.com",
     editorialApproval:false,readyForPublication:false,
     visualReviewRequired:true,qualityStatus:passed?"technical_pass_needs_editor":"technical_or_similarity_reject",
     quality:{...quality,sha256:hash(readFileSync(mp4)),minimumDhashDistance:nearest},
     outputs:{mp4:source.id+".mp4",jpg:source.id+".jpg",contactSheet:source.id+"-contact.jpg"},
     suggestedTheme:source.suggestedTheme||null,
     sourceRightsCaveat:"CC BY 4.0 requires credit, licence URL, modification note; faces/logos/privacy still require editorial review"};
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
const report={schemaVersion:"hh-dareful-hd-editorial-qc-v1",
  reviewedSourceCandidates:16,technicalPass:ok,blockedOrNeedsReshoot:16-ok,
  publicationStatus:"ALL_UNAPPROVED_REVIEW_ONLY",
  addedToProduction:0,individualReviewStillMandatory:true,license,
  criteria:"actual decoded H264/720x1280/24fps/5s, measurable motion, tonal contrast, edges, SHA256 and dHash deduplication",
  noPaidServices:true,noUserData:true,sources:reviews};
writeFileSync(join(output,"report.json"),JSON.stringify(report,null,2)+"\n");
writeFileSync(join(output,"README.md"),
  "# HD moving footage editorial review (NOT RELEASED)\n\n"+
  "Each generated asset is cropped, modified Joel Holland/Dareful CC BY 4.0 licensed stock.\n"+
  "This review is not owner approval, release permission for people/marks, or a stock mirror.\n"+
  "Only technical pass clips with individually verified moving content can be considered for later import.\n"+
  "Contact sheets plus actual MP4 are mandatory to assess cropping, semantic suitability and quality.\n"+
  "Credit Joel Holland / Dareful, source URL, CC BY 4.0 and note crop/changes.\n");
process.stdout.write(JSON.stringify({status:report.publicationStatus,technicalPass:ok,needsReview:16},null,2)+"\n");
if(ok===0)process.exitCode=1;
