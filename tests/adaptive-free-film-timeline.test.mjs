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

test("reframing retains the approved source shots and manual stage timings",async()=>{
  const {reframeCinematicPlan}=await import("../lib/mandala/free-film-timeline.mjs");
  const shots=allocateAdaptiveFilmTimeline(30,clips,[5,8,9,8])
    .map((shot,i)=>({...shot,theme:"relationships",slotId:"stage-"+i}));
  const plan={version:"hh-free-film-v2",aspect:"portrait",durationSeconds:30,
    activePresetId:"warm-connection",shots};
  for(const aspect of ["landscape","square","portrait"]){
    const framed=reframeCinematicPlan(plan,aspect);
    assert.equal(framed.aspect,aspect);
    assert.equal(framed.version,plan.version);
    assert.equal(framed.activePresetId,plan.activePresetId);
    assert.equal(framed.durationSeconds,30);
    assert.strictEqual(framed.shots,shots,"aspect-only change keeps the approved clip objects");
    assert.deepEqual(framed.shots.map(shot=>shot.durationSeconds),[5,8,9,8]);
  }
  assert.equal(plan.aspect,"portrait","reframing is immutable");
  assert.throws(()=>reframeCinematicPlan(plan,"random"),/invalid_cinematic_aspect/);
  assert.throws(()=>reframeCinematicPlan({shots:[]},"square"),/invalid_cinematic_aspect/);
});

test("all format controls call the same plan-preserving reframe handler",()=>{
  const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  assert.match(studio,/const changeVideoAspect=\(nextAspect:Aspect\)=>\{/);
  assert.match(studio,/setCinematicPlan\(plan=>plan\?reframeCinematicPlan\(plan,nextAspect\)/);
  for(const [selector,handler] of [
    ["data-video-aspect={format}","changeVideoAspect(format)"],
    ["data-video-quick-aspect={value}","changeVideoAspect(value)"],
    ["data-video-advanced-aspect","changeVideoAspect(event.currentTarget.value as Aspect)"],
  ]){
    const at=studio.indexOf(selector);
    assert.ok(at>=0,"missing source control "+selector);
    assert.ok(studio.slice(at,at+500).includes(handler),"format control loses montage "+selector);
  }
  assert.doesNotMatch(studio,/setAspect\((?:format|value)\);setCinematicPlan\(null\)/);
  assert.doesNotMatch(studio,/data-video-aspect=\{format\}[\s\S]{0,240}onPointerUp=/);
});


test("approved real catalogue replacement excludes wrong origins and unknown URLs",async()=>{
  const {isApprovedMontageScene,validateMontageClips,isSafeMontageScene}=
    await import("../lib/mandala/video-montage-sources.mjs");
  const realCatalogue=JSON.parse(readFileSync(
    new URL("../data/video-catalog/scene-taxonomy.json",import.meta.url),"utf8")).scenes;
  assert.equal(realCatalogue.length,44,"do not invent source MP4 assets");
  assert.ok(realCatalogue.every(isApprovedMontageScene),
    "all published first-party / approved CC-BY masters have stable URLs and provenance");
  const firstFour=realCatalogue.slice(0,4);
  assert.equal(validateMontageClips(firstFour.map(s=>s.id),realCatalogue),true);
  assert.equal(validateMontageClips([firstFour[0].id,firstFour[1].id,firstFour[1].id,firstFour[3].id],realCatalogue),false);
  assert.equal(isSafeMontageScene({...firstFour[0],status:"unverified"}),false);
  assert.equal(isSafeMontageScene({...firstFour[0],video:"https://example.org/video.mp4"}),false);
  assert.equal(isSafeMontageScene({...firstFour[0],video:"/videos/holistic-house/private.mp4"}),false);
  assert.equal(isSafeMontageScene({...firstFour[0],rightsReference:{kind:"unknown-license"}}),false);
  assert.equal(validateMontageClips(firstFour.map(s=>s.id),realCatalogue,["anything"]),false);
  assert.equal(isSafeMontageScene(firstFour[2],["forest"]),false,"tree-related motif is excluded");
});

test("scene replacement is deterministic and preserves explicit avoid-water/night limits",async()=>{
  const {montageReplacementOptions,validateMontageClips,isSafeMontageScene}=
    await import("../lib/mandala/video-montage-sources.mjs");
  const all=JSON.parse(readFileSync(
    new URL("../data/video-catalog/scene-taxonomy.json",import.meta.url),"utf8")).scenes;
  const current="garden-acceptance";
  assert.ok(all.find(s=>s.id===current),"source must be a registered MP4");
  const selected=["garden-acceptance","meadow-morning","flower-softening","petal-hope"];
  const options=montageReplacementOptions({
    scenes:all,currentId:current,selectedIds:selected,
    excludedMotifs:["water","dark"],limit:6,
  });
  assert.ok(options.length>0,"offer other licensed footage when one theme has only two clips");
  assert.ok(options.every(s=>!selected.includes(s.id)&&isSafeMontageScene(s,["water","dark"])));
  assert.deepEqual(options,montageReplacementOptions({
    scenes:all,currentId:current,selectedIds:selected,
    excludedMotifs:["water","dark"],limit:6,
  }),"same request and scene set must yield same alternatives");
  const next=[options[0].id,...selected.slice(1)];
  assert.equal(validateMontageClips(next,all,["water","dark"]),true);
  assert.deepEqual(montageReplacementOptions({
    scenes:all,currentId:current,selectedIds:selected,
    excludedMotifs:["unknown-motif"],limit:6,
  }),[],"unknown exclusions cannot silently loosen restrictions");
  assert.deepEqual(montageReplacementOptions({scenes:all,currentId:"never-licensed",selectedIds:selected}),[]);
});

test("optional replacement picker reaches the original recorder with safe validation",()=>{
  const ui=readFileSync(new URL("../components/mandala-auto-video-director.tsx",import.meta.url),"utf8");
  const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  assert.match(ui,/data-auto-video-stage-replace=\{index\}/);
  assert.match(ui,/availableReplacements\[index\]\.map\(item=>/);
  assert.match(ui,/replaceStage\(index,event\.currentTarget\.value\)/);
  assert.match(ui,/excludedMotifs:proposal\.excludedMotifs/);
  assert.match(studio,/validateMontageClips\(\[\.\.\.clipIds\],FREE_FILM_CATALOG/);
  assert.match(studio,/throw Error\("invalid_free_film_replacement"\)/);
  assert.match(studio,/firstPartyFilmFor\(shotTheme,sceneId\)/);
  assert.match(studio,/providerPrompt:""/);
});
