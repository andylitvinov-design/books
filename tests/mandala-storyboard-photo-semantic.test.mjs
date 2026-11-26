import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {STORY_PHOTO_BY_ID,isTrustedStoryPhoto,STORY_DIRECTOR_PHOTOS,
 MYTUBE_SCENARIO_PHOTO_COVERAGE}
 from "../lib/mandala/story-photo-library.mjs";
import {storyboardPhotoReferences,illustrativeStoryboardPhotoReferences,
 STORYBOARD_ILLUSTRATION_STATUS}
 from "../lib/mandala/storyboard-photo-references.mjs";
import {sceneVisualCues,scoreScenePhoto}
 from "../lib/mandala/storyboard-visual-matcher.mjs";
import {suggestVideoConcept} from "../lib/mandala/auto-video-concept.mjs";
import {getVideoCreativeDirections,applyVideoCreativeDirection}
 from "../lib/mandala/video-creative-directions.mjs";
import {buildAlignedStorySceneGuides} from "../lib/mandala/storyboard-content-alignment.mjs";
const crossing=[
 {visual:"A solitary traveller follows a misty woodland path at dawn.",
  keywords:["person","path","forest"]},
 {visual:"A bridge spans a river; someone stands on the far bank.",
  keywords:["bridge","river","person"]},
 {visual:"A heavy bag is set down; one treasured object is placed in a pocket.",
  keywords:["bag","hands","ground"]},
 {visual:"Close-up of a foot stepping onto the wooden bridge.",
  keywords:["feet","bridge","walking"]},
 {visual:"A distant figure waits across the water by the bridge.",
  keywords:["person","bridge","distance"]},
 {visual:"Warm sunlight reaches the far woodland path.",
  keywords:["sunlight","path","people"]}
];
const option=(aspect,sceneGuides=crossing,avoidImagery=[])=>({
 scenarioId:"ready-relationship-s2",categoryId:"love-relationships",
 shotCount:6,aspect,sceneGuides,avoidImagery
});
test("The Crossing uses six topic-specific licensed, nonrepeating photos per aspect",()=>{
 assert.equal(STORY_DIRECTOR_PHOTOS.length,12);
 for(const aspect of ["portrait","landscape"]){
  const chosen=storyboardPhotoReferences(option(aspect));
  assert.equal(chosen.length,6);
  assert.ok(chosen.every(p=>p&&isTrustedStoryPhoto(p)&&p.orientation===aspect),aspect);
  assert.equal(new Set(chosen.map(p=>p.id)).size,6,aspect);
  assert.ok(chosen.every((p,i)=>scoreScenePhoto(p,crossing[i],{
   scenarioId:"ready-relationship-s2",aspect})!==null),aspect);
  assert.ok(chosen.every(p=>p.src==="/api/video/story-photo/"+p.id&&
    p.editorialScenarioId==="ready-relationship-s2"),aspect);
  assert.ok(chosen.every(p=>p.approval==="source_page_reviewed_actual_image_decode_required"));
 }
});
test("No abstract sentiment or unrelated love photo can satisfy a bridge/river action",()=>{
 const people=STORY_PHOTO_BY_ID.get("pexels-7132421");
 assert.equal(scoreScenePhoto(people,crossing[1],{scenarioId:"ready-relationship-s2"}),null);
 assert.equal(scoreScenePhoto(people,crossing[2],{scenarioId:"ready-relationship-s2"}),null);
 assert.equal(scoreScenePhoto(STORY_PHOTO_BY_ID.get("pexels-4413480"),crossing[2],{
  scenarioId:"ready-relationship-s2"}),null);
 assert.deepEqual(sceneVisualCues({visual:"Hope and love",keywords:[]}),[]);
});
test("An edited unmatchable object leaves a transparent media gap, no reused photo",()=>{
 const edited=crossing.map((x,i)=>i===2?{
  visual:"A train arrives at the station",keywords:["train","station"]}:x);
 for(const aspect of ["portrait","landscape"]){
  const photos=storyboardPhotoReferences(option(aspect,edited));
  assert.equal(photos.length,6);
  assert.equal(photos[2],null,"never replace a train with a bag/couple/forest");
  assert.equal(new Set(photos.filter(Boolean).map(p=>p.id)).size,photos.filter(Boolean).length);
 }
});
test("Avoid people and invalid selected media must not silently supply stock",()=>{
 const photos=storyboardPhotoReferences(option("landscape",crossing,["no people"]));
 assert.ok(photos.some(p=>p===null));
 assert.ok(photos.every(p=>!p||!p.tags.some(tag=>["person","people","walking"].includes(tag))));
 assert.equal(scoreScenePhoto(STORY_PHOTO_BY_ID.get("pexels-36085970"),crossing[0],
   {scenarioId:"wrong-story"}),null);
});
test("Studio passes actual selected action guides, selected aspect and preserves approval gate",()=>{
 const source=readFileSync(new URL("../components/mandala-automatic-storyboard.tsx",
  import.meta.url),"utf8");
 assert.match(source,/sceneGuides:guides\.scenes,aspect:photoOutputAspect/);
 assert.match(source,/photoApprovalRequired=hasSixPhotoReferences/);
 assert.match(source,/referencesDecoded/);
 assert.match(source,/depictedEventVerified:false as const/);
 assert.match(source,/data-storyboard-apply-reference-photos/);
 assert.match(source,/data-storyboard-reference-only/);
});

const localizedCrossing={
 ru:[
  "Одинокий путник идёт через туманный лес на рассвете.",
  "Мост над рекой; человек на дальнем берегу сохраняет дистанцию.",
  "Сумка остаётся на земле; один памятный предмет отправляется в карман.",
  "Крупно: нога ступает на мост и делает ещё один шаг.",
  "На другом берегу спокойно ждут, не зовут и не требуют.",
  "Свет озаряет дорожку за мостом; встречу зритель ещё не видит."
 ],
 es:[
  "Una persona camina por un sendero con niebla al amanecer.",
  "Un puente cruza el río; otra persona espera lejos, sin acercarse.",
  "La bolsa se queda en el suelo y un recuerdo pasa al bolsillo.",
  "Un pie se posa sobre el puente y da otro paso.",
  "La figura del otro lado espera sin presionar.",
  "La luz alcanza el camino del otro lado antes del encuentro."
 ]
};
test("RU/ES authored Crossing keeps all six scene-action matches in both formats",()=>{
 for(const [locale,actions] of Object.entries(localizedCrossing)){
  const guides=crossing.map((beat,i)=>({...beat,visual:actions[i]}));
  for(const aspect of ["portrait","landscape"]){
   const photos=storyboardPhotoReferences(option(aspect,guides));
   assert.equal(photos.length,6,locale+" "+aspect);
   assert.ok(photos.every(Boolean),locale+" "+aspect+" missing scene "+
    photos.findIndex(p=>!p));
   assert.equal(new Set(photos.map(p=>p.id)).size,6,locale+" "+aspect);
   assert.ok(photos.every((p,i)=>scoreScenePhoto(p,guides[i],{
    scenarioId:"ready-relationship-s2",aspect})!==null),locale+" "+aspect);
  }
 }
});
test("Russian distance is not a station; bridge behind final path is context",()=>{
 const cues=sceneVisualCues({visual:"Человек сохраняет дистанцию на другом берегу.",keywords:["person"]});
 assert.ok(!cues.includes("station"),"дистанцию must not produce станция");
 assert.ok(!sceneVisualCues({visual:"Свет на дорожке за мостом",
  keywords:["sunlight","path"]}).includes("bridge"));
 assert.ok(sceneVisualCues({visual:"Человек на станции ждёт поезд.",
  keywords:[]}).includes("station"),"genuine station must still match");
 assert.ok(sceneVisualCues({visual:"Человек ступает на мост.",
  keywords:[]}).includes("bridge"),"genuine bridge action stays strict");
});

test("the owner's new-skill story offers six work photos in EN/RU/ES without claiming filmed actions",()=>{
 for(const locale of ["en","ru","es"])for(const aspect of ["portrait","landscape"]){
  const base=suggestVideoConcept({locale,theme:"money",selectedTopicId:"income-growth"});
  const direction=getVideoCreativeDirections(base,locale)
   .find(item=>item.scenarioId==="income-growth-s2");
  assert.ok(direction);
  const film=applyVideoCreativeDirection(base,direction);
  const guides=buildAlignedStorySceneGuides({locale,goal:film.goal,concept:film});
  const options={scenarioId:film.scenarioId,categoryId:film.categoryId,aspect,
   shotCount:guides.scenes.length,avoidImagery:film.avoidImagery,
   userEditedFields:film.userEditedFields};
  // This was the production dead end. Do not fake exact action evidence.
  const exact=storyboardPhotoReferences({...options,sceneGuides:guides.scenes});
  assert.ok(exact.some(photo=>!photo));
  const photos=illustrativeStoryboardPhotoReferences(options);
  assert.equal(photos.length,6,locale+"/"+aspect);
  assert.equal(new Set(photos.map(photo=>photo.upstreamSrc)).size,6);
  assert.ok(photos.every(photo=>isTrustedStoryPhoto(photo)&&
   photo.id.startsWith("story-photo-office-")&&photo.labels[locale]));
  assert.ok(photos.every(photo=>!photo.tags.some(tag=>["money","finance","budget"].includes(tag))),
   "a work/learning story must not consist of six cash-counting photos");
 }
 assert.equal(STORYBOARD_ILLUSTRATION_STATUS,"illustrative_topic_photos_not_action_verified");
});

test("illustrative photo stories reuse only the selected canonical binding, never arbitrary category filler",()=>{
 for(const [scenarioId,binding] of Object.entries(MYTUBE_SCENARIO_PHOTO_COVERAGE)){
  const photos=illustrativeStoryboardPhotoReferences({scenarioId,categoryId:binding.categoryId});
  assert.equal(photos.length,6,scenarioId);
  assert.ok(photos.every(isTrustedStoryPhoto),scenarioId);
  assert.equal(new Set(photos.map(photo=>photo.upstreamSrc)).size,6,scenarioId);
  if(scenarioId!=="income-growth-s2")assert.deepEqual(photos.map(photo=>photo.id),binding.photoIds);
 }
 const options={scenarioId:"income-growth-s2",categoryId:"goals-money"};
 for(const change of [{scenarioId:"unknown"},{categoryId:"love-relationships"},
   {shotCount:5},{aspect:"square"},{avoidImagery:["no people"]},
   {avoidImagery:["без людей"]},{avoidImagery:["sin personas"]},{avoidImagery:["no forest"]},
   ...["mainMessage","conceptText","storyboard"].map(field=>({userEditedFields:[field]}))]){
  assert.deepEqual(illustrativeStoryboardPhotoReferences({...options,...change}),[],JSON.stringify(change));
 }
});

test("illustrative stills require visible review, actual decode and explicit application",()=>{
 const tab=readFileSync(new URL("../components/mandala-automatic-storyboard.tsx",import.meta.url),"utf8");
 const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
 assert.match(tab,/data-storyboard-reference-match=\{illustrativePhotos\?"illustrative":"scene"\}/);
 assert.match(tab,/data-storyboard-reference-title>\{reference\.labels\[locale\]\}/);
 assert.match(tab,/disabled=\{disabled\|\|!referencesDecoded\}/);
 assert.match(tab,/depictedEventVerified:false as const/);
 assert.match(tab,/loading="eager" decoding="async"/);
 assert.match(tab,/data-storyboard-retry-photos/);
 assert.match(tab,/references\.map\(photo=>photo\?\.id\|\|null\)/,
  "the accepted story signature must identify the actual ordered photos");
 assert.match(studio,/onSourceIssueChange=\{issue=>\{\s*storySourceIssueRef\.current=issue;/);
 assert.match(studio,/if\(storyRecoveryPendingRef\.current\)\{\s*storyRecoveryPendingRef\.current=false;\s*if\(storySourcePendingRef\.current\)revealPendingStoryApproval\(issue\);/);
 assert.match(studio,/const issue=reportedIssue\|\|storySourceIssueRef\.current/);
 assert.match(studio,/data-storyboard-choose-another-story/);
 assert.match(studio,/!storyChoicePendingRef\.current&&usingFreeFilmCompilation/,
  "a user-requested Story may not silently fall back to an old independent film");
 for(const kind of ["DraftChange","Approve"]){
  const start=studio.indexOf("on"+kind+"={",studio.indexOf("<MandalaVideoConcept"));
  assert.ok(start>0);
  const handler=studio.slice(start,start+400);
  assert.match(handler,/storyChoicePendingRef\.current=true;storySourcePendingRef\.current=true/,
   "a new explicit Story must block the previous movie even before Story mounts");
 }
});
