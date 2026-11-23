#!/usr/bin/env node
/**
 * Deterministic, owner-operated proof of physical MP4 media readiness.
 * Reads ONLY local first-party catalogues and video/posters, no network or
 * provider calls. Writes a derived anonymous report under artifacts/ only.
 */
import {readFile,realpath,stat,open,mkdir,writeFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dirname,join,resolve,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VERIFIED_ASSETS_SCHEMA} from '../lib/mandala/verified-asset-resolver.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const PATH=/^\/videos\/holistic-house\/(money-films-v1|film-collection-v2|film-collection-v3)\/([a-z0-9-]+)\.mp4$/;
const POSTER=/^\/videos\/holistic-house\/(money-films-v1|film-collection-v2|film-collection-v3)\/[a-z0-9-]+\.jpg$/;
const invalid=message=>{throw Error('VIDEO_CATALOG_'+message);};
function inside(root,path){
  const rel=relative(root,path);
  if(!rel||rel==='..'||rel.startsWith('..'+sep)||rel.startsWith(sep))invalid('UNTRUSTED_PATH');
  return path;
}
async function localFile(root,publicPath){
  const expected=inside(root,resolve(root,'public',publicPath.slice(1)));
  const actual=inside(root,await realpath(expected));
  const metadata=await stat(actual);
  if(!metadata.isFile())invalid('NOT_FILE');
  return {actual,bytes:metadata.size};
}
async function sha256(file){
  const hash=createHash('sha256');
  for await(const chunk of createReadStream(file))hash.update(chunk);
  return hash.digest('hex');
}
function mediaProbe(file){
  const raw=execFileSync('ffprobe',[
    '-v','error','-show_entries',
    'stream=codec_type,codec_name,width,height,avg_frame_rate,pix_fmt:format=duration',
    '-of','json',file,
  ],{encoding:'utf8',timeout:15000,maxBuffer:256000});
  const data=JSON.parse(raw);
  const video=data.streams?.find(s=>s.codec_type==='video');
  if(!video)invalid('NO_VIDEO_STREAM');
  const [num,den]=String(video.avg_frame_rate||'0/0').split('/').map(Number);
  return {
    codec:video.codec_name,
    width:video.width,height:video.height,pixFmt:video.pix_fmt,
    fps:den>0?num/den:0,
    durationSeconds:Number(data.format?.duration),
    hasAudio:Boolean(data.streams?.some(s=>s.codec_type==='audio')),
  };
}
function decodeProof(file,duration){
  const t=Math.max(.15,Math.min(1.0,duration/2));
  const frame=execFileSync('ffmpeg',[
    '-hide_banner','-loglevel','error','-nostdin','-ss',String(t),
    '-i',file,'-frames:v','1','-vf','scale=48:48,format=rgb24',
    '-f','rawvideo','pipe:1',
  ],{timeout:15000,maxBuffer:128000});
  return frame.byteLength===48*48*3;
}
function expectedFor(id,collection,manifests){
  const rows=manifests[collection];
  if(!Array.isArray(rows))invalid('MISSING_COLLECTION_MANIFEST');
  const found=rows.filter(x=>x?.id===id);
  if(found.length!==1)invalid('MANIFEST_ID_MISMATCH');
  return found[0];
}
function rightsScope(scene,source){
  if(scene.rightsReference?.kind==='dareful_cc_by_4_0'){
    // The safe importer accepts either one genuine source or two independently
    // licensed shots. Honor that contract in the physical catalogue probe too.
    // Legacy two-shot records predate sourceKind and remain supported.
    const sources=source.sources;
    const validShape=source.sourceKind==='licensed_single_shot_edit'
      ? Array.isArray(sources)&&sources.length===1
      : (source.sourceKind===undefined||source.sourceKind==='licensed_two_shot_composite')
        &&Array.isArray(sources)&&sources.length===2;
    if(!String(scene.rightsReference.attribution||'').includes('CC BY 4.0')||
       !validShape||
       !sources.every(s=>s.licenseId==='cc_by_4_0'&&
         /^https:\/\/dareful\.com\/[a-z0-9-]+\/$/.test(s.sourcePage))||
       new Set(sources.map(s=>s.sourcePage)).size!==sources.length)
      invalid('INDIVIDUAL_RIGHTS_EVIDENCE');
    return 'individual_record';
  }
  if(scene.rightsReference?.kind==='existing_approved_first_party_master' &&
     typeof source.video==='string')return 'collection_only';
  invalid('RIGHTS_REFERENCE_MISSING');
}

/** One testable seam: probe, frame-decoder and hash may be replaced by fixtures. */
export async function auditVideoCatalog({root,catalog,manifests,
  probe=mediaProbe,decode=decodeProof,hash=sha256}={}){
  if(!root||!catalog||!Array.isArray(catalog.scenes)||
     catalog.scenes.length!==catalog.count||!manifests)invalid('INVALID_CATALOG');
  const localRoot=await realpath(root);
  const ids=new Set(),assets=[];
  for(const scene of catalog.scenes){
    const failure=reason=>({id:scene?.id||'unknown',path:scene?.video||'',status:'rejected',reason});
    try{
      if(typeof scene.id!=='string'||!PATH.test(scene.video)||
         !scene.video.endsWith('/'+scene.id+'.mp4')||!POSTER.test(scene.poster)||
         scene.media!=='licensed_mp4'||scene.status!=='approved'||ids.has(scene.id))
        invalid('UNAPPROVED_OR_DUPLICATE_SCENE');
      ids.add(scene.id);
      const collection=PATH.exec(scene.video)[1];
      const expected=expectedFor(scene.id,collection,manifests);
      if(expected.video!==scene.video||expected.poster!==scene.poster)
        invalid('SOURCE_PATH_MISMATCH');
      const {actual,bytes}=await localFile(localRoot,scene.video);
      const poster=await localFile(localRoot,scene.poster);
      if(bytes<10000||bytes>100*1024*1024||poster.bytes<1024)
        invalid('FILE_SIZE_INVALID');
      if(!Number.isInteger(expected.bytes)||expected.bytes!==bytes)
        invalid('EXPECTED_BYTES_MISMATCH');
      const mp4=await open(actual,'r');
      let header;
      try{header=Buffer.alloc(12);await mp4.read(header,0,12,0);}finally{await mp4.close();}
      if(header.toString('ascii',4,8)!=='ftyp')invalid('MP4_HEADER_INVALID');
      const metadata=await probe(actual);
      if(metadata.codec!=='h264'||metadata.pixFmt!=='yuv420p'||
         !Number.isInteger(metadata.width)||metadata.width<360||metadata.width>4096||
         !Number.isInteger(metadata.height)||metadata.height<360||metadata.height>4096||
         !Number.isFinite(metadata.fps)||metadata.fps<10||metadata.fps>60||
         !Number.isFinite(metadata.durationSeconds)||metadata.durationSeconds<1||
         metadata.durationSeconds>120)invalid('MEDIA_PROBE_INVALID');
      for(const key of ['width','height'])
        if(Number.isInteger(expected[key])&&metadata[key]!==expected[key])
          invalid('EXPECTED_DIMENSIONS_MISMATCH');
      if(Number.isFinite(expected.fps)&&Math.abs(metadata.fps-expected.fps)>1.5)
        invalid('EXPECTED_FRAMERATE_MISMATCH');
      if(Number.isFinite(expected.durationSeconds)&&
         Math.abs(metadata.durationSeconds-expected.durationSeconds)>.75)
        invalid('EXPECTED_DURATION_MISMATCH');
      const digest=await hash(actual);
      if(!/^[0-9a-f]{64}$/.test(digest))invalid('INVALID_SHA256');
      if(expected.sha256&&expected.sha256!==digest)invalid('SOURCE_SHA256_MISMATCH');
      if(!(await decode(actual,metadata.durationSeconds)))invalid('FRAME_DECODE_FAILED');
      const scope=rightsScope(scene,expected);
      assets.push({id:scene.id,path:scene.video,status:'technical_ready',
        technicalVerified:true,sha256:digest,bytes,
        codec:'h264',width:metadata.width,height:metadata.height,
        fps:metadata.fps,durationSeconds:metadata.durationSeconds,
        hasAudio:metadata.hasAudio===true,frameDecoded:true,rightsScope:scope});
    }catch(error){
      const known=String(error instanceof Error?error.message:'');
      assets.push(failure(known.startsWith('VIDEO_CATALOG_')?
        known.slice('VIDEO_CATALOG_'.length):'MEDIA_IO_OR_DECODE_FAILURE'));
    }
  }
  const count=assets.length;
  const failed=assets.filter(a=>a.status!=='technical_ready');
  const status=failed.length===0?'pass':'fail';
  return {
    schemaVersion:VERIFIED_ASSETS_SCHEMA,status,
    source:'LOCAL_FIRST_PARTY_ONLY',mediaVerifiedBy:'ffprobe_ffmpeg_sha256',
    catalogVersion:catalog.version,counts:{total:count,technicalReady:count-failed.length,
      failed:failed.length,collectionRightsReview:assets.filter(a=>a.rightsScope==='collection_only').length,
      individualAttributionRecords:assets.filter(a=>a.rightsScope==='individual_record').length},
    assets,
  };
}

export async function loadVideoCatalogFiles(root=ROOT){
  const load=async path=>JSON.parse(await readFile(resolve(root,path),'utf8'));
  const catalog=await load('data/video-catalog/scene-taxonomy.json');
  const v1=await load('public/videos/holistic-house/money-films-v1/manifest.json');
  const v2=await load('public/videos/holistic-house/film-collection-v2/manifest.json');
  const v3=await load('data/video-catalog/free-stock-scenes.json');
  if(v1.sourceLicense!=='https://supareels.com/stock-footage-licence'||
     v2.license!=='https://supareels.com/stock-footage-licence')
    invalid('COLLECTION_LICENSE_REFERENCE_MISSING');
  return {root,catalog,manifests:{
    'money-films-v1':v1.scenes,
    'film-collection-v2':v2.scenes,
    'film-collection-v3':v3,
  }};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  const allowed=['--check','--json'];
  if(args.some(x=>!allowed.includes(x)))invalid('INVALID_ARGS');
  const report=await auditVideoCatalog(await loadVideoCatalogFiles());
  await mkdir(resolve(ROOT,'artifacts/benchmarking'),{recursive:true});
  await writeFile(resolve(ROOT,'artifacts/benchmarking/verified-video-assets.json'),
    JSON.stringify(report,null,2)+'\n');
  if(args.includes('--json'))process.stdout.write(JSON.stringify(report)+'\n');
  else process.stdout.write(JSON.stringify({
    status:report.status,counts:report.counts,
    failed:report.assets.filter(a=>a.status==='rejected').map(a=>({id:a.id,reason:a.reason})),
  })+'\n');
  if(report.status!=='pass')process.exitCode=1;
}
