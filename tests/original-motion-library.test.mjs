import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,statSync} from "node:fs";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {resolve,dirname} from "node:path";
import {isApprovedMontageScene,validateMontageClips,montageReplacementOptions} from "../lib/mandala/video-montage-sources.mjs";
import {compileVerifiedRenderPlanV2} from "../lib/mandala/render-plan-v2.mjs";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const source=JSON.parse(readFileSync(resolve(root,"data/video-catalog/original-motion-scenes-v1.json"),"utf8"));
const fixture=id=>({
  id,theme:"health",collection:"original-motion-v1",status:"approved",
  media:"original_motion_mp4",
  visualOrigin:"original_procedural_non_photographic",
  sha256:"a".repeat(64),
  video:"/videos/holistic-house/original-motion-v1/"+id+".mp4",
  poster:"/videos/holistic-house/original-motion-v1/"+id+".jpg",
  motifs:["flowers","light"],tags:["meditation","light"],pace:"slow",
  rightsReference:{kind:"project_generated_original",creator:"Holistic House"},
});
test("original animation must never be accepted as licensed stock or arbitrary external URLs",()=>{
 const row=fixture("motion-stress-recovery-stress-relief-v1");
 assert.equal(isApprovedMontageScene(row),true);
 assert.equal(isApprovedMontageScene({...row,sha256:"bad"}),false);
 assert.equal(isApprovedMontageScene({...row,media:"licensed_mp4"}),false);
 assert.equal(isApprovedMontageScene({...row,visualOrigin:"stock_photography"}),false);
 assert.equal(isApprovedMontageScene({...row,rightsReference:{kind:"dareful_cc_by_4_0"}}),false);
 assert.equal(isApprovedMontageScene({...row,video:"https://example.com/video.mp4"}),false);
});
test("four different project-original moving MP4s are allowed by the same protected renderer",()=>{
 const scenes=[1,2,3,4,5].map(i=>fixture("motion-stress-recovery-stress-relief-v"+i));
 const ids=scenes.slice(0,4).map(s=>s.id);
 assert.equal(validateMontageClips(ids,scenes),true);
 assert.equal(validateMontageClips([ids[0],ids[0],ids[2],ids[3]],scenes),false);
 assert.equal(montageReplacementOptions({scenes,currentId:ids[0],selectedIds:ids}).length,1);
 const script={
    version:"hh-executable-video-scenario-v1",readyToExecute:true,
    paidRenderApproved:false,noExternalClientData:true,presetId:"motion-film-stress-relief",
    durationSeconds:20,aspect:"portrait",rendering:{quality:"hd"},
    audio:{kind:"silent",trackId:"none",volumePercent:0},edit:{excludedMotifs:[]},
    shots:ids.map((id,i)=>({sceneId:id,assetPath:scenes[i].video,startSeconds:i*5,durationSeconds:5,captionText:""})),
 };
 const plan=compileVerifiedRenderPlanV2({scenario:script,scenes});
 assert.equal(plan.shots.length,4);
 assert.ok(plan.rightsProof.every(r=>r.rightsKind==="project_generated_original"));
});
test("production abstract motion library contains 320 individually encoded H264 source records",()=>{
 // Fail closed: CI must never release an empty placeholder, partial library,
 // or an editorial-only record pretending to be 320 real encoded MP4s.
 assert.notEqual(source.status,"awaiting_one_time_encoded_media");
 assert.equal(source.status,"generated_and_technical_verified");
 assert.equal(source.count,320);
 assert.equal(source.scenes.length,320);
 assert.equal(source.presets.length,64);
 assert.equal(new Set(source.scenes.map(s=>s.id)).size,320);
 assert.equal(new Set(source.scenes.map(s=>s.sha256)).size,320);
 for(const scene of source.scenes){
    assert.equal(isApprovedMontageScene(scene),true);
    assert.equal(scene.visualOrigin,"original_procedural_non_photographic");
    assert.equal(scene.rightsReference.thirdPartyFootage,false);
    const movie=resolve(root,"public"+scene.video);
    const poster=resolve(root,"public"+scene.poster);
    assert.ok(statSync(movie).size>10000);
    assert.ok(statSync(poster).size>1000);
    assert.equal(statSync(movie).size,scene.bytes,"MP4 byte count must match published manifest");
    assert.equal(createHash("sha256").update(readFileSync(movie)).digest("hex"),
      scene.sha256,"Each published master must have a matching physical SHA-256");
 }
 for(const preset of source.presets){
   assert.equal(preset.clips.length,4);
   assert.equal(new Set(preset.clips).size,4);
   assert.equal(validateMontageClips(preset.clips,source.scenes),true);
 }
});
