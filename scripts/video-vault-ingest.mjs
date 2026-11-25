#!/usr/bin/env node
/**
 * Operator-only, LOCAL-FILE batch importer. Dry-run by default.
 * It NEVER scrapes/downloads Pexels, Pixabay, Mixkit, Dareful, social video
 * or any internet MP4. --apply needs current owner-approved Cloudflare usage,
 * explicit flags, checked licenses and an existing private Standard R2 bucket.
 *
 * node scripts/import-scenario-video-batch.mjs batch.json --target=r2
 * node scripts/import-scenario-video-batch.mjs batch.json --target=r2 --apply --usage=/private/usage.json
 * node scripts/video-vault-ingest.mjs --r2-audit --usage=/private/usage.json
 * node scripts/video-vault-ingest.mjs --reconcile
 */
import {readFileSync,realpathSync,statSync,mkdtempSync,rmSync,appendFileSync,existsSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {resolve,dirname,join,relative,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {
 validateVaultManifest,checkVaultCostGate,findVaultDuplicate,
 isGeneratorEligible,VAULT_MAX_FILE_BYTES,VAULT_EXCEPTION_FILE_BYTES,
} from '../lib/video-vault/contracts.mjs';
import {r2Config,createR2Client,objectKeys} from '../lib/video-vault/r2-client.mjs';
import {planVaultTrim} from '../lib/video-vault/ingest-trim.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const orphanJournal=resolve(root,'artifacts/video-vault-orphans.jsonl');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
function fail(code){throw Error('HH_VAULT_'+code)}
function run(name,args,{binary=false,timeout=45000}={}){
 const r=spawnSync(name,args,{encoding:binary?null:'utf8',shell:false,timeout,maxBuffer:2000000});
 if(r.error||r.status!==0)fail('MEDIA_TOOL_FAILED_'+name);
 return r.stdout;
}
function sourcePath(dir,file){
 const real=realpathSync(resolve(dir,file));
 const rel=relative(dir,real);
 if(!rel||rel==='..'||rel.startsWith('..'+sep)||rel.startsWith(sep)||file.includes('/')||file.includes('\\'))
   fail('UNSAFE_LOCAL_FILE');
 const stat=statSync(real);
 if(!stat.isFile()||stat.size<10000||stat.size>150_000_000)fail('LOCAL_FILE_SIZE');
 return {path:real,bytes:stat.size};
}
function probe(file){
 let info;
 try{info=JSON.parse(run('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file]));}
 catch{fail('FFPROBE_INVALID')}
 const video=info.streams?.find(v=>v.codec_type==='video');
 const seconds=Number(info.format?.duration);
 const fpsParts=String(video?.avg_frame_rate||'0/1').split('/').map(Number);
 const fps=fpsParts[1]?fpsParts[0]/fpsParts[1]:NaN;
 if(!video||video.width<480||video.height<480||
   !Number.isFinite(seconds)||seconds<4.95||seconds>600||
   !Number.isFinite(fps)||fps<10||fps>120)fail('UNSUITABLE_SOURCE_MEDIA');
 return {seconds,width:video.width,height:video.height,codec:video.codec_name,
   pixFmt:video.pix_fmt,fps,hasAudio:info.streams.some(v=>v.codec_type==='audio')};
}
function decode(file,seconds){
 for(const time of [0.2,seconds/2,Math.max(0.2,seconds-0.5)]){
  run('ffmpeg',['-hide_banner','-loglevel','error','-nostdin',
    '-ss',String(time),'-i',file,'-frames:v','1','-f','null','-']);
 }
 // Spot frames are not a full corruption/decode check.
 run('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-xerror',
   '-i',file,'-f','null','-'],{timeout:120000});
}
function perceivedHash(file){
 const bytes=run('ffmpeg',['-hide_banner','-loglevel','error','-nostdin',
   '-ss','1','-i',file,'-frames:v','1','-vf','scale=9:8,format=gray',
   '-f','rawvideo','-'],{binary:true});
 if(bytes.length!==72)fail('PERCEPTUAL_HASH_FAILED');
 let bit=0n;
 for(let y=0;y<8;y++)for(let x=0;x<8;x++){
  bit=(bit<<1n)|(bytes[y*9+x]>bytes[y*9+x+1]?1n:0n);
 }
 return bit.toString(16).padStart(16,'0');
}
function normalize(input,asset,tmp){
 const output=join(tmp,'master.mp4'),poster=join(tmp,'poster.jpg');
 const src=probe(input);
 const trim=planVaultTrim(src.seconds,asset.desiredTrimSeconds,asset.trimStartSeconds);
 const width=asset.aspect==='landscape'?1920:1080;
 const height=asset.aspect==='landscape'?1080:1920;
 const filter='fps=24,scale='+width+':'+height+
   ':force_original_aspect_ratio=increase,crop='+width+':'+height+',setsar=1,format=yuv420p'+
   (trim.finalFrameHoldApplied?',tpad=stop_mode=clone:stop_duration=0.12':'');
 // Input -t must precede -i, otherwise a tiny final still-frame hold gets cut off.
 run('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y',
   '-ss',String(trim.startSeconds),'-t',String(trim.inputSeconds),'-i',input,
   '-an','-vf',filter,'-frames:v',String(trim.outputFrames),
   '-c:v','libx264','-pix_fmt','yuv420p','-preset','fast','-crf','27',
   '-movflags','+faststart',output],{timeout:120000});
 const mp4=probe(output);
 if(mp4.codec!=='h264'||mp4.pixFmt!=='yuv420p'||mp4.width!==width||
   mp4.height!==height||Math.abs(mp4.fps-24)>.1||
   mp4.seconds<5||mp4.seconds>15.1||mp4.hasAudio)fail('CANONICAL_ENCODE_REJECTED');
 decode(output,mp4.seconds);
 run('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y',
   '-ss','1','-i',output,'-frames:v','1','-vf','scale=540:-2',
   '-q:v','4',poster]);
 const master=readFileSync(output),jpg=readFileSync(poster);
 if(master.length>VAULT_MAX_FILE_BYTES||
   jpg.length>=150000||jpg.length<500||
   master.toString('ascii',4,8)!=='ftyp')fail('CANONICAL_FILE_BUDGET');
 return {master,jpg,meta:mp4,sha256:digest(master),perceptualHash:perceivedHash(output),
   sourceInputGeometry:{width:src.width,height:src.height},
   upscaledFromStaging:src.width<width||src.height<height,
   finalFrameHoldApplied:trim.finalFrameHoldApplied};
}
function parse(file){return JSON.parse(readFileSync(file,'utf8'))}
function flags(args){
 const result={apply:false,audit:false,reconcile:false,fullReadback:false,manifest:null,usage:null};
 for(const arg of args){
  if(arg==='--apply')result.apply=true;
  else if(arg==='--dry-run')result.apply=false;
  else if(arg==='--r2-audit')result.audit=true;
  else if(arg==='--full-readback')result.fullReadback=true;
  else if(arg==='--reconcile')result.reconcile=true;
  else if(arg.startsWith('--usage='))result.usage=arg.slice(8);
  else if(arg==='--target=r2'){}
  else if(arg.startsWith('--'))fail('UNKNOWN_OPTION');
  else if(result.manifest)fail('ONE_MANIFEST_ONLY');
  else result.manifest=arg;
 }
 return result;
}
async function database(){
 if(!process.env.HH_APP_DATABASE_URL)fail('DATABASE_CREDENTIALS_MISSING');
 const {default:pg}=await import('pg');
 const {SUPABASE_ROOT_2021_CA}=await import('../lib/app/supabase-ca.js');
 const client=new pg.Client({connectionString:process.env.HH_APP_DATABASE_URL,
  ssl:{rejectUnauthorized:true,ca:SUPABASE_ROOT_2021_CA},
  connectionTimeoutMillis:7000,statement_timeout:15000,
  application_name:'hh-video-vault-operator'});
 await client.connect();
 return client;
}
async function vaultInventory(db){
 await db.query('begin read only');
 try{
  await db.query('set local role hh_app_backend');
  const result=await db.query(
   'select asset_id,source_provider,source_asset_id,filmed_master_id,source_url,raw_sha256,sha256,perceptual_hash,r2_object_key,poster_object_key,r2_bucket,file_bytes,status,type,owner_review_status,visual_review_score,commercial_use_ok,derivative_edit_ok,raw_client_delivery_ok,technical_verified_at,r2_head_checked_at,r2_readback_sha256,subject_release_status,codec,category,aspect_ratio,duration_ms,tags,goals,motifs,pace from app.video_vault_assets_v1'
);
  await db.query('commit');
  return result.rows;
 }catch(error){await db.query('rollback').catch(()=>{});throw error}
}
async function register(db,asset,output,rawSha,keys,batchId,bucket){
 const a=asset,now=new Date().toISOString();
 await db.query('begin');
 try{
  await db.query('set local role hh_app_backend');
  await db.query("select set_config('hh.video_vault_ingest','approved',true)");
  const cols=['asset_id','source_provider','source_asset_id','filmed_master_id','source_url',
   'creator','license_id','license_url','license_evidence','attribution_text','rights_checked_at',
   'commercial_use_ok','derivative_edit_ok','raw_client_delivery_ok','subject_release_status',
   'subject_release_evidence','owner_review_status','visual_review_score','human_reviewer',
   'type','category','tags','goals','motifs','pace','aspect_ratio','width','height','fps','duration_ms',
   'codec','file_bytes','raw_sha256','sha256','perceptual_hash','r2_bucket','r2_object_key',
   'poster_object_key','r2_readback_sha256','technical_verified_at','r2_head_checked_at',
   'status','batch_id'];
  const vals=[a.assetId,a.sourceProvider,a.sourceAssetId,a.filmedMasterId,a.originalSourcePage,
   a.creator,a.licenseId,a.licenseUrl||null,a.licenseEvidence,a.attributionText||'',a.rightsCheckedOn,
   true,true,a.deliveryPolicy==='client_raw_allowed',a.subjectReleaseStatus,
   a.subjectReleaseEvidence||null,'approved',a.beautyRating,a.humanReviewer,'real_footage',
   a.category,a.tags,a.goals,a.motifs,a.pace,a.aspect,output.meta.width,output.meta.height,
   24,Math.round(output.meta.seconds*1000),'h264',output.master.length,rawSha,
   output.sha256,output.perceptualHash,bucket,keys.master,keys.poster,output.sha256,
   now,now,'generator_eligible',batchId];
  const insert=await db.query('insert into app.video_vault_assets_v1 ('+cols.join(',')+
   ') values ('+vals.map((_,i)=>'$'+(i+1)).join(',')+
   ') on conflict do nothing returning asset_id',vals);
  if(insert.rowCount!==1)fail('DUPLICATE_DB_ASSET');
  const states=['discovered','metadata_ready','rights_checked','visual_approved',
    'ingest_approved','normalized','r2_verified','generator_eligible'];
  for(let i=0;i<states.length;i++){
   await db.query('insert into app.video_vault_asset_events_v1 '+
     '(asset_id,batch_id,actor,previous_status,next_status,reason,source_evidence_uri,sha256) '+
     'values ($1,$2,$3,$4,$5,$6,$7,$8)',[
       a.assetId,batchId,a.humanReviewer,i?states[i-1]:null,states[i],
       'operator-reviewed physical media and verified private R2 readback',
       a.originalSourcePage,output.sha256,
     ]);
  }
  await db.query('commit');
  return {status:'generator_eligible',assetId:a.assetId};
 }catch(error){await db.query('rollback').catch(()=>{});throw error}
}
function journalOrphan(assetId,keys,reason){
 mkdirSync(dirname(orphanJournal),{recursive:true,mode:0o700});
 const safe={assetId,keys,reason:String(reason).replace(/https?:\/\/[^\s]+/g,'[url]').slice(0,160),
   time:new Date().toISOString(),status:'ORPHAN_PENDING_MANUAL_RECONCILE'};
 appendFileSync(orphanJournal,JSON.stringify(safe)+'\n',{mode:0o600});
}
export async function runVideoVaultIngest(args=process.argv.slice(2)){
 const options=flags(args);
 if(options.reconcile){
  if(!existsSync(orphanJournal))return {orphans:0,action:'no_deletions'};
  const entries=readFileSync(orphanJournal,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
  return {orphans:entries.length,items:entries,action:'MANUAL_RECONCILE_ONLY'};
 }
 if(!options.manifest&&!options.audit)fail('MANIFEST_REQUIRED');
 const manifest=options.manifest?validateVaultManifest(parse(realpathSync(resolve(options.manifest)))):null;
 const batchDir=manifest?dirname(realpathSync(resolve(options.manifest))):null;
 const prepared=[];
 if(manifest){
  for(const asset of manifest.assets){
   const file=sourcePath(batchDir,asset.localFile);
   const src=probe(file.path);
   if((asset.aspect==='landscape'&&src.width<src.height)||
      (asset.aspect==='portrait'&&src.width>src.height))fail('STAGED_ASPECT_MISMATCH');
   const trim=planVaultTrim(src.seconds,asset.desiredTrimSeconds,asset.trimStartSeconds);
   decode(file.path,src.seconds);
   const hash=digest(readFileSync(file.path));
   if(asset.sourceHash&&asset.sourceHash!==hash)fail('SOURCE_HASH_MISMATCH');
   prepared.push({asset,file,rawSha:hash,source:src,trim});
  }
 }
 if(!options.apply&&!options.audit){
  return {mode:'dry-run',batchId:manifest.batchId,checked:prepared.length,
   approvedForPreparation:prepared.map(a=>a.asset.assetId),
   UPSCALE_WARNINGS_NOT_NATIVE_HD:prepared.filter(a=>
      a.source.width<(a.asset.aspect==='landscape'?1920:1080)||
      a.source.height<(a.asset.aspect==='landscape'?1080:1920))
      .map(a=>({assetId:a.asset.assetId,sourceWidth:a.source.width,
        sourceHeight:a.source.height,canonicalOutput:a.asset.aspect==='landscape'?'1920x1080':'1080x1920'})),
   FINAL_FRAME_HOLD_WARNINGS:prepared.filter(a=>a.trim.finalFrameHoldApplied)
      .map(a=>({assetId:a.asset.assetId,holdSeconds:a.trim.holdSeconds})),
   NEW_UPLOADED:0,READY_AFTER_QA:0,COUNTABLE_N_OVER_500:0,
   costGate:'NOT_RUN',message:'No R2, DB, network download or cloud writes performed'};
 }
 // No use of a mere file of stock URLs: rights, owner and Cloudflare gates first.
 if(options.apply&&(process.env.HH_VIDEO_VAULT_APPLY_APPROVED!=='true'||
   process.env.HH_VIDEO_VAULT_OWNER_UPLOAD_CONFIRMED!=='true'))
   fail('OWNER_UPLOAD_APPROVAL_REQUIRED');
 if(!options.usage)fail('HOLD_COST_UNVERIFIED');
 const snapshot=parse(realpathSync(resolve(options.usage)));
 const estimate=prepared.reduce((sum,x)=>sum+x.asset.expectedByteBudget+160000,0);
 checkVaultCostGate(snapshot,{plannedBytes:estimate,plannedA:prepared.length*3,plannedB:prepared.length*6});
 const config=r2Config(process.env,{write:options.apply});
 const r2=createR2Client(config);
 const db=await database();
 try{
  const existing=await vaultInventory(db);
  if(options.audit){
   let verified=0,missing=0,bytes=0;
   for(const row of existing.filter(r=>isGeneratorEligible(r))){
    try{
     const head=await r2.head(row.r2_object_key);
     if(head.bytes!==Number(row.file_bytes)||head.contentType!=='video/mp4'||
       head.checksum!==row.sha256)throw Error('R2_HEAD_MISMATCH');
     if(options.fullReadback)await r2.getVerified(row.r2_object_key,{
       expectedBytes:Number(row.file_bytes),expectedSha256:row.sha256});
     verified++;bytes+=head.bytes;
    }catch{missing++}
   }
   return {mode:'audit',DB_ELIGIBLE:existing.filter(r=>isGeneratorEligible(r)).length,
     R2_HEAD_VERIFIED:verified,FAILED_OR_MISSING:missing,R2_BYTES:bytes,
     LIVE_VERIFIED:false};
  }
  const totals={mode:'apply',batchId:manifest.batchId,NEW_UPLOADED:0,
   READY_AFTER_QA:0,DEDUPED:0,REJECTED:0,HOLD_COST:0,HOLD_RIGHTS:0,R2_BYTES:0,
   UPSCALED_FROM_STAGED_SOURCE:0,SHORT_FINAL_FRAME_HOLDS:0};
  for(const item of prepared){
   const {asset,file,rawSha}=item;
   const dup=findVaultDuplicate({...asset,sourceHash:rawSha},existing);
   if(dup){
    if(dup.asset_id===asset.assetId&&dup.raw_sha256===rawSha&&isGeneratorEligible(dup)){
     totals.DEDUPED++;continue;
    }
    fail('POSSIBLE_DUPLICATE_REQUIRES_REVIEW_'+asset.assetId);
   }
   const tmp=mkdtempSync(join(tmpdir(),'hh-video-vault-'));
   try{
    const rendered=normalize(file.path,asset,tmp);
    const near=findVaultDuplicate({...asset,sourceHash:rawSha,
      masterSha256:rendered.sha256,perceptualHash:rendered.perceptualHash},existing);
    if(near)fail('PERCEPTUAL_DUPLICATE_REVIEW_REQUIRED');
    const rightsEvidence=Buffer.from(JSON.stringify({
      schemaVersion:'hh-vault-rights-v1',assetId:asset.assetId,
      sourceProvider:asset.sourceProvider,sourceAssetId:asset.sourceAssetId,
      filmedMasterId:asset.filmedMasterId,originalSourcePage:asset.originalSourcePage,
      creator:asset.creator,licenseId:asset.licenseId,licenseUrl:asset.licenseUrl||null,
      rightsCheckedOn:asset.rightsCheckedOn,licenseEvidence:asset.licenseEvidence,
      attributionText:asset.attributionText||'',subjectReleaseStatus:asset.subjectReleaseStatus,
      subjectReleaseEvidence:asset.subjectReleaseEvidence||null,
      humanReviewer:asset.humanReviewer,beautyRating:asset.beautyRating,
      deliveryPolicy:asset.deliveryPolicy,originalSourceSha256:rawSha,
      canonicalSha256:rendered.sha256,
      approvedCommercialEdit:true,ownerReviewed:true,
    }));
    if(rightsEvidence.length>16000)fail('RIGHTS_EVIDENCE_TOO_LARGE');
    // Revalidate account-wide operator snapshot before each physical PUT.
    checkVaultCostGate(snapshot,{plannedBytes:totals.R2_BYTES+rendered.master.length+rendered.jpg.length+rightsEvidence.length,
      plannedA:(totals.NEW_UPLOADED+1)*3,plannedB:(totals.NEW_UPLOADED+1)*6});
    const keys=objectKeys(asset.assetId,rendered.sha256);
    let r2Uploaded=false;
    try{
     await r2.put(keys.master,rendered.master,{contentType:'video/mp4',checksum:rendered.sha256});
     r2Uploaded=true;
     await r2.put(keys.poster,rendered.jpg,{contentType:'image/jpeg',checksum:digest(rendered.jpg)});
     await r2.put(keys.evidence,rightsEvidence,{
       contentType:'application/json',checksum:digest(rightsEvidence),evidence:true});
     const [masterHead,posterHead,evidenceHead]=await Promise.all([
       r2.head(keys.master),r2.head(keys.poster),r2.head(keys.evidence,{evidence:true})]);
     if(masterHead.bytes!==rendered.master.length||masterHead.contentType!=='video/mp4'||
       masterHead.checksum!==rendered.sha256||
       posterHead.bytes!==rendered.jpg.length||posterHead.contentType!=='image/jpeg'||
       evidenceHead.bytes!==rightsEvidence.length||evidenceHead.checksum!==digest(rightsEvidence)||
       evidenceHead.contentType!=='application/json')
       fail('R2_HEAD_READBACK_FAILED');
     await r2.getVerified(keys.master,{expectedBytes:rendered.master.length,
       expectedSha256:rendered.sha256});
     await register(db,asset,rendered,rawSha,keys,manifest.batchId,config.bucket);
     totals.NEW_UPLOADED++;totals.READY_AFTER_QA++;
     if(rendered.upscaledFromStaging)totals.UPSCALED_FROM_STAGED_SOURCE++;
     if(rendered.finalFrameHoldApplied)totals.SHORT_FINAL_FRAME_HOLDS++;
     totals.R2_BYTES+=rendered.master.length+rendered.jpg.length+rightsEvidence.length;
     existing.push({
      asset_id:asset.assetId,source_provider:asset.sourceProvider,
      source_asset_id:asset.sourceAssetId,filmed_master_id:asset.filmedMasterId,
      source_url:asset.originalSourcePage,raw_sha256:rawSha,sha256:rendered.sha256,
      perceptual_hash:rendered.perceptualHash,status:'generator_eligible',
      type:'real_footage',owner_review_status:'approved',
      visual_review_score:asset.beautyRating,commercial_use_ok:true,
      derivative_edit_ok:true,raw_client_delivery_ok:asset.deliveryPolicy==='client_raw_allowed',
      technical_verified_at:new Date().toISOString(),r2_head_checked_at:new Date().toISOString(),
      r2_readback_sha256:rendered.sha256,subject_release_status:asset.subjectReleaseStatus,
      codec:'h264',file_bytes:rendered.master.length,
      r2_object_key:keys.master,poster_object_key:keys.poster,
     });
    }catch(error){
     if(r2Uploaded)journalOrphan(asset.assetId,keys,error.message);
     throw error;
    }
   }finally{rmSync(tmp,{recursive:true,force:true})}
  }
  totals.COUNTABLE_N_OVER_500=existing.filter(r=>isGeneratorEligible(r)).length;
  return totals;
 }finally{await db.end()}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 runVideoVaultIngest().then(result=>process.stdout.write(JSON.stringify(result,null,2)+'\n'))
  .catch(error=>{process.stderr.write(String(error?.message||'HH_VAULT_FAILED')
    .replace(/https?:\/\/[^\s]+/g,'[url]')+'\n');process.exitCode=1});
}
