import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {auditVideoCatalog} from '../scripts/video-catalog-probe.mjs';
import {inspectVerifiedVideoAsset,resolveVerifiedVideoPreset,VERIFIED_ASSETS_SCHEMA} from '../lib/mandala/verified-asset-resolver.mjs';

const id='golden-rain', collection='money-films-v1';
const video='/videos/holistic-house/'+collection+'/'+id+'.mp4';
const poster='/videos/holistic-house/'+collection+'/'+id+'.jpg';
const sha='a'.repeat(64);
const meta={codec:'h264',pixFmt:'yuv420p',width:720,height:1280,fps:24,
  durationSeconds:5,hasAudio:false};
const scene={id,video,poster,media:'licensed_mp4',status:'approved',
  rightsReference:{kind:'existing_approved_first_party_master'}};
const fixture=async()=>{
  const root=await mkdtemp(join(tmpdir(),'hh-video-asset-'));
  const dir=join(root,'public','videos','holistic-house',collection);
  await mkdir(dir,{recursive:true});
  const bytes=Buffer.alloc(17000);bytes.write('ftyp',4,'ascii');
  await writeFile(join(dir,id+'.mp4'),bytes);
  await writeFile(join(dir,id+'.jpg'),Buffer.alloc(1200));
  const catalog={version:'fixture',count:1,scenes:[scene]};
  const manifests={[collection]:[{id,video,poster,bytes:17000,
    width:720,height:1280,fps:24,durationSeconds:5}]};
  return {root,catalog,manifests};
};
const run=(fixture,settings={})=>auditVideoCatalog({...fixture,
  probe:()=>({...meta,...settings.probe}),decode:()=>settings.decode??true,
  hash:async()=>settings.hash??sha});

test('the verified report is honest about collection-level rights',async()=>{
  const f=await fixture();
  try{
    const r=await run(f);
    assert.equal(r.schemaVersion,VERIFIED_ASSETS_SCHEMA);
    assert.equal(r.status,'pass');
    assert.equal(r.counts.technicalReady,1);
    assert.equal(r.counts.collectionRightsReview,1);
    assert.equal(r.assets[0].rightsScope,'collection_only');
    assert.equal(inspectVerifiedVideoAsset(scene,r).status,'technical_ready');
    assert.equal(inspectVerifiedVideoAsset(scene,r).rightsReviewRequired,true);
  }finally{await rm(f.root,{recursive:true,force:true});}
});

test('checks actual bytes, expected checksum and independently decoded frame',async()=>{
  const f=await fixture();
  try{
    let r=await run(f,{decode:false});
    assert.equal(r.status,'fail');assert.equal(r.assets[0].reason,'FRAME_DECODE_FAILED');
    r=await run(f,{probe:{codec:'hevc'}});
    assert.equal(r.assets[0].reason,'MEDIA_PROBE_INVALID');
    r=await run(f,{probe:{durationSeconds:9}});
    assert.equal(r.assets[0].reason,'EXPECTED_DURATION_MISMATCH');
    f.manifests[collection][0].sha256=sha;
    r=await run(f,{hash:'b'.repeat(64)});
    assert.equal(r.assets[0].reason,'SOURCE_SHA256_MISMATCH');
    f.manifests[collection][0].sha256=undefined;
    f.manifests[collection][0].bytes+=1;
    r=await run(f);
    assert.equal(r.assets[0].reason,'EXPECTED_BYTES_MISMATCH');
  }finally{await rm(f.root,{recursive:true,force:true});}
});

test('rejects hallucinated paths, duplicate IDs and unapproved scenes',async()=>{
  const f=await fixture();
  try{
    f.catalog.scenes[0]={...scene,video:'/videos/holistic-house/../private.mp4'};
    assert.equal((await run(f)).assets[0].reason,'UNAPPROVED_OR_DUPLICATE_SCENE');
    f.catalog.scenes[0]=scene;
    f.catalog.count=2;
    f.catalog.scenes.push({...scene});
    const r=await run(f);
    assert.equal(r.status,'fail');
    assert.equal(r.assets[1].reason,'UNAPPROVED_OR_DUPLICATE_SCENE');
    assert.equal(inspectVerifiedVideoAsset({...scene,status:'pending'},r).status,'rejected');
  }finally{await rm(f.root,{recursive:true,force:true});}
});

test('Dareful requires per-scene CC BY 4.0 attribution and a matching hash',async()=>{
  const f=await fixture();
  try{
    const s={...scene,rightsReference:{kind:'dareful_cc_by_4_0',attribution:'Joel Holland / CC BY 4.0'}};
    f.catalog.scenes=[s];
    f.manifests[collection][0].sources=[
      {licenseId:'cc_by_4_0',sourcePage:'https://dareful.com/foo/'},
      {licenseId:'cc_by_4_0',sourcePage:'https://dareful.com/bar/'}];
    const r=await run(f);
    assert.equal(r.status,'pass');
    assert.equal(r.counts.individualAttributionRecords,1);
    assert.equal(inspectVerifiedVideoAsset(s,r).rightsReviewRequired,false);
    f.catalog.scenes=[{...s,rightsReference:{kind:'dareful_cc_by_4_0'}}];
    assert.equal((await run(f)).assets[0].reason,'INDIVIDUAL_RIGHTS_EVIDENCE');
  }finally{await rm(f.root,{recursive:true,force:true});}
});

test('resolver fails closed for missing evidence and tampered scene identity',async()=>{
  const f=await fixture();
  try{
    const r=await run(f);
    assert.equal(inspectVerifiedVideoAsset(scene,null).status,'unverified');
    assert.equal(inspectVerifiedVideoAsset({...scene,id:'new-unlicensed-clip'},r).status,'rejected');
    assert.equal(inspectVerifiedVideoAsset(scene,{...r,assets:[r.assets[0],r.assets[0]]}).status,'unverified');
    assert.equal(inspectVerifiedVideoAsset(scene,{...r,assets:[{...r.assets[0],path:'/bad.mp4'}]}).status,'rejected');
    const preset={id:'four-shots',clips:['a','b','c','d']};
    assert.deepEqual(resolveVerifiedVideoPreset(preset,[scene],r).missingSceneIds,preset.clips);
    assert.equal(resolveVerifiedVideoPreset({...preset,clips:['a','a','c','d']},[scene],r).status,'rejected');
  }finally{await rm(f.root,{recursive:true,force:true});}
});

test('one licensed edited source is accepted, two-shot masquerades and duplicate source pages fail closed',async()=>{
  const f=await fixture();
  try{
    f.catalog.scenes=[{...scene,rightsReference:{
      kind:'dareful_cc_by_4_0',attribution:'Joel Holland / Dareful / CC BY 4.0 / adapted',
    }}];
    const first={licenseId:'cc_by_4_0',sourcePage:'https://dareful.com/sunrise-forest/'};
    const master=f.manifests[collection][0];
    master.sourceKind='licensed_single_shot_edit';
    master.sources=[first];
    let result=await run(f);
    assert.equal(result.status,'pass');
    assert.equal(result.counts.individualAttributionRecords,1);

    master.sourceKind='licensed_two_shot_composite';
    assert.equal((await run(f)).assets[0].reason,'INDIVIDUAL_RIGHTS_EVIDENCE');
    master.sources=[first,{...first}];
    assert.equal((await run(f)).assets[0].reason,'INDIVIDUAL_RIGHTS_EVIDENCE');

    master.sources=[first,{licenseId:'cc_by_4_0',sourcePage:'https://dareful.com/sunset-coast/'}];
    assert.equal((await run(f)).status,'pass');
    master.sources[1].sourcePage='https://untrusted.example.com/sunset-coast/';
    assert.equal((await run(f)).assets[0].reason,'INDIVIDUAL_RIGHTS_EVIDENCE');
  }finally{await rm(f.root,{recursive:true,force:true});}
});
