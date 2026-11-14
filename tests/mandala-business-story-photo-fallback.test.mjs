import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import catalog from "../data/video-catalog/scene-taxonomy.json" with {type:"json"};
import original from "../data/video-catalog/original-motion-scenes-v1.json" with {type:"json"};
import {planReviewedStoryWithPhotos,isReviewedStoryWithPhotosSequence} from "../lib/mandala/reviewed-filmed-story.mjs";
import {STORY_BUSINESS_PHOTOS,STORY_PHOTO_BY_ID,isTrustedStoryPhoto,
  chooseBusinessStoryPhoto} from "../lib/mandala/story-photo-library.mjs";
const code=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const ui=readFileSync(new URL("../components/mandala-automatic-storyboard.tsx",import.meta.url),"utf8");
const route=readFileSync(new URL("../app/api/video/story-photo/[id]/route.ts",import.meta.url),"utf8");
const scenes=[...catalog.scenes,...original.scenes];
const business={
 categoryId:"goals-money",
 goal:"I want recognition for my hard work and to ask my manager for a salary increase",
 sceneOutline:["Useful work stays unseen","Evidence goes into a folder",
 "Value is shown in a meeting","A specific pay request"],
 avoidImagery:[],
};
test("25 individually sourced real business photographs, not illustrated MP4s",()=>{
 assert.equal(STORY_BUSINESS_PHOTOS.length,25);
 assert.equal(new Set(STORY_BUSINESS_PHOTOS.map(p=>p.id)).size,25);
 assert.equal(new Set(STORY_BUSINESS_PHOTOS.map(p=>p.sourcePage)).size,25);
 assert.equal(new Set(STORY_BUSINESS_PHOTOS.map(p=>p.upstreamSrc)).size,25);
 for(const p of STORY_BUSINESS_PHOTOS){
   assert.equal(isTrustedStoryPhoto(p),true);
   assert.equal(p.media,"licensed_photo");
   assert.equal(p.visualOrigin,"real_camera_photo");
   assert.ok(p.src.startsWith("/api/video/story-photo/"));
   assert.match(p.sourcePage,/^https:\/\/www\.pexels\.com\/photo\/[a-z0-9-]+\/$/);
   assert.equal(p.licenseUrl,"https://www.pexels.com/license/");
   assert.ok(p.labels.ru&&p.labels.en&&p.labels.es);
 }
 assert.equal(isTrustedStoryPhoto({...STORY_BUSINESS_PHOTOS[0]}),false,
   "A forged photo object cannot enter the built-in allowlist");
 assert.notEqual(chooseBusinessStoryPhoto({description:"salary negotiation",stage:3})?.id,null);
});

test("30-second work/story uses six real business photos instead of irrelevant nature footage",()=>{
 for(const locale of ["ru","en","es"]){
   const plan=planReviewedStoryWithPhotos({
     concept:business,categoryId:"goals-money",locale,
     aspect:"portrait",durationSeconds:30,scenes
   });
   assert.equal(plan.ok,true,plan.status);
   assert.equal(plan.shots.length,6);
   assert.equal(plan.totalPlannedMs,30000);
   assert.deepEqual(plan.shots.map(x=>x.startMs),[0,5000,10000,15000,20000,25000]);
   assert.deepEqual(plan.shots.map(x=>x.durationMs),[5000,5000,5000,5000,5000,5000]);
   assert.equal(plan.mediaMix.photo,6,"natural landscapes must not be called business videos");
   assert.equal(plan.videoCandidates,0);
   assert.equal(plan.photoCandidates,25);
   assert.equal(new Set(plan.shots.map(x=>x.sourceMasterKey)).size,6);
   assert.equal(STORY_PHOTO_BY_ID.get(plan.shots[0].sceneId)?.stage,0,
     "opening work must not be illustrated by salary-contract paperwork");
   assert.equal(STORY_PHOTO_BY_ID.get(plan.shots[5].sceneId)?.stage,3,
     "salary negotiation belongs only in the concluding action");
   assert.ok(plan.shots.every(shot=>shot.sourceKind==="photo"&&
     STORY_PHOTO_BY_ID.has(shot.sceneId)&&!shot.loopRequired));
   assert.equal(isReviewedStoryWithPhotosSequence({scenes,aspect:"portrait",
      shots:plan.shots.map(s=>({sceneId:s.sceneId,startSeconds:s.startMs/1000,
        durationSeconds:s.durationMs/1000}))}),true);
   assert.equal(plan.canExport,false,"editorial plan is not a verified finished MP4");
 }
});

test("tampered/duplicate or overlong stock-photo storyboard is rejected",()=>{
 const first=STORY_BUSINESS_PHOTOS[0].id,second=STORY_BUSINESS_PHOTOS[1].id;
 const shots=[first,second,STORY_BUSINESS_PHOTOS[2].id,STORY_BUSINESS_PHOTOS[3].id]
   .map((sceneId,i)=>({sceneId,startSeconds:i*5,durationSeconds:5}));
 assert.equal(isReviewedStoryWithPhotosSequence({shots,scenes}),true);
 assert.equal(isReviewedStoryWithPhotosSequence({shots:[shots[0],shots[0],shots[2],shots[3]],scenes}),false);
 assert.equal(isReviewedStoryWithPhotosSequence({shots:[{...shots[0],durationSeconds:6},...shots.slice(1)],scenes}),false);
 assert.equal(isReviewedStoryWithPhotosSequence({shots:[{...shots[0],sceneId:"photo-external-url"},...shots.slice(1)],scenes}),false);
});

test("existing nonbusiness reviewed footage is preserved and new photo proxy fails closed",()=>{
 const p=planReviewedStoryWithPhotos({
   concept:{categoryId:"stress-anxiety",goal:"I want to relax"},
   categoryId:"stress-anxiety",aspect:"portrait",durationSeconds:30,scenes
 });
 assert.equal(p.ok,true);assert.equal(p.mediaMix.photo,0);
 assert.ok(p.shots.every(shot=>shot.mediaKind==="licensed_mp4"));
 assert.match(route,/STORY_PHOTO_BY_ID\.get\(id\)/);
 assert.match(route,/isTrustedStoryPhoto/);
 assert.match(route,/redirect:"error"/);
 assert.match(route,/MAX_BYTES/);
 assert.match(route,/image\/jpeg/);
 assert.match(code,/paintStoryboardStill/);
 assert.match(code,/activeStoryboardPhotos/);
 assert.match(code,/freeFilmPhotoRefs/);
 assert.match(code,/STORY_PHOTO_BY_ID/);
 assert.match(code,/await image\.decode\(\)/);
 assert.match(code,/verifiedMixedPhotoSubset:true/);
 assert.match(code,/hasStoryboardPhotoAt\(frameTime\)/);
 assert.match(code,/!frame&&!hasStoryboardPhotoAt\(time\)/);
 assert.match(ui,/planReviewedStoryWithPhotos/);
 assert.match(ui,/isReviewedStoryWithPhotosSequence/);
 assert.match(ui,/data-story-media-kind/);
});

test("generic personal growth does not become workplace photos in RU/EN/ES",()=>{
 const personal=[
   ["en","I want personal growth and inner peace"],
   ["ru","Я хочу личностного роста и внутреннего спокойствия"],
   ["es","Quiero crecimiento personal y paz interior"]
 ];
 for(const [locale,goal] of personal){
   const plan=planReviewedStoryWithPhotos({
     concept:{categoryId:"goals-money",goal,sceneOutline:[],avoidImagery:[]},
     categoryId:"goals-money",locale,aspect:"portrait",durationSeconds:30,scenes
   });
   assert.equal(plan.mediaMix.photo,0,"personal goals do not request stock office workers");
   assert.ok(!plan.shots?.some(shot=>STORY_PHOTO_BY_ID.has(shot.sceneId)));
 }
});

test("requested people exclusion never inserts a stock employee",()=>{
 const result=chooseBusinessStoryPhoto({
   description:"Salary negotiation",stage:3,avoid:["no people"]
 });
 assert.equal(result,null);
});

test("encoded video may paint real decoded photos but cannot fake a missing scene",()=>{
 assert.match(code,/await image\.decode\(\)/);
 assert.match(code,/image\.naturalWidth<600/);
 assert.match(code,/resolved\.origin!==window\.location\.origin/);
 assert.match(code,/!frame&&!hasStoryboardPhotoAt\(time\)/);
 assert.match(code,/paintCinematicFrame/);
 assert.match(code,/activeStoryboardPhotos/);
});
