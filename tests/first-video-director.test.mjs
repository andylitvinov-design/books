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
  const visual=src.indexOf('data-video-quick-section="4"');
  assert.ok(first>visual&&visual>controls,"first-video form must be below the player, six buttons and Style section");
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
  assert.match(route,/HH_FIRST_VIDEO_OPENROUTER_FREE_CONFIRMED/);
  assert.match(route,/consumeRate\(config/);
  assert.match(route,/requireSameOrigin\(request,config\)/);
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
