import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,statSync} from "node:fs";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {resolve,dirname} from "node:path";
import {isApprovedMontageScene,validateMontageClips,montageReplacementOptions} from "../lib/mandala/video-montage-sources.mjs";
import {compileVerifiedRenderPlanV2} from "../lib/mandala/render-plan-v2.mjs";
import {recommendAutoVideo} from "../lib/mandala/auto-video-director.mjs";

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

test("Auto Video Director can propose a real four-clip original motion preset without pretending it is stock",()=>{
 const scenes=[1,2,3,4,5].map(i=>fixture("motion-stress-recovery-stress-relief-v"+i));
 const preset={id:"motion-film-stress-relief",theme:"health",
   clips:scenes.slice(0,4).map(s=>s.id),
   sourceKind:"original_abstract_motion"};
 const plan=recommendAutoVideo({
   goal:"Я хочу спокойствия",locale:"ru",preferredTheme:"health",
   presets:[preset],scenes
 });
 assert.equal(plan.kind,"existing_mp4_compilation");
 assert.equal(plan.presetId,preset.id);
 assert.deepEqual(plan.sourceClipIds,preset.clips);
 assert.equal(plan.paidRenderApproved,false);
 assert.equal(plan.noExternalClientData,true);
});
test("production original-motion library contains 684 real MP4s with immutable hash proofs",()=>{
 // Fail closed: CI must never release an empty placeholder, partial library,
 // or an editorial-only record pretending to be 684 real encoded MP4s.
 assert.notEqual(source.status,"awaiting_one_time_encoded_media");
 assert.equal(source.status,"generated_and_technical_verified");
 assert.equal(source.count,684);
 assert.equal(source.firstWaveOriginalMasters,320);
 assert.equal(source.secondWaveAdditionalMasters,364);
 assert.equal(source.scenes.length,684);
 assert.equal(source.presets.length,128);
 assert.equal(new Set(source.scenes.map(s=>s.id)).size,684);
 assert.equal(new Set(source.scenes.map(s=>s.sha256)).size,684);
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

// The user's four public categories are editorial. Legacy renderer themes
// must reflect the individual topic: goals != money; sleep != energy.
test("all 684 animations follow precise topic-level themes, not broad categories",()=>{
 const expected={
  "goals-discipline": "goals",
  "purpose-choice": "life",
  "money-mindset": "money",
  "business-career": "money",
  "finding-love": "relationships",
  "couple-relationships": "relationships",
  "loneliness-breakups": "relationships",
  "intimacy-family": "relationships",
  "body-wellbeing": "health",
  "energy-fatigue": "energy",
  "confidence-worth": "energy",
  "sleep-rest": "health",
  "stress-burnout": "health",
  "anxiety-fears": "health",
  "trauma-childhood": "health",
  "depression-apathy": "health"
};
 const byId=new Map(source.scenes.map(scene=>[scene.id,scene]));
 const counts={};
 for(const scene of source.scenes){
   assert.equal(scene.theme,expected[scene.categories[2]],scene.id);
   assert.equal(scene.categories[0],scene.theme,scene.id);
   counts[scene.theme]=(counts[scene.theme]||0)+1;
 }
 assert.deepEqual(counts,{goals:40,life:40,money:80,relationships:176,health:260,energy:88});
 for(const preset of source.presets){
   const matching=preset.clips.map(id=>byId.get(id));
   assert.ok(matching.every(Boolean),preset.id);
   assert.ok(matching.every(scene=>scene.theme===preset.theme),preset.id);
 }
});

test("new 364 MP4s are genuinely additional with v6-v10 for 64 topics and 44 prioritized v11",()=>{
 const first=source.scenes.slice(0,320);
 const extra=source.scenes.slice(320);
 assert.equal(first.length,320);
 assert.equal(extra.length,364);
 assert.ok(first.every(scene=>/\-v[1-5]$/.test(scene.id)));
 assert.ok(extra.every(scene=>/\-v(?:[6-9]|10|11)$/.test(scene.id)));
 assert.ok(extra.every(scene=>scene.labelsMatchOriginalAbstractArt===true));
 assert.ok(extra.every(scene=>["aurora","orbit","bloom","sunburst","ripple","path"].includes(scene.visualFamily)));
 const perTopic=new Map();
 for(const scene of source.scenes){
   const rows=perTopic.get(scene.sourceId)||[];
   rows.push(scene);
   perTopic.set(scene.sourceId,rows);
 }
 assert.equal(perTopic.size,64);
 assert.equal([...perTopic.values()].filter(group=>group.length===11).length,44);
 assert.equal([...perTopic.values()].filter(group=>group.length===10).length,20);
 for(const group of perTopic.values()){
   const versions=group.map(s=>Number(s.id.match(/-v(\d+)$/)?.[1])).sort((a,b)=>a-b);
   assert.deepEqual(versions,Array.from({length:group.length},(_,i)=>i+1));
   assert.equal(new Set(group.map(s=>s.sha256)).size,group.length);
 }
 const firstPresets=source.presets.filter(p=>!p.id.endsWith("-alternative"));
 const alternatives=source.presets.filter(p=>p.id.endsWith("-alternative"));
 assert.equal(firstPresets.length,64);
 assert.equal(alternatives.length,64);
 assert.ok(alternatives.every(p=>p.clips.every(id=>/-v[6-9]$/.test(id))));
});
