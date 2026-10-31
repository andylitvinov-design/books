import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildFirstVideoDraft, inferFirstVideoTheme } from "../lib/mandala/first-video-director.mjs";
const browserSource=()=>readFileSync(new URL("../scripts/verify-holistic-mandala-browser.mjs",import.meta.url),"utf8");

test("RU/EN/ES auto classify with stable fallback", () => {
  assert.equal(inferFirstVideoTheme("Тёплая любовь и близость"),"relationships");
  assert.equal(inferFirstVideoTheme("Growing my business income"),"money");
  assert.equal(inferFirstVideoTheme("Quiero descansar en calma"),"health");
  assert.equal(inferFirstVideoTheme("Something unrecognized"),"energy");
  assert.equal(inferFirstVideoTheme("work", "life"),"life");
});

test("compile four real approved shots and provider-safe prompt", () => {
  const raw="I wish to have my salary increased, private contact Jane@example.com";
  const draft=buildFirstVideoDraft({locale:"en",wish:raw,theme:"auto",
    durationSeconds:20,aspect:"landscape",style:"nature"});
  assert.equal(draft.theme,"money");
  assert.equal(draft.plan.shotCount,4);
  assert.equal(draft.plan.durationSeconds,20);
  assert.equal(draft.plan.aspect,"landscape");
  assert.equal(draft.plan.paidRenderApproved,false);
  assert.equal(draft.plan.noExternalClientData,true);
  assert.equal(draft.mediaSource,"local_canvas");
  assert.equal(draft.aiMediaGenerated,false);
  assert.ok(draft.plan.shots.every(s=>s.sceneId&&s.visualCue&&s.durationSeconds>0));
  assert.match(draft.prompt,/Verified existing scenes/);
  assert.equal(draft.prompt.includes("Jane@example.com"),false);
  assert.equal(draft.prompt.includes(raw),false);
});

test("six shots, real supported 60s durations and visual exclusion",()=>{
  const draft=buildFirstVideoDraft({locale:"ru",wish:"Новая дорога к цели",aspect:"portrait",
    durationSeconds:60,avoid:"море и вода",style:"dream"});
  assert.equal(draft.plan.shotCount,6);
  assert.equal(draft.plan.shots.reduce((total,shot)=>total+shot.durationSeconds,0),60);
  assert.equal(new Set(draft.plan.shots.map(s=>s.sceneId)).size,6);
  assert.ok(draft.plan.shots.every(s=>!/sea|water|coast|stream|wave/i.test(s.visualCue)));
  assert.match(draft.prompt,/60s/);
  const changed=buildFirstVideoDraft({locale:"ru",wish:"Важный новый путь",promptOverride:"Свет и солнце"});
  assert.equal(changed.plan.shots.length,4);
  assert.ok(changed.plan.shots.every(shot=>shot.providerPrompt.length<650));
});

test("unsupported people or animals never become imaginary free AI footage",()=>{
  const wolf=buildFirstVideoDraft({locale:"ru",wish:"Белый волк бежит и превращается в человека"});
  assert.equal(wolf.descriptionLimited,true);
  assert.equal(wolf.aiMediaGenerated,false);
  assert.ok(wolf.limitationNote.length>20);
  assert.ok(!wolf.prompt.includes("Белый волк"));
  const es=buildFirstVideoDraft({locale:"es",wish:"Naturaleza verde",aspect:"square"});
  assert.equal(es.plan.aspect,"square");
  assert.match(es.prompt,/Vídeo gratis/);
});

test("prompt-first UI uses original MediaRecorder and protected optional AI route",()=>{
  const src=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  const ui=readFileSync(new URL("../components/mandala-first-video-start.tsx",import.meta.url),"utf8");
  const route=readFileSync(new URL("../app/api/holistic-support/first-video-prompt/route.js",import.meta.url),"utf8");
  const first=src.indexOf("<MandalaFirstVideoStart ");
  const controls=src.indexOf("data-video-quick-controls");
  assert.ok(first>0&&controls>first);
  assert.match(src,/onApply=\{applyFirstVideoDraft\}/);
  assert.match(src,/setCinematicPlan\(draft\.plan\)/);
  assert.match(src,/createQuickVideo\(\)/);
  assert.match(src,/paintCinematicFrame\(/);
  assert.match(src,/new MediaRecorder\(/);
  assert.match(ui,/data-first-video-generate/);
  assert.match(ui,/data-first-video-prompt/);
  assert.match(ui,/data-first-video-wish/);
  assert.match(ui,/data-first-video-filters/);
  assert.match(ui,/data-first-video-hydrated/);
  assert.match(ui,/disabled=\{disabled \|\| !hydrated \|\| !ready \|\| !wish\.trim\(\)\}/);
  assert.match(src,/useLayoutEffect\(\(\) => \{\s*const job=jobRef\.current;/);
  assert.match(src,/backgroundOnly\?null:frameUrl/);
  assert.match(src,/data-video-result-mode/);
  assert.match(src,/data-video-catalog-fallback/);
  assert.match(src,/firstPartyFilmFor\(first\.theme,first\.sceneId\)/);
  assert.match(src,/url:film\.src,extension:"mp4"/);
  assert.match(src,/result\.mode!=="catalog"/);
  // Private Canvas editor cannot add network fetch just for the fallback.
  assert.doesNotMatch(src,/\bfetch\s*\(|XMLHttpRequest|FormData|sendBeacon/);
  assert.match(browserSource(),/supportsCanvasRecording/);
  assert.match(browserSource(),/free first-video export missing/);
  assert.match(ui,/setAiConsent\(event\.currentTarget\.checked\)/);
  assert.match(route,/MODEL = "openrouter\/free"/);
  assert.match(route,/HH_FIRST_VIDEO_OPENROUTER_FREE_CONFIRMED/);
  assert.match(route,/consumeRate\(config/);
  assert.match(route,/requireSameOrigin\(request,config\)/);
});


test("Safari export is never offered until the native video decoder succeeds",()=>{
  const src=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  assert.match(src,/recorder\.start\(\);/,"record one complete file rather than short Safari MP4 fragments");
  assert.doesNotMatch(src,/recorder\.start\(500\)/);
  assert.match(src,/playbackStatus==="ready"/);
  assert.match(src,/resultReady=\{Boolean\(result\)&&playbackStatus==="ready"\}/);
  assert.match(src,/onLoadedData=\{event=>confirmVideoPlayback/);
  assert.match(src,/video\.videoWidth>0 && video\.videoHeight>0 && video\.readyState>=2/);
  assert.match(src,/data-video-playback-error/);
  assert.match(src,/data-video-retry-compatible/);
  assert.match(src,/onClick=\{event=>\{\s*if\(result\.mode==="catalog"/);
  assert.match(browserSource(),/simulated native decode failure/);
});
