import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  FREE_FILM_DURATIONS,FREE_FILM_STAGE_WEIGHTS,FREE_FILM_MIN_STAGE_SECONDS,
  allocateFreeFilmTimeline,allocateAdaptiveFilmTimeline,
  shiftAdaptiveFilmBoundary,retimeAdaptiveFilmPlan,
} from "../lib/mandala/free-film-timeline.mjs";

const clips=["light-path","wildflower-dance","heart-light","meadow-morning"];

test("adaptive Director favors the peak and has exact 10–60s timelines",()=>{
  assert.deepEqual(FREE_FILM_STAGE_WEIGHTS,[5,7,10,8]);
  assert.equal(FREE_FILM_MIN_STAGE_SECONDS,2);
  const expected=new Map([
    [10,[2,2,3,3]], [15,[3,3,5,4]], [20,[3,5,7,5]],
    [30,[5,7,10,8]], [60,[10,14,20,16]],
  ]);
  for(const duration of FREE_FILM_DURATIONS){
    const actual=allocateAdaptiveFilmTimeline(duration,clips);
    assert.deepEqual(actual.map(x=>x.durationSeconds),expected.get(duration));
    assert.deepEqual(actual.map(x=>x.sceneId),clips);
    assert.equal(actual[0].startSeconds,0);
    assert.equal(actual.at(-1).startSeconds+actual.at(-1).durationSeconds,duration);
    for(let i=1;i<actual.length;i++)
      assert.equal(actual[i].startSeconds,actual[i-1].startSeconds+actual[i-1].durationSeconds);
    assert.equal(Object.isFrozen(actual),true);
  }
  // No silently changed pacing for the older first-video/food producer.
  assert.deepEqual(allocateFreeFilmTimeline(30,clips).map(x=>x.durationSeconds),[8,8,7,7]);
});

test("timeline editor transfers only one second and preserves sum",()=>{
  const first=[5,7,10,8];
  assert.deepEqual(shiftAdaptiveFilmBoundary(first,1,1),[5,8,9,8]);
  assert.deepEqual(shiftAdaptiveFilmBoundary(first,1,-1),[5,6,11,8]);
  assert.deepEqual(first,[5,7,10,8]);
  const shortest=[2,2,3,3];
  assert.deepEqual(shiftAdaptiveFilmBoundary(shortest,0,1),shortest);
  assert.deepEqual(shiftAdaptiveFilmBoundary(shortest,0,-1),shortest);
  assert.deepEqual(allocateAdaptiveFilmTimeline(30,clips,[5,8,9,8])
    .map(x=>x.durationSeconds),[5,8,9,8]);
  const reordered=[...clips].reverse();
  assert.deepEqual(allocateAdaptiveFilmTimeline(30,reordered,[5,8,9,8])
    .map(x=>x.sceneId),reordered);
});

test("bad durations, repeated clips and invalid edits fail closed",()=>{
  for(const seconds of [8,12,120,NaN,15.25])
    assert.throws(()=>allocateAdaptiveFilmTimeline(seconds,clips));
  assert.throws(()=>allocateAdaptiveFilmTimeline(30,[...clips.slice(0,3),clips[1]]));
  for(const bad of [[5,7,10,7],[5,7,10],[5,7,10,0],[5,7,10,8.5],[5,7,10,NaN]])
    assert.throws(()=>allocateAdaptiveFilmTimeline(30,clips,bad),/invalid_adaptive_film_timing/);
  for(const [i,n] of [[-1,1],[3,1],[0,2],[0,0]])
    assert.throws(()=>shiftAdaptiveFilmBoundary([5,7,10,8],i,n),/invalid_adaptive_film_boundary/);
  assert.throws(()=>retimeAdaptiveFilmPlan({shots:[]},20),/invalid_free_film_timeline/);
});

test("retiming preserves metadata, source IDs, and returns new stage intervals",()=>{
  const shots=allocateAdaptiveFilmTimeline(30,clips);
  const plan={version:"hh-free-film-v2",durationSeconds:30,
    shots:shots.map(s=>({...s,theme:"relationships",providerPrompt:""}))};
  const next=retimeAdaptiveFilmPlan(plan,20);
  assert.equal(next.durationSeconds,20);
  assert.deepEqual(next.shots.map(s=>s.durationSeconds),[3,5,7,5]);
  assert.deepEqual(next.shots.map(s=>s.sceneId),clips);
  assert.ok(next.shots.every(s=>s.theme==="relationships"&&s.providerPrompt===""));
  assert.equal(plan.durationSeconds,30);
});

test("real studio consumes edited storyboard and invalidates stale exported video",()=>{
  const ui=readFileSync(new URL("../components/mandala-auto-video-director.tsx",import.meta.url),"utf8");
  const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  assert.match(ui,/data-auto-video-montage/);
  assert.match(ui,/shiftAdaptiveFilmBoundary/);
  assert.match(ui,/durationSecondsByStage:stageDurations/);
  assert.match(studio,/compileFreeFilmPreset\(preset,locale,seconds,outputAspect,edit\)/);
  assert.match(studio,/allocateAdaptiveFilmTimeline\(/);
  assert.match(studio,/retimeAdaptiveFilmPlan\(plan,seconds\)/);
  assert.match(studio,/shot\.sceneId,shot\.startSeconds,shot\.durationSeconds/);
  assert.match(ui,/onInvalidate\?\.\(\)/,"shot edits must invalidate stale output immediately");
  assert.match(studio,/onInvalidate=\{\(\)=>\{setPreviewPlaying\(false\);setCinematicPlan\(null\);\}\}/);
});
