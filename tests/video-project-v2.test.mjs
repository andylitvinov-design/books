import test from "node:test";
import assert from "node:assert/strict";
import {createVideoProjectV2,applyVideoProjectAction} from "../lib/mandala/video-project-v2.mjs";
const shots=[
  {sceneId:"forest-morning",startMs:0,durationMs:5000},
  {sceneId:"mountain-air",startMs:5000,durationMs:7000},
  {sceneId:"sunbeam-flow",startMs:12000,durationMs:10000},
  {sceneId:"desert-light",startMs:22000,durationMs:8000},
];
const init=()=>createVideoProjectV2({projectId:"guest-test",locale:"ru",goalText:"Мой новый путь"});
test("project state preserves goal, scene, phrase and music across tab switches",()=>{
  const p=init();
  const a=applyVideoProjectAction(p,{type:"set_film",film:{presetId:"warm-film",aspect:"portrait",durationMs:30000,shots}},0);
  const b=applyVideoProjectAction(a,{type:"approve_phrases",confirmed:true,items:["Я могу сделать шаг"]},1);
  const c=applyVideoProjectAction(b,{type:"set_audio",trackId:"score-warm-film-1",volumePercent:38},2);
  const d=applyVideoProjectAction(c,{type:"set_workspace",workspace:"editor"},3);
  assert.equal(d.revision,3);assert.equal(d.activeWorkspace,"editor");
  assert.equal(d.goal.text,"Мой новый путь");assert.equal(d.film.shots.length,4);
  assert.deepEqual(d.phrases.approved,["Я могу сделать шаг"]);
  assert.equal(d.audio.trackId,"score-warm-film-1");
  assert.equal(Object.isFrozen(d.film.shots),true);
  assert.equal(p.film.shots.length,0);
});
test("approval belongs to one revision; creative edits invalidate export without dropping artifact",()=>{
  const film=applyVideoProjectAction(init(),{type:"set_film",film:{presetId:"forest-film",aspect:"portrait",durationMs:30000,shots}},0);
  const hash="fnv64-0123456789abcdef";
  const approved=applyVideoProjectAction(film,{type:"approve_plan",planHash:hash,revision:1},1);
  const ready=applyVideoProjectAction(approved,{type:"export_ready",planHash:hash,
    artifact:{mime:"video/webm",bytes:2048,validatedPlayback:true}},1);
  assert.equal(ready.export.status,"ready");
  const changed=applyVideoProjectAction(ready,{type:"set_audio",trackId:"none",volumePercent:20},1);
  assert.equal(changed.export.status,"stale");
  assert.equal(changed.export.artifact.bytes,2048);
  assert.equal(changed.renderApproval.planHash,null);
  assert.throws(()=>applyVideoProjectAction(changed,{type:"export_ready",planHash:hash,
    artifact:{mime:"video/webm",bytes:2048,validatedPlayback:true}},2),/not_verified/);
});
test("rejects stale writes, fake playback, invalid timings, unknown mutations and unsigned phrases",()=>{
  const p=init();
  assert.throws(()=>applyVideoProjectAction(p,{type:"set_audio",trackId:"none",volumePercent:10},1),/stale_revision/);
  assert.throws(()=>applyVideoProjectAction(p,{type:"set_film",film:{presetId:"x",aspect:"portrait",durationMs:30000,shots:[...shots.slice(0,3),shots[0]]}}),/invalid_film/);
  assert.throws(()=>applyVideoProjectAction(p,{type:"approve_phrases",confirmed:false,items:["Фраза"]}),/invalid_phrases/);
  assert.throws(()=>applyVideoProjectAction(p,{type:"delete_project"}),/unsupported_action/);
  assert.throws(()=>applyVideoProjectAction(p,{type:"export_ready",planHash:"fnv64-0123456789abcdef",artifact:{mime:"video/mp4",bytes:1024,validatedPlayback:false}}),/not_verified/);
  assert.throws(()=>createVideoProjectV2({projectId:"__bad",locale:"ru"}),/invalid_input/);
});
test("re-applying identical material does not needlessly invalidate approvals",()=>{
  const p=init();
  const a=applyVideoProjectAction(p,{type:"set_audio",trackId:"none",volumePercent:75});
  assert.equal(a,p);
  const b=applyVideoProjectAction(p,{type:"set_workspace",workspace:"phrases"});
  assert.equal(b.revision,0);
});
