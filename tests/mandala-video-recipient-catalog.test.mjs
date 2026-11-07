import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import originalMotion from "../data/video-catalog/original-motion-scenes-v1.json" with {type:"json"};
import {planMyTubeCategory,verifiedCategorySource,verifiedSceneAspect} from "../lib/mandala/category-video-storyboard.mjs";
import {
 RECIPIENT_VIDEO_KIND_IDS,getRecipientVideoKind,listRecipientVideoKinds,
 listRecipientVideoOccasions,buildRecipientVideoBrief,
 classifyRecipientVideoWish,buildRecipientVideoCaptions
} from "../lib/mandala/video-recipient-catalog.mjs";
const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const director=read("../components/mandala-auto-video-director.tsx");
const studio=read("../components/mandala-free-video-studio.tsx");
const css=read("../components/mandala-auto-video-director.module.css");
const audio=read("../components/mandala-recipient-audio-entry.tsx");

test("exactly three For others cards and unchanged For self taxonomy",()=>{
 assert.deepEqual(RECIPIENT_VIDEO_KIND_IDS,["greeting-gift","presentation","audio-content"]);
 for(const locale of ["ru","en","es"]){
  const kinds=listRecipientVideoKinds(locale);
  assert.equal(kinds.length,3);
  assert.ok(kinds.every(k=>k.label&&k.description));
  assert.equal(kinds.find(k=>k.id==="audio-content").requiresAudio,true);
 }
 assert.match(director,/const videoGoalCategories=\[/);
 assert.match(director,/videoAudience==="self"\?<[\s\S]*?data-auto-video-category=\{item.id\}/);
 assert.match(director,/data-auto-video-audience=\{mode\}/);
 assert.match(director,/data-auto-video-recipient-kind=\{item.id\}/);
 assert.match(director,/data-auto-video-recipient-occasion=\{item.id\}/);
 assert.match(director,/MandalaRecipientAudioEntry/);
 assert.match(studio,/<MandalaAutoVideoDirector/);
 assert.match(css,/\.recipientAudioPanel\{/);
});

test("combined greeting+gift shares one category with occasions and preserves presentations",()=>{
 for(const locale of ["ru","en","es"]){
  const greeting=listRecipientVideoOccasions("greeting-gift",locale);
  const presentation=listRecipientVideoOccasions("presentation",locale);
  assert.equal(greeting.length,8);
  assert.equal(presentation.length,4);
  assert.equal(new Set(greeting.map(x=>x.id)).size,8);
  assert.ok(greeting.every(x=>x.label));
  assert.deepEqual(listRecipientVideoOccasions("audio-content",locale),[]);
  assert.equal(getRecipientVideoKind("gift").id,"greeting-gift");
  assert.equal(getRecipientVideoKind("greeting").id,"greeting-gift");
  assert.deepEqual(buildRecipientVideoCaptions({kindId:"audio-content",locale}),["","","",""]);
 }
});

test("voice content classification is distinct from gift and presentation",()=>{
 assert.deepEqual(classifyRecipientVideoWish("Поздравь сестру с днём рождения"),
  {kindId:"greeting-gift",occasionId:"birthday",confidence:"keyword"});
 assert.deepEqual(classifyRecipientVideoWish("Подарок другу"),
  {kindId:"greeting-gift",occasionId:"friendship",confidence:"keyword"});
 assert.deepEqual(classifyRecipientVideoWish("Presentation of my project"),
  {kindId:"presentation",occasionId:"project",confidence:"keyword"});
 assert.deepEqual(classifyRecipientVideoWish("Видеоряд на основе аудиозаписи"),
  {kindId:"audio-content",occasionId:"",confidence:"keyword"});
 assert.equal(classifyRecipientVideoWish("хочу больше уверенности"),null);
 assert.equal(buildRecipientVideoCaptions({kindId:"presentation",occasionId:"project",
  wish:"Project",locale:"ru"})[1],"Project");
 assert.match(buildRecipientVideoBrief({kindId:"greeting-gift",occasionId:"birthday",
  wish:"Сестре",locale:"ru"}),/Сестре/);
});

test("audio upload appears in Goal and requires rights, explicit STT consent and review",()=>{
 for(const selector of ["data-video-recipient-audio-upload",
   "data-video-recipient-audio-rights","data-video-recipient-audio-stt-consent",
   "data-video-recipient-audio-analyze","data-video-recipient-audio-transcript",
   "data-video-recipient-audio-concept","data-video-recipient-audio-prepare"])
   assert.ok(audio.includes(selector),selector);
 assert.match(director,/recipientKindId==="audio-content"/);
 assert.match(director,/recipientAudio\.onPrepare\(\)/);
 assert.match(studio,/setVoiceVisualPlan\(planAudioVisualStoryboard\(/);
 assert.match(studio,/requestConsentedTimedTranscript\(entry\.file,locale,sttConsent,controller\.signal\)/);
 assert.match(studio,/onPrepare:\(\)=>applyTranscriptVideo\(voiceTranscript\?\?undefined,true\)/);
 assert.match(studio,/nonLoop:true/);
 assert.match(audio,/plan\?\.shots\.flatMap\(shot=>shot\.concepts\)/);
 assert.doesNotMatch(audio,/fetch\(/);
});

test("recipient videos use physical 9:16 licensed sources",()=>{
 assert.ok(originalMotion.scenes.length>=684);
 const plan=planMyTubeCategory({categoryId:"energy-confidence",aspect:"portrait",
  durationSeconds:30,locale:"ru",scenes:originalMotion.scenes});
 assert.equal(plan.ok,true,plan.status);
 assert.equal(plan.shots.length,6);
 const byId=new Map(originalMotion.scenes.map(scene=>[scene.id,scene]));
 for(const shot of plan.shots){
  const source=verifiedCategorySource(byId.get(shot.sceneId));
  assert.ok(source);assert.ok(verifiedSceneAspect(source,"portrait"));
  assert.equal(verifiedSceneAspect(source,"landscape"),false);
  assert.ok(shot.durationMs<=source.durationSeconds*1000);
 }
 assert.match(director,/onAspectChange\?\.\("portrait"\)/);
 assert.match(director,/selfAspectRef\.current=aspect/);
 assert.match(director,/onAspectChange\?\.\(selfAspectRef\.current\)/);
});
