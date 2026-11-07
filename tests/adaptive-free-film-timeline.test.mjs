import {autoFillApprovedFilm} from "../lib/mandala/auto-fill-approved-film.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  FREE_FILM_DURATIONS,FREE_FILM_STAGE_WEIGHTS,FREE_FILM_MIN_STAGE_SECONDS,
  allocateFreeFilmTimeline,allocateAdaptiveFilmTimeline,allocateSourceBoundedFilmTimeline,
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
  assert.match(studio,/allocateSourceBoundedFilmTimeline\(/);
  assert.match(studio,/allocateSourceBoundedFilmTimeline\(seconds,ids,/);
  assert.match(studio,/allocateVariableFilmTimeline\(seconds,ids\)/);
  assert.match(studio,/verified\.durationSeconds>=timeline\[index\]\.durationSeconds/);
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
  assert.match(studio,/setCinematicPlan\(plan=>\{/);
  assert.match(studio,/verifiedSceneAspect\(verified,nextAspect\)/);
  assert.match(studio,/reframeCinematicPlan\(plan,nextAspect\)/);
  for(const [selector,handler] of [
    ["data-video-montage-preference=\"format\"","changeVideoAspect(event.currentTarget.value as Aspect)"],
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
  assert.equal(realCatalogue.length,56,"48 existing physical MP4 scenes plus eight verified sunlight variants");
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

/** Auto Video Director's no-loop source expansion: exercised by existing Mandala CI. */
const makeAutoSource=(id,change={})=>({id,theme:"money",durationSeconds:5,
  certified:true,masterKey:"hash:"+id,origins:[],group:null,media:"licensed_mp4",
  tags:["money","gold"],motifs:["sun","gold"],sourceId:"money-mindset",...change});
const AUTO_FILM_SEEDS=Array.from({length:4},(_,i)=>makeAutoSource("seed-"+i));
const AUTO_FILM_EXTRAS=Array.from({length:12},(_,i)=>makeAutoSource("extra-"+i,
  {media:"original_motion_mp4"}));
const fillPreset=(durationSeconds,options={})=>autoFillApprovedFilm({
  initialIds:AUTO_FILM_SEEDS.map(s=>s.id),
  scenes:[...AUTO_FILM_SEEDS,...AUTO_FILM_EXTRAS],
  theme:"money",durationSeconds,...options
});
test("Free 20s can use four equal 5s originals instead of illegally looping unequal 4-shot weights",()=>{
  const r=fillPreset(20,{legacyStageSeconds:[3,5,7,5]});
  assert.equal(r.ok,true);assert.equal(r.addedCount,0);
  assert.equal(r.usedVariableTiming,true);
});
test("Free 30s uses six certified masters and preserves four scene-act anchors",()=>{
  const r=fillPreset(30,{legacyStageSeconds:[5,7,10,8]});
  assert.equal(r.ok,true);assert.equal(r.clipIds.length,6);
  assert.deepEqual([r.clipIds[0],r.clipIds[2],r.clipIds[4],r.clipIds[5]],
    AUTO_FILM_SEEDS.map(s=>s.id));
});
test("Free 60s uses twelve distinct five-second masters in the four approved acts",()=>{
  const r=fillPreset(60,{legacyStageSeconds:[10,14,20,16]});
  assert.equal(r.ok,true);assert.equal(r.clipIds.length,12);
  assert.deepEqual([0,3,6,9].map(i=>r.clipIds[i]),AUTO_FILM_SEEDS.map(s=>s.id));
  assert.equal(new Set(r.clipIds).size,12);
});
test("Free Auto Director does not invent rights, groups, media or subject match",()=>{
  assert.equal(fillPreset(60,{scenes:[...AUTO_FILM_SEEDS,
    ...AUTO_FILM_EXTRAS.map(s=>({...s,certified:false}))]}).ok,false);
  assert.equal(fillPreset(60,{scenes:[...AUTO_FILM_SEEDS,
    ...AUTO_FILM_EXTRAS.map(s=>({...s,masterKey:AUTO_FILM_SEEDS[0].masterKey}))]}).ok,false);
  assert.equal(fillPreset(60,{scenes:[...AUTO_FILM_SEEDS,
    ...AUTO_FILM_EXTRAS.map(s=>({...s,theme:"relationships"}))]}).ok,false);
});
test("Studio presents an explicit 9:16 choice instead of lying about 16:9 footage",()=>{
  const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  assert.match(studio,/autoFillApprovedFilm\(/);
  assert.match(studio,/data-video-portrait-retry/);
  assert.match(studio,/!edit&&clipIds\.length===4/);
  assert.match(studio,/!scene\|\|!isSafeMontageScene\(source\)\|\|!verifiedSceneAspect\(scene,aspect\)/);
});

test("20s original motion uses four real 5s masters without stretching a 7s adaptive peak",()=>{
  const originals=["motion-goals-money-goal-achievement-v1",
    "motion-goals-money-goal-achievement-v2",
    "motion-goals-money-goal-achievement-v3",
    "motion-goals-money-goal-achievement-v4"];
  assert.deepEqual(allocateAdaptiveFilmTimeline(20,originals)
    .map(s=>s.durationSeconds),[3,5,7,5],
    "the prior adaptive third cut exceeds a physical 5s source");
  const safe=allocateSourceBoundedFilmTimeline(20,originals,[5,5,5,5]);
  assert.deepEqual(safe.map(s=>s.durationSeconds),[5,5,5,5]);
  assert.deepEqual(safe.map(s=>s.sceneId),originals,
    "no duplicate, fabricated or substituted master clips");
  assert.deepEqual(safe.map(s=>s.startSeconds),[0,5,10,15]);
  assert.ok(safe.every((shot,i)=>shot.durationSeconds<=5));
  assert.ok(Object.isFrozen(safe),"the source-backed timeline remains immutable");
  assert.deepEqual(allocateSourceBoundedFilmTimeline(20,originals,[5,5,7,5])
    .map(s=>s.durationSeconds),[3,5,7,5],
    "adaptive cinematic timing stays unchanged when masters support it");
  assert.deepEqual(allocateSourceBoundedFilmTimeline(20,originals,[5,5,5,5],[5,5,5,5])
    .map(s=>s.durationSeconds),[5,5,5,5],
    "a visitor-approved manual 5-second schedule is retained");
  for(const [seconds,sources,manual] of [
    [30,[5,5,5,5],null], [20,[5,5,5,5],[3,5,7,5]],
    [20,[5,5,0,5],null], [20,[5,5,NaN,5],null],
  ])assert.throws(()=>allocateSourceBoundedFilmTimeline(seconds,originals,sources,manual),
    /UNVERIFIED_FOOTAGE_ASPECT_DURATION_OR_REUSE/);
});
test("original-motion studio selection and retiming both honor actual source duration",()=>{
  const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  assert.match(studio,/const verified=clipIds\.map\(id=>verifiedCategorySource/);
  assert.match(studio,/allocateSourceBoundedFilmTimeline\(durationSeconds,\[\.\.\.clipIds\]/);
  assert.match(studio,/verified\.map\(scene=>scene\?\.durationSeconds\?\?NaN\)/);
  assert.match(studio,/allocateSourceBoundedFilmTimeline\(seconds,ids,/);
  assert.match(studio,/verifiedSources\.map\(scene=>scene\?\.durationSeconds\?\?NaN\)/);
  // The source guard now normalizes Error.message before offering a verified
  // portrait fallback; never allow a failed physical source to be rendered.
  assert.match(studio,/reason==="UNVERIFIED_FOOTAGE_ASPECT_DURATION_OR_REUSE"/);
  assert.match(studio,/formatUnavailable=outputAspect!=="portrait"&&/);
  assert.match(studio,/setPortraitRetry\(\{presetId,seconds,edit\}\)/);
  assert.match(studio,/validateMontageClips\(\[\.\.\.clipIds\],FREE_FILM_CATALOG/);
  assert.match(studio,/verifiedSceneAspect\(scene,aspect\)/);
});
