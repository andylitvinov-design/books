/**
 * Dot's runtime bridge from the already approved first-party video catalogue
 * to physically verified, bounded MP4 bytes. Editorial status alone is never
 * sufficient for a render, and arbitrary client URLs are never fetched.
 */
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {isSafeMontageScene} from './video-montage-sources.mjs';

const ORIGIN='https://holistichouse.vercel.app';
const MAX_SCENE_BYTES=12_000_000;
const MAX_TOTAL_BYTES=48_000_000;
const MP4=/^\/videos\/holistic-house\/(money-films-v1|film-collection-v2|film-collection-v3)\/([a-z0-9-]+)\.mp4$/;
const TEMP=/^\/tmp\/hh-dot-story-[a-zA-Z0-9_-]{5,80}$/;
const SHA=/^[a-f0-9]{64}$/;
const fail=code=>{throw Error(code);};
export function filmedSourceAspect(width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||
   width<480||height<480||width>7680||height>7680)return null;
 const r=width/height;
 if(Math.abs(r-16/9)<0.05)return 'landscape';
 if(Math.abs(r-9/16)<0.04)return 'portrait';
 return null;
}
const originKeys=(scene,source)=>Object.freeze(
 Array.isArray(source.sources)&&source.sources.length
 ?[...new Set(source.sources.map(s=>'original:'+String(s.sourcePage).toLowerCase()))].sort()
 :source.originalSourcePage?['original:'+String(source.originalSourcePage).toLowerCase()]
 :['legacy-export:'+scene.video]
);

/** Cross-check the catalogue against separately reviewed physical source manifests.
 * The first 32 masters have licensed collection-level bytes/duration; the v3
 * masters also have individually published immutable SHA256 references.
 */
export function storySceneCandidates({catalog,moneyManifest,filmManifest,stockManifest}={}){
  if(!Array.isArray(catalog?.scenes)||catalog.scenes.length!==catalog.count||
    !Array.isArray(moneyManifest?.scenes)||!Array.isArray(filmManifest?.scenes)||
    !Array.isArray(stockManifest))fail('VIDEO_STORY_CATALOG_MISSING');
  if(moneyManifest.sourceLicense!=='https://supareels.com/stock-footage-licence'||
    filmManifest.license!=='https://supareels.com/stock-footage-licence')
    fail('VIDEO_STORY_SOURCE_LICENSE_MISSING');
  const manifests=new Map([
    ['money-films-v1',moneyManifest.scenes],
    ['film-collection-v2',filmManifest.scenes],
    ['film-collection-v3',stockManifest],
  ]);
  const seen=new Set(),out=[];
  for(const scene of catalog.scenes){
    if(!isSafeMontageScene(scene)||seen.has(scene.id))fail('VIDEO_STORY_CATALOG_NOT_APPROVED');
    seen.add(scene.id);
    const match=MP4.exec(scene.video);
    if(!match||match[2]!==scene.id)fail('VIDEO_STORY_CATALOG_PATH');
    const entries=manifests.get(match[1]).filter(item=>item.id===scene.id);
    if(entries.length!==1)fail('VIDEO_STORY_MANIFEST_MISMATCH');
    const source=entries[0];
    if(source.video!==scene.video||!Number.isInteger(source.bytes)||
      source.bytes<10000||source.bytes>MAX_SCENE_BYTES||
      !Number.isFinite(source.durationSeconds)||source.durationSeconds<1||
      source.durationSeconds>120)fail('VIDEO_STORY_SOURCE_METADATA_MISSING');
    const individual=scene.rightsReference?.kind==='dareful_cc_by_4_0';
    if(individual&&(!SHA.test(source.sha256)||!Array.isArray(source.sources)||
      source.sources.length<1||!source.sources.every(s=>
        s.licenseId==='cc_by_4_0'&&/^https:\/\/dareful\.com\//.test(s.sourcePage))||
      !String(scene.rightsReference.attribution||'').includes('CC BY 4.0')))
      fail('VIDEO_STORY_INDIVIDUAL_RIGHTS_UNVERIFIED');
    const nativeAspect=filmedSourceAspect(source.width,source.height);
    if(!nativeAspect||(scene.allowedAspects&&
       (!Array.isArray(scene.allowedAspects)||!scene.allowedAspects.includes(nativeAspect))))
      fail('VIDEO_STORY_SOURCE_GEOMETRY_MISSING');
    const originMasterKeys=originKeys(scene,source);
    if(!originMasterKeys.length)fail('VIDEO_STORY_ORIGIN_UNVERIFIED');
    out.push(Object.freeze({...scene,
      durationSeconds:source.durationSeconds,expectedBytes:source.bytes,
      expectedSha256:individual?source.sha256:null,
      width:source.width,height:source.height,
      allowedAspects:Object.freeze([nativeAspect]),originMasterKeys,
    }));
  }
  return Object.freeze(out);
}

/** Decode one real video frame and determine its container duration with the
 * existing ffmpeg-static binary (ffprobe-static is not an installed dependency).
 */
export async function probeStoryMp4(executable,path){
  if(typeof executable!=='string'||!executable.startsWith('/')||
    typeof path!=='string'||!TEMP.test(path.slice(0,path.lastIndexOf('/'))))
    fail('VIDEO_STORY_PROBE_PATH');
  return await new Promise((resolve,reject)=>{
    const child=spawn(executable,[
      '-hide_banner','-nostdin','-i',path,
      '-frames:v','1','-f','null','-',
    ],{shell:false,stdio:['ignore','ignore','pipe']});
    let output='',done=false;
    const stop=(err,result)=>{
      if(done)return;done=true;clearTimeout(timeout);
      if(err)reject(err);else resolve(result);
    };
    const timeout=setTimeout(()=>{
      child.kill('SIGKILL');stop(Error('VIDEO_STORY_PROBE_TIMEOUT'));
    },15000);
    child.stderr.on('data',chunk=>{
      if(output.length<32000)output+=String(chunk).slice(0,32000-output.length);
    });
    child.on('error',()=>stop(Error('VIDEO_STORY_PROBE_UNAVAILABLE')));
    child.on('close',code=>{
      const m=output.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}\.\d+)/);
      const seconds=m?Number(m[1])*3600+Number(m[2])*60+Number(m[3]):NaN;
      const dims=output.match(/Video:\s*h264[^\n]*?\b(\d{3,5})x(\d{3,5})(?=[\s,\[]|$)/);
      const width=dims?Number(dims[1]):NaN,height=dims?Number(dims[2]):NaN;
      if(code!==0||!output.includes('Video: h264')||
        !Number.isFinite(seconds)||seconds<1||seconds>120||
        !Number.isInteger(width)||!Number.isInteger(height))
        stop(Error('VIDEO_STORY_PROBE_INVALID'));
      else stop(null,{durationMs:Math.round(seconds*1000),width,height});
    });
  });
}

async function readBoundedResponse(response,expectedBytes){
  if(!response||!response.ok||response.redirected||
    (response.headers.get('content-length')&&
     Number(response.headers.get('content-length'))!==expectedBytes))
    fail('VIDEO_STORY_MEDIA_DOWNLOAD_FAILED');
  const reader=response.body?.getReader();
  if(!reader)fail('VIDEO_STORY_MEDIA_DOWNLOAD_FAILED');
  const bytes=Buffer.alloc(expectedBytes);
  let total=0;
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      if(!(value instanceof Uint8Array)||total+value.length>expectedBytes){
        await reader.cancel().catch(()=>{});
        fail('VIDEO_STORY_MEDIA_SIZE_MISMATCH');
      }
      bytes.set(value,total);total+=value.length;
    }
  }finally{reader.releaseLock();}
  if(total!==expectedBytes||bytes.toString('ascii',4,8)!=='ftyp')
    fail('VIDEO_STORY_MEDIA_INVALID');
  return bytes;
}

/** Materialize ONLY the chosen IDs. Evidence binds immutable metadata, hash,
 * bytes, decoded H.264 frame, source duration and a safe private temp path.
 * render caller must clean the directory even if any one source fails.
 */
export async function verifyStoryShotSources({
  scenes,sceneIds,tempDir,executable,fetcher=fetch,probe=probeStoryMp4,
  requireAspect=null,
}={}){
  if(requireAspect!==null&&requireAspect!=='landscape'&&requireAspect!=='portrait')
    fail('VIDEO_STORY_ASPECT_INVALID');
  if(!Array.isArray(scenes)||!Array.isArray(sceneIds)||sceneIds.length<4||
    sceneIds.length>16||new Set(sceneIds).size!==sceneIds.length||
    !TEMP.test(tempDir||''))fail('VIDEO_STORY_INVALID_SOURCE_SET');
  const byId=new Map(scenes.map(s=>[s.id,s]));
  const verifiedFiles={},readyScenes=[];
  let downloaded=0;
  for(const id of sceneIds){
    const scene=byId.get(id);
    if(!scene||!isSafeMontageScene(scene)||!MP4.test(scene.video)||
      !Number.isInteger(scene.expectedBytes)||scene.expectedBytes>MAX_SCENE_BYTES||
      !Number.isFinite(scene.durationSeconds)||scene.durationSeconds<1)
      fail('VIDEO_STORY_SOURCE_NOT_APPROVED');
    if(requireAspect&&(!scene.allowedAspects?.includes(requireAspect)||
      filmedSourceAspect(scene.width,scene.height)!==requireAspect))
      fail('VIDEO_STORY_PHYSICAL_ASPECT_MISMATCH');
    downloaded+=scene.expectedBytes;
    if(downloaded>MAX_TOTAL_BYTES)fail('VIDEO_STORY_MEDIA_BUDGET_EXCEEDED');
    const response=await fetcher(ORIGIN+scene.video,{
      method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(18000),
    });
    const bytes=await readBoundedResponse(response,scene.expectedBytes);
    const sha256=createHash('sha256').update(bytes).digest('hex');
    if(scene.expectedSha256&&scene.expectedSha256!==sha256)
      fail('VIDEO_STORY_HASH_MISMATCH');
    const absolutePath=join(tempDir,'scene-'+id+'.mp4');
    await writeFile(absolutePath,bytes,{mode:0o600,flag:'wx'});
    const measured=await probe(executable,absolutePath);
    const durationMs=typeof measured==='number'?measured:measured?.durationMs;
    if(!Number.isInteger(durationMs)||durationMs<1000||
      Math.abs(durationMs-Math.round(scene.durationSeconds*1000))>750)
      fail('VIDEO_STORY_DURATION_MISMATCH');
    if(requireAspect&&(measured?.width!==scene.width||
      measured?.height!==scene.height||
      filmedSourceAspect(measured.width,measured.height)!==requireAspect))
      fail('VIDEO_STORY_PHYSICAL_ASPECT_MISMATCH');
    readyScenes.push(Object.freeze({...scene,sha256,durationSeconds:durationMs/1000}));
    verifiedFiles[id]=Object.freeze({approved:true,path:scene.video,sha256,
      durationMs,absolutePath,bytes:bytes.length});
  }
  return {scenes:Object.freeze(readyScenes),verifiedFiles};
}
