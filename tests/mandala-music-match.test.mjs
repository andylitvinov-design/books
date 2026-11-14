import test from "node:test";
import assert from "node:assert/strict";
import {rankPersonalMusic,MUSIC_MATCH_VERSION} from "../lib/mandala/music-match.mjs";
import {mandalaAudioTracks} from "../lib/mandala/audio-recommendations.mjs";
import {SCENARIO_AUDIO_REGISTRY,scenarioAudioTracks,classicalAudioTracks} from "../lib/mandala/scenario-audio-catalog.mjs";
import {curatedAudioTracks} from "../lib/mandala/curated-audio-recommendations.mjs";
const historical=[...SCENARIO_AUDIO_REGISTRY.flatMap(row=>scenarioAudioTracks(row.id)),...mandalaAudioTracks,...classicalAudioTracks];
const approvedIds=new Set(curatedAudioTracks.map(row=>row.id));

test("new music suggestions exclude every synthesized historical track",()=>{
 assert.equal(MUSIC_MATCH_VERSION,"hh-music-match-v1");
 assert.ok(historical.length>200);
 for(const theme of ["money","relationships","energy","goals","health","life"]){
  const ranked=rankPersonalMusic({tracks:[...historical,...curatedAudioTracks],theme,limit:300});
  assert.equal(ranked.length,curatedAudioTracks.length);
  assert.ok(ranked.every(row=>approvedIds.has(row.id)),theme);
  assert.equal(new Set(ranked.map(row=>row.id)).size,ranked.length);
 }
 assert.deepEqual(rankPersonalMusic({tracks:historical,theme:"goals"}),[]);
});

test("forged licensed IDs and disallowed rights fail closed",()=>{
 const actual=curatedAudioTracks[0];
 for(const candidate of [
   {...actual,id:"curated-invented"},
   {...actual,rights:{...actual.rights,license:"CC-BY-NC-4.0"}},
   {...actual,rights:{...actual.rights,sourcePage:"https://example.com/bad.mp3"}},
   {...actual,rights:undefined},
 ])assert.deepEqual(rankPersonalMusic({tracks:[candidate]}),[]);
 assert.equal(rankPersonalMusic({tracks:[{...actual}]}).length,1);
});

test("new voice-safe suggestions cannot fall back to synthetic beds",()=>{
 const ranked=rankPersonalMusic({tracks:[...historical,...curatedAudioTracks],
  voiceFriendly:true,theme:"health",limit:300});
 assert.ok(ranked.length>0);
 assert.ok(ranked.every(row=>row.voiceSafe&&approvedIds.has(row.id)));
 assert.deepEqual(rankPersonalMusic({tracks:mandalaAudioTracks,voiceFriendly:true}),[]);
});

test("RU/EN/ES goal matching is deterministic with real licensed tracks",()=>{
 for(const input of [
  {theme:"goals",wish:"Хочу ясно мыслить и двигаться к цели"},
  {theme:"relationships",wish:"Gentle, peaceful love"},
  {theme:"health",wish:"Descanso, calma y tranquilidad"},
 ]){
  const tracks=rankPersonalMusic({tracks:curatedAudioTracks,...input,limit:3});
  assert.ok(tracks.length>=1&&tracks.length<=3);
  assert.ok(tracks.every(row=>approvedIds.has(row.id)));
  assert.deepEqual(tracks,rankPersonalMusic({tracks:curatedAudioTracks,...input,limit:3}));
 }
});

test("UI offers one of three suggestions and preserves user voice/silence",async()=>{
 const {readFileSync}=await import("node:fs");
 const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
 const ideas=studio.slice(studio.indexOf('data-hypno-music'),
   studio.indexOf('id="phrase-audio-settings"'));
 assert.match(studio,/rankPersonalMusic\(\{tracks:rankedAudioPool/);
 assert.match(studio,/SCENARIO_AUDIO_REGISTRY\.flatMap\(\(scene:\{id:string\}\)=>scenarioAudioTracks\(scene\.id\)\)/);
 assert.match(studio,/const featuredMelodies=rankPersonalMusic/);
 assert.match(ideas,/featuredMelodies\.slice\(0,3\)/);
 assert.match(ideas,/onClick=\{\(\)=>choosePersonalMusic\(id\)\}/);
 assert.match(ideas,/data-phrase-music-play=\{id\}/);
 assert.match(studio,/if\(attachedAudio\?\.kind==="file"\)\{/);
 assert.match(studio,/changeMusicBed\(\{id:choice as MyTubeMusicBed\["id"\]\}\)/);
 assert.match(studio,/setAudioAuto\(false\);chooseMusic\("none"\);setAttachedAudio\(null\)/);
 assert.match(studio,/startPresetAudio\(attachedAudio\.id,soundVolume/);
});

test("personalized Music Match remains visible in Ideas Voice while legacy controls stay hidden",async()=>{
 const {readFileSync}=await import("node:fs");
 const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
 const hidden='.studio[data-active-workspace="phrases"] [data-ideas-subtab="voice"] [data-hypno-overview]>:not([data-hypno-voice]):not([data-personalized-music-match]):not(#phrase-audio-settings){display:none!important}';
 assert.ok(css.includes(hidden),"compact Ideas Voice must exclude personalized music from its hidden legacy child selector");
 assert.match(css,/\.studio\[data-active-workspace="phrases"\] \.phraseMusicSection\[data-personalized-music-match\]\{display:grid!important\}/,
   "the current 3 Music Match suggestions must remain visible");
});

test("post-export WebKit touch opens actual Montage Text and preserves stale narration safety",async()=>{
 const {readFileSync}=await import("node:fs");
 const script=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
 const index=script.indexOf("Phrase selection is now owned by the real Montage");
 assert.ok(index>0,"post-export phrase flow must exist");
 const journey=script.slice(index);
 assert.ok(journey.includes('if(engine==="webkit")await montageTextEntry.tap();'),
   "Safari must use a genuine visitor touch, not a swallowed synthetic click");
 assert.ok(journey.includes('else await montageTextEntry.click();'),
   "Chromium must retain the real click path");
 assert.ok(journey.includes('[data-video-quick-control="editor"]'),
   "verify Montage actually becomes selected");
 assert.ok(journey.includes('[data-video-montage-tab="text"]'),
   "verify the actual Text panel becomes selected");
 assert.ok(journey.includes('await expect(phraseEditor).toBeVisible({timeout:15000});'),
   "verify approved phrases visibly render before editing");
 assert.ok(journey.includes('[data-video-narration-reapproval]'),
   "never permit stale narration after a spoken phrase changes");
 assert.ok(journey.includes('toBeDisabled({timeout:15000})'),
   "a stale voice cannot be exported as an approved recording");
});
