import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildFirstVideoDraft, inferFirstVideoTheme } from "../lib/mandala/first-video-director.mjs";
import {
  FIRST_VIDEO_PROMPT_CONTRACT_VERSION,FIRST_VIDEO_PROMPT_FILTER_KEYS,
  makeFirstVideoPromptRequest,parseFirstVideoPromptInput,buildFirstVideoPromptContext,
} from "../lib/mandala/first-video-prompt-contract.mjs";
import { VIDEO_QUICK_TEMPLATES, getVideoQuickTemplateDraft } from "../lib/mandala/video-quick-templates.mjs";
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
  assert.match(providers,/FIRST_VIDEO_GEMINI_MODEL="gemini-3.5-flash-lite"/);
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
  assert.match(calls[0].url,/gemini-3\.5-flash-lite:generateContent/);
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


test("unavailable Gemini 3.5 Lite model falls back ONLY to confirmed free-tier Gemini 3.1 Lite; failures stay private",async()=>{
  const {generateFreeFirstVideoPrompt,FIRST_VIDEO_GEMINI_ALT_MODEL}=
    await import("../lib/mandala/first-video-free-providers.mjs");
  const env={
    HH_FIRST_VIDEO_GEMINI_FREE_CONFIRMED:"true",
    HH_FIRST_VIDEO_OPENROUTER_FREE_CONFIRMED:"true",
    HH_COUNCIL_GEMINI_API_KEY:"verified-free-tier-gemini-key",
    HH_COUNCIL_OPENROUTER_API_KEY:"verified-openrouter-free-key",
  };
  const input={locale:"ru",wish:"Горы",theme:"auto",style:"warm",aspect:"landscape",durationSeconds:20};
  const called=[];
  const result=await generateFreeFirstVideoPrompt(input,env,async(url,options)=>{
    called.push({url,body:JSON.parse(options.body)});
    if(called.length===1)return {status:404,ok:false,text:async()=>""};
    return {status:200,ok:true,text:async()=>JSON.stringify({
      candidates:[{content:{parts:[{text:"Горные вершины с медленными облаками. Четыре сцены горного пейзажа с плавными переходами."}]}}],
    })};
  });
  assert.equal(result.provider,"gemini_free");
  assert.equal(result.model,FIRST_VIDEO_GEMINI_ALT_MODEL);
  assert.equal(called.length,2,"one 404 model fallback; no OpenRouter call");
  assert.match(called[1].url,/gemini-3\.1-flash-lite:generateContent/);
  assert.ok(!JSON.stringify(called).includes("gemini-4-argon"));
  const unavailable=await generateFreeFirstVideoPrompt(input,env,async()=>({
    status:403,ok:false,text:async()=>JSON.stringify({error:{message:"never log an API key or private wish"}}),
  }));
  assert.equal(unavailable.error,"VIDEO_PROMPT_PROVIDER_UNAVAILABLE");
  assert.deepEqual(unavailable.diagnostics,[
    {provider:"gemini_free",model:"gemini-3.5-flash-lite",reason:"http_403"},
    {provider:"openrouter_free",model:"openrouter/free",reason:"http_403"},
  ]);
  assert.ok(!JSON.stringify(unavailable).includes(input.wish));
  assert.ok(!JSON.stringify(unavailable).includes("never log"));
  const route=readFileSync(new URL("../app/api/holistic-support/first-video-prompt/route.js",import.meta.url),"utf8");
  assert.match(route,/HH_FIRST_VIDEO_FREE_PROVIDER_STATUS/);
  assert.match(route,/if\(result\.error\)/);
  assert.match(route,/return NextResponse\.json\(\{prompt:result\.prompt,provider:result\.provider/);
  const ui=readFileSync(new URL("../components/mandala-first-video-start.tsx",import.meta.url),"utf8");
  assert.match(ui,/const useLocal=mode==="local"/);
  assert.match(ui,/setVariant\(nextVariant\);setPromptOverride\(""\);setMode\("local"\)/);
  assert.match(ui,/localFallback:"Создан другой локальный вариант, без внешнего AI\."/);
});


test("Food/Еда/Comida creates honest harvest storyboard instead of silently treating food as generic energy",()=>{
  const options={durationSeconds:20,theme:"auto",style:"warm",aspect:"landscape"};
  const ru=buildFirstVideoDraft({locale:"ru",wish:"Еда",...options});
  assert.equal(ru.theme,"life");
  assert.equal(ru.plan.shots[0].sceneId,"golden-harvest");
  assert.equal(ru.descriptionLimited,true);
  assert.match(ru.prompt,/Тема «Еда»/);
  assert.match(ru.prompt,/поле урожая/);
  assert.match(ru.limitationNote,/нет кадров блюд/);
  assert.equal(ru.plan.shots.every(s=>Boolean(s.providerPrompt)),true);
  const variant=buildFirstVideoDraft({locale:"ru",wish:"Еда",variant:1,...options});
  assert.equal(variant.plan.shots[0].sceneId,"golden-harvest");
  assert.notEqual(ru.prompt,variant.prompt,"real scene variants must change");
  const manual=buildFirstVideoDraft({locale:"ru",wish:"Еда",promptOverride:"Горы и звёзды",...options});
  assert.equal(manual.plan.shots[0].sceneId,"golden-harvest","AI text cannot override the user's food intent");
  for (const [locale,wish] of [["en","Food"],["es","Comida"]]){
    const result=buildFirstVideoDraft({locale,wish,...options});
    assert.equal(result.plan.shots[0].sceneId,"golden-harvest");
    assert.equal(result.descriptionLimited,true);
    assert.ok(result.limitationNote.length>60);
  }
  assert.equal(inferFirstVideoTheme("Победа"),"energy","don't confuse a word containing 'еда' with food");
});

test("fast free-text failover is budgeted, skips same-project quota retries, keeps safe error details",async()=>{
  const {
    generateFreeFirstVideoPrompt,FIRST_VIDEO_GEMINI_MODEL,FIRST_VIDEO_GEMINI_ALT_MODEL,
    FIRST_VIDEO_TOTAL_BUDGET_MS,FIRST_VIDEO_PRIMARY_TIMEOUT_MS,
    FIRST_VIDEO_LEGACY_TIMEOUT_MS,FIRST_VIDEO_ROUTER_TIMEOUT_MS
  }=await import("../lib/mandala/first-video-free-providers.mjs");
  assert.equal(FIRST_VIDEO_GEMINI_MODEL,"gemini-3.5-flash-lite");
  assert.equal(FIRST_VIDEO_GEMINI_ALT_MODEL,"gemini-3.1-flash-lite");
  assert.ok(FIRST_VIDEO_TOTAL_BUDGET_MS<=12000);
  assert.ok(FIRST_VIDEO_PRIMARY_TIMEOUT_MS+FIRST_VIDEO_LEGACY_TIMEOUT_MS+
    FIRST_VIDEO_ROUTER_TIMEOUT_MS<=FIRST_VIDEO_TOTAL_BUDGET_MS);
  const env={
    HH_FIRST_VIDEO_GEMINI_FREE_CONFIRMED:"true",
    HH_FIRST_VIDEO_OPENROUTER_FREE_CONFIRMED:"true",
    HH_COUNCIL_GEMINI_API_KEY:"verified-gemini-free-tier-key",
    HH_COUNCIL_OPENROUTER_API_KEY:"verified-openrouter-free-key",
  };
  const input={locale:"ru",wish:"Еда",theme:"auto",style:"warm",aspect:"landscape",durationSeconds:20};
  const calls=[];
  const failed=await generateFreeFirstVideoPrompt(input,env,async(url,options)=>{
    calls.push({url,model:JSON.parse(options.body).model,signal:options.signal});
    assert.equal(options.signal.aborted,false,"active provider starts without abort");
    if(calls.length===1)return {status:429,ok:false};
    return {status:503,ok:false};
  });
  assert.equal(failed.error,"VIDEO_PROMPT_PROVIDER_UNAVAILABLE");
  assert.equal(calls.length,2,"Google quota MUST go directly to independent OpenRouter; no same-project retry");
  assert.match(calls[1].url,/openrouter\.ai\/api\/v1/);
  assert.deepEqual(failed.diagnostics.map(d=>d.reason),["quota","http_503"]);
  assert.ok(!JSON.stringify(failed).includes("Еда"));
  assert.ok(!JSON.stringify(failed).includes("verified-gemini-free-tier-key"));
  const legacyCalls=[];
  const legacy=await generateFreeFirstVideoPrompt(input,env,async(url)=>{
    legacyCalls.push(url);
    return legacyCalls.length===1 ? {status:400,ok:false} : {
      status:200,ok:true,text:async()=>JSON.stringify({
        candidates:[{content:{parts:[{text:"Поля урожая и спокойный летний сад. Четыре доступные природные сцены плавно сменяют друг друга."}]}}],
      })
    };
  });
  assert.equal(legacy.provider,"gemini_free");
  assert.equal(legacy.model,FIRST_VIDEO_GEMINI_ALT_MODEL);
  assert.equal(legacyCalls.length,2,"model-incompatible 400 tries exactly one confirmed free-tier 3.1 route");
});

test("transient primary model 503 uses confirmed free Gemini 3.1 Lite before OpenRouter",async()=>{
  const {generateFreeFirstVideoPrompt,FIRST_VIDEO_GEMINI_ALT_MODEL}=
    await import("../lib/mandala/first-video-free-providers.mjs");
  const env={
    HH_FIRST_VIDEO_GEMINI_FREE_CONFIRMED:"true",
    HH_FIRST_VIDEO_OPENROUTER_FREE_CONFIRMED:"true",
    HH_COUNCIL_GEMINI_API_KEY:"verified-gemini-free-tier-key",
    HH_COUNCIL_OPENROUTER_API_KEY:"verified-openrouter-free-key",
  };
  const calls=[];
  const r=await generateFreeFirstVideoPrompt({locale:"ru",wish:"Сад и горы",theme:"auto",style:"warm",aspect:"landscape",durationSeconds:20},env,async url=>{
    calls.push(url);
    return calls.length===1?{status:503,ok:false}:{
      status:200,ok:true,text:async()=>JSON.stringify({
        candidates:[{content:{parts:[{text:"Мягкий свет над горным садом и зелёная долина. Четыре спокойные природные сцены с плавным движением камеры."}]}}],
      }),
    };
  });
  assert.equal(r.model,FIRST_VIDEO_GEMINI_ALT_MODEL);
  assert.equal(r.provider,"gemini_free");
  assert.equal(calls.length,2);
  assert.match(calls[1],/gemini-3\.1-flash-lite:generateContent/);
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

test("six one-tap creative templates compile to real free RU/EN/ES video storyboards",()=>{
  const ids=["morning-light","gentle-pause","inner-confidence",
    "heart-connection","quiet-evening","work-possibilities"];
  assert.deepEqual(VIDEO_QUICK_TEMPLATES.map(template=>template.id),ids);
  assert.ok(Object.isFrozen(VIDEO_QUICK_TEMPLATES));
  for(const template of VIDEO_QUICK_TEMPLATES){
    for(const locale of ["ru","en","es"]){
      assert.ok(template.title[locale].length>3);
      assert.ok(template.hint[locale].length>3);
      const selection=getVideoQuickTemplateDraft(template.id,locale);
      assert.equal(selection.wish,template.wish[locale]);
      assert.ok(selection.wish.length>25&&selection.wish.length<800);
      const draft=buildFirstVideoDraft({locale,wish:selection.wish,...selection.preferences});
      assert.equal(draft.theme,selection.preferences.theme);
      assert.equal(draft.aspect,selection.preferences.aspect);
      assert.equal(draft.mediaSource,"local_canvas");
      assert.equal(draft.aiMediaGenerated,false);
      assert.equal(draft.plan.localPreview,true);
      assert.equal(draft.plan.paidRenderApproved,false);
      assert.equal(draft.plan.shots.length,selection.preferences.durationSeconds===60?6:4);
      assert.equal(draft.plan.shots.reduce((total,shot)=>total+shot.durationSeconds,0),
        selection.preferences.durationSeconds);
      assert.ok(draft.plan.shots.every(shot=>shot.sceneId&&shot.durationSeconds>0));
    }
  }
  const exclusions="Море, волны, темнота";
  assert.equal(getVideoQuickTemplateDraft("inner-confidence","ru",exclusions).preferences.avoid,exclusions);
  assert.equal(getVideoQuickTemplateDraft("no-such-template","ru"),null);
  assert.equal(getVideoQuickTemplateDraft("gentle-pause","unknown").wish,
    VIDEO_QUICK_TEMPLATES.find(item=>item.id==="gentle-pause").wish.en);
  assert.equal(getVideoQuickTemplateDraft("gentle-pause","en","x".repeat(500)).preferences.avoid.length,140);
});

test("one-tap template buttons reuse the canonical preview/export, not a duplicate editor",()=>{
  const ui=readFileSync(new URL("../components/mandala-first-video-start.tsx",import.meta.url),"utf8");
  const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../components/mandala-first-video-start.module.css",import.meta.url),"utf8");
  const templateSource=readFileSync(new URL("../lib/mandala/video-quick-templates.mjs",import.meta.url),"utf8");
  assert.match(ui,/data-first-video-templates/);
  assert.match(ui,/data-first-video-template=\{template\.id\}/);
  assert.match(ui,/aria-pressed=\{selectedTemplateId===template\.id\}/);
  assert.match(ui,/getVideoQuickTemplateDraft\(templateId, locale, prefs\.avoid\)/);
  assert.match(ui,/onWishChange\(choice\.wish\)/);
  assert.match(ui,/apply\(choice\.wish, nextPrefs, "", 0\)/);
  assert.match(studio,/onApply=\{applyFirstVideoDraft\}/);
  assert.match(studio,/setCinematicPlan\(draft\.plan\)/);
  assert.match(studio,/new MediaRecorder\(/);
  assert.match(css,/\.templateStrip\{display:flex;gap:7px;overflow-x:auto/);
  assert.match(css,/\.templateCard\[aria-pressed="true"\]/);
  assert.doesNotMatch(templateSource,/\bfetch\s*\(|XMLHttpRequest|navigator\.sendBeacon|localStorage|checkout|xpDebit/);
  assert.ok(ui.indexOf("data-first-video-wish")<ui.indexOf("data-first-video-templates"));
  assert.ok(ui.indexOf("data-first-video-templates")<ui.indexOf("data-first-video-filters"));
});

test("quick 16:9, 9:16 and 1:1 buttons adjust the canonical director without separate renderer",()=>{
  const ui=readFileSync(new URL("../components/mandala-first-video-start.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../components/mandala-first-video-start.module.css",import.meta.url),"utf8");
  assert.match(ui,/data-first-video-quick-aspect-group/);
  assert.match(ui,/data-first-video-quick-aspect=\{format\}/);
  assert.match(ui,/aria-pressed=\{prefs\.aspect===format\}/);
  assert.match(ui,/onClick=\{\(\)=>changePreferences\(\{aspect:format\}\)\}/);
  assert.match(ui,/data-first-video-aspect/,"advanced format selector still shares current preferences");
  assert.match(css,/\.quickFormatButtons button\[aria-pressed="true"\]/);
  assert.ok(ui.indexOf("data-first-video-quick-aspect-group")<ui.indexOf("data-first-video-filters"));
});

test("LIVE regression: primary timeout must try distinct Gemini free model before unstable OpenRouter",async()=>{
  const {generateFreeFirstVideoPrompt,FIRST_VIDEO_GEMINI_MODEL,FIRST_VIDEO_GEMINI_ALT_MODEL}=
    await import("../lib/mandala/first-video-free-providers.mjs");
  const env={HH_FIRST_VIDEO_GEMINI_FREE_CONFIRMED:"true",
    HH_FIRST_VIDEO_OPENROUTER_FREE_CONFIRMED:"true",
    HH_COUNCIL_GEMINI_API_KEY:"test-only-google-credential",
    HH_COUNCIL_OPENROUTER_API_KEY:"test-only-openrouter-credential"};
  const sample={locale:"ru",wish:"Горы и облака над долиной",theme:"auto",
    style:"warm",aspect:"landscape",durationSeconds:20};
  assert.equal(FIRST_VIDEO_GEMINI_MODEL,"gemini-3.5-flash-lite");
  assert.equal(FIRST_VIDEO_GEMINI_ALT_MODEL,"gemini-3.1-flash-lite");
  const attempted=[];
  const result=await generateFreeFirstVideoPrompt(sample,env,async (url,options)=>{
    attempted.push(url);
    assert.ok(options.signal instanceof AbortSignal,"each attempt is time-bounded");
    if(attempted.length===1)throw Object.assign(new Error("synthetic timeout"),{name:"TimeoutError"});
    return {status:200,ok:true,text:async()=>JSON.stringify({
      candidates:[{content:{parts:[{text:"Медленные облака над открытыми горными вершинами. Четыре спокойных природных сцены, плавные переходы."}]}}],
    })};
  });
  assert.equal(result.model,FIRST_VIDEO_GEMINI_ALT_MODEL);
  assert.deepEqual(result.diagnostics,[{provider:"gemini_free",model:FIRST_VIDEO_GEMINI_MODEL,reason:"timeout"}]);
  assert.equal(attempted.length,2,"do not fall through to OpenRouter when second Gemini works");
  assert.match(attempted[0],/gemini-3\.5-flash-lite/);
  assert.match(attempted[1],/gemini-3\.1-flash-lite/);
  assert.ok(!JSON.stringify(result.diagnostics).includes(sample.wish),"never log user text");
});

test("Gemini returns truncated or invalid response: try second Gemini, never leak secrets",async()=>{
  const {generateFreeFirstVideoPrompt,FIRST_VIDEO_GEMINI_ALT_MODEL}=
    await import("../lib/mandala/first-video-free-providers.mjs");
  const env={HH_FIRST_VIDEO_GEMINI_FREE_CONFIRMED:"true",
    HH_COUNCIL_GEMINI_API_KEY:"test-only-google-credential"};
  const wish="Comida y paisajes";
  let count=0;
  const r=await generateFreeFirstVideoPrompt(
    {locale:"es",wish,theme:"auto",style:"warm",aspect:"landscape",durationSeconds:20},
    env,async()=>{
      count++;
      return count===1?{ok:true,status:200,text:async()=>JSON.stringify({candidates:[]})}
        :{ok:true,status:200,text:async()=>JSON.stringify({
          candidates:[{content:{parts:[{text:"Cosecha dorada y jardines cálidos. Cuatro escenas reales de la naturaleza, sin imágenes de platos o cocina."}]}}],
        })};
    });
  assert.equal(r.model,FIRST_VIDEO_GEMINI_ALT_MODEL);
  assert.deepEqual(r.diagnostics.map(d=>d.reason),["invalid_text"]);
  assert.ok(!JSON.stringify(r.diagnostics).includes(wish));
  assert.equal(count,2);
});

test("401 and 403 are shared Google key failures: skip secondary Gemini and use independent free router",async()=>{
  const {generateFreeFirstVideoPrompt}=await import("../lib/mandala/first-video-free-providers.mjs");
  const env={HH_FIRST_VIDEO_GEMINI_FREE_CONFIRMED:"true",
    HH_FIRST_VIDEO_OPENROUTER_FREE_CONFIRMED:"true",
    HH_COUNCIL_GEMINI_API_KEY:"test-only-google-credential",
    HH_COUNCIL_OPENROUTER_API_KEY:"test-only-openrouter-credential"};
  for(const status of [401,403,429]){
    let count=0;
    const result=await generateFreeFirstVideoPrompt(
      {locale:"en",wish:"Mountain sunrise",theme:"auto",style:"warm",aspect:"landscape",durationSeconds:20},env,
      async url=>{
        count++;
        if(count===1)return {ok:false,status};
        assert.match(url,/openrouter\.ai/,"a Google account failure must not call another Gemini");
        return {ok:true,status:200,text:async()=>JSON.stringify({
          choices:[{message:{content:"Open mountain sky and gentle sunrise. Four real scenes with calm transitions and quiet light."}}],
        })};
      });
    assert.equal(result.provider,"openrouter_free");
    assert.equal(count,2);
  }
});


test("Server-side optional Groq router is fail closed, free-only and priority configurable",async()=>{
  const {freeFirstVideoProviders,generateFreeFirstVideoPrompt,FIRST_VIDEO_GROQ_MODEL}=
    await import("../lib/mandala/first-video-free-providers.mjs");
  const {orderFreeTextProviders}=await import("../lib/ai/free-text-provider-route.mjs");
  const env={
    HH_FIRST_VIDEO_GEMINI_FREE_CONFIRMED:"true",
    HH_COUNCIL_GEMINI_API_KEY:"test-only-gemini-key-123",
    HH_FIRST_VIDEO_OPENROUTER_FREE_CONFIRMED:"true",
    HH_COUNCIL_OPENROUTER_API_KEY:"test-only-openrouter-key-123",
    HH_FIRST_VIDEO_GROQ_API_KEY:"test-only-groq-key-123",
    HH_FIRST_VIDEO_GROQ_FREE_CONFIRMED:"true",
    HH_FIRST_VIDEO_PROVIDER_ORDER:"groq_free,rogue_https://private.invalid,gemini_free",
  };
  assert.equal(FIRST_VIDEO_GROQ_MODEL,"openai/gpt-oss-20b");
  assert.deepEqual(freeFirstVideoProviders(env),
    ["groq_free","gemini_free","openrouter_free"]);
  assert.deepEqual(orderFreeTextProviders(["gemini_free","openrouter_free"],"bad,openrouter_free"),
    ["openrouter_free","gemini_free"]);
  assert.deepEqual(freeFirstVideoProviders({...env,HH_FIRST_VIDEO_GROQ_FREE_CONFIRMED:"false"}),
    ["gemini_free","openrouter_free"],"an API key alone never authorizes Groq");
  assert.deepEqual(freeFirstVideoProviders({...env,HH_FIRST_VIDEO_GROQ_API_KEY:""}),
    ["gemini_free","openrouter_free"],"a free flag alone never authorizes Groq");
  const urls=[];
  const result=await generateFreeFirstVideoPrompt(
    {locale:"es",wish:"Montañas al amanecer",theme:"auto",
      style:"warm",aspect:"landscape",durationSeconds:20},
    env,async (url,options)=>{
      urls.push(url);
      assert.equal(options.method,"POST");
      assert.equal(options.redirect,"error");
      assert.equal(options.headers.Authorization,"Bearer "+env.HH_FIRST_VIDEO_GROQ_API_KEY);
      const body=JSON.parse(options.body);
      assert.equal(body.model,FIRST_VIDEO_GROQ_MODEL);
      return {ok:true,status:200,text:async()=>JSON.stringify({
        choices:[{message:{content:"Montañas doradas bajo el sol. Cuatro planos sucesivos de luz y nubes, con transiciones suaves y sin escenas inventadas."}}],
      })};
    });
  assert.equal(result.provider,"groq_free");
  assert.equal(result.model,FIRST_VIDEO_GROQ_MODEL);
  assert.equal(urls.length,1);
  assert.deepEqual(urls,["https://api.groq.com/openai/v1/chat/completions"]);
  assert.ok(!JSON.stringify(result).includes(env.HH_FIRST_VIDEO_GROQ_API_KEY));
});

test("Groq 503 uses independent confirmed-free Gemini; no paid or arbitrary URL",async()=>{
  const {generateFreeFirstVideoPrompt}=await import("../lib/mandala/first-video-free-providers.mjs");
  const env={
    HH_FIRST_VIDEO_GROQ_FREE_CONFIRMED:"true",
    HH_FIRST_VIDEO_GROQ_API_KEY:"test-only-groq-key-123",
    HH_FIRST_VIDEO_GEMINI_FREE_CONFIRMED:"true",
    HH_COUNCIL_GEMINI_API_KEY:"test-only-gemini-key-123",
    HH_FIRST_VIDEO_PROVIDER_ORDER:"groq_free,gemini_free",
  };
  const urls=[];
  const r=await generateFreeFirstVideoPrompt(
    {locale:"en",wish:"Gentle sky and sunrise",theme:"auto",
      style:"warm",aspect:"landscape",durationSeconds:20},
    env,async url=>{
      urls.push(url);
      if(url.includes("api.groq.com"))return {ok:false,status:503};
      assert.match(url,/^https:\/\/generativelanguage\.googleapis\.com\//);
      return {ok:true,status:200,text:async()=>JSON.stringify({
        candidates:[{content:{parts:[{text:"A calm open sky at dawn, warming mountains, four gentle successive shots of real scenery, and soft light."}]}}],
      })};
    });
  assert.equal(r.provider,"gemini_free");
  assert.equal(urls.length,2);
  assert.deepEqual(r.diagnostics.map(x=>x.reason),["http_503"]);
  assert.ok(!JSON.stringify(r).includes(env.HH_FIRST_VIDEO_GROQ_API_KEY));
});


test("v1 schema preserves all eight creative filters, explicitly selected values and render options",()=>{
  const preferences={theme:"goals",style:"dream",aspect:"portrait",
    durationSeconds:60,motion:"dynamic",music:"meditation",caption:true,avoid:"море и ночь"};
  const request=makeFirstVideoPromptRequest({
    locale:"ru",wish:"Горы и свобода",preferences,selectedFields:[...FIRST_VIDEO_PROMPT_FILTER_KEYS],
    templateId:"morning-light",variant:2,manualPrompt:"Свет на горных вершинах",
    renderOptions:{quality:"fullhd",brightness:"bright",audioVolumePercent:42},
  });
  assert.equal(request.schemaVersion,FIRST_VIDEO_PROMPT_CONTRACT_VERSION);
  assert.equal(request.consent,true);
  for(const field of FIRST_VIDEO_PROMPT_FILTER_KEYS)
    assert.deepEqual(request[field],preferences[field],"filter lost: "+field);
  const parsed=parseFirstVideoPromptInput(JSON.parse(JSON.stringify(request)));
  assert.ok(parsed,"backend must accept the exact browser payload");
  assert.deepEqual(parsed.selectedFields,[...FIRST_VIDEO_PROMPT_FILTER_KEYS]);
  assert.equal(parsed.templateId,"morning-light");
  assert.equal(parsed.variant,2);
  assert.equal(parsed.manualPrompt,"Свет на горных вершинах");
  assert.deepEqual(parsed.renderOptions,{quality:"fullhd",brightness:"bright",audioVolumePercent:42});
  assert.equal(Object.hasOwn(request,"photoUrl"),false);
  assert.equal(Object.hasOwn(request,"uploadedAudio"),false);
  assert.equal(Object.hasOwn(request,"tests"),false);
});

test("v1 prompt context uses only verified local scene IDs and honors every parameter",()=>{
  const options={
    locale:"ru",wish:"Горы",preferences:{theme:"auto",style:"nature",aspect:"square",
      durationSeconds:30,motion:"dynamic",music:"none",caption:false,avoid:"море"},
    selectedFields:["style","aspect","motion","music","caption","avoid"],
    variant:1,renderOptions:{quality:"hd",brightness:"soft",audioVolumePercent:75},
  };
  const request=makeFirstVideoPromptRequest(options);
  const context=buildFirstVideoPromptContext(parseFirstVideoPromptInput(request));
  assert.equal(context.contractVersion,FIRST_VIDEO_PROMPT_CONTRACT_VERSION);
  assert.equal(context.visitorWish,"Горы");
  assert.equal(context.effectiveFilters.motion,"dynamic");
  assert.equal(context.effectiveFilters.music,"none");
  assert.equal(context.effectiveFilters.caption,false);
  assert.equal(context.effectiveFilters.avoid,"море");
  assert.equal(context.effectiveFilters.aspect,"square");
  assert.equal(context.effectiveFilters.durationSeconds,30);
  assert.equal(context.scenarioVariant,1);
  assert.deepEqual(context.localRendering,{quality:"hd",brightness:"soft",audioVolumePercent:75});
  assert.equal(context.verifiedLocalStoryboard.shotCount,4);
  assert.equal(context.verifiedLocalStoryboard.scenes[0].sceneId,"mountain-air");
  const allowed=new Set(context.availableSceneChoices.map(x=>x.sceneId));
  assert.ok(context.verifiedLocalStoryboard.scenes.every(x=>allowed.has(x.sceneId)));
  assert.ok(!context.availableSceneChoices.some(x=>/sea|ocean|wave|coast/i.test(x.visualCue)),
    "visual exclusion must constrain the catalog as well as the narrative");
  assert.ok(JSON.stringify(context).length<6500,"provider input remains bounded");
  assert.ok(!JSON.stringify(context).includes("photoUrl"));
});

test("v1 request rejects unknown personal data, invalid filters and injection-shaped structure",()=>{
  const base=makeFirstVideoPromptRequest({
    locale:"es",wish:"Naturaleza",preferences:{
      theme:"auto",style:"warm",aspect:"landscape",durationSeconds:20,
      motion:"slow",music:"none",caption:false,avoid:"",
    },
  });
  assert.equal(parseFirstVideoPromptInput(base)?.motion,"slow");
  assert.equal(parseFirstVideoPromptInput(base)?.caption,false);
  for(const extra of [
    {photoUrl:"blob:private"},{accountId:"account-123"},{medicalTests:{score:5}},
    {profile:{email:"someone@example.com"}},{wish:"x"},{avoid:"a".repeat(141)},
    {motion:"teleport"},{music:"expensive"},{caption:"true"},
    {schemaVersion:"unknown-v999"},{variant:100},{templateId:"forged-template"},
    {selectedFields:["theme","theme"]},{selectedFields:["secret"]},
    {manualPrompt:"secret\u0000injection"},
    {renderOptions:{quality:"1080p",brightness:"bright",audioVolumePercent:80}},
    {renderOptions:{quality:"hd",brightness:"bright",audioVolumePercent:101}},
    {renderOptions:{quality:"hd",brightness:"bright",audioVolumePercent:50,apiKey:"secret"}},
  ]){
    assert.equal(parseFirstVideoPromptInput({...base,...extra}),null,
      "should reject "+JSON.stringify(Object.keys(extra)));
  }
  const legacy={locale:"ru",wish:"Горы",theme:"auto",style:"warm",aspect:"landscape",durationSeconds:20};
  const old=parseFirstVideoPromptInput(legacy);
  assert.ok(old,"old production browsers need compatible defaults");
  assert.deepEqual([old.motion,old.music,old.caption,old.avoid,old.variant],["slow","none",false,"",0]);
});

test("Gemini and OpenRouter receive identical fully selected v1 creative brief with consent",async()=>{
  const {generateFreeFirstVideoPrompt,firstVideoSystemPrompt}=
    await import("../lib/mandala/first-video-free-providers.mjs");
  const input=parseFirstVideoPromptInput(makeFirstVideoPromptRequest({
    locale:"ru",wish:"Еда и овощи",preferences:{
      theme:"life",style:"nature",aspect:"portrait",durationSeconds:30,
      motion:"dynamic",music:"harmony",caption:true,avoid:"море",
    },
    selectedFields:["theme","style","aspect","durationSeconds","motion","music","caption","avoid"],
    renderOptions:{quality:"fullhd",brightness:"bright",audioVolumePercent:64},
  }));
  assert.match(firstVideoSystemPrompt("ru"),/explicitlySelectedFilters/);
  assert.match(firstVideoSystemPrompt("ru"),/effectiveFilters/);
  const seen=[];
  const env={HH_FIRST_VIDEO_GEMINI_FREE_CONFIRMED:"true",
    HH_FIRST_VIDEO_OPENROUTER_FREE_CONFIRMED:"true",
    HH_COUNCIL_GEMINI_API_KEY:"mock-gemini-only-key",
    HH_COUNCIL_OPENROUTER_API_KEY:"mock-openrouter-only-key"};
  const reply=await generateFreeFirstVideoPrompt(input,env,async(url,options)=>{
    const body=JSON.parse(options.body);
    const idea=url.includes("googleapis.com")
      ?body.contents[0].parts[0].text:body.messages[1].content;
    seen.push({url,context:JSON.parse(idea)});
    return seen.length===1?{status:429,ok:false}:{
      status:200,ok:true,text:async()=>JSON.stringify({
        choices:[{message:{content:"Золотое поле урожая и цветущий сад. Четыре существующих природных сцены в мягком свете и с плавными переходами."}}],
      }),
    };
  });
  assert.equal(reply.provider,"openrouter_free");
  assert.equal(seen.length,2);
  assert.deepEqual(seen[0].context,seen[1].context,"fallback lost selected filters");
  assert.equal(seen[0].context.effectiveFilters.motion,"dynamic");
  assert.equal(seen[0].context.effectiveFilters.music,"harmony");
  assert.equal(seen[0].context.effectiveFilters.caption,true);
  assert.equal(seen[0].context.effectiveFilters.avoid,"море");
  assert.equal(seen[0].context.localRendering.quality,"fullhd");
  assert.equal(seen[0].context.verifiedLocalStoryboard.scenes[0].sceneId,"golden-harvest");
  assert.ok(!seen[0].context.availableSceneChoices.some(x=>/cooking|dishes|kitchen/i.test(x.visualCue)));
});

test("UI sends complete filter contract; server retains consent, origin and rate gates",()=>{
  const ui=readFileSync(new URL("../components/mandala-first-video-start.tsx",import.meta.url),"utf8");
  const provider=readFileSync(new URL("../lib/mandala/first-video-free-providers.mjs",import.meta.url),"utf8");
  const route=readFileSync(new URL("../app/api/holistic-support/first-video-prompt/route.js",import.meta.url),"utf8");
  const editor=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  assert.match(ui,/makeFirstVideoPromptRequest\(\{/);
  assert.match(ui,/selectedFields:selectedFilterKeys,templateId:selectedTemplateId,variant/);
  assert.match(ui,/manualPrompt:mode==="manual"\?promptOverride:null/);
  assert.match(ui,/data-first-video-motion/);
  assert.match(ui,/data-first-video-caption/);
  assert.match(editor,/renderOptions=\{\{quality,brightness,audioVolumePercent:soundVolume\}\}/);
  assert.match(provider,/JSON\.stringify\(buildFirstVideoPromptContext\(input\)\)/);
  assert.match(route,/parseFirstVideoPromptInput\(body\)/);
  assert.match(route,/FIRST_VIDEO_PROMPT_ALLOWED_FIELDS/);
  assert.match(route,/requireSameOrigin\(request,config\)/);
  assert.match(route,/body\.consent!==true/);
  assert.match(route,/consumeRate\(config/);
  assert.doesNotMatch(ui,/photoUrl:|testResults:|profileId:/);
});
