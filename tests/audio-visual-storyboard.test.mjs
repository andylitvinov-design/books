import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {normalizeTimedTranscript,planAudioVisualStoryboard} from "../lib/mandala/audio-visual-storyboard.mjs";
import {stageVoiceStudioHandoff,consumeVoiceStudioHandoff} from "../lib/mandala/voice-studio-handoff.mjs";

const localCatalog=JSON.parse(readFileSync(
 new URL("../data/video-catalog/scene-taxonomy.json",import.meta.url),"utf8")).scenes;
const source=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
test("verified real timestamps are preserved and normalized",()=>{
 const transcript=normalizeTimedTranscript({duration:9.7,segments:[
  {start:0,end:2.6,text:"  Сначала лес  "},
  {start:2.6,end:5.1,text:"потом океан"},
  {start:5.1,end:9.7,text:"и наконец солнце"}]});
 assert.equal(transcript.durationSeconds,9.7);
 assert.equal(transcript.segments[1].startSeconds,2.6);
 assert.equal(transcript.segments[2].text,"и наконец солнце");
 assert.equal(transcript.text,"Сначала лес потом океан и наконец солнце");
});
test("no fabricated timing, no usable transcript from plain text alone",()=>{
 assert.equal(normalizeTimedTranscript({text:"forest sunshine"}),null);
 assert.equal(normalizeTimedTranscript({segments:[{start:4,end:3,text:"invalid"}]}),null);
 assert.equal(normalizeTimedTranscript({segments:[{start:1,end:2,text:"ok"},{start:0,end:1,text:"reversed"}]}),null);
});
test("long voice is never silently truncated to a 60 second video",()=>{
 const speech={text:"forest",durationSeconds:68,
  segments:[{startSeconds:0,endSeconds:68,text:"forest"}]};
 assert.equal(planAudioVisualStoryboard({transcript:speech,scenes:[]}).status,"AUDIO_LONGER_THAN_60_SECONDS");
});
test("unsupported aspect, absent real video masters and privacy guard",()=>{
 const speech={text:"лес",durationSeconds:9,segments:[{startSeconds:0,endSeconds:9,text:"лес"}]};
 assert.equal(planAudioVisualStoryboard({transcript:speech,scenes:[],aspect:"vertical"}).status,"INVALID_INPUT");
 assert.equal(planAudioVisualStoryboard({transcript:speech,scenes:[]}).status,"INSUFFICIENT_APPROVED_VIDEO");
 assert.match(source,/data-video-audio-transcribe/);
 assert.match(source,/planAudioVisualStoryboard/);
 assert.match(source,/applyAutoFilm/);
});

test("segment clock selects unique, licensed, physically verified footage",()=>{
 const transcript=normalizeTimedTranscript({duration:8.4,segments:[
   {start:0,end:2.2,text:"Сначала море"},
   {start:2.2,end:4.2,text:"потом лес"},
   {start:4.2,end:6.5,text:"золотое солнце"},
   {start:6.5,end:8.4,text:"смотрим на горы"}]});
 assert.ok(transcript);
 const plan=planAudioVisualStoryboard({
   transcript,scenes:localCatalog,aspect:"landscape",theme:"health",locale:"ru"});
 assert.equal(plan.canExport,true,plan.status);
 assert.equal(plan.durationSeconds,10);
 assert.equal(plan.shots.length,4);
 assert.deepEqual(plan.shots.map(shot=>shot.startSeconds),[0,3,6,8]);
 assert.deepEqual(plan.shots.map(shot=>shot.durationSeconds),[3,3,2,2]);
 assert.equal(new Set(plan.edit.clipIds).size,4);
 assert.ok(plan.shots[0].concepts.includes("water"));
 assert.ok(plan.prompt.includes("00:00–00:03"));
 assert.ok(plan.shots.every(shot=>localCatalog.some(scene=>scene.id===shot.sceneId)));
});
test("provider never transcribes without explicit free-project approval",()=>{
 const route=readFileSync(new URL(
   "../app/api/holistic-support/audio-storyboard/route.js",import.meta.url),"utf8");
 assert.match(route,/HH_AUDIO_STT_FREE_CONFIRMED/);
 assert.match(route,/HH_FIRST_VIDEO_GROQ_FREE_CONFIRMED/);
 assert.match(route,/timestamp_granularities\[\]/);
 assert.match(route,/consent/);
 assert.match(route,/MAX_AUDIO_BYTES=4\*1024\*1024/);
});

test("iHelp voice attachment hands off only through local one-use storage",async()=>{
 const chat=readFileSync(new URL("../components/holistic-agent-chat.tsx",import.meta.url),"utf8");
 assert.match(chat,/data-hh-voice-message-upload/);
 assert.match(chat,/data-hh-voice-transcribe/);
 assert.match(chat,/stageVoiceStudioHandoff/);
 assert.match(source,/consumeVoiceStudioHandoff/);
 assert.match(source,/data-video-audio-stt-consent/);
 assert.match(source,/data-video-audio-visual-plan/);
 assert.equal(await consumeVoiceStudioHandoff(),null);
});
test("public microphone is authorized ONLY at existing live host and Studio routes",()=>{
 const next=readFileSync(new URL("../next.config.ts",import.meta.url),"utf8");
 assert.match(next,/microphone=\(\), geolocation=\(\)/);
 assert.match(next,/\/ru\/holistic-support\/mandala/);
 assert.match(next,/\/es\/holistic-support\/mandala/);
});
