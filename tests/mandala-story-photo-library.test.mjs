import test from "node:test";
import assert from "node:assert/strict";
import {
 STORY_PHOTOS,STORY_BUSINESS_PHOTOS,STORY_WIKIMEDIA_PHOTOS,STORY_PHOTO_BY_ID,
 isTrustedStoryPhoto,chooseConceptStoryPhoto
} from "../lib/mandala/story-photo-library.mjs";
import {planReviewedStoryWithPhotos} from "../lib/mandala/reviewed-filmed-story.mjs";

test("Story photo catalog keeps Pexels and Wikimedia Commons sources and licenses separate",()=>{
 assert.equal(STORY_BUSINESS_PHOTOS.length,24);
 assert.ok(STORY_WIKIMEDIA_PHOTOS.length>=10);
 assert.equal(STORY_PHOTOS.length,STORY_BUSINESS_PHOTOS.length+STORY_WIKIMEDIA_PHOTOS.length);
 assert.equal(new Set(STORY_PHOTOS.map(photo=>photo.id)).size,STORY_PHOTOS.length);
 assert.ok(STORY_PHOTOS.every(isTrustedStoryPhoto));
 assert.ok(STORY_WIKIMEDIA_PHOTOS.every(photo=>
  photo.sourcePage.startsWith("https://commons.wikimedia.org/wiki/File:")&&
  photo.upstreamSrc.startsWith("https://commons.wikimedia.org/wiki/Special:Redirect/file/")&&
  ["CC0-1.0","CC-BY-2.0","CC-BY-4.0"].includes(photo.licenseId)&&photo.attribution));
});

test("love, stress, energy and body each have six distinct photograph candidates",()=>{
 for(const category of ["love","stress","energy","body"]){
  const photos=STORY_PHOTOS.filter(photo=>photo.categories.includes(category));
  assert.ok(photos.length>=6,category+" needs six unique source photos");
 }
 assert.equal(STORY_PHOTO_BY_ID.size,STORY_PHOTOS.length);
});

test("concept photo picker is category-scoped and honours no-people restrictions",()=>{
 const love=chooseConceptStoryPhoto({category:"love",description:"A couple walking together"});
 assert.ok(love&&love.categories.includes("love")&&isTrustedStoryPhoto(love));
 assert.equal(chooseConceptStoryPhoto({category:"love",description:"connection",avoid:["no people"]}),null);
 const business=chooseConceptStoryPhoto({category:"business",description:"team meeting documents"});
 assert.ok(business&&business.categories.includes("business"));
});

test("video-first planner creates six unique photos when a love/stress/energy clip is absent",()=>{
 for(const [categoryId,category,visual] of [
  ["love-relationships","love","couple connection trust"],
  ["stress-anxiety","stress","quiet reading rest safety"],
  ["energy-confidence","energy","stretching movement vitality"]
 ]){
  const plan=planReviewedStoryWithPhotos({
   categoryId,locale:"en",aspect:"portrait",durationSeconds:30,scenes:[],
   concept:{categoryId,goal:"A specific "+category+" concept"},
   sceneGuides:Array.from({length:6},(_,index)=>({visual,title:"Beat "+(index+1)}))
  });
  assert.equal(plan.ok,true,category);
  assert.equal(plan.mediaMix.video,0);
  assert.equal(plan.mediaMix.photo,6);
  assert.equal(plan.photoCategory,category);
  assert.equal(new Set(plan.shots.map(shot=>shot.sceneId)).size,6);
  assert.ok(plan.shots.every(shot=>shot.mediaKind==="licensed_photo"&&
   shot.photoSourcePage&&shot.photoAttribution&&shot.photoLicense));
 }
});
