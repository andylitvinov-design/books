#!/usr/bin/env node
/**
 * HH Wave 8: bounded one-time technical screening of independently credited
 * NOAA Ocean Exploration MP4 assets. No R2, no billing, no live publication.
 * This script downloads 30 expressly shortlisted *individual official pages*,
 * not an unrestricted crawler or redistributor of entire stock collections.
 */
import {readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {join, dirname, resolve, basename} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
const ROOT=dirname(fileURLToPath(import.meta.url));
const MANIFEST=JSON.parse(readFileSync(join(ROOT,'sources.json'),'utf8'));
const ID=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA=b=>createHash('sha256').update(b).digest('hex');
const NOAABASE='https://oceanexplorer.noaa.gov';
const allowedHosts=new Set(['oceanexplorer.noaa.gov','origin.oceanexplorer.noaa.gov']);
const description='Research source, not an approved video or a Cloudflare asset';
function reject(c){throw Error('NOAA_WAVE8_'+c)}
export function validateManifest(manifest){
 if(manifest?.schemaVersion!=='hh-noaa-ocean-exploration-wave8-v1'||
    manifest?.status!=='RESEARCH_ONLY_NOT_LICENSE_OR_VISUAL_APPROVED'||
    manifest?.credit!=='NOAA Ocean Exploration'||
    !Array.isArray(manifest.sources)||manifest.sources.length<12||manifest.sources.length>32||
    manifest.sourceCount!==manifest.sources.length)reject('BAD_MANIFEST');
 const ids=new Set(),slugs=new Set();
 for(const x of manifest.sources){
  if(!ID.test(x.id||'')||x.id.length>65||!ID.test(x.slug||'')||
    ids.has(x.id)||slugs.has(x.slug)||!['nature','water'].includes(x.category)||
    typeof x.subject!=='string'||x.subject.length>100||
    !Array.isArray(x.tags)||x.tags.length<2||x.tags.length>6||x.tags.some(t=>!ID.test(t)))
   reject('SOURCE_ID_OR_TAG_UNSAFE');
  ids.add(x.id);slugs.add(x.slug);
 }
 return manifest.sources;
}
function plainText(s){return s.replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim()}
function unescapeHtml(s){return s.replace(/&amp;/gi,'&').replace(/&#39;|&apos;/gi,"'").replace(/&quot;/gi,'"').replace(/&#x2f;/gi,'/')}
export function officialURL(url,{video=false}={}){
 let u;try{u=new URL(url)}catch{reject('BAD_MEDIA_URL')}
 if(u.protocol!=='https:'||!allowedHosts.has(u.hostname)||u.username||u.password||u.port||u.search||u.hash)reject('UNTRUSTED_HOST');
 if(video){if(!/^\/wp-content\/uploads\/20\d{2}\/\d{2}\/[a-zA-Z0-9_.%()\-]+\.mp4$/.test(u.pathname))reject('UNSAFE_VIDEO_PATH')}
 else{if(!/^\/multimedia\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(u.pathname))reject('UNSAFE_PAGE_PATH')}
 return u.href;
}
export function extractNOAAMedia(html,slug){
 if(typeof html!=='string'||html.length<400||html.length>2_500_000)reject('BAD_SOURCE_HTML');
 const sourcePage=officialURL(NOAABASE+'/multimedia/'+slug+'/');
 const plain=plainText(html),mediaKind=/\bvideo\b/i.test(plain);
 // Media Kit / FAQ: only NOAA's own (non-copyright) footage. External credits
 // such as photographers, MBARI, foundations and partners require their consent.
 const credit=plain.match(/\bCredit\s+(.{0,240}?)\s+Download\b/i)?.[1]||'';
 if(!mediaKind||!credit||!/\bNOAA (?:Ocean Exploration|Office of Ocean Exploration and Research)\b/i.test(credit)||
    /(?:\bcopyright\b|\b©\b|MBARI|Oceaneering|National Marine Sanctuary Foundation|Green Fire|Woods Hole|Lia Kim)/i.test(credit))
    reject('INDEPENDENT_RIGHTS_NOT_PROVEN');
 const anchors=[...html.matchAll(/<a\b([^>]*?)>([\s\S]*?)<\/a>/gi)];
 const results=[];
 for(const a of anchors){
  const href=a[1].match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];
  if(!href)continue;
  let u;
  try{u=new URL(unescapeHtml(href),sourcePage)}catch{continue}
  const text=plainText(a[2]);
  if(!/\b(?:SD version|HD version|Video|Download)\b/i.test(text)||!text.toLowerCase().includes('mp4'))continue;
  try{officialURL(u.href,{video:true})}catch{continue}
  results.push({url:u.href,quality:/HD version/i.test(text)?'hd':/SD version/i.test(text)?'sd':'video',label:text.slice(0,100)});
 }
 if(!results.length)reject('OFFICIAL_MP4_LINK_NOT_FOUND');
 // Limit to this particular media page's own video, not entire site embedded links.
 const dedup=[...new Map(results.map(x=>[x.url,x])).values()];
 const choice=dedup.find(x=>x.quality==='sd')||dedup.find(x=>x.quality==='video')||dedup.find(x=>x.quality==='hd');
 return {page:sourcePage,videoUrl:choice.url,videoQuality:choice.quality,credit:credit.trim().slice(0,240),downloadChoices:dedup.length};
}
function exec(bin,args,{timeout=75000,binary=false}={}){
 const x=spawnSync(bin,args,{encoding:binary?null:'utf8',timeout,maxBuffer:8e6,shell:false});
 if(x.error||x.status!==0)reject('MEDIA_TOOL_'+bin+'_'+String(x.stderr||x.error||'fail').slice(-140));
 return x.stdout;
}
function probe(file,{minimumSeconds=5.2}={}){
 const json=JSON.parse(exec('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file]));
 const v=json.streams?.find(x=>x.codec_type==='video');
 const duration=Number(json.format?.duration),parts=(v?.avg_frame_rate||'0/1').split('/').map(Number),fps=parts[1]?parts[0]/parts[1]:0;
 if(!v||!Number.isFinite(duration)||duration<minimumSeconds||duration>3600||v.width<600||v.height<360||fps<10||fps>120)reject('VIDEO_TECHNICAL_UNSUITABLE');
 return {codec:v.codec_name,width:v.width,height:v.height,duration,fps,pixFmt:v.pix_fmt};
}
function frameMetrics(file){
 const v=exec('ffmpeg',['-v','error','-nostdin','-i',file,'-vf','fps=1,scale=48:27,format=gray','-frames:v','5','-f','rawvideo','pipe:1'],{binary:true});
 const n=48*27, count=Math.floor(v.length/n);if(count<4)reject('FRAME_DECODE_INSUFFICIENT');
 let motion=0,contrast=0,avg=0;
 for(let t=0;t<count;t++){
  let sum=0,sq=0,delta=0;for(let p=0;p<n;p++){
    const z=v[t*n+p];sum+=z;sq+=z*z;if(t)delta+=Math.abs(z-v[(t-1)*n+p]);
  }
  const mu=sum/n;avg+=mu;contrast=Math.max(contrast,Math.sqrt(Math.max(0,sq/n-mu*mu)));if(t)motion+=delta/n;
 }
 return {motion:Number((motion/(count-1)).toFixed(2)),contrast:Number(contrast.toFixed(2)),brightness:Number((avg/count).toFixed(2))};
}
function dHash(file){
 const p=exec('ffmpeg',['-v','error','-nostdin','-ss','2','-i',file,'-frames:v','1','-vf','scale=9:8,format=gray','-f','rawvideo','pipe:1'],{binary:true});
 if(p.length!==72)reject('DHASH_FRAME_MISSING');let bits=0n;
 for(let y=0;y<8;y++)for(let x=0;x<8;x++)bits=(bits<<1n)|(p[9*y+x]>p[9*y+x+1]?1n:0n);
 return bits.toString(16).padStart(16,'0');
}
function encodeOriginal(file,dir,seconds){
 const start=Math.max(0,Math.min(seconds-5.15,Math.max(2,Math.floor(seconds*.42))));
 const outs={};
 for(const [aspect,width,height,crf] of [['landscape',1280,720,24],['portrait',720,1280,26]]){
  const filename=`${aspect}.mp4`,out=join(dir,filename);
  exec('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-ss',String(start),'-i',file,'-t','5','-an',
   '-vf',`fps=24,scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,format=yuv420p`,
   '-c:v','libx264','-preset','veryfast','-crf',String(crf),'-threads','2','-pix_fmt','yuv420p','-movflags','+faststart',
   '-metadata','comment=NOAA Ocean Exploration public-domain source; shortened and reframed; no government endorsement',out],{timeout:120000});
  const p=probe(out,{minimumSeconds:4.8});
  if(p.codec!=='h264'||p.pixFmt!=='yuv420p'||p.width!==width||p.height!==height||Math.abs(p.fps-24)>.12||p.duration<4.8||p.duration>5.2)reject('OUTPUT_CODEC_ASPECT_DURATION');
  exec('ffmpeg',['-v','error','-xerror','-nostdin','-i',out,'-f','null','-']);
  const bytes=readFileSync(out),metrics=frameMetrics(out);
  outs[aspect]={file:filename,sha256:SHA(bytes),bytes:bytes.length,width,height,fps:24,durationSeconds:p.duration,
   ...metrics,perceptualDhash:dHash(out),needsArtReview:metrics.motion<.45||metrics.contrast<10||metrics.brightness<21};
 }
 exec('ffmpeg',['-v','error','-nostdin','-y','-ss','2','-i',join(dir,'landscape.mp4'),'-frames:v','1','-vf','scale=480:270','-q:v','4',join(dir,'poster.jpg')]);
 exec('ffmpeg',['-v','error','-nostdin','-y','-i',join(dir,'landscape.mp4'),'-frames:v','1','-vf','fps=1.8,scale=320:180,tile=3x3:nb_frames=9','-q:v','4',join(dir,'contact.jpg')]);
 return {start,outputs:outs};
}
async function safeDownload(url,maxBytes,timeout=90000){
 const checked=officialURL(url,{video:url.toLowerCase().includes('.mp4')});
 const response=await fetch(checked,{redirect:'error',signal:AbortSignal.timeout(timeout),headers:{'User-Agent':'HolisticHouse-Owner-OneShot-NOAA-VideoSource-QA/1.0'}});
 if(!response.ok||response.redirected)reject('NOAA_DOWNLOAD_'+response.status);
 const clen=Number(response.headers.get('content-length')||0);
 if(clen>maxBytes)reject('MAX_BYTES_EXCEEDED');
 let size=0,part=[];const reader=response.body?.getReader();if(!reader)reject('BODY_MISSING');
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes){await reader.cancel();reject('TRANSFER_OVER_LIMIT')}part.push(value);}}finally{reader.releaseLock()}
 if(size<1000)reject('TOO_SHORT');return Buffer.concat(part,size);
}
async function screen(source,shardDir){
 const page=NOAABASE+'/multimedia/'+source.slug+'/';
 const html=(await safeDownload(page,2_500_000,25000)).toString('utf8');
 const proof=extractNOAAMedia(html,source.slug);
 const raw=await safeDownload(proof.videoUrl,84_000_000,95000);
 if(raw.toString('ascii',4,8)!=='ftyp')reject('NOT_MP4_MAGIC');
 const tmp=mkdtempSync(join(tmpdir(),'hh-noaa-source-'));const dest=join(shardDir,source.id);mkdirSync(dest,{recursive:true});
 try{
   const f=join(tmp,'original.mp4');writeFileSync(f,raw);const orig=probe(f);const processed=encodeOriginal(f,dest,orig.duration);
   return {id:source.id,sourcePage:proof.page,mediaSource:proof.videoUrl,
    originalProvider:'NOAA Ocean Exploration',credit:proof.credit,sourceRightsGuideline:MANIFEST.rightsSource,
    sourceVideoSha256:SHA(raw),sourceBytes:raw.length,sourceFormat:{width:orig.width,height:orig.height,durationSeconds:orig.duration},
    ...processed,topic:source.subject,category:source.category,tags:source.tags,
    ownerVisualApproval:false,personAndThirdPartyRightsAdditionalReview:true,noAgencyEndorsement:true,
    approvedForPublication:false,cloudflareR2UploadVerified:false,generatorEligible:false,
    portraitCropIsNotNativePortraitSource:true,
    status:'technical_qa_only_pending_rights_and_art_review'};
 }finally{rmSync(tmp,{recursive:true,force:true});}
}
export async function run(shard){
 const all=validateManifest(MANIFEST);if(!Number.isInteger(shard)||shard<0||shard>3)reject('BAD_SHARD');
 const items=all.filter((_,i)=>i%4===shard),dir=resolve(ROOT,`artifacts/shard-${shard}`);mkdirSync(dir,{recursive:true});
 const report={schemaVersion:'hh-noaa-wave8-qa-v1',shard,sourceCandidates:items.length,sourceProvider:'NOAA Ocean Exploration',
  websiteSource:'https://oceanexplorer.noaa.gov/about/media-kit/',githubBranchOnly:true,
  newCloudflareR2Objects:0,publicCatalogChanges:0,generatorEligible:0,rightsApproval:false,
  originals:[],failures:[]};
 const save=()=>writeFileSync(join(dir,'report.json'),JSON.stringify({...report,physicalOriginals:report.originals.length,
   physicalMP4s:report.originals.length*2},null,2)+'\n');
 save();for(const item of items){try{const out=await screen(item,dir);report.originals.push(out);console.log('NOAA_WAVE8_PASS',item.id,out.sourceBytes)}
 catch(e){report.failures.push({id:item.id,reason:String(e?.message||e).slice(0,210)});console.log('NOAA_WAVE8_HOLD',item.id,String(e?.message||e).slice(0,200));}
 save();}
 writeFileSync(join(dir,'README.md'),`# Holistic House NOAA Wave 8 · physical source QA, not publication\n\n${description}.\nOriginals from NOAA Ocean Exploration, credited per individual source page.\nCropped portrait variants do not represent new independent footage. No government endorsement.\nReview all source rights, encoded framing, people, third-party marks, quality and motion prior to any deployment or R2.\n\n`);
 console.log('NOAA_WAVE8_RECEIPT',JSON.stringify({shard,uniqueFilmedOriginals:report.originals.length,mp4:report.originals.length*2,failed:report.failures.length}));
 if(report.originals.length===0)process.exitCode=1;
 return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const argv=process.argv.slice(2);if(argv.length!==1||!/^--shard=[0-3]$/.test(argv[0]))reject('EXPECTED_SHARD');
 await run(Number(argv[0].split('=')[1]));
}
