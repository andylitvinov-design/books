import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {
 VAULT_TARGET,VAULT_CATEGORY_TARGETS,VAULT_MILESTONES,
 validateVaultAsset,validateVaultManifest,checkVaultCostGate,
 findVaultDuplicate,hammingHex64,isGeneratorEligible,
 selectVaultScenes,countQualifiedVaultAssets,
} from '../lib/video-vault/contracts.mjs';
import {safeR2Key,objectKeys,r2Config,presignR2Get,createR2Client} from '../lib/video-vault/r2-client.mjs';
import {
 validateVaultResolveInput,validateVaultSearchParams,publicVaultSearchResult,
 resolveVaultFourShots,
} from '../lib/video-vault/api-service.mjs';
import {suggestVerifiedVaultMontage} from '../lib/video-vault/director-bridge.mjs';

const checkedOn=new Date().toISOString().slice(0,10);
const hash='a'.repeat(64);
const base={
 type:'real_footage',
 assetId:'forest-golden-morning',sourceProvider:'first_party',
 sourceAssetId:'owner-camera-001',filmedMasterId:'camera-session-00001',
 originalSourcePage:'https://holistichouse.vercel.app/verified-source-001',
 localFile:'source-001.mp4',title:'Beautiful morning',
 creator:'Original footage owner',licenseId:'owner_original',
 ownershipEvidenceVerified:true,
 licenseEvidence:'Original filmmaker owned all rights and approved commercial edited video use.',
 rightsCheckedOn:checkedOn,commercialUseApproved:true,editingApproved:true,
 noRecognizablePeople:true,noVisibleBrandLogos:true,
 subjectReleaseStatus:'not_applicable',
 visualApproved:true,beautyRating:5,
 humanReviewer:'owner curator',ownerApproved:true,manualFootageVerified:true,
 deliveryPolicy:'client_raw_allowed',rawClientDeliveryApproved:true,
 category:'nature',tags:['forest'],goals:['calm'],motifs:['forest'],
 aspect:'landscape',pace:'slow',expectedByteBudget:8_000_000,
};
const validRow=(id='scene-a',sha=hash)=>({
 asset_id:id,source_provider:'first_party',source_asset_id:id,
 filmed_master_id:id+'-camera',type:'real_footage',status:'generator_eligible',
 owner_review_status:'approved',visual_review_score:5,
 commercial_use_ok:true,derivative_edit_ok:true,raw_client_delivery_ok:true,
 subject_release_status:'not_applicable',category:'nature',aspect_ratio:'landscape',
 pace:'slow',goals:['calm'],motifs:['forest'],tags:['forest'],
 duration_ms:10000,width:1920,height:1080,codec:'h264',
 file_bytes:150000,sha256:sha,r2_readback_sha256:sha,
 r2_object_key:'masters/'+id+'/'+sha+'.mp4',
 poster_object_key:'posters/'+id+'/'+sha+'.jpg',r2_bucket:'hh-real-video-vault',
 technical_verified_at:checkedOn,r2_head_checked_at:checkedOn,
 attribution_text:'Original footage rights verified',
});
const snapshot=()=>({
 provider:'cloudflare_r2_standard',checkedAt:new Date().toISOString(),
 ownerConfirmedNoNewSpend:true,billingAndPaymentMethodReviewed:true,
 r2AlreadyEnabled:true,accountUsageVerified:true,remainingStandardGbMonthVerified:true,
 otherCloudflareUsageChecked:true,accountStorageBytes:2000000,vaultStorageBytes:1000000,
 monthlyClassA:100,monthlyClassB:100,
});
test('targets are 500 independently filmed masters, 6 domains, milestones 20→100→250→500',()=>{
 assert.equal(VAULT_TARGET,500);
 assert.equal(Object.values(VAULT_CATEGORY_TARGETS).reduce((a,b)=>a+b,0),500);
 assert.deepEqual(VAULT_MILESTONES,[20,100,250,500]);
});
test('rights/curation: only individually filmed approved source, never procedural, AI, link-only or rejected',()=>{
 assert.equal(validateVaultAsset(base).type,'real_footage');
 for(const patch of [
  {type:'original_motion_mp4'},
  {type:'synthetic_ai_video'},
  {localFile:undefined},
  {ownerApproved:false},
  {manualFootageVerified:false},
  {beautyRating:3},
  {subjectReleaseStatus:'unknown'},
  {rawClientDeliveryApproved:false},
  {commercialUseApproved:false},
  {expectedByteBudget:20_000_000},
 ])assert.throws(()=>validateVaultAsset({...base,...patch}),/HH_VAULT_/);
});
test('Dareful reuses exact stock rights; restricted Mixkit and unpermitted stock sources are denied',()=>{
 const dareful={
  ...base,sourceProvider:'dareful',sourceAssetId:'dareful-001',
  originalSourcePage:'https://dareful.com/golden-morning/',
  licenseId:'cc_by_4_0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',
  exactClipLicenseConfirmed:true,identifiableSubjectsCleared:true,
  attributionText:'Author / CC BY 4.0 / adapted',
 };
 assert.equal(validateVaultAsset(dareful).sourceProvider,'dareful');
 assert.throws(()=>validateVaultAsset({...dareful,attributionText:''}),/ATTRIBUTION/);
 assert.throws(()=>validateVaultAsset({...dareful,licenseId:'mixkit_video_restricted'}),/STOCK_LICENSE/);
 assert.throws(()=>validateVaultAsset({...dareful,sourceProvider:'pexels',
  licenseId:'pexels_content',licenseUrl:'https://www.pexels.com/license/',
  originalSourcePage:'https://www.pexels.com/video/golden-1234/'}),
 /SOURCE_PERMISSION/);
 assert.throws(()=>validateVaultAsset({...dareful,noRecognizablePeople:false,
   subjectReleaseStatus:'unknown'}),/RELEASE/);
});
test('batch manifest does not count duplicate source page, identity, original SHA or more than 20',()=>{
 const one={...base},two={...base,assetId:'morning-two',sourceAssetId:'owner-camera-002',
 filmedMasterId:'camera-session-00002'};
 assert.deepEqual(validateVaultManifest({schemaVersion:'hh-video-vault-batch-v1',
  batchId:'pilot-2026-001',milestone:20,assets:[one]}).assets.map(x=>x.assetId),[one.assetId]);
 assert.throws(()=>validateVaultManifest({schemaVersion:'hh-video-vault-batch-v1',
  batchId:'pilot-2026-001',milestone:20,assets:[one,two]}),/DUPLICATE_PAGE/);
 assert.throws(()=>validateVaultManifest({schemaVersion:'hh-video-vault-batch-v1',
  batchId:'pilot-2026-001',milestone:20,
  assets:Array(21).fill(one)}),/BATCH_OR_SIZE/);
});
test('rights + budget are strict fail-closed including unknown account-wide usage',()=>{
 assert.equal(checkVaultCostGate(snapshot(),{plannedBytes:1000}).status,'COST_GATE_PASS');
 for(const patch of [
  {ownerConfirmedNoNewSpend:false},
  {accountUsageVerified:false},
  {remainingStandardGbMonthVerified:false},
  {otherCloudflareUsageChecked:false},
  {accountStorageBytes:9_000_000_000},
  {vaultStorageBytes:7_000_000_000},
  {monthlyClassA:100001},
  {monthlyClassB:1000001},
  {checkedAt:'2026-10-01T00:00:00Z'},
 ])assert.throws(()=>checkVaultCostGate({...snapshot(),...patch},{plannedBytes:1000}),/HH_VAULT_HOLD_COST/);
 assert.throws(()=>checkVaultCostGate(null),/HH_VAULT_HOLD_COST/);
});
test('SHA, source and perceptual similarity suppress re-crops of one original',()=>{
 const a=validRow('scene-a',hash);
 assert.equal(findVaultDuplicate({...base,sourceHash:'c'.repeat(64),
  perceptualHash:'0000000000000001'},[{...a,perceptual_hash:'0000000000000000'}]),a);
 assert.equal(hammingHex64('0000000000000000','ffffffffffffffff'),64);
 assert.equal(findVaultDuplicate({sourceProvider:'first_party',sourceAssetId:'scene-a'},[a]),a);
});
test('generator count excludes procedural, unconfirmed R2, identical originals and repeated sha',()=>{
 const rows=[validRow('scene-a','a'.repeat(64)),
 validRow('scene-b','b'.repeat(64)),
 {...validRow('scene-c','c'.repeat(64)),type:'original_motion_mp4'},
 {...validRow('scene-d','d'.repeat(64)),r2_readback_sha256:'e'.repeat(64)},
 {...validRow('scene-e','e'.repeat(64)),filmed_master_id:'scene-a-camera'},
 {...validRow('scene-f','f'.repeat(64)),raw_client_delivery_ok:false},
 ];
 const count=countQualifiedVaultAssets(rows);
 assert.equal(count.verified,3); // scene f is index-ready even when not client-deliverable
 assert.equal(count.remaining,497);
 assert.equal(selectVaultScenes(rows,{goal:'calm'}).length,2);
});
test('four-shot bridge returns only four independent approved footage IDs and no unsafe fallback',()=>{
 const rows=['a','b','c','d'].map((id,i)=>validRow('scene-'+id,String(i+1).repeat(64)));
 const result=suggestVerifiedVaultMontage(rows,{goal:'calm',motif:'forest'});
 assert.equal(result.status,'ready_for_server_resolution');
 assert.equal(result.sourceType,'r2Approved');
 assert.equal(new Set(result.assetIds).size,4);
 const unavailable=suggestVerifiedVaultMontage(rows.slice(0,3),{goal:'calm'});
 assert.equal(unavailable.status,'unavailable');
 assert.equal(unavailable.fallback,'existing_local_montage');
});
test('R2 disabled by default; strict object keys; presigned GET is short-lived',()=>{
 assert.throws(()=>r2Config({}),/DISABLED/);
 assert.throws(()=>safeR2Key('https://evil.example.com/a.mp4'),/DENIED/);
 assert.throws(()=>safeR2Key('masters/../../photo.mp4'),/DENIED/);
 const keys=objectKeys('forest-golden-morning',hash);
 assert.equal(keys.master,'masters/forest-golden-morning/'+hash+'.mp4');
 const cfg={account:'0123456789abcdef0123456789abcdef',bucket:'hh-real-video-vault',
  accessKeyId:'TEST_READ_ONLY_ACCESS',secretAccessKey:'TEST_READ_ONLY_SECRET_ONLY'};
 const url=presignR2Get(cfg,keys.master,{seconds:1200});
 assert.match(url,/X-Amz-Expires=1200/);
 assert.match(url,/r2\.cloudflarestorage\.com/);
 assert.ok(!url.includes(cfg.secretAccessKey));
 assert.throws(()=>presignR2Get(cfg,keys.evidence),/DENIED/);
 assert.throws(()=>presignR2Get(cfg,keys.master,{seconds:86400}),/TTL/);
});
test('S3 client mock confirms HEAD, checksum and full byte readback; no real network request',async()=>{
 const bytes=Buffer.from('0000ftyp'+'.'.repeat(20000));
 const sha=createHash('sha256').update(bytes).digest('hex');
 const keys=objectKeys('forest-golden-morning',sha);
 const store=new Map();
 const fake=async(url,req)=>{
  const path=new URL(url).pathname;
  if(req.method==='PUT'){
   store.set(path,{bytes:Buffer.from(req.body),sha:req.headers['x-amz-meta-sha256'],
     contentType:req.headers['content-type']});
   return {ok:true,status:200,redirected:false,headers:new Headers()};
  }
  const item=store.get(path);
  if(!item)return {ok:false,status:404,redirected:false};
  const h=new Headers({'content-length':String(item.bytes.length),
   'content-type':item.contentType,'x-amz-meta-sha256':item.sha});
  return {ok:true,status:200,redirected:false,headers:h,
   arrayBuffer:async()=>item.bytes};
 };
 const cfg={account:'0123456789abcdef0123456789abcdef',bucket:'hh-real-video-vault',
  accessKeyId:'TEST_WRITE_ONLY_ACCESS',secretAccessKey:'TEST_WRITE_ONLY_SECRET_ONLY'};
 const client=createR2Client(cfg,{fetcher:fake,time:()=>new Date('2026-11-04T12:00:00Z')});
 await client.put(keys.master,bytes,{contentType:'video/mp4',checksum:sha});
 const head=await client.head(keys.master);
 assert.deepEqual({bytes:head.bytes,checksum:head.checksum}, {bytes:bytes.length,checksum:sha});
 assert.equal((await client.getVerified(keys.master,{expectedBytes:bytes.length,expectedSha256:sha})).sha256,sha);
 await assert.rejects(()=>client.getVerified(keys.master,{expectedBytes:bytes.length,
  expectedSha256:'f'.repeat(64)}),/READBACK_CHECKSUM/);
});
test('search/resolve rejects client URL injection, missing 4 shots and invalid IDs',async()=>{
 const search=validateVaultSearchParams(new URLSearchParams('goal=calm&motif=forest&limit=4'));
 assert.equal(search.limit,4);
 assert.throws(()=>validateVaultSearchParams(new URLSearchParams('goal=https%3A%2F%2Fexample.com')),/BAD_SEARCH/);
 const input={projectId:'personal-video-001',
  assetIds:['scene-a','scene-b','scene-c','scene-d']};
 assert.equal(validateVaultResolveInput(input).assetIds.length,4);
 assert.throws(()=>validateVaultResolveInput({...input,assetIds:['scene-a','scene-a','scene-b','scene-c']}),/INVALID_RESOLVE/);
 const rows=input.assetIds.map((id,i)=>validRow(id,String(i+1).repeat(64)));
 const r2={head:async key=>{const row=rows.find(r=>r.r2_object_key===key);
   return {bytes:row.file_bytes,contentType:'video/mp4',checksum:row.sha256};
  },presignGet:(key)=>'https://signed.example.com/'+key};
 const resolved=await resolveVaultFourShots(rows,input,{r2,bucket:'hh-real-video-vault'});
 assert.equal(resolved.assets.length,4);
 assert.equal(new Set(resolved.assets.map(x=>x.assetId)).size,4);
 assert.equal(publicVaultSearchResult(rows,{goal:'calm',limit:4},{signPoster:key=>key}).length,4);
 await assert.rejects(()=>resolveVaultFourShots(rows.slice(0,3),input,{r2,bucket:'hh-real-video-vault'}),/ASSET_UNAVAILABLE/);
 await assert.rejects(()=>resolveVaultFourShots(rows,input,{r2:{
  ...r2,head:async()=>({bytes:0,contentType:'text/plain',checksum:'bad'}),
 },bucket:'hh-real-video-vault'}),/R2_NOT_READY/);
});
test('SQL migration retains internal app schema, FORCE RLS and no client permissions',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261104235500_hh_video_vault_assets_v1.sql',import.meta.url),'utf8');
 assert.match(sql,/app\.video_vault_assets_v1/);
 assert.match(sql,/force row level security/i);
 assert.match(sql,/revoke all on app\.video_vault_assets_v1 from public,anon,authenticated/);
 assert.match(sql,/owner_review_status='approved'/);
 assert.doesNotMatch(sql,/public\.hh_meditation_catalog_v1|assessment_runs/);
});
test('existing Dareful importer remains intact and default CLI keeps old --import path',()=>{
 const importer=readFileSync(new URL('../scripts/import-scenario-video-batch.mjs',import.meta.url),'utf8');
 assert.match(importer,/importScenarioMediaBatch/);
 assert.match(importer,/--import/);
 assert.match(importer,/--target=r2/);
 const code=readFileSync(new URL('../scripts/video-vault-ingest.mjs',import.meta.url),'utf8');
 assert.match(code,/HOLD_COST/);
 assert.match(code,/MANUAL_RECONCILE_ONLY/);
 assert.doesNotMatch(code,/fetch\((?:'|")https?:\/\//);
});

test('NPS: only official public-domain archives and independently filmed videos',()=>{
 const a={...base,assetId:'nps-canyon-one',sourceProvider:'nps_grca',
  sourceAssetId:'nps-video-id-one',filmedMasterId:'nps-camera-master-one',
  originalSourcePage:'https://www.nps.gov/grca/learn/photosmultimedia/b-roll_hd10.htm',
  localFile:'nps-original.MTS',creator:'National Park Service',
  licenseId:'nps_public_domain_broll',
  licenseUrl:'https://www.nps.gov/grca/learn/photosmultimedia/b-roll_hd_index.htm',
  licenseEvidence:'Specific National Park Service B-roll movie is explicitly marked public domain.',
  exactClipLicenseConfirmed:true,identifiableSubjectsCleared:true};
 assert.equal(validateVaultAsset(a).sourceProvider,'nps_grca');
 const b={...a,assetId:'nps-canyon-two',sourceAssetId:'nps-video-id-two',
  filmedMasterId:'nps-camera-master-two'};
 assert.equal(validateVaultManifest({schemaVersion:'hh-video-vault-batch-v1',
  batchId:'nps-reviewed-pilot',milestone:20,assets:[a,b]}).assets.length,2);
 assert.equal(findVaultDuplicate(b,[{asset_id:a.assetId,source_provider:a.sourceProvider,
  source_asset_id:a.sourceAssetId,filmed_master_id:a.filmedMasterId,
  source_url:a.originalSourcePage}]),null);
 assert.throws(()=>validateVaultManifest({schemaVersion:'hh-video-vault-batch-v1',
  batchId:'nps-reviewed-pilot',milestone:20,
  assets:[a,{...b,filmedMasterId:a.filmedMasterId}]}),/DUPLICATE_MASTER/);
 assert.throws(()=>validateVaultAsset({...a,
  originalSourcePage:'https://www.nps.gov/saan/learn/photosmultimedia/videos.htm'}),/RIGHTS_EVIDENCE/);
 assert.throws(()=>validateVaultAsset({...a,
  originalSourcePage:'https://www.nps.gov/grca/learn/photosmultimedia/unsafe-video.htm'}),/RIGHTS_EVIDENCE/);
 assert.throws(()=>validateVaultAsset({...a,exactClipLicenseConfirmed:false}),/UNVERIFIED_RIGHTS/);
 assert.throws(()=>validateVaultAsset({...a,noRecognizablePeople:false,
  subjectReleaseStatus:'unknown'}),/RELEASE_MISSING/);
});

test('free nature CC0 can enter existing private vault contract only with exact individual rights and curator signoff',()=>{
 const fn={
  ...base,sourceProvider:'free_nature_stock',sourceAssetId:'red-sunset',
  originalSourcePage:'https://freenaturestock.com/video/red-sunset/',
  creator:'Free Nature Stock',licenseId:'cc0_1_0',
  licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',
  licenseEvidence:'Official source page and CC0 rights checked for this specific video.',
  exactClipLicenseConfirmed:true,identifiableSubjectsCleared:true,
  attributionText:'',deliveryPolicy:'client_raw_allowed',rawClientDeliveryApproved:true,
 };
 assert.equal(validateVaultAsset(fn).sourceProvider,'free_nature_stock');
 assert.throws(()=>validateVaultAsset({...fn,ownerApproved:false}),/HUMAN_CURATOR/);
 assert.throws(()=>validateVaultAsset({...fn,noRecognizablePeople:false,
  subjectReleaseStatus:'unknown'}),/RELEASE/);
 assert.throws(()=>validateVaultAsset({...fn,originalSourcePage:'https://freenaturestock.com/videos/'}),/RIGHTS_EVIDENCE_MISSING|STOCK_UNTRUSTED_SOURCE_PAGE/);
 assert.throws(()=>validateVaultAsset({...fn,licenseId:'cc_by_4_0'}),/STOCK_LICENSE/);
 assert.throws(()=>validateVaultAsset({...fn,sourceProvider:'coverr',originalSourcePage:'https://coverr.co/videos/sample'}),/RIGHTS_EVIDENCE_MISSING|STOCK_LICENSE/);
});
