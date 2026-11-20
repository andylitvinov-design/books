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
