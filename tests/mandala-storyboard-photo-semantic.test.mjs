import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {STORY_PHOTO_BY_ID,isTrustedStoryPhoto,STORY_DIRECTOR_PHOTOS}
 from "../lib/mandala/story-photo-library.mjs";
import {storyboardPhotoReferences}
 from "../lib/mandala/storyboard-photo-references.mjs";
import {sceneVisualCues,scoreScenePhoto}
 from "../lib/mandala/storyboard-visual-matcher.mjs";
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
