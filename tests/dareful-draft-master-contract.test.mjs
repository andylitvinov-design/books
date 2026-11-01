import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateDraftMediaSource} from "../scripts/render-dareful-candidate-masters.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const manifest=JSON.parse(read("data/video-catalog/dareful-verified-candidate-wave-20261101.json"));
test("four source-backed draft videos cannot be published or use untrusted hosts",()=>{
 assert.equal(manifest.approvedForPublication,false);
 for(const source of manifest.sources){
   assert.equal(validateDraftMediaSource(source,manifest),true);
   assert.throws(()=>validateDraftMediaSource({...source,mediaUrl:"https://localhost/video.m3u8"},manifest));
   assert.throws(()=>validateDraftMediaSource({...source,sourcePage:"https://other.example/video"},manifest));
   assert.throws(()=>validateDraftMediaSource(source,{...manifest,approvedForPublication:true}));
 }
});
test("draft renderer emits real H264 motion and editorial-only artifacts",()=>{
 const src=read("scripts/render-dareful-candidate-masters.mjs");
 assert.match(src,/verifyMp4\(mp4\)/);
 assert.match(src,/static_or_repeated_frames_are_not_unique_footage/);
 assert.match(src,/DRAFT_REAL_MOVING_VIDEO_NOT_PUBLISHED/);
 assert.match(src,/libx264/);
 assert.doesNotMatch(src,/public\/videos\/holistic-house\/film-collection-v3|importFreeStockScene|git push|update_ref/);
});
