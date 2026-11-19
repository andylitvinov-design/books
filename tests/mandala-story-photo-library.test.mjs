import test from "node:test";
import assert from "node:assert/strict";
import {
 STORY_PHOTOS,STORY_BUSINESS_PHOTOS,STORY_WIKIMEDIA_PHOTOS,STORY_SCENARIO_PHOTOS,STORY_PHOTO_BY_ID,
 isTrustedStoryPhoto,chooseConceptStoryPhoto,isAllowedStoryPhotoResponseUrl
} from "../lib/mandala/story-photo-library.mjs";
import {planReviewedFilmedStory,planReviewedStoryWithPhotos} from "../lib/mandala/reviewed-filmed-story.mjs";

test("Story photo catalog keeps Pexels and Wikimedia Commons sources and licenses separate",()=>{
 assert.equal(STORY_BUSINESS_PHOTOS.length,25);
 assert.ok(STORY_WIKIMEDIA_PHOTOS.length>=22);
 assert.ok(STORY_PHOTO_BY_ID.has("story-photo-energy-park-leg-stretch"),
   "the stretching photo must survive its neighbouring catalog row");
 assert.ok(STORY_PHOTO_BY_ID.has("story-photo-relationship-couple-wall-unsplash"),
   "the couple photo must not be parsed as a subscript of the preceding row");
 assert.equal(STORY_PHOTOS.length,STORY_BUSINESS_PHOTOS.length+STORY_WIKIMEDIA_PHOTOS.length+STORY_SCENARIO_PHOTOS.length);
 assert.equal(new Set(STORY_PHOTOS.map(photo=>photo.id)).size,STORY_PHOTOS.length);
 assert.ok(STORY_PHOTOS.every(isTrustedStoryPhoto));
 assert.ok(STORY_WIKIMEDIA_PHOTOS.every(photo=>
  photo.sourcePage.startsWith("https://commons.wikimedia.org/wiki/File:")&&
  photo.upstreamSrc.startsWith("https://commons.wikimedia.org/wiki/Special:Redirect/file/")&&
  ["CC0-1.0","CC-BY-2.0","CC-BY-4.0","Public-Domain"].includes(photo.licenseId)&&photo.attribution));
 assert.ok(STORY_WIKIMEDIA_PHOTOS.every(photo=>photo.autoUseEligible===(photo.licenseId==="CC0-1.0"||photo.licenseId==="Public-Domain")));
});

test("love, stress, energy and body each have six distinct photograph candidates",()=>{
 for(const category of ["love","stress","energy","body"]){
  const photos=STORY_PHOTOS.filter(photo=>photo.categories.includes(category)&&photo.autoUseEligible===true);
  assert.ok(photos.length>=6,category+" needs six unique CC0/public-domain source photos");
 }
 assert.equal(STORY_PHOTO_BY_ID.size,STORY_PHOTOS.length);
});

test("concept photo picker is category-scoped and honours no-people restrictions",()=>{
 const love=chooseConceptStoryPhoto({category:"love",description:"A couple walking together"});
 assert.ok(love&&love.categories.includes("love")&&isTrustedStoryPhoto(love));
 const noPeople=chooseConceptStoryPhoto({category:"love",description:"connection",avoid:["no people"]});
 assert.ok(!noPeople||!noPeople.tags.some(tag=>["couple","friendship","people","person","woman","man","hands","relationship"].includes(tag)));
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
  assert.ok(plan.shots.every(shot=>STORY_PHOTO_BY_ID.get(shot.sceneId)?.autoUseEligible===true));
  assert.equal(plan.photoCategory,category);
  assert.equal(new Set(plan.shots.map(shot=>shot.sceneId)).size,6);
  assert.ok(plan.shots.every(shot=>shot.mediaKind==="licensed_photo"&&
   shot.photoSourcePage&&shot.photoAttribution&&shot.photoLicense));
 }
});

test("existing Story entrypoint automatically falls back to photos only on insufficient video coverage",()=>{
 const plan=planReviewedFilmedStory({
  categoryId:"love-relationships",locale:"en",aspect:"portrait",durationSeconds:30,scenes:[],
  goal:"A story about trust and connection",
  sceneGuides:Array.from({length:6},(_,i)=>({visual:"couple connection trust",title:"Beat "+(i+1)}))
 });
 assert.equal(plan.ok,true);
 assert.equal(plan.photoCategory,"love");
 assert.equal(plan.mediaMix.photo,6);
 assert.equal(new Set(plan.shots.map(shot=>shot.sceneId)).size,6);
 const invalid=planReviewedFilmedStory({categoryId:"not-a-real-category",locale:"en",
  aspect:"portrait",durationSeconds:30,scenes:[]});
 assert.equal(invalid.ok,false);
 assert.equal(invalid.status,"INVALID_FILMED_STORY_REQUEST");
});

test("Wikimedia thumbnail redirects are allowlisted without opening a generic image proxy",()=>{
 const wiki=STORY_PHOTO_BY_ID.get("story-photo-relationship-adult-couple-hands");
 const pexels=STORY_BUSINESS_PHOTOS[0];
 assert.ok(wiki&&pexels);
 for(const origin of ["https://thumb.wikimedia.org","https://upload.wikimedia.org"]){
  assert.equal(isAllowedStoryPhotoResponseUrl(wiki,origin+
   "/wikipedia/commons/thumb/9/9f/Adult_couple_holding_hands.jpg/960px-Adult_couple_holding_hands.jpg"),true);
 }
 for(const url of [
  "http://thumb.wikimedia.org/wikipedia/commons/9/9f/file.jpg",
  "https://thumb.wikimedia.org.evil.invalid/photo.jpg",
  "https://upload.wikimedia.org:444/photo.jpg",
  "https://example.com/photo.jpg","not a URL"
 ])assert.equal(isAllowedStoryPhotoResponseUrl(wiki,url),false,url);
 assert.equal(isAllowedStoryPhotoResponseUrl(pexels,
  "https://images.pexels.com/photos/6446309/pexels-photo-6446309.jpeg"),true);
 assert.equal(isAllowedStoryPhotoResponseUrl(pexels,
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9f/file.jpg"),false);
 assert.equal(isAllowedStoryPhotoResponseUrl({...wiki},
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9f/file.jpg"),false,
  "a forged record cannot bypass the exact catalog identity gate");
});
