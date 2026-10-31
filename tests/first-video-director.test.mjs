import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildFirstVideoDraft, inferFirstVideoTheme } from "../lib/mandala/first-video-director.mjs";
import { prefersSafariWebm, orderRecordingMimes } from "../lib/mandala/recording-codecs.mjs";
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
  const style=src.indexOf('data-video-quick-section="4"');
  assert.ok(first>style&&style>controls,"form follows video and third style block");
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
  assert.match(route,/generateFreeFirstVideoPrompt/);
  const providers=readFileSync(new URL("../lib/mandala/first-video-free-providers.mjs",import.meta.url),"utf8");
  assert.match(providers,/FIRST_VIDEO_OPENROUTER_MODEL="openrouter\/free"/);
  assert.match(providers,/FIRST_VIDEO_GEMINI_MODEL="gemini-2.5-flash-lite"/);
  assert.match(providers,/HH_FIRST_VIDEO_OPENROUTER_FREE_CONFIRMED/);
  assert.match(providers,/HH_FIRST_VIDEO_GEMINI_FREE_CONFIRMED/);
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

test("mountains in Russian lead to real mountain shots, localized scenes and genuinely new variants",()=>{
  const original=buildFirstVideoDraft({locale:"ru",wish:"Горы",durationSeconds:20});
  const other=buildFirstVideoDraft({locale:"ru",wish:"Горы",durationSeconds:20,variant:1});
  assert.equal(original.plan.shots[0].sceneId,"mountain-air");
  assert.equal(other.plan.shots[0].sceneId,"mountain-air");
  assert.match(original.prompt,/горные вершины/i);
  assert.ok(!original.prompt.includes("sunlight awakening across a wide meadow"),"no generic English opening meadow");
  assert.notDeepEqual(original.plan.shots.map(s=>s.sceneId),other.plan.shots.map(s=>s.sceneId));
  assert.notEqual(original.prompt,other.prompt);
  assert.equal(new Set(other.plan.shots.map(s=>s.sceneId)).size,4);
  for(const locale of ["en","es"]){
    const draft=buildFirstVideoDraft({locale,wish:locale==="es"?"Montañas":"Mountains"});
    assert.equal(draft.plan.shots[0].sceneId,"mountain-air");
    assert.ok(draft.prompt.includes(locale==="es"?"cumbres montañosas":"broad open mountain sky"));
  }
  const forest=buildFirstVideoDraft({locale:"ru",wish:"Лес и деревья"});
  assert.equal(forest.plan.shots[0].sceneId,"fern-awakening");
  const cascada=buildFirstVideoDraft({locale:"es",wish:"Cascada"});
  assert.equal(cascada.plan.shots[0].sceneId,"light-waterfall");
});

test("Gemini free first; rate-limit fallback to OpenRouter free; no paid models or silent output",async()=>{
  const {generateFreeFirstVideoPrompt,freeFirstVideoProviders}=
    await import("../lib/mandala/first-video-free-providers.mjs");
  const env={
    HH_FIRST_VIDEO_GEMINI_FREE_CONFIRMED:"true",
    HH_FIRST_VIDEO_OPENROUTER_FREE_CONFIRMED:"true",
    HH_COUNCIL_GEMINI_API_KEY:"verified-gemini-free-tier-key",
    HH_COUNCIL_OPENROUTER_API_KEY:"verified-openrouter-free-key",
  };
  assert.deepEqual(freeFirstVideoProviders(env),["gemini_free","openrouter_free"]);
  let calls=[];
  const sample={locale:"ru",wish:"Горы",theme:"auto",style:"warm",aspect:"landscape",durationSeconds:20};
  const one=await generateFreeFirstVideoPrompt(sample,env,async(url,options)=>{
    calls.push({url,headers:options.headers,body:JSON.parse(options.body)});
    return {status:200,ok:true,text:async()=>JSON.stringify({
      candidates:[{content:{parts:[{text:"Горные вершины под медленными облаками. Мягкий свет и ясный горизонт, плавное движение камеры."}]}}],
    })};
  });
  assert.equal(one.provider,"gemini_free");
  assert.equal(calls.length,1);
  assert.match(calls[0].url,/gemini-2\.5-flash-lite:generateContent/);
  assert.ok(!JSON.stringify(calls[0].body).includes("openrouter/free"));
  calls=[];
  const two=await generateFreeFirstVideoPrompt(sample,env,async(url,options)=>{
    calls.push({url,body:JSON.parse(options.body)});
    return calls.length===1?{status:429,ok:false,text:async()=>""}:{
      status:200,ok:true,text:async()=>JSON.stringify({
        choices:[{message:{content:"Горные вершины в вечернем свете. Четыре спокойные сцены: облака, солнечные лучи, горная тропа, звёздное небо."}}],
      }),
    };
  });
  assert.equal(two.provider,"openrouter_free");
  assert.equal(calls.length,2);
  assert.equal(calls[1].body.model,"openrouter/free");
  assert.deepEqual(freeFirstVideoProviders({
    HH_COUNCIL_GEMINI_API_KEY:env.HH_COUNCIL_GEMINI_API_KEY,
    HH_FIRST_VIDEO_GEMINI_FREE_CONFIRMED:"false",
  }),[]);
  const unavailable=await generateFreeFirstVideoPrompt(sample,{},async()=>{throw Error("must not call");});
  assert.equal(unavailable.error,"VIDEO_PROMPT_FREE_AI_DISABLED");
  const exhausted=await generateFreeFirstVideoPrompt(sample,env,async()=>({
    status:429,ok:false,text:async()=>"",
  }));
  assert.equal(exhausted.error,"VIDEO_PROMPT_FREE_QUOTA");
  assert.match(readFileSync(new URL("../components/mandala-first-video-start.tsx",import.meta.url),"utf8"),/data-first-video-refresh/);
});


test("real iPhone Safari 26 chooses WebM first; other browsers keep MP4 first",()=>{
  const mp4=["video/mp4;codecs=avc1.42E01E","video/mp4"];
  const webm=["video/webm;codecs=vp8","video/webm"];
  const ua="Mozilla/5.0 (iPhone; CPU iPhone OS 26_6_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
  assert.equal(prefersSafariWebm(ua),true);
  assert.deepEqual(orderRecordingMimes({mp4,webm,userAgent:ua}),[...webm,...mp4]);
  assert.deepEqual(orderRecordingMimes({mp4,webm,userAgent:"Mozilla/5.0 Chrome/153.0"}),[...mp4,...webm]);
  assert.equal(prefersSafariWebm("Mozilla/5.0 (Macintosh; Intel Mac OS X) Version/26.1 Safari/605.1"),true);
  assert.equal(prefersSafariWebm("Mozilla/5.0 (Macintosh; Intel Mac OS X) Version/25.0 Safari/605.1"),false);
  assert.equal(prefersSafariWebm("Mozilla/5.0 (Macintosh; Intel Mac OS X)",5),true);
  assert.deepEqual(orderRecordingMimes({mp4,webm,userAgent:ua,preferWebm:true}),webm);
  assert.deepEqual(orderRecordingMimes({mp4,webm,userAgent:ua,forceMp4:true}),mp4);
});

test("iPhone encoder recovery preserves real media, truthful playback state and share",()=>{
  const src=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  assert.match(src,/orderRecordingMimes\(\{/);
  assert.match(src,/maxTouchPoints:typeof navigator/);
  assert.match(src,/const encoded = new Blob\(chunks/);
  assert.match(src,/isWebm=header\.length>=4/);
  assert.match(src,/job\.recorder\.stop\(\)/);
  assert.match(src,/data-video-recording-format/);
  assert.match(src,/data-video-save-direct/,"direct download must remain available when iPhone share sheet fails");
  assert.match(src,/onClick=\{\(\)=>void createVideo\(false,true\)\}/);
  assert.match(src,/resultReady=\{Boolean\(result\)&&playbackStatus==="ready"\}/);
  assert.doesNotMatch(src,/recorder\.start\(500\)/);
});
