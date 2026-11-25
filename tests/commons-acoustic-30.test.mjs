import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import queue from "../data/video-catalog/commons-acoustic-30-review-20261115.json" with {type:"json"};
import {validateAcoustic30,auditAcoustic30,recordingLicense,
  safeOriginalUrl,commonsMetadata} from "../scripts/stage-commons-acoustic-30.mjs";

const source=fileURLToPath(new URL("../scripts/stage-commons-acoustic-30.mjs",import.meta.url));
const approved=validateAcoustic30(queue);

test("curation uses independently listed real high-quality originals, not low-bitrate copies",()=>{
 const rows=new Map(queue.candidates.map(x=>[x.id,x]));
 assert.equal(rows.get("curated-bach-goldberg-aria").fileName,"Goldberg Variations 01 Aria.ogg");
 for(const id of ["curated-chopin-nocturne-15-2","curated-chopin-nocturne-55-2",
   "curated-chopin-cello-sonata-largo","curated-chopin-etude-tristesse"]){
   const row=rows.get(id);
   assert.ok(row?.sourcePageStatus?.includes("official_commons_category"));
   assert.ok(row.fileName.endsWith(".flac"));
 }
 assert.ok(new Set(queue.candidates.map(row=>row.performer)).size>=7);
 assert.ok(queue.candidates.every(row=>row.generatorEligible===false));
});
test("30 genuinely distinct composition/performance candidate pages, never synthetic generators",()=>{
 assert.equal(approved.length,30);
 assert.equal(new Set(approved.map(r=>r.id)).size,30);
 assert.equal(new Set(approved.map(r=>r.fileName)).size,30);
 assert.ok(approved.every(r=>r.sourcePage.startsWith("https://commons.wikimedia.org/wiki/File:")));
 assert.ok(approved.every(r=>r.generatorEligible===false));
 assert.ok(approved.every(r=>r.musicalEditorialStatus==="pending_human_audition"));
 assert.ok(approved.every(r=>r.recordingRights==="VERIFY_COMMONS_CC0_OR_PDM"));
 assert.ok(approved.every(r=>r.compositionRights==="public_domain"));
 assert.ok(approved.every(r=>r.instrument==="piano"||r.instrument==="cello"));
 assert.ok(new Set(approved.map(r=>r.performer)).size>=5);
});

test("all existing studio goal and emotional categories covered without repeated tracks",()=>{
 const data=auditAcoustic30(queue);
 assert.equal(data.sourceCandidates,30);
 assert.equal(data.actualFilesPublishedByThisScript,0);
 assert.equal(data.publicEligibleByThisScript,0);
 for(const cat of ["body","business","energy","love","stress"])
  assert.ok(data.categories[cat]>=4,cat);
 assert.deepEqual(data.instruments.sort(),["cello","piano"]);
});

test("source URL strict pinning and guest-safe audio file license verification",()=>{
 assert.equal(safeOriginalUrl("https://upload.wikimedia.org/wikipedia/commons/b/b7/Gymnopedie_No._1..ogg"),
  "https://upload.wikimedia.org/wikipedia/commons/b/b7/Gymnopedie_No._1..ogg");
 for(const value of [
  "https://evil.example/clip.ogg",
  "http://upload.wikimedia.org/wikipedia/commons/1/x.ogg",
  "https://upload.wikimedia.org@evil.example/wikipedia/commons/1/x.ogg",
  "https://upload.wikimedia.org/wikipedia/commons/../private/x.ogg",
  "https://upload.wikimedia.org/wikipedia/commons/x.ogg?token=test"
 ])assert.throws(()=>safeOriginalUrl(value),/HH_ACOUSTIC_/);
 assert.equal(recordingLicense({extmetadata:{
  LicenseShortName:{value:"CC0 1.0"},
  LicenseUrl:{value:"https://creativecommons.org/publicdomain/zero/1.0/"}
 }}).id,"CC0-1.0");
 assert.equal(recordingLicense({extmetadata:{
  LicenseShortName:{value:"Public domain"},
  LicenseUrl:{value:"https://creativecommons.org/publicdomain/mark/1.0/"}
 }}).id,"PDM-1.0");
 for(const attrs of [
  {LicenseShortName:{value:"CC BY-NC 4.0"}},
  {LicenseShortName:{value:"CC BY-SA 4.0"}},
  {LicenseShortName:{value:"Public domain"}}
 ])assert.throws(()=>recordingLicense({extmetadata:attrs}),/NOT_CC0_OR_VERIFIED_PDM/);
});

test("Wikimedia API metadata must resolve the exact original and CC0 recording",async()=>{
 const row=approved[0],original="https://upload.wikimedia.org/wikipedia/commons/a/aa/Aria.ogg";
 let calls=0;
 const fetchFn=async(request,options)=>{
  calls++;
  assert.equal(new URL(request).hostname,"commons.wikimedia.org");
  assert.equal(new URL(request).searchParams.get("titles"),"File:"+row.fileName);
  assert.equal(options.redirect,"error");
  return {ok:true,json:async()=>({query:{pages:{"100":{imageinfo:[{
   url:original,size:2200000,sha1:"a".repeat(40),mime:"application/ogg",
   extmetadata:{LicenseShortName:{value:"CC0 1.0"},
   LicenseUrl:{value:"https://creativecommons.org/publicdomain/zero/1.0/"}}
  }]}}}})};
 };
 const metadata=await commonsMetadata(row,{fetchFn});
 assert.equal(calls,1);
 assert.equal(metadata.url,original);
 assert.equal(metadata.sha1,"a".repeat(40));
 assert.equal(metadata.license.id,"CC0-1.0");
 const bad=async()=>({ok:true,json:async()=>({query:{pages:{"-1":{missing:""}}}})});
 await assert.rejects(()=>commonsMetadata(row,{fetchFn:bad}),/MISSING_ORIGINAL/);
});

test("offline CLI audit never downloads, publishes or claims approved audio",()=>{
 const run=spawnSync(process.execPath,[source,"--audit"],{
  encoding:"utf8",timeout:10000});
 assert.equal(run.status,0,run.stderr);
 const status=JSON.parse(run.stdout);
 assert.equal(status.sourceCandidates,30);
 assert.equal(status.publicEligibleByThisScript,0);
 assert.match(status.status,/PENDING_RIGHTS/);
 const forged={...queue,candidates:queue.candidates.map(x=>({...x}))};
 forged.candidates[0].generatorEligible=true;
 assert.throws(()=>validateAcoustic30(forged),/INVALID_ENTRY/);
 const repeated={...queue,candidates:[...queue.candidates]};
 repeated.candidates[29]={...repeated.candidates[0]};
 assert.throws(()=>validateAcoustic30(repeated),/INVALID_ENTRY/);
});
