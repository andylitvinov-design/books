#!/usr/bin/env node
/**
 * One-time technical screening of 28 individually researched CC BY 4.0 Dareful films.
 * Stage PRIVATE owner QA artifacts; never publish raw stock, R2 objects or DB rows.
 * A portrait crop is never an independently filmed native portrait original.
 */
import {readFileSync,writeFileSync,mkdirSync,statSync,rmSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
const root=process.cwd();
const manifest=JSON.parse(readFileSync(resolve(root,'data/video-catalog/dareful-cinematic-wave4-20261106.json'),'utf8'));
const out=resolve(root,'artifacts/cinematic-dareful-wave4-20261106');
const SHA=bytes=>createHash('sha256').update(bytes).digest('hex');
const PAGE=/^https:\/\/dareful\.com\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/;
const STREAM=/^https:\/\/stream\.mux\.com\/[A-Za-z0-9]+\.m3u8$/;
function validate(){
 if(manifest.schemaVersion!=='hh-dareful-wave4-physical-qa-v1'||manifest.sourceCount!==28||
    manifest.approvedForPublication!==false||manifest.cloudflareUploadApproved!==false||
    manifest.ownerRightsSignoff!==false||manifest.sources?.length!==28)
   throw Error('INVALID_RESEARCH_MANIFEST');
 const ids=new Set(),pages=new Set(),streams=new Set();
 for(const x of manifest.sources){
   if(!/^[a-z][a-z0-9-]+$/.test(x.id)||!PAGE.test(x.sourcePage)||!STREAM.test(x.mediaUrl)||
     x.sourcePage!==`https://dareful.com/${x.id}/`||x.creator!=='Joel Holland'||
     x.licenseId!=='cc_by_4_0'||x.licenseUrl!=='https://creativecommons.org/licenses/by/4.0/'||
     x.sourcePageCheckedAt!=='2026-11-06'||x.rightsFinalCleared!==false||
     x.editorialApproved!==false||!Number.isInteger(x.durationSeconds)||x.durationSeconds<8||
     !['nature','water','work','heritage'].includes(x.category)||
     ids.has(x.id)||pages.has(x.sourcePage)||streams.has(x.mediaUrl))throw Error('UNVERIFIED_SOURCE_'+x.id);
   ids.add(x.id);pages.add(x.sourcePage);streams.add(x.mediaUrl);
 }
}
function cmd(bin,args,timeout=125000,{binary=false}={}){
 const p=spawnSync(bin,args,{cwd:root,encoding:binary?null:'utf8',timeout,maxBuffer:3000000,shell:false});
 if(p.error||p.status!==0)throw Error('MEDIA_TOOL_FAILED_'+bin+' '+String(p.stderr||p.error).slice(-350));
 return p.stdout;
}
function probe(file,w,h){
 const data=JSON.parse(cmd('ffprobe',['-v','error','-show_format','-show_streams','-of','json',file],15000));
 const video=data.streams?.find(s=>s.codec_type==='video');
 const parts=String(video?.avg_frame_rate||'0/1').split('/').map(Number),fps=parts[1]?parts[0]/parts[1]:0;
 const seconds=Number(data.format?.duration),bytes=statSync(file).size;
 if(!video||video.codec_name!=='h264'||video.pix_fmt!=='yuv420p'||
    video.width!==w||video.height!==h||Math.abs(fps-24)>0.15||
    !Number.isFinite(seconds)||seconds<4.7||seconds>5.3||bytes<55000||bytes>12000000||
    data.streams?.some(s=>s.codec_type==='audio'))throw Error('ENCODED_SOURCE_UNSUITABLE');
 cmd('ffmpeg',['-nostdin','-hide_banner','-loglevel','error','-xerror','-i',file,'-f','null','-'],50000);
 return {width:w,height:h,fps,seconds,bytes,sha256:SHA(readFileSync(file))};
}
function framesAndMotion(file){
 const raw=cmd('ffmpeg',['-nostdin','-hide_banner','-loglevel','error','-i',file,
   '-vf','fps=1,scale=48:27,format=gray','-frames:v','5','-f','rawvideo','-'],24000,{binary:true});
 const bytesPerFrame=48*27,count=Math.floor(raw.length/bytesPerFrame);
 if(count<4)throw Error('NO_MOVING_FRAMES');
 let motion=0,contrast=0;
 for(let t=0;t<count;t++){
   let sum=0,sumSq=0,delta=0;
   for(let j=0;j<bytesPerFrame;j++){
     const val=raw[t*bytesPerFrame+j];sum+=val;sumSq+=val*val;
     if(t)delta+=Math.abs(val-raw[(t-1)*bytesPerFrame+j]);
   }
   contrast=Math.max(contrast,Math.sqrt(Math.max(0,sumSq/bytesPerFrame-(sum/bytesPerFrame)**2)));
   if(t)motion+=delta/bytesPerFrame;
 }
 return {motion:Number((motion/(count-1)).toFixed(2)),contrast:Number(contrast.toFixed(2))};
}
function dHash(file){
 const raw=cmd('ffmpeg',['-nostdin','-hide_banner','-loglevel','error','-ss','2','-i',file,
   '-frames:v','1','-vf','scale=9:8,format=gray','-f','rawvideo','-'],20000,{binary:true});
 if(raw.length!==72)throw Error('HASH_FRAME_MISSING');
 let bits=0n;
 for(let y=0;y<8;y++)for(let x=0;x<8;x++)bits=(bits<<1n)|(raw[y*9+x]>raw[y*9+x+1]?1n:0n);
 return bits.toString(16).padStart(16,'0');
}
function hamming(a,b){let n=0,z=BigInt('0x'+a)^BigInt('0x'+b);while(z){n++;z&=z-1n;}return n;}
function render(source,file,aspect,start){
 const w=aspect==='landscape'?1280:720,h=aspect==='landscape'?720:1280;
 cmd('ffmpeg',['-y','-nostdin','-hide_banner','-loglevel','error','-rw_timeout','20000000',
   '-ss',String(start),'-i',source.mediaUrl,'-t','5','-an',
   '-vf',`fps=24,scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1,format=yuv420p`,
   '-c:v','libx264','-preset','veryfast','-crf',aspect==='landscape'?'25':'27',
   '-pix_fmt','yuv420p','-threads','2','-movflags','+faststart',
   '-metadata',`comment=Joel Holland / Dareful / CC BY 4.0 / adapted; ${source.sourcePage}`,file],110000);
 return probe(file,w,h);
}
function screen(source,prior){
 const land=join(out,source.id+'-landscape.mp4');
 const portrait=join(out,source.id+'-portrait.mp4');
 let error='';
 const starts=[Math.max(0,Math.min(source.durationSeconds-7,Math.floor(source.durationSeconds/3))),0];
 for(const start of [...new Set(starts)]){
   try{
     const landscape=render(source,land,'landscape',start),metrics=framesAndMotion(land);
     if(metrics.contrast<10||metrics.motion<0.22)throw Error('FLAT_OR_STILL_FOOTAGE');
     const phash=dHash(land),near=prior.filter(x=>hamming(x.phash,phash)<=5).map(x=>x.id);
     const portraitResult=render(source,portrait,'portrait',start);
     cmd('ffmpeg',['-y','-nostdin','-hide_banner','-loglevel','error','-ss','1','-i',land,
       '-frames:v','1','-vf','scale=640:-2','-q:v','3',join(out,source.id+'.jpg')],15000);
     cmd('ffmpeg',['-y','-nostdin','-hide_banner','-loglevel','error','-i',land,
       '-vf','fps=0.6,scale=480:270,tile=3x1:padding=3:margin=3','-frames:v','1',
       '-q:v','3',join(out,source.id+'-contact.jpg')],20000);
     return {id:source.id,status:'TECHNICAL_PASS_PENDING_HUMAN_REVIEW',category:source.category,
       sourcePage:source.sourcePage,filmedMasterId:'dareful:'+source.id,
       creator:source.creator,licenseId:source.licenseId,licenseUrl:source.licenseUrl,
       landscape:{file:source.id+'-landscape.mp4',...landscape},
       portrait:{file:source.id+'-portrait.mp4',...portraitResult,nativePortraitOriginal:false},
       ...metrics,phash,nearDuplicateReview:near,contactSheet:source.id+'-contact.jpg',
       editorialApproved:false,rightsFinalCleared:false,cloudflareUploaded:false,live:false};
   }catch(e){error=e.message;
     for(const p of [land,portrait])if(existsSync(p))rmSync(p,{force:true});
   }
 }
 return {id:source.id,status:'REJECTED_TECHNICAL',reason:String(error).slice(0,350),
   editorialApproved:false,rightsFinalCleared:false,cloudflareUploaded:false};
}
function main(){
 validate();
 if(process.argv.slice(2).join(' ')==='--check'){
   console.log('WAVE4_SOURCE_RIGHTS_PREFLIGHT_OK',manifest.sources.length);return;
 }
 if(process.argv.length!==2)throw Error('UNKNOWN_CLI_ARGUMENT');
 mkdirSync(out,{recursive:true});
 const report={schemaVersion:'hh-wave4-private-technical-qa-v1',reviewedAt:'2026-11-06',
   sourceCount:manifest.sourceCount,approvedForPublication:false,cloudflareUploaded:false,
   live:false,rightsFinalCleared:false,
   countingRule:'Count distinct filmedMasterId only, not landscape and cropped portrait separately',
   sources:[]};
 const prior=[];
 for(const src of manifest.sources){
   console.log('SOURCE_START',src.id);
   const r=screen(src,prior);report.sources.push(r);
   if(r.status==='TECHNICAL_PASS_PENDING_HUMAN_REVIEW')prior.push(r);
   console.log('SOURCE_RESULT',src.id,r.status);
 }
 report.technicalPass=prior.length;
 report.technicalRejected=report.sourceCount-prior.length;
 writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 writeFileSync(join(out,'README.txt'),
   'Private footage QA from Dareful CC BY 4.0; no Cloudflare R2 upload, no generator release.\n'+
   'All visual/people/property rights and individual final approvals remain pending.\n'+
   'Cropped portrait is NOT an independent native-portrait filmed original.\n');
 if(!prior.length)throw Error('NO_VALID_PHYSICAL_MEDIA_FOUND');
 console.log('FINAL_REPORT',JSON.stringify({pass:prior.length,rejected:report.technicalRejected}));
}
try{main()}catch(e){console.error('WAVE4_ERROR',e.message);process.exitCode=1;}
