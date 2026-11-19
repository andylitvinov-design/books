import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import taxonomy from "../data/video-catalog/mytube-content-taxonomy-4x4x4-v2.json" with {type:"json"};
import {planExpressVideo,EXPRESS_VIDEO_RECIPE_VERSION}
 from "../lib/mandala/express-video-director.mjs";
import {getMyTubeScenarioPhotos,isTrustedStoryPhoto} from "../lib/mandala/story-photo-library.mjs";
import {curatedAudioTracks} from "../lib/mandala/curated-audio-recommendations.mjs";

test("256 subjects in RU/EN/ES have exactly six distinct licensed photo shots and approved soundtrack",()=>{
 const topics=taxonomy.categories.flatMap(c=>c.subcategories.flatMap(s=>s.topics));
 assert.equal(topics.length,64);
 const scenarioIds=topics.flatMap(t=>t.scenarios.map(s=>s.id));
 assert.equal(scenarioIds.length,256);
 assert.equal(new Set(scenarioIds).size,256);
 for(const scenarioId of scenarioIds){
  const photos=getMyTubeScenarioPhotos(scenarioId);
  assert.equal(photos.length,6,scenarioId);
  assert.ok(photos.every(photo=>isTrustedStoryPhoto(photo)&&photo.durationSeconds===10));
 }
 for(const lang of ["ru","en","es"])for(const topic of topics){
  const recipe=planExpressVideo({locale:lang,goal:topic.label[lang],
   selectedTopicId:topic.id});
  assert.equal(recipe.canRender,true,lang+":"+topic.id+":"+recipe.reason);
  assert.equal(recipe.version,EXPRESS_VIDEO_RECIPE_VERSION);
  assert.equal(recipe.durationSeconds,30);
  assert.equal(recipe.aspect,"portrait");
  assert.equal(recipe.clipIds.length,6);
  assert.equal(new Set(recipe.clipIds).size,6);
  assert.deepEqual(recipe.durationSecondsByStage,[5,5,5,5,5,5]);
  assert.equal(recipe.captionTexts.length,6);
  assert.equal(recipe.evidence,"scenario_editorial_photos_license_checked_not_literal_action_review");
  assert.ok(recipe.photos.every(x=>getMyTubeScenarioPhotos(recipe.scenarioId)
   .some(y=>y.id===x.id&&isTrustedStoryPhoto(y))));
  assert.ok(curatedAudioTracks.some(x=>x.id===recipe.musicId));
 }
});
test("meditation preserves one original non-looping recording with an approved quiet music bed",()=>{
 const transcript={text:"Я ищу спокойствия и отдыха",durationSeconds:56.4,
  segments:[{startSeconds:0,endSeconds:10,text:"Хочу спокойствия"},
   {startSeconds:10,endSeconds:20,text:"Отпускаю напряжение"},
   {startSeconds:40,endSeconds:56.4,text:"Мягкое завершение"}]};
 const plan=planExpressVideo({locale:"ru",goal:"Тихая аудиомедитация",
   theme:"health",transcript,hasAudio:true,audioDurationSeconds:56.4});
 assert.equal(plan.canRender,true,plan.reason);
 assert.equal(plan.durationSeconds,60);
 assert.deepEqual(plan.durationSecondsByStage,[10,10,10,10,10,10]);
 assert.equal(plan.withOriginalAudio,true);
 assert.equal(plan.audioStatus,"original_audio_non_looping");
 assert.equal(plan.transcriptUsed,true);
 assert.ok(plan.captionTexts.every(x=>x===""));
 assert.ok(plan.musicId===null||curatedAudioTracks.some(x=>x.id===plan.musicId&&x.voiceSafe));
 assert.ok(plan.musicBedVolumePercent<=15);
 assert.equal(new Set(plan.clipIds).size,6);
 const noTranscript=planExpressVideo({locale:"en",hasAudio:true,audioDurationSeconds:20,
   goal:"Quiet nature meditation"});
 assert.equal(noTranscript.canRender,true,noTranscript.reason);
 assert.equal(noTranscript.transcriptUsed,false);
 assert.equal(noTranscript.durationSeconds,30);
 assert.equal(planExpressVideo({hasAudio:true,audioDurationSeconds:null}).reason,"AUDIO_DURATION_UNKNOWN");
 assert.equal(planExpressVideo({hasAudio:true,audioDurationSeconds:78}).reason,"AUDIO_OVER_59_SECONDS");
});
test("privacy, exclusions and one-click production contract",()=>{
 const source=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
 const photos=readFileSync(new URL("../lib/mandala/story-photo-library.mjs",import.meta.url),"utf8");
 assert.match(source,/planExpressVideo\(/);
 assert.match(source,/data-video-express-create/);
 assert.match(source,/data-video-recipient-express-create/);
 assert.match(source,/flushSync\(\(\)=>\{/);
 assert.match(source,/expressRenderRef\.current\(\)/);
 assert.match(source,/onClick=\{generateExpressFromCurrent\}/);
 assert.match(source,/setReadyGenerationPending\(true\)/);
 assert.match(source,/setActiveWorkspace\("ready"\)/);
 assert.match(source,/setMusicBed\(/);
 assert.match(source,/nonLoop:true/);
 assert.match(source,/creditCatalog\?\.chargeRequired/);
 assert.match(photos,/durationSeconds:10,/);
 const express=source.slice(source.indexOf("const generateExpressFromCurrent="),
  source.indexOf("const generateFromGoal=",source.indexOf("const generateExpressFromCurrent=")));
 assert.ok(express.length>1000);
 assert.doesNotMatch(express,/setTimeout\(/,"one click must not be deferred beyond Safari user activation");
 const denied=planExpressVideo({goal:"No ocean, without water",theme:"life"});
 assert.ok(denied.reason==="SCENARIO_IMAGERY_EXCLUDED"||denied.canRender);
});
