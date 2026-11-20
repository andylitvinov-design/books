#!/usr/bin/env node
/**
 * OFFLINE OWNER TOOL — attest already-rendered, cleared, first-party MP4s.
 * Reads only fixed repository paths. No Vercel runtime, URLs, uploads, paid API,
 * network, user prompts, personal photos/voice, or GitHub Actions render queue.
 * Never marks a plan READY from a storyboard preview or individual stock clip.
 *
 * Run from repository root AFTER actually producing and editorially reviewing
 * finished masters and an approved candidate manifest:
 * node scripts/verify-express-ready-masters.mjs
 *   data/video-catalog/express-master-candidates-v1.json
 *   data/video-catalog/express-ready-masters-v1.json
 */
import {readFile,realpath,stat,mkdir,rename,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {resolve,dirname,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  EXPRESS_READY_INDEX_VERSION,EXPRESS_READY_PATH,isVerifiedExpressMaster,
} from '../lib/mandala/express-ready-master.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const ERROR=(code)=>{throw Error(code);};
const ID=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_BYTES=25*1024*1024;
const timeout=25000;
const safe=(base,path)=>{
  const rel=relative(base,path);
  return !!rel&&rel!=='..'&&!rel.startsWith('..'+sep)&&!rel.startsWith(sep);
};
export function inspectFinishedVideoProof(meta,bytes,expected){
  const video=meta?.streams?.filter(s=>s.codec_type==='video')||[];
  const audio=meta?.streams?.filter(s=>s.codec_type==='audio')||[];
  const durationMs=Math.round(Number(meta?.format?.duration)*1000);
  const v=video[0];
  const [numer,denom]=String(v?.avg_frame_rate||'').split('/').map(Number);
  const fps=numer/denom;
  const dims=expected.aspect==='portrait'?[720,1280]:
    expected.aspect==='landscape'?[1280,720]:expected.aspect==='square'?[720,720]:null;
  if(!dims||video.length!==1||audio.length>(expected.audioIds.length?1:0)||
     !Number.isFinite(fps)||fps<23||fps>30||
     v?.codec_name!=='h264'||v.pix_fmt!=='yuv420p'||
     v.width!==dims[0]||v.height!==dims[1]||
     expected.audioIds.length>0&&(audio.length!==1||audio[0].codec_name!=='aac')||
     expected.audioIds.length===0&&audio.length!==0||
     !Number.isInteger(durationMs)||Math.abs(durationMs-expected.durationMs)>500||
     bytes.byteLength<4096||bytes.byteLength>MAX_BYTES)
    ERROR('EXPRESS_MP4_CODEC_OR_DURATION_INVALID');
  // MP4 faststart: validate top-level box order, not a string search in media.
  let cursor=0,moov=false,mdat=false;
  while(cursor+8<=bytes.length){
    let length=bytes.readUInt32BE(cursor);
    const type=bytes.toString('ascii',cursor+4,cursor+8);
    if(length===1&&cursor+16<=bytes.length){
      const big=bytes.readBigUInt64BE(cursor+8);
      length=Number(big);
    }else if(length===0)length=bytes.length-cursor;
    if(!Number.isSafeInteger(length)||length<8||cursor+length>bytes.length)
      ERROR('EXPRESS_MP4_BROKEN_BOX');
    if(type==='moov')moov=true;
    if(type==='mdat'){mdat=true;if(!moov)ERROR('EXPRESS_MP4_NOT_FASTSTART');}
    cursor+=length;
  }
  if(!moov||!mdat||cursor!==bytes.length)ERROR('EXPRESS_MP4_MISSING_BOX');
  return {width:v.width,height:v.height,fps:Math.round(fps),
    videoCodec:'h264',pixelFormat:'yuv420p',
    audioCodec:audio.length?'aac':'none',verifiedDurationMs:durationMs};
}
const ff=(binary,args,ms=timeout)=>execFileSync(binary,args,
  {encoding:'utf8',timeout:ms,maxBuffer:1200000});
const validateCatalog=(items,catalog)=>{
  if(!Array.isArray(items)||items.length<1||items.length>8)ERROR('EXPRESS_CANDIDATES_INVALID');
  const map=new Map(catalog.scenes.filter(x=>x?.status==='approved'&&
    x.media==='licensed_mp4'&&
    ['existing_approved_first_party_master','dareful_cc_by_4_0'].includes(x.rightsReference?.kind))
    .map(x=>[x.id,x]));
  const ids=new Set();
  for(const item of items){
    if(!ID.test(item?.id||'')||ids.has(item.id)||
      !Array.isArray(item.sceneIds)||item.sceneIds.length<4||item.sceneIds.length>6||
      new Set(item.sceneIds).size!==item.sceneIds.length||
      item.sceneIds.some(id=>!map.has(id)))ERROR('EXPRESS_SOURCE_RIGHTS_INVALID');
    ids.add(item.id);
    const origins=item.sceneIds.map(id=>map.get(id)?.originMasterKeys?.[0]||id);
    if(new Set(origins).size!==origins.length)ERROR('EXPRESS_SOURCE_REUSE_INVALID');
    if(item.sceneIds.some(id=>!map.get(id).allowedAspects?.includes(item.aspect)))
      ERROR('EXPRESS_SOURCE_ASPECT_INVALID');
    if(item.editorialApproved!==true||item.personalDataIncluded!==false)
      ERROR('EXPRESS_EDITORIAL_OR_PRIVACY_UNVERIFIED');
  }
};
export async function verifyExpressMasters({candidateFile,outputFile,probe=ff,root=ROOT}={}){
  const expectedCandidate=resolve(root,'data/video-catalog/express-master-candidates-v1.json');
  const expectedOutput=resolve(root,'data/video-catalog/express-ready-masters-v1.json');
  if(candidateFile!==expectedCandidate||outputFile!==expectedOutput)
    ERROR('EXPRESS_MANIFEST_PATH_NOT_ALLOWLISTED');
  const candidates=JSON.parse(await readFile(candidateFile,'utf8'));
  const catalog=JSON.parse(await readFile(resolve(root,'data/video-catalog/scene-taxonomy.json'),'utf8'));
  if(candidates.version!=='hh-express-candidates-v1')ERROR('EXPRESS_VERSION_INVALID');
  validateCatalog(candidates.masters,catalog);
  const masters=[];
  const dir=resolve(root,'public'+EXPRESS_READY_PATH);
  for(const c of candidates.masters){
    const file=resolve(dir,c.id+'.mp4');
    if(!safe(dir,file)||!(await stat(file)).isFile()||
       !safe(dir,await realpath(file)))ERROR('EXPRESS_MASTER_FILE_NOT_FOUND');
    const bytes=await readFile(file);
    const metadata=JSON.parse(probe('ffprobe',[
      '-v','error','-show_entries',
      'format=duration:stream=codec_type,codec_name,width,height,pix_fmt,avg_frame_rate',
      '-of','json',file]));
    const proof=inspectFinishedVideoProof(metadata,bytes,c);
    for(let index=0;index<c.sceneIds.length;index++){
      const seek=(c.durationMs*(index+.5)/c.sceneIds.length/1000).toFixed(2);
      const frame=probe('ffmpeg',['-nostdin','-v','error','-ss',seek,'-i',file,
        '-map','0:v:0','-frames:v','1','-f','framecrc','-']);
      if(!/^0,\s*\d+,/m.test(frame))ERROR('EXPRESS_SCENE_FRAME_DECODE_FAILED');
    }
    if(c.audioIds.length){
      // Entire AAC must decode, AND volumedetect proves an audible soundtrack.
      const check=spawnSync('ffmpeg',['-nostdin','-v','info','-i',file,'-vn',
        '-af','volumedetect','-f','null','-'],{encoding:'utf8',timeout:timeout,maxBuffer:1200000});
      if(check.error||check.status!==0)ERROR('EXPRESS_AUDIO_DECODE_FAILED');
      const value=(check.stderr||'').match(/mean_volume:\s*(-?\d+(?:\.\d+)?) dB/);
      if(!value||Number(value[1])<=-55)ERROR('EXPRESS_AUDIO_EFFECTIVELY_SILENT');
    }
    const entry={id:c.id,status:'verified',
      path:EXPRESS_READY_PATH+c.id+'.mp4',locale:c.locale,
      planHash:c.planHash,presetId:c.presetId,
      durationMs:c.durationMs,aspect:c.aspect,sceneIds:c.sceneIds,
      audioIds:c.audioIds,captioned:c.captioned,
      bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),
      proofVersion:'ffprobe-ffmpeg-verified-v1',...proof};
    if(!isVerifiedExpressMaster(entry))ERROR('EXPRESS_ENTRY_PROOF_INVALID');
    masters.push(entry);
  }
  const index={version:EXPRESS_READY_INDEX_VERSION,masters};
  await mkdir(dirname(outputFile),{recursive:true});
  const temp=outputFile+'.verified-tmp';
  await writeFile(temp,JSON.stringify(index,null,2)+'\n',{flag:'wx'});
  await rename(temp,outputFile);
  return {count:masters.length,totalBytes:masters.reduce((sum,x)=>sum+x.bytes,0)};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const a=process.argv.slice(2);
  if(a.length!==2){process.stderr.write('usage: node scripts/verify-express-ready-masters.mjs <approved-candidates.json> <index.json>\n');process.exitCode=2;}
  else verifyExpressMasters({candidateFile:resolve(a[0]),outputFile:resolve(a[1])})
    .then(result=>process.stdout.write(JSON.stringify({ok:true,...result})+'\n'),
      error=>{process.stderr.write('express_verification_failed:'+
        (String(error?.message||'unknown').startsWith('EXPRESS_')?error.message:'UNEXPECTED')+'\n');process.exitCode=1;});
}
