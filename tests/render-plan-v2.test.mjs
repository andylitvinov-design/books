import test from "node:test";
import assert from "node:assert/strict";
import {compileVerifiedRenderPlanV2,videoRenderFingerprint} from "../lib/mandala/render-plan-v2.mjs";
const src=id=>({id,theme:"energy",collection:"film-collection-v2",status:"approved",media:"licensed_mp4",
  video:"/videos/holistic-house/film-collection-v2/"+id+".mp4",
  rightsReference:{kind:"existing_approved_first_party_master"},motifs:["sun"],tags:["bright"]});
const scenes=["forest-morning","mountain-air","sunbeam-flow","desert-light"].map(src);
const script={version:"hh-executable-video-scenario-v1",readyToExecute:true,paidRenderApproved:false,
  noExternalClientData:true,presetId:"bright-film",durationSeconds:30,aspect:"portrait",
  rendering:{quality:"fullhd"},audio:{kind:"approved_preset",trackId:"meditation",volumePercent:47},
  edit:{excludedMotifs:[]},shots:[
    {sceneId:"forest-morning",assetPath:scenes[0].video,startSeconds:0,durationSeconds:5,captionText:"Новый путь"},
    {sceneId:"mountain-air",assetPath:scenes[1].video,startSeconds:5,durationSeconds:7,captionText:""},
    {sceneId:"sunbeam-flow",assetPath:scenes[2].video,startSeconds:12,durationSeconds:10,captionText:"Мой следующий шаг"},
    {sceneId:"desert-light",assetPath:scenes[3].video,startSeconds:22,durationSeconds:8,captionText:""},
  ]};
test("render contract binds only trusted licensed scenes, real timing and caption/audio tracks",()=>{
  const plan=compileVerifiedRenderPlanV2({scenario:script,scenes,projectId:"guest-a",projectRevision:3});
  assert.equal(plan.durationMs,30000);
  assert.deepEqual(plan.shots.map(x=>x.startMs),[0,5000,12000,22000]);
  assert.equal(plan.requestedTarget.width,1080);assert.equal(plan.requestedTarget.height,1920);
  assert.equal(plan.captions.length,2);assert.equal(plan.captions[1].startMs,12000);
  assert.equal(plan.audioTracks[0].gainPercent,47);
  assert.ok(plan.rightsProof.every(x=>x.rightsKind==="existing_approved_first_party_master"));
  assert.match(plan.planHash,/^fnv64-[0-9a-f]{16}$/);
  assert.equal(JSON.stringify(plan).includes("Мой новый путь"),false);
  assert.equal(Object.isFrozen(plan.shots[0]),true);
});
test("same plan yields same key, any real scene/timing/audio change yields another key",()=>{
  const a=compileVerifiedRenderPlanV2({scenario:script,scenes});
  const b=compileVerifiedRenderPlanV2({scenario:structuredClone(script),scenes});
  assert.equal(a.planHash,b.planHash);
  const changed={...script, audio:{...script.audio,volumePercent:50}};
  assert.notEqual(a.planHash,compileVerifiedRenderPlanV2({scenario:changed,scenes}).planHash);
  assert.notEqual(videoRenderFingerprint({foo:1}),videoRenderFingerprint({foo:2}));
});
test("rejects invented external URL, blocked licensed source, unapproved task, invalid timing",()=>{
  const edit = s=>compileVerifiedRenderPlanV2({scenario:s,scenes});
  assert.throws(()=>edit({...script,shots:[{...script.shots[0],assetPath:"https://example.com/bad.mp4"},...script.shots.slice(1)]}),/invalid_timeline/);
  assert.throws(()=>edit({...script,shots:[script.shots[0],script.shots[0],...script.shots.slice(2)]}),/unlicensed_scene/);
  assert.throws(()=>edit({...script,paidRenderApproved:true}),/invalid_input/);
  assert.throws(()=>edit({...script,shots:script.shots.map((s,i)=>i===3?{...s,durationSeconds:10}:s)}),/duration_mismatch/);
  const badScenes=[{...scenes[0],rightsReference:{kind:"unlicensed"}},...scenes.slice(1)];
  assert.throws(()=>compileVerifiedRenderPlanV2({scenario:script,scenes:badScenes}),/unlicensed_scene/);
  assert.throws(()=>edit({...script, audio:{kind:"silent",trackId:"meditation",volumePercent:25}}),/invalid_audio/);
});
test("silent mode emits no phantom audio; browser MIME remains negotiated honestly",()=>{
  const a=compileVerifiedRenderPlanV2({scenario:{...script,audio:{kind:"silent",trackId:"none",volumePercent:0}},scenes});
  assert.deepEqual(a.audioTracks,[]);
  assert.equal(a.requestedTarget.mime,"browser_negotiated");
});
