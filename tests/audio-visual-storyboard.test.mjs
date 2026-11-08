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
 const helper=readFileSync(new URL("../lib/mandala/consented-audio-stt.ts",import.meta.url),"utf8");
 assert.match(helper,/if\(!consent\)throw Error\("AUDIO_STT_CONSENT_REQUIRED"\)/);
 assert.match(helper,/fetch\("\/api\/holistic-support\/audio-storyboard"/);
 assert.match(helper,/method:"POST",cache:"no-store",credentials:"same-origin"/);
 assert.match(helper,/form.append\("consent","yes"\)/);
 assert.match(source,/requestConsentedTimedTranscript\(entry.file,locale,sttConsent,controller.signal\)/);
 assert.doesNotMatch(source,/\bfetch\s*\(|\bFormData\b/);
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
 assert.match(next,/\/en\/app\/messages/);
 assert.match(next,/\/ru\/app\/messages/);
 assert.match(next,/\/es\/app\/messages/);
 assert.match(next,/camera=\(\), microphone=\(self\), geolocation=\(\)/);
});

test("recipient audio shows STT failure at step 2 and preserves local manual progress",()=>{
 const recipient=source.slice(source.indexOf("const recipientAudioPanel="),
   source.indexOf("const activateQuickWorkspace="));
 assert.ok(recipient.includes("data-video-recipient-audio-transcribe"));
 assert.ok(recipient.indexOf("data-video-recipient-audio-error")>
   recipient.indexOf("data-video-recipient-audio-transcribe"));
 assert.ok(recipient.indexOf("data-video-recipient-audio-error")<
   recipient.indexOf("data-video-recipient-audio-plan"));
 assert.equal(recipient.split("data-video-recipient-audio-error").length-1,1);
 assert.match(recipient,/data-video-recipient-audio-manual/);
 assert.match(source,/function goRecipientAudioToManualMontage\(\)/);
 assert.match(source,/setAttachedAudio\(\{kind:"file",file:entry\.file,id:entry\.url,nonLoop:true\}\)/);
 assert.match(source,/if\(recipientAudioSelected\)window\.requestAnimationFrame/);
});

test("macOS WebKit export selects visible mobile format and retains real encoder checks",()=>{
 const browser=readFileSync(new URL(
  "../scripts/benchmarking/first-video-live-export.mjs",import.meta.url),"utf8");
 assert.match(browser,/await portrait\.click\(\)/);
 assert.match(browser,/data-first-video-quick-aspect="portrait"/);
 assert.match(browser,/const openFilters=async/);
 assert.match(browser,/selectOption\('meditation'\)/);
 assert.match(browser,/readRealGuestVideo\(page/);
 assert.match(browser,/ffprobe/);
 assert.doesNotMatch(browser,/\.selectOption\('portrait'\)/);
 assert.doesNotMatch(browser,/\.click\(\{\s*force:\s*true/);
});

test("WebKit guest film identifies Safari UI state and preserves physical media gates",()=>{
 const browser=readFileSync(new URL("../scripts/benchmarking/first-video-live-export.mjs",import.meta.url),"utf8");
 assert.match(browser,/row\.phase='portrait-selection-confirmation'/);
 assert.match(browser,/LIVE_VIDEO_PORTRAIT_SELECTION_NOT_REFLECTED/);
 assert.match(browser,/root\.getClientRects\(\)\.length>0/);
 assert.match(browser,/fieldset\.waitFor\(\{state:'visible',timeout:15000\}\)/);
 assert.match(browser,/LIVE_VIDEO_FILTERS_DISABLED/);
 assert.match(browser,/firstVideoWidgets:/);
 assert.match(browser,/WEBKIT_MOVIE_EXPORT_LAST_PHASE/);
 assert.match(browser,/await portrait\.click\(\)/);
 assert.match(browser,/await first\.locator\('\[data-first-video-music\]'\)\.selectOption\('meditation'\)/);
 assert.match(browser,/readRealGuestVideo\(page/);
 assert.match(browser,/ffprobe/);
 assert.doesNotMatch(browser,/\.click\(\{\s*force:\s*true/);
});

test("approved 4-shot footage is never replaced by a selected style preview",()=>{
 const painter=source.slice(source.indexOf("function paintCinematicFrame("),
   source.indexOf("/** Each authored caption",source.indexOf("function paintCinematicFrame(")));
 assert.match(painter,/if\(storyboard\?\.version!==FREE_FILM_PLAN_VERSION\s*&&\s*montageStyleId/);
 assert.match(painter,/paintSelectedStyleShot\(ctx,styleVideo\)/);
 assert.match(painter,/paintStudioVisualGrade\(ctx,montageStyleId\|\|storyboard\.styleId\)/);
 assert.match(painter,/stockShotVideo:null/);
 assert.match(source,/const frame=freeFilmVideoAt\(time,true\)/);
 assert.match(source,/if\(usingFreeFilmCompilation&&!frame\)return false/);
});
