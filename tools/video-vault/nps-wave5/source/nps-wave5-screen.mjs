#!/usr/bin/env node
/** Wave 5: one-time NPS Official NPGallery physical real footage review; NO publication or Cloudflare writes. */
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {resolve,join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const SOURCES=JSON.parse(readFileSync(resolve(ROOT,'source/nps-wave5-sources.json'),'utf8'));
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
const ID=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA=x=>createHash('sha256').update(x).digest('hex');
export function verifyManifest(manifest){
 if(manifest?.schemaVersion!=='hh-nps-acadia-wave5-v1'||
   manifest?.publication!=='unapproved_private_editorial_review_only'||
   !Array.isArray(manifest.sources)||manifest.sources.length<6||manifest.sources.length>30)throw Error('invalid_nps_manifest');
 const ids=new Set(),uuids=new Set();
 for(const x of manifest.sources){
   if(!ID.test(x.id)||!UUID.test(x.uuid)||ids.has(x.id)||uuids.has(x.uuid)||
     !['nature','water','work','people','heritage','relationships'].includes(x.theme)||
     typeof x.peoplePossible!=='boolean'||!Array.isArray(x.tags)||x.tags.length<2||
     x.tags.some(t=>!ID.test(t)||t.length>32)||String(x.title||'').length<8)throw Error('invalid_nps_asset_'+x.id);
   ids.add(x.id);uuids.add(x.uuid);
 }
 return manifest.sources;
}
export function rightsEvidence(html){
 if(typeof html!=='string'||html.length<200)throw Error('nps_rights_document_missing');
 const plain=html.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ');
 // Positive per-asset NPGallery proof; generic NPS property is NOT public domain by default.
 const ok=/Public\s*domain\s*:\s*Full\s*Granting\s*Rights/i.test(plain)||
   /Public\s*domain\s*:\s*Full\s*Granting\s*Rights/i.test(html);
 if(!ok||!/Video\s*Files/i.test(plain)||!/NPS\s*Video|NPS\s*Photo/i.test(plain))throw Error('nps_rights_unverified');
 return true;
}
export function safeOfficialUrls(uuid){
 if(!UUID.test(uuid))throw Error('unsafe_nps_uuid');
 return {page:`https://npgallery.nps.gov/AssetDetail/${uuid}`,
   download:`https://npgallery.nps.gov/GetAsset/${uuid}/proxyhires`};
}
function command(bin,args,{binary=false,timeout=130000}={}){
 const p=spawnSync(bin,args,{encoding:binary?null:'utf8',maxBuffer:9000000,timeout,shell:false});
 if(p.error||p.status!==0)throw Error('tool_failed_'+bin+':'+String(p.stderr||p.error).slice(-260));
 return p.stdout;
}
function probe(file){
 const j=JSON.parse(command('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file]));
 const v=j.streams?.find(s=>s.codec_type==='video'),seconds=Number(j.format?.duration);
 const [p,q]=String(v?.avg_frame_rate||'0/0').split('/').map(Number);
 const fps=q?p/q:0;
 if(!v||v.width<600||v.height<400||!Number.isFinite(seconds)||seconds<7||
    seconds>900||fps<15||fps>120)throw Error('source_not_viable');
 return {width:v.width,height:v.height,seconds,codec:v.codec_name,fps:Number(fps.toFixed(2)),pixFmt:v.pix_fmt};
}
function checkCanon(file,width,height){
 const p=probe(file);
 if(p.width!==width||p.height!==height||p.codec!=='h264'||p.pixFmt!=='yuv420p'||
   Math.abs(p.fps-24)>.1||p.seconds<4.8||p.seconds>5.2)throw Error('invalid_canonical_mp4');
 const sha=SHA(readFileSync(file));
 command('ffmpeg',['-v','error','-xerror','-nostdin','-i',file,'-f','null','-'],{timeout:70000});
 return {...p,sha256:sha,bytes:statSync(file).size};
}
function quality(file){
 const raw=command('ffmpeg',['-v','error','-nostdin','-i',file,'-vf','fps=1,scale=48:27,format=gray',
  '-frames:v','5','-f','rawvideo','pipe:1'],{binary:true,timeout:40000});
 const n=48*27,frames=Math.floor(raw.length/n);if(frames<4)throw Error('nps_frame_decode_short');
 let motion=0,contrast=0,bright=0;
 for(let i=0;i<frames;i++){
   const now=raw.subarray(n*i,n*(i+1));let s=0,sq=0,delta=0;
   for(let k=0;k<n;k++){s+=now[k];sq+=now[k]*now[k];if(i)delta+=Math.abs(now[k]-raw[(i-1)*n+k]);}
   const avg=s/n;bright+=avg;contrast=Math.max(contrast,Math.sqrt(Math.max(0,sq/n-avg*avg)));
   if(i)motion+=delta/n;
 }
 return {meanBrightness:Number((bright/frames).toFixed(2)),
   contrast:Number(contrast.toFixed(2)),motion:Number((motion/(frames-1)).toFixed(2)),
   motionReview:motion/(frames-1)<.45,contrastReview:contrast<12};
}
async function fetchBounded(url,maxBytes,timeout=22000){
 const r=await fetch(url,{signal:AbortSignal.timeout(timeout),redirect:'follow',headers:{'User-Agent':'HolisticHouse-Noncommercial-Source-QualityReview/1.0'}});
 if(!r.ok||!r.url.startsWith('https://'))throw Error('nps_download_http_'+r.status);
 const length=Number(r.headers.get('content-length')||0);
 if(length>maxBytes)throw Error('nps_asset_too_large');
 const reader=r.body?.getReader();if(!reader)throw Error('nps_body_unavailable');
 let bytes=0;const parts=[];
 try{
   while(true){const {done,value}=await reader.read();if(done)break;
     bytes+=value.length;if(bytes>maxBytes){await reader.cancel();throw Error('nps_asset_over_cap');}
     parts.push(value);
   }
 }finally{reader.releaseLock();}
 const out=Buffer.concat(parts,bytes);
 if(bytes<500)throw Error('nps_asset_too_small');
 return out;
}
function encode(input,out,start){
 const formats=[['landscape',1280,720],['portrait',720,1280]];
 const results={};
 for(const [aspect,w,h] of formats){
  const path=join(out,`${aspect}.mp4`);
  command('ffmpeg',['-v','error','-nostdin','-y','-ss',String(start),'-i',input,'-t','5','-an',
   '-vf',`fps=24,scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1,format=yuv420p`,
   '-c:v','libx264','-preset','veryfast','-crf',aspect==='portrait'?'26':'24',
   '-pix_fmt','yuv420p','-threads','2','-movflags','+faststart',
   '-metadata','comment=NPS public domain B-roll; shortened/reframed by Holistic House; no NPS endorsement',path],{timeout:110000});
  const c=checkCanon(path,w,h);
  results[aspect]={...c,...quality(path),file:path};
 }
 return results;
}
async function screen(source,output){
 const {page,download}=safeOfficialUrls(source.uuid);
 const doc=(await fetchBounded(page,2_000_000,26000)).toString('utf8');
 rightsEvidence(doc);
 const blob=await fetchBounded(download,46_000_000,95000);
 if(blob.toString('ascii',4,8)!=='ftyp')throw Error('nps_proxy_not_mp4');
 const temp=mkdtempSync(join(tmpdir(),'hh-nps-'));
 try{
   const original=join(temp,'source.mp4');writeFileSync(original,blob);
   const meta=probe(original);
   const cutPoints=[Math.max(1,Math.min(meta.seconds-6,Math.floor(meta.seconds*.15))),
                    Math.max(1,Math.min(meta.seconds-6,Math.floor(meta.seconds*.61)))];
   const cuts=[];
   for(let i=0;i<cutPoints.length;i++){
     const folder=join(output,source.id+`-sample${i+1}`);mkdirSync(folder,{recursive:true});
     const checked=encode(original,folder,cutPoints[i]);
     // Ten-frame poster mosaics are only for human artistic selection; never evidence of full film diversity.
     command('ffmpeg',['-v','error','-nostdin','-y','-i',checked.landscape.file,
        '-vf','fps=1.8,scale=320:180,tile=3x3:nb_frames=9','-frames:v','1',join(folder,'contact-landscape.jpg')]);
     command('ffmpeg',['-v','error','-nostdin','-y','-ss','2','-i',checked.portrait.file,
        '-vf','scale=360:640','-frames:v','1','-q:v','4',join(folder,'poster-portrait.jpg')]);
     const simplify=({file,...r})=>({...r,file:file.split('/').slice(-2).join('/')});
     cuts.push({sample:i+1,startsAtSeconds:cutPoints[i],portrait:simplify(checked.portrait),landscape:simplify(checked.landscape),
       artisticApproval:false,rightsForDepictedPersonsUnverified:source.peoplePossible});
   }
   return {id:source.id,sourcePage:page,creator:'U.S. National Park Service',sourceKind:'NPS_public_domain',
     originalAssetUuid:source.uuid,rawSourceSha256:SHA(blob),bytesDownloaded:blob.length,
     rightsEvidence:'NPGallery per-asset Public domain:Full Granting Rights',
     noGovernmentEndorsement:true,peoplePossible:source.peoplePossible,
     sourceDurationSeconds:meta.seconds,cropsAreNotNewIndependentOriginals:true,
     tagSuggestions:source.tags,themeSuggestion:source.theme,title:source.title,
     clips:cuts,approvedForPublication:false,cloudflareR2UploadVerified:false,
     status:'verified_physical_mp4_pending_art_and_release_review'};
 }finally{rmSync(temp,{recursive:true,force:true});}
}
async function main(){
 const args=process.argv.slice(2);
 if(args.length!==1||!/^--shard=[0-3]$/.test(args[0]))throw Error('expected_one_shard_option');
 const shard=Number(args[0].split('=')[1]);
 const all=verifyManifest(SOURCES);
 const chosen=all.filter((_,i)=>i%4===shard);
 const out=resolve(ROOT,`artifacts/nps-wave5-shard${shard}`);mkdirSync(out,{recursive:true});
 const report={schemaVersion:'hh-nps-wave5-physical-review-v1',shard,assessedAt:new Date().toISOString(),
   collection:'Acadia NPGallery B-Roll',publisher:'NPS',rights:'asset_specific_public_domain_only',
   sourceCandidates:chosen.length,publicCatalogUpdates:0,cloudflareR2Uploads:0,generatorEligible:0,
   sources:[],errors:[]};
 for(const s of chosen){
   try{const res=await screen(s,out);report.sources.push(res);console.log('NPS_SOURCE_QA_PASS',s.id,res.clips.length,'samples');}
   catch(e){report.errors.push({id:s.id,code:String(e.message||e).slice(0,250)});console.log('NPS_SOURCE_QA_HOLD',s.id,String(e.message||e).slice(0,220));}
 }
 report.physicalUniqueSourceMasters=report.sources.length;
 report.physicalMp4Count=report.sources.reduce((n,r)=>n+r.clips.length*2,0);
 report.unapprovedForPublication=true;
 writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 writeFileSync(join(out,'README.md'),
  '# NPS Wave 5 — private filmed video QA, never publication approval\n\n'+
  'This package contains shortened, reframed excerpts of separate United States National Park Service B-roll sources. '+
  'A 9:16 crop is NOT a new camera original. All clips need human review for people/brand/property restrictions, no government endorsement, actual scene uniqueness, cinematic quality and intended user topics. '+
  'Public-domain status was checked for each original NPGallery asset page. '+
  'Cloudflare R2 uploads, website publication and generator eligibility are all ZERO.\n');
 console.log('NPS_WAVE5_RECEIPT',JSON.stringify({shard,good:report.physicalUniqueSourceMasters,
   failed:report.errors.length,mp4:report.physicalMp4Count}));
 if(report.physicalUniqueSourceMasters===0)process.exitCode=1;
}
const direct=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct)main().catch(e=>{console.error('NPS_FATAL',String(e?.message||e));process.exitCode=1});
