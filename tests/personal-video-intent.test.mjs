import assert from "node:assert/strict";
import { test } from "node:test";
import {readFileSync} from "node:fs";
import {suggestPersonalVideoScene,graphemeTrim,captionFromWish,PERSONAL_VIDEO_THEMES} from "../lib/mandala/personal-video-intent.mjs";

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
  assert.match(ui,/maxLength=\{160\}/);
  assert.match(ui,/id="personal-video-result"/);
});

test("native audio preview is user-clicked, media-controlled, and the selected audio fades during export",()=>{
  const ui=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  const audio=readFileSync(new URL("../lib/mandala/local-video-music.ts",import.meta.url),"utf8");
  assert.match(ui,/data-video-music-preview/);
  assert.match(ui,/data-video-music-volume/);
  assert.match(ui,/createAmbientPreviewWav\(music\)/);
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
