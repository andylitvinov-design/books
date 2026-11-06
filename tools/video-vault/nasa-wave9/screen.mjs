#!/usr/bin/env node
/** NASA footage private moving source QA; no claims of rights/endorsement or LIVE. */
import {readFileSync,writeFileSync,mkdirSync,statSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {safeNasaId,NASA_LIBRARY} from './discover.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const API_URL=/^https:\/\/images-api\.nasa\.gov\/asset\/[a-z0-9_\-]+$/i;
const NASA_ASSET_HOSTS=new Set(['images-assets.nasa.gov','images-api.nasa.gov']);
// NASA's own /asset API still returns canonical NASA file links with http://.
// Upgrade ONLY the exact official host to HTTPS; never fetch insecure HTTP,
// arbitrary third-party providers, signed/secret URLs or credentials.
export function canonicalNasaVideoUrl(value){
 try{
  const u=new URL(value);
  if(!['https:','http:'].includes(u.protocol)||!NASA_ASSET_HOSTS.has(u.hostname)||
     !/\.(mp4|mov)$/i.test(u.pathname)||u.username||u.password||u.search||u.hash)
    return null;
  u.protocol='https:';
  return u.toString();
 }catch{return null}
}
export const safeVideoUrl=value=>canonicalNasaVideoUrl(value)!==null;
export function selectManifestVideos(json){
 const links=json?.collection?.items;
 if(!Array.isArray(links))return [];
 return [...new Set(links.map(x=>canonicalNasaVideoUrl(x?.href)).filter(Boolean))]
  .sort((a,b)=>rank(a)-rank(b)).slice(0,5);
}
function rank(url){const p=url.toLowerCase();return (p.includes('~large')||p.includes('720p')?-5:0)+(p.includes('~medium')?-2:0)+(p.includes('~orig')?8:0);}
function exec(bin,args,timeout=110000,{binary=false}={}){
 const r=spawnSync(bin,args,{timeout,encoding:binary?null:'utf8',maxBuffer:12000000,shell:false});
 if(r.error||r.status!==0)throw Error('MEDIA_'+bin+'_FAILED_'+String(r.stderr||r.error).slice(-130));
 return r.stdout;
}
function meta(url){
 const info=JSON.parse(exec('ffprobe',['-v','error','-rw_timeout','22000000','-show_format','-show_streams','-of','json',url],28000));
 const s=info.streams?.find(x=>x.codec_type==='video'),seconds=Number(info.format?.duration||0);
 const [n,d]=String(s?.avg_frame_rate||'0/1').split('/').map(Number);
 if(!s||s.width<800||s.height<450||seconds<6||seconds>3600||d===0||n/d<12)
   throw Error('NASA_SOURCE_BAD_DIMENSIONS_OR_DURATION');
 return {durationSeconds:seconds,width:s.width,height:s.height,fps:n/d,codec:s.codec_name};
}
function check(file,w,h){
 const i=JSON.parse(exec('ffprobe',['-v','error','-show_format','-show_streams','-of','json',file],15000));
 const v=i.streams.find(x=>x.codec_type==='video'),dur=Number(i.format.duration);
 const [n,d]=String(v.avg_frame_rate).split('/').map(Number);
 if(v.width!==w||v.height!==h||v.codec_name!=='h264'||v.pix_fmt!=='yuv420p'||
    Math.abs(n/d-24)>.1||Math.abs(dur-5)>.2)throw Error('NASA_ENCODE_INVALID');
 exec('ffmpeg',['-v','error','-xerror','-nostdin','-i',file,'-f','null','-'],22000);
 const buffer=readFileSync(file);
 if(buffer.length<50000||buffer.length>12000000)throw Error('NASA_FILE_BUDGET');
 const raw=exec('ffmpeg',['-v','error','-nostdin','-i',file,'-vf','fps=1,scale=40:24,format=gray',
 '-frames:v','5','-f','rawvideo','pipe:1'],22000,{binary:true});
 const size=40*24;let motion=0,contrast=0,samples=0;
 for(let i=0;i+1<raw.length/size;i++){
  const fr=raw.subarray(i*size,(i+1)*size),next=raw.subarray((i+1)*size,(i+2)*size);
  let d=0,sum=0,sq=0;
  for(let k=0;k<size;k++){d+=Math.abs(fr[k]-next[k]);sum+=fr[k];sq+=fr[k]*fr[k];}
  motion+=d/size;contrast=Math.max(contrast,Math.sqrt(sq/size-(sum/size)**2));samples++;
 }
 const quality={motion:Math.round(100*(motion/Math.max(1,samples)))/100,contrast:Math.round(100*contrast)/100};
 return {sha256:sha(buffer),bytes:buffer.length,width:w,height:h,durationSeconds:dur,fps:24,codec:'h264',...quality,
   qualityFlag:quality.motion<0.5||quality.contrast<12?'REVIEW_LOW_MOTION_OR_CONTRAST':'TECHNICAL_PASS_REVIEW_PENDING'};
}
function encode(url,out){
 const result={};
 for(const [aspect,w,h] of [['landscape',1280,720],['portrait',720,1280]]){
  const p=join(out,aspect+'.mp4');
  const vf=`fps=24,scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1,format=yuv420p`;
  exec('ffmpeg',['-hide_banner','-v','error','-nostdin','-y','-rw_timeout','25000000',
    '-ss','2','-i',url,'-t','5','-an','-vf',vf,'-c:v','libx264','-preset','veryfast',
    '-crf','27','-threads','2','-pix_fmt','yuv420p','-movflags','+faststart',p],90000);
  result[aspect]={...check(p,w,h),filename:aspect+'.mp4'};
 }
 exec('ffmpeg',['-v','error','-nostdin','-y','-i',join(out,'landscape.mp4'),
  '-vf','fps=1.8,scale=240:135,tile=3x3:nb_frames=9','-frames:v','1',join(out,'contact.jpg')],16000);
 return result;
}
async function getManifest(url){
 if(!API_URL.test(url))throw Error('NASA_API_ONLY');
 const res=await fetch(url,{signal:AbortSignal.timeout(20000),redirect:'error'});
 if(!res.ok)throw Error('NASA_MANIFEST_HTTP_'+res.status);
 const text=await res.text();if(text.length>750000)throw Error('NASA_MANIFEST_BUDGET');
 return JSON.parse(text);
}
async function main(){
 const args=process.argv.slice(2);
 if(args.length!==1||!/^--shard=[0-3]$/.test(args[0]))throw Error('NASA_SHARD_REQUIRED');
 const shard=Number(args[0].split('=')[1]);
 const root=process.cwd();const source=JSON.parse(readFileSync(resolve(root,'artifacts/nasa-wave9/candidates.json'),'utf8'));
 if(source.schemaVersion!=='hh-nasa-wave9-v1'||source.cloudflareR2Uploaded!==0||source.generatorEligible!==0||
  !Array.isArray(source.candidates)||source.candidates.length>40)throw Error('NASA_UNSAFE_CANDIDATES');
 const items=source.candidates.filter((_,i)=>i%4===shard);
 const out=resolve(root,`artifacts/nasa-wave9-shard${shard}`);mkdirSync(out,{recursive:true});
 const report={schemaVersion:'hh-nasa-wave9-physical-v1',shard,checkedAt:new Date().toISOString(),
  sourceCandidates:items.length,physicalIndependentFootage:0,physicalMp4:0,
  cloudflareR2Uploads:0,generatorEligible:0,artisticApproved:0,rightsApproved:0,
  sourceType:'nasa_media_library',sources:[],errors:[]};
 for(const item of items){
  try{
    if(!safeNasaId(item.nasaId)||!API_URL.test(item.assetApi))throw Error('NASA_INVALID_ID');
    const manifest=await getManifest(item.assetApi);
    const urls=selectManifestVideos(manifest);
    if(!urls.length)throw Error('NASA_NO_APPROVED_HOST_MP4');
    let variant=null,info=null;const failures=[];
    for(const url of urls.slice(0,3)){
      try{info=meta(url);variant=url;break}catch(e){failures.push(String(e.message||e).slice(0,60));}
    }
    if(!variant)throw Error('NASA_NO_USABLE_HD:'+failures.join(';'));
    const id=item.nasaId.toLowerCase().replace(/[^a-z0-9_-]/g,'_');
    const dir=join(out,id);mkdirSync(dir,{recursive:true});
    const outputs=encode(variant,dir);
    report.sources.push({id:item.nasaId,title:item.title,sourcePage:item.archiveItemPage,
     sourceMediaUrl:variant,sourceMetadata:info,outputs,provider:'NASA',
     videoShowsIdentifiablePeopleNotChecked:true,thirdPartyCopyrightNotChecked:true,
     logosNotChecked:true,editorialApproval:false,commercialPermissionNotClaimed:true,
     croppedPortraitIsNotSecondOriginal:true,cloudflareUploaded:false,
     description:item.description});
    report.physicalIndependentFootage++;report.physicalMp4+=2;
    console.log('NASA_PHYSICAL_PASS',item.nasaId,'2 H264 clips');
  }catch(e){const error=String(e.message||e).slice(0,240);report.errors.push({id:item.nasaId,error});console.log('NASA_PHYSICAL_HOLD',item.nasaId,error);}
 }
 writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 writeFileSync(join(out,'README.txt'),'Private NASA footage technical QA only; NOT legal/art/publication clearance. NASA logo, identifiable people, third-party footage and commercial/promotional use require case-by-case review. Crop not independent shoot. No R2/live upload.\n');
 console.log('NASA_WAVE9_SHARD_RESULT',JSON.stringify({shard,pass:report.physicalIndependentFootage,mp4:report.physicalMp4,failed:report.errors.length}));
 if(report.physicalIndependentFootage===0)process.exitCode=1;
}
const direct=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct)main().catch(e=>{console.error('NASA_SCREEN_FATAL',String(e));process.exitCode=1});
