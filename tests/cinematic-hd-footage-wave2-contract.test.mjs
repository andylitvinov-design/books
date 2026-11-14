import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const file=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const wave=JSON.parse(file("data/video-catalog/dareful-cinematic-hd-candidates-wave2-20261105.json"));
const previous=["dareful-verified-candidate-wave-20261101.json","dareful-verified-candidate-wave2-20261101.json",
  "dareful-verified-candidate-wave3-20261103.json"].flatMap(name=>
    JSON.parse(file("data/video-catalog/"+name)).sources);
const released=JSON.parse(file("data/video-catalog/free-stock-scenes.json")).flatMap(s=>s.sources);
test("25 genuine new third-party source records never count as 25 live first-party MP4s",()=>{
 assert.equal(wave.schemaVersion,"hh-dareful-cinematic-wave2-v1");
 assert.equal(wave.sourceCount,25);
 assert.equal(wave.sources.length,25);
 assert.equal(wave.approvedForPublication,false);
 assert.equal(wave.requiresIndividualOwnerApproval,true);
 assert.equal(wave.noPaidServices,true);
 const used=new Set([...previous,...released].map(s=>s.sourcePage));
 const urls=new Set(),ids=new Set(),streams=new Set();
 for(const s of wave.sources){
   assert.match(s.id,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
   assert.match(s.sourcePage,/^https:\/\/dareful\.com\/[a-z0-9-]+\/$/);
   assert.match(s.mediaUrl,/^https:\/\/stream\.mux\.com\/[A-Za-z0-9]+\.m3u8$/);
   assert.equal(s.licenseUrl,"https://creativecommons.org/licenses/by/4.0/");
   assert.equal(s.licenseId,"cc_by_4_0");
   assert.equal(s.creator,"Joel Holland");
   assert.equal(s.approvedForPublication,false);
   assert.equal(s.visualReviewRequired,true);
   assert.equal(s.individualRightsReviewRequired,true);
   assert.ok(Number(s.durationSeconds)>=8);
   assert.equal(used.has(s.sourcePage),false,"never reuse an already published or reviewed filmed source");
   assert.equal(urls.has(s.sourcePage),false);
   assert.equal(ids.has(s.id),false);
   assert.equal(streams.has(s.mediaUrl),false);
   for(const lang of ["ru","en","es"])assert.ok(s.suggestedNames?.[lang]?.trim());
   assert.ok(s.visualTags?.length>=2);
   urls.add(s.sourcePage);ids.add(s.id);streams.add(s.mediaUrl);
 }
});
test("one-time video review yields two real H264 MP4 aspect edits, mandatory technical checks, no public writes",()=>{
 const src=file("scripts/review-dareful-cinematic-wave2-20261105.mjs");
 assert.match(src,/const landscape=join\(output,source\.id\+"-landscape\.mp4"\)/);
 assert.match(src,/const mp4=join\(output,source\.id\+"\.mp4"\)/);
 assert.match(src,/fps=24,scale=1280:720/);
 assert.match(src,/fps=24,scale=720:1280/);
 assert.match(src,/technical_codec_duration_or_size_rejected/);
 assert.match(src,/perceptualDuplicate/);
 assert.match(src,/editorialApproval:false/);
 assert.match(src,/readyForPublication:false/);
 assert.match(src,/notNativePortraitHD:true/);
 assert.match(src,/artifacts\/cinematic-dareful-wave2-20261105/);
 assert.match(src,/HH_CINEMATIC_RETRY_ZERO/);
 assert.match(src,/retryIds=new Set/);
 assert.match(src,/cinematic-dareful-wave2-retry-20261105/);
 assert.doesNotMatch(src,/writeFileSync\([^\n]*public\//);
});
