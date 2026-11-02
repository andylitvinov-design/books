import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  resolveLicensedSourceFrame,assessLicensedSourceFrame,
  LICENSED_SOURCE_MAX_DRIFT_SECONDS,
} from "../lib/mandala/free-film-source-clock.mjs";

const ids=["clip-a","clip-b","clip-c","clip-d"];
const lengths=[5,7,10,8];
const shots=ids.map((sceneId,index)=>({
  sceneId,
  startSeconds:lengths.slice(0,index).reduce((a,b)=>a+b,0),
  durationSeconds:lengths[index],
}));
const plan={durationSeconds:30,shots};
const mock=(currentTime,rest={})=>({
  readyState:4,videoWidth:720,videoHeight:1280,
  error:null,seeking:false,currentTime,...rest,
});
const frame=(seconds,duration=15)=>resolveLicensedSourceFrame(plan,seconds,duration);

test("exact four-shot boundaries never select the following scene too early",()=>{
  const cases=[
    [0,"clip-a",0],[4.99,"clip-a",4.99],
    [5,"clip-b",0],[11.99,"clip-b",6.99],
    [12,"clip-c",0],[21.999,"clip-c",9.999],
    [22,"clip-d",0],[29.99,"clip-d",7.99],
    [30,"clip-a",0],[35,"clip-b",0],
  ];
  for(const [second,id,local] of cases){
    const got=frame(second);
    assert.equal(got.sceneId,id);
    assert.ok(Math.abs(got.stageSeconds-local)<.001);
  }
});

test("native video loops preserve source clock after the clip ends",()=>{
  const expected=frame(18.2,4); // shot C starts at 12 => 6.2s -> 2.2s in 4s MP4
  assert.equal(expected.sceneId,"clip-c");
  assert.ok(Math.abs(expected.expectedSourceSeconds-2.2)<1e-8);
  assert.equal(assessLicensedSourceFrame(mock(2.18),expected).status,"ready");
  const wrapped=frame(16.03,4); // 4.03 seconds into the 4s MP4
  assert.equal(assessLicensedSourceFrame(mock(3.98),wrapped).status,"ready",
    "currentTime near old loop end must match expected new loop start");
});

test("optional verified in/out trim clocks are relative to source interval",()=>{
  const trimmed={...plan,shots:plan.shots.map((shot,index)=>
    index===0?{...shot,sourceInSeconds:2,sourceOutSeconds:5}:shot)};
  const got=resolveLicensedSourceFrame(trimmed,4.7,10);
  assert.equal(got.sceneId,"clip-a");
  assert.ok(Math.abs(got.expectedSourceSeconds-3.7)<1e-8);
  assert.equal(assessLicensedSourceFrame(mock(3.72),got).status,"ready");
  assert.equal(assessLicensedSourceFrame(mock(.72),got).status,"drift");
});

test("stale preview and frozen decoders cannot silently enter export",()=>{
  const expected=frame(5.05,20);
  assert.equal(assessLicensedSourceFrame(mock(5.7),expected).status,"drift");
  assert.equal(assessLicensedSourceFrame(mock(.15),expected).status,"ready");
  assert.equal(assessLicensedSourceFrame(mock(.05,{seeking:true}),expected).status,"waiting");
  assert.equal(assessLicensedSourceFrame(mock(.05,{readyState:1}),expected).status,"unavailable");
  assert.equal(assessLicensedSourceFrame(mock(.05,{error:{code:3}}),expected).status,"unavailable");
  assert.equal(assessLicensedSourceFrame(mock(Number.NaN),expected).status,"invalid");
  assert.ok(LICENSED_SOURCE_MAX_DRIFT_SECONDS<1);
});

test("hard bounds reject inconsistent shot plans and invalid source metadata",()=>{
  const fail=input=>assert.throws(()=>resolveLicensedSourceFrame(input,0,10),
    /invalid_licensed_source_clock/);
  fail({...plan,shots:shots.slice(1)});
  fail({...plan,shots:[shots[0],{...shots[1],sceneId:shots[0].sceneId},shots[2],shots[3]]});
  fail({...plan,shots:shots.map((s,i)=>i===2?{...s,startSeconds:11}:s)});
  fail({...plan,durationSeconds:29});
  assert.throws(()=>frame(-1),/invalid_licensed_source_clock/);
  assert.throws(()=>frame(0,Number.NaN),/invalid_licensed_source_clock/);
  assert.throws(()=>resolveLicensedSourceFrame({...plan,shots:shots.map((s,i)=>
    i===0?{...s,sourceOutSeconds:100}:s)},0,10),/invalid_licensed_source_clock/);
});

test("existing Studio remains the sole Canvas renderer and uses source-clock validation",()=>{
  const source=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  assert.match(source,/resolveLicensedSourceFrame\(/);
  assert.match(source,/assessLicensedSourceFrame\(/);
  assert.match(source,/const framePosition=resolveLicensedSourceFrame/);
  assert.match(source,/if\(assessment\.status!=="ready"\)return null/);
  assert.match(source,/paintCinematicFrame\(/);
  assert.match(source,/new MediaRecorder\(/);
  assert.match(source,/encodeLocalWebCodecsMp4\(/);
  assert.match(source,/prepareFourFilmSources\(/);
});

test("an asynchronous WebKit encoder must not auto-play source masters before frame zero",()=>{
  const source=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  const start=source.indexOf("function freeFilmVideoAt(");
  const end=source.indexOf("function updateFreeFilmReadiness()",start);
  assert.ok(start>=0 && end>start,"the existing Studio remains the one licensed-source renderer");
  const selector=source.slice(start,end);
  assert.ok(selector.includes("function freeFilmVideoAt(seconds:number,advancePlayback=false)"));
  assert.ok(selector.includes("if(video.paused&&advancePlayback)"));
  for(const unexpected of ["preparingRef.current","webCodecJobRef.current","||recording"])
    assert.equal(selector.includes(unexpected),false,"preflight cannot start source clocks: "+unexpected);
  assert.ok(source.includes("const firstStockFrame=freeFilmVideoAt(0,false)"),
    "initial still must remain paused during asynchronous audio preparation");
  for(const required of ["freeFilmVideoAt(0,previewPlaying)",
    "freeFilmVideoAt(frameSecond,previewPlaying)","freeFilmVideoAt(frameTime,true)",
    "freeFilmVideoAt(time,true)"])
    assert.ok(source.includes(required),"missing explicit playback intent: "+required);
});
