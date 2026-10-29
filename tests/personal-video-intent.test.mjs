import assert from "node:assert/strict";
import { test } from "node:test";
import {readFileSync} from "node:fs";
import {suggestPersonalVideoScene,buildFreePromptStoryboard,freeStoryboardFrameAt,FREE_STORYBOARD_VERSION,graphemeTrim,captionFromWish,PERSONAL_VIDEO_THEMES} from "../lib/mandala/personal-video-intent.mjs";

const money=["golden-rain","cosmic-flow","abundance-tree","opportunity-falls","money-magnet",
  "path-to-goals","partners","infinite-flow","golden-shield","abundance-circle","life-gifts","dreams"];
const energy=["sun-flight","green-vortex","light-waterfall","gentle-shield"];
const love=["heart-light","warm-connection","blossom-garden","two-circles"];
const goals=["light-path","open-door","guiding-stars","meaning-tree"];
const suggest=(theme,wish,availableScenes,locale="ru")=>
  suggestPersonalVideoScene({theme,wish,locale,availableScenes});

test("all 24 existing visual scenes represented; never builds a second catalog",()=>{
  assert.deepEqual(PERSONAL_VIDEO_THEMES,["money","energy","life","health","relationships","goals"]);
  assert.equal(money.length+love.length+energy.length+goals.length,24);
});
test("RU personal money wishes choose corresponding artwork, preserving explicit category",()=>{
  assert.equal(suggest("money","Я принимаю достойную оплату за свой труд",money).sceneId,"money-magnet");
  assert.equal(suggest("money","Хочу новых клиентов и партнёров",money).sceneId,"partners");
  assert.equal(suggest("money","Я замечаю возможности",money).sceneId,"opportunity-falls");
  assert.equal(suggest("money","Хочу финансовой стабильности",money).sceneId,"golden-shield");
  assert.equal(suggest("money","Хочу больше любви",money).theme,"money");
});
test("RU 4 categories and clear visual fallbacks",()=>{
  assert.equal(suggest("relationships","Взаимная любовь и тепло",love).sceneId,"two-circles");
  assert.equal(suggest("energy","Дайте отдых и расслабление",energy).sceneId,"light-waterfall");
  assert.equal(suggest("goals","Я выбираю ясность и смысл",goals).sceneId,"guiding-stars");
  assert.deepEqual(suggest("goals","мне бы как-нибудь",goals),{
    theme:"goals",sceneId:"light-path",matched:false,reasonId:"default_scene",captionSuggestionId:"goals"});
});
test("EN/ES stems and explicit user control",()=>{
  assert.equal(suggest("money","Fair payment for my work",money,"en").sceneId,"money-magnet");
  assert.equal(suggest("money","Quiero nuevos clientes",money,"es").sceneId,"partners");
  assert.equal(suggest("relationships","Deseo amor con confianza",love,"es").sceneId,"warm-connection");
  assert.equal(suggest("goals","I want new beginnings",goals,"en").sceneId,"open-door");
});
test("only selects from available theme scenes, never arbitrary or absent scenes",()=>{
  assert.equal(suggest("money","больше клиентов",["golden-rain","abundance-tree"]).sceneId,"golden-rain");
  assert.equal(suggest("money","больше клиентов",["abundance-tree"]).sceneId,"abundance-tree");
  assert.throws(()=>suggest("money","заработок",["open-door"]),/no_available_video_scenes/);
  assert.throws(()=>suggest("money","заработок",[]),/no_available_video_scenes/);
  assert.throws(()=>suggest("no-theme","text",money),/invalid_video_intent/);
  assert.throws(()=>suggest("money","text",money,"xx"),/invalid_video_intent/);
});
test("wish and caption lengths count Unicode graphemes; original text not echoed as recommendation",()=>{
  const emojis="👩‍👩‍👧‍👧".repeat(175);
  assert.equal([...new Intl.Segmenter(undefined,{granularity:"grapheme"}).segment(graphemeTrim(emojis))].length,160);
  assert.equal([...new Intl.Segmenter(undefined,{granularity:"grapheme"}).segment(captionFromWish(emojis))].length,60);
  assert.equal(graphemeTrim("  one\n two  "), "one  two");
  const choice=suggest("energy","очень личный секрет, не передавать в CRM",energy);
  assert.doesNotMatch(JSON.stringify(choice),/секрет/);
});
test("pure local engine never posts, persists, processes photos or sends private health/identity data",()=>{
  const src=readFileSync(new URL("../lib/mandala/personal-video-intent.mjs",import.meta.url),"utf8");
  assert.doesNotMatch(src,/\bfetch\s*\(|XMLHttpRequest|FormData|sendBeacon|localStorage|sessionStorage|postMessage|api\.kling|supabase|google-analytics/i);
});
test("existing Mandala editor remains the sole renderer; UI wires independent wish and user override",()=>{
  const ui=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  assert.match(ui,/suggestPersonalVideoScene\(/);
  assert.match(ui,/data-video-wish/);
  assert.match(ui,/data-video-suggest/);
  assert.match(ui,/setMoneyScene\(recommended\.sceneId/);
  assert.match(ui,/setOtherScene\(recommended\.sceneId/);
  assert.match(ui,/maxLength=\{320\}/);
  assert.match(ui,/id="personal-video-result"/);
});

test("native audio preview is user-clicked, media-controlled, and the selected audio fades during export",()=>{
  const ui=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  const audio=readFileSync(new URL("../lib/mandala/local-video-music.ts",import.meta.url),"utf8");
  assert.match(ui,/data-video-music-preview/);
  assert.match(ui,/data-video-music-volume/);
  assert.match(ui,/presetAudioUrl\(music\)/);
  assert.match(ui,/data-video-audio-player/);
  assert.match(ui,/audioPreviewRef\.current/);
  assert.match(ui,/data-video-audio-upload/);
  assert.match(ui,/startUploadedAudio\(uploadedAudio\.file,soundVolume\)/);
  assert.match(ui,/startPresetAudio\(music,soundVolume\)/);
  assert.match(ui,/job\.musicSession\?\.fadeOut\(\)/);
  assert.match(audio,/if \(audible\) master\.connect\(context\.destination\)/);
  assert.match(audio,/linearRampToValueAtTime\(0, at \+ \.7\)/);
  assert.match(audio,/context\.createMediaStreamDestination\(\)/);
});

test("full HD energy, life and wellbeing suggestions remain local and multilingual",()=>{
  assert.equal(suggest("energy","Мне нужен заряд бодрости",["solar-surge","ocean-pulse"]).sceneId,"solar-surge");
  assert.equal(suggest("life","Я хочу свободу",["wildflower-dance","coastal-freedom"]).sceneId,"coastal-freedom");
  assert.equal(suggest("health","I want a calm pause",["calm-sea","morning-dew"],"en").sceneId,"calm-sea");
});


const story=(prompt,locale="ru",preferredTheme="energy",maxShots=3)=>
  buildFreePromptStoryboard({prompt,locale,preferredTheme,maxShots});

test("detailed RU scene instructions become an ordered 3-shot movie without a provider",()=>{
  const x=story("Сначала достойная оплата от клиентов, затем тёплая любовь, потом ясная цель");
  assert.equal(x.version,FREE_STORYBOARD_VERSION);
  assert.deepEqual(x.shots.map(s=>s.theme),["money","relationships","goals"]);
  assert.equal(x.shots[1].sceneId,"heart-light");
  assert.equal(x.shots[2].sceneId,"guiding-stars");
  assert.equal(x.matched,true);
  assert.ok(x.shots.every(s=>s.matched===true));
  assert.equal(JSON.stringify(x).includes("достойная"),false,"do not retain text or health data");
});

test("EN/ES instructions safely set format, duration and motion without paid video rendering",()=>{
  const en=story("Vertical 20 seconds: fair pay, then gentle love, then a clear goal","en","energy");
  assert.equal(en.options.aspect,"portrait");
  assert.equal(en.options.duration,20);
  assert.deepEqual(en.shots.map(s=>s.theme),["money","relationships","goals"]);
  const es=story("Vídeo horizontal 30 segundos: confianza, luego energía, luego objetivo","es","life");
  assert.equal(es.options.aspect,"landscape");
  assert.equal(es.options.duration,30);
  assert.ok(es.shots.length>=2&&es.shots.length<=3);
  assert.equal(story("Квадратное динамичное видео 10 сек о цели").options.aspect,"square");
  assert.equal(story("Квадратное динамичное видео 10 сек о цели").options.duration,10);
  assert.equal(story("Квадратное динамичное видео 10 сек о цели").options.speed,"dynamic");
});

test("unknown prompts use one explicitly chosen existing visual fallback, not an invented video",()=>{
  const x=story("невыразимая загадка", "ru","money");
  assert.deepEqual(x.shots,[{theme:"money",sceneId:"golden-rain",matched:false}]);
  assert.equal(x.matched,false);
  assert.throws(()=>story("test","unknown"),/invalid_video_storyboard/);
  assert.throws(()=>buildFreePromptStoryboard({prompt:"something",locale:"en",preferredTheme:"money",
    availableByTheme:{money:["not-a-real-scene"]}}),/no_available_video_scenes/);
  assert.ok(story("Любовь, затем деньги, потом отдых, после этого новые цели","ru","energy",12).shots.length<=3);
});

test("one shared deterministic frame timeline spans actual preview and encoded video",()=>{
  const shots=story("оплата, любовь, ясная цель").shots;
  assert.equal(shots.length,3);
  assert.equal(freeStoryboardFrameAt(shots,10,0).index,0);
  assert.equal(freeStoryboardFrameAt(shots,10,3.4).index,1);
  assert.equal(freeStoryboardFrameAt(shots,10,7.1).index,2);
  assert.ok(freeStoryboardFrameAt(shots,10,3.33).shade>.6,
    "actual scene transition fades through dark without requiring three HD decoders");
  assert.equal(freeStoryboardFrameAt(shots,10,10).index,2);
  assert.throws(()=>freeStoryboardFrameAt([],10,1),/invalid_video_storyboard_timeline/);
});

test("no duplicate editor: the same local recorder paints the storyboard in preview and export",()=>{
  const ui=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  assert.match(ui,/data-video-storyboard-build/);
  assert.match(ui,/data-video-storyboard-shot/);
  assert.match(ui,/data-video-storyboard-clear/);
  assert.match(ui,/paintFreeStoryboard\(ctx,image,freeStoryboard,0,duration/);
  assert.match(ui,/paintFreeStoryboard\(ctx,image,freeStoryboard,Math\.min\(duration/);
  assert.match(ui,/canvas\.captureStream\(framesPerSecond\)/);
  assert.match(ui,/const \[freeStoryboard,setFreeStoryboard\] = useState/);
  assert.match(ui,/setFreeStoryboard\(null\)/);
  assert.match(ui,/data-mandala-video-download/);
  assert.match(ui,/data-video-photo-consent/);
  assert.match(ui,/maxLength=\{320\}/);
});
