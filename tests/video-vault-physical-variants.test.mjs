import test from 'node:test';
import assert from 'node:assert/strict';
import {auditPrivatePhysicalRegistry,isVaultVariantEligible,selectAspectVaultShots}
 from '../lib/video-vault/physical-variants.mjs';
const sha=x=>x.repeat(64);
const now=new Date().toISOString();
const master=(id,hash,aspect='landscape')=>({
 asset_id:id,filmed_master_id:'film-'+id,source_provider:'first_party',
 source_asset_id:id,type:'real_footage',status:'generator_eligible',
 owner_review_status:'approved',visual_review_score:5,
 commercial_use_ok:true,derivative_edit_ok:true,raw_client_delivery_ok:true,
 subject_release_status:'not_applicable',aspect_ratio:aspect,category:'nature',pace:'slow',
 goals:['calm'],motifs:['sun'],tags:['sunlight'],duration_ms:5000,
 codec:'h264',width:1920,height:1080,file_bytes:80000,sha256:sha(hash),
 r2_readback_sha256:sha(hash),r2_bucket:'private-video-vault',
 r2_object_key:'masters/'+id+'/'+sha(hash)+'.mp4',
 poster_object_key:'posters/'+id+'/'+sha(hash)+'.jpg',
 technical_verified_at:now,r2_head_checked_at:now
});
const variant=(a,hash,i=1)=>({
 variant_id:a+'-portrait-'+i,master_asset_id:a,take_index:i,aspect_ratio:'portrait',
 width:1080,height:1920,codec:'h264',fps:24,duration_ms:5000,file_bytes:80000,
 sha256:sha(hash),r2_readback_sha256:sha(hash),r2_bucket:'private-video-vault',
 r2_object_key:'masters/'+a+'-portrait-'+i+'/'+sha(hash)+'.mp4',
 poster_object_key:'posters/'+a+'-portrait-'+i+'/'+sha(hash)+'.jpg',
 owner_review_status:'approved',visual_review_score:4,raw_client_delivery_ok:true,
 human_reviewer:'owner curator',owner_approved_at:now,
 technical_verified_at:now,r2_head_checked_at:now,status:'generator_eligible'
});
const fixture=()=>({sourceOriginals:2,physicalMP4:3,entries:[
 {id:'sun-one',provider:'dareful',sourceCameraMasterId:'sun-one',
  sourcePage:'https://dareful.com/sun-one/',rightsAndArtApproved:false,
  clientRawDeliveryVerified:false,cloudflareR2UploadVerified:false,generatorEligible:false,
  files:[{aspect:'landscape',sha256:sha('a'),bytes:90000,width:1280,height:720,durationSeconds:5,fps:24,archiveMember:'sun-one-landscape.mp4'},
   {aspect:'portrait',sha256:sha('b'),bytes:95000,width:720,height:1280,durationSeconds:5,fps:24,archiveMember:'sun-one-portrait.mp4'}]},
 {id:'sun-two',provider:'dareful',sourceCameraMasterId:'sun-two',
  sourcePage:'https://dareful.com/sun-two/',rightsAndArtApproved:false,
  clientRawDeliveryVerified:false,cloudflareR2UploadVerified:false,generatorEligible:false,
  files:[{aspect:'landscape',sha256:sha('c'),bytes:93000,width:1280,height:720,durationSeconds:5,fps:24,archiveMember:'sun-two-landscape.mp4'}]},
]});
test('operator registry 2 originals and 3 aspect edits: never 3 physical source originals',()=>{
 const r=auditPrivatePhysicalRegistry(fixture());
 assert.equal(r.valid,true);assert.equal(r.structurallyValidFilmedSourceIds,2);
 assert.equal(r.acceptedMP4VariantMetadata,3);
 assert.equal(r.aspectCounts.landscape,2);assert.equal(r.aspectCounts.portrait,1);
 assert.equal(r.rightsOrDeliveryStillHeld,2);assert.equal(r.r2OrGeneratorStillHeld,2);
 assert.equal(r.generatorEligibleFromThisRegistry,0);
 assert.equal(r.independentCameraTakesIndependentlyAttested,false);
});
test('registry normalizes only exact ffprobe 24/1 to 24fps, but never 25 or unknown',()=>{
 const film=fixture();
 film.entries[0].files[0].fps='24/1';
 film.entries[1].files[0].fps='24/1';
 assert.equal(auditPrivatePhysicalRegistry(film).valid,true);
 for(const fps of ['24/0','23.976','25/1','24.0',25,null]){
  const invalid=fixture();invalid.entries[0].files[0].fps=fps;
  assert.equal(auditPrivatePhysicalRegistry(invalid).valid,false,String(fps));
 }
});
test('reject same physical file hash in different aspect variants',()=>{
 const x=fixture();x.entries[1].files[0].sha256=sha('b');
 assert.equal(auditPrivatePhysicalRegistry(x).valid,false);
});
test('rejected fake portrait shape, unsafe archive path and header count',()=>{
 for(const change of [
  x=>{x.entries[0].files[1].height=720},
  x=>{x.entries[0].files[1].archiveMember='../secret.mp4'},
  x=>{x.physicalMP4=4},
 ]){const x=fixture();change(x);assert.equal(auditPrivatePhysicalRegistry(x).valid,false)}
});
test('unapproved, not-deliverable and wrong-identity variants never become generator eligible',()=>{
 const m=master('scene-a','a'),v=variant('scene-a','b');
 assert.equal(isVaultVariantEligible(v,m),true);
 for(const patch of [
  {master_asset_id:'scene-b'},{status:'pending'},{owner_review_status:'pending'},
  {raw_client_delivery_ok:false},{r2_readback_sha256:sha('c')},
  {r2_bucket:'wrong-bucket'},{width:1280},{fps:15},
  {variant_id:'../../escape'},{file_bytes:20000000},
  {human_reviewer:''},{owner_approved_at:null},
  {r2_object_key:'masters/wrong/'+sha('b')+'.mp4'},
  {sha256:sha('a'),r2_readback_sha256:sha('a')}
 ])assert.equal(isVaultVariantEligible({...v,...patch},m),false);
 assert.equal(isVaultVariantEligible(v,{...m,raw_client_delivery_ok:false}),false);
});
test('four-way montage selects 4 distinct approved filmed masters not 4 crops of one',()=>{
 const m=['a','b','c','d'].map((a,i)=>master('scene-'+a,String(i+1)));
 const v=m.flatMap((row,i)=>[
  variant(row.asset_id,String(i+5),1),
  variant(row.asset_id,['9','a','b','c'][i],2)
 ]);
 const result=selectAspectVaultShots(m,v,{aspect:'portrait',goal:'calm',limit:4});
 assert.equal(result.length,4);
 assert.equal(new Set(result.map(x=>x.filmed_master_id)).size,4);
 assert.ok(result.every(x=>x.aspect_ratio==='portrait'&&x.variant_id));
 assert.deepEqual(selectAspectVaultShots(m.slice(0,3),v,{aspect:'portrait',limit:4}).length,3);
 assert.equal(selectAspectVaultShots(m,v,{aspect:'square'}).length,0);
});
test('unverified child stays invisible even when parent master is ready',()=>{
 const m=[master('scene-a','a')];const v=[variant('scene-a','b')];
 assert.equal(selectAspectVaultShots(m,[{...v[0],r2_head_checked_at:null}],{aspect:'portrait'}).length,0);
 assert.equal(selectAspectVaultShots(m,v,{aspect:'portrait'}).length,1);
});

test('variant SQL is private, keeps parent uniqueness, force RLS and denies public clients',async()=>{
 const {readFileSync}=await import('node:fs');
 const sql=readFileSync(new URL('../supabase/migrations/20261106220000_hh_video_vault_variants_v1.sql',import.meta.url),'utf8');
 assert.match(sql,/references app\.video_vault_assets_v1\(asset_id\)/i);
 assert.match(sql,/force row level security/i);
 assert.match(sql,/revoke all on app\.video_vault_variants_v1 from public,anon,authenticated/i);
 assert.match(sql,/create policy hh_video_vault_variant_operator_insert/i);
 assert.match(sql,/current_setting\('hh\.video_vault_ingest',true\)='approved'/i);
 assert.match(sql,/raw_client_delivery_ok/i);
 assert.match(sql,/r2_readback_sha256/i);
 assert.match(sql,/m\.r2_bucket=video_vault_variants_v1\.r2_bucket/i);
 assert.match(sql,/owner_approved_at is not null/i);
 assert.match(sql,/r2_object_key='masters\/'/i);
 assert.doesNotMatch(sql,/grant .*\bto (anon|authenticated)\b/i);
});
