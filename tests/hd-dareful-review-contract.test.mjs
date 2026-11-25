import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateCandidateManifest} from "../scripts/preview-dareful-candidates.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const waves=[
 "data/video-catalog/dareful-verified-candidate-wave-20261101.json",
 "data/video-catalog/dareful-verified-candidate-wave2-20261101.json",
 "data/video-catalog/dareful-verified-candidate-wave3-20261103.json",
].map(name=>JSON.parse(read(name)));
test("16 actual individually attributed source candidates remain unapproved",()=>{
 const ids=new Set(),pages=new Set(),streams=new Set();
 assert.equal(waves.flatMap(w=>w.sources).length,16);
 for(const wave of waves){
  assert.equal(validateCandidateManifest(wave),true);
  assert.equal(wave.approvedForPublication,false);
  assert.equal(wave.licenseUrl,"https://creativecommons.org/licenses/by/4.0/");
  for(const s of wave.sources){
   assert.equal(s.sourcePage,"https://dareful.com/"+s.id+"/");
   assert.match(s.mediaUrl,/^https:\/\/stream\.mux\.com\/[A-Za-z0-9]+\.m3u8$/);
   assert.equal(s.visualReviewRequired,true);
   assert.equal(ids.has(s.id),false);ids.add(s.id);
   assert.equal(pages.has(s.sourcePage),false);pages.add(s.sourcePage);
   assert.equal(streams.has(s.mediaUrl),false);streams.add(s.mediaUrl);
  }
 }
});
test("quality screen uses physically decoded 720p24 MP4 and never marks approval or writes public files",()=>{
 const src=read("scripts/review-dareful-hd-footage-20261104.mjs");
 assert.match(src,/fps=24,scale=720:1280/);
 assert.match(src,/video\.width!==720\|\|video\.height!==1280/);
 assert.match(src,/technical_codec_duration_or_size_rejected/);
 assert.match(src,/minMean>=27&&maxMean<=230/);
 assert.match(src,/autoQualityPass/);
 assert.match(src,/perceptualDuplicate/);
 assert.match(src,/publicationStatus:"ALL_UNAPPROVED_REVIEW_ONLY"/);
 assert.match(src,/readyForPublication:false/);
 assert.match(src,/editorialApproval:false/);
 assert.match(src,/sourceRightsCaveat/);
 assert.doesNotMatch(src,/importFreeStockScene|importScenarioMediaBatch|sceneTaxonomy\.scenes\.push|public\/videos\/holistic-house\/film-collection-v3/);
});
