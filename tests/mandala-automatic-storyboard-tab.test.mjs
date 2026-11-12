import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import catalog from "../data/video-catalog/scene-taxonomy.json" with {type:"json"};
import original from "../data/video-catalog/original-motion-scenes-v1.json" with {type:"json"};
import {suggestVideoConcept} from "../lib/mandala/auto-video-concept.mjs";
import {
  planReviewedFilmedStory,isReviewedFilmedStoryScene,isReviewedFilmedStorySequence
} from "../lib/mandala/reviewed-filmed-story.mjs";

const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const tab=readFileSync(new URL("../components/mandala-automatic-storyboard.tsx",import.meta.url),"utf8");
const sources=[...catalog.scenes,...original.scenes];
const byId=new Map(sources.map(s=>[s.id,s]));

test("Montage Story uses the Ideas concept and only reviewed film, not the retired questionnaire",()=>{
 const montage=studio.split("data-video-montage-concept aria-label=")[1]
   .split("</section> : null}")[0];
 assert.match(montage,/MandalaAutomaticStoryboard/);
 assert.doesNotMatch(montage,/deepVideoDirectorPane/);
 assert.match(tab,/suggestVideoConcept/);
 assert.match(tab,/planReviewedFilmedStory/);
 assert.match(tab,/isReviewedFilmedStorySequence/);
 assert.match(tab,/data-video-story-graphics-detected/);
 assert.match(tab,/data-video-auto-storyboard-list/);
 assert.match(tab,/data-video-story-scene/);
 assert.match(tab,/data-reviewed-filmed-only/);
 assert.match(studio,/applyAutoFilm\(preset.id,duration,edit,"portrait",true\)/);
 const browser=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
 assert.match(browser,/automaticStoryboard=montageVideoConcept\.locator/);
 assert.match(browser,/data-video-story-scene/);
 assert.doesNotMatch(browser,/data-cinematic-director/);
});

test("30-second Story always uses six DISTINCT 5s verified filmed masters in all themes/languages",()=>{
 const categories=["goals-money","love-relationships","energy-confidence","stress-anxiety"];
 for(const categoryId of categories)for(const locale of ["ru","en","es"]){
   const plan=planReviewedFilmedStory({
     categoryId,locale,aspect:"portrait",durationSeconds:30,scenes:sources
   });
   assert.equal(plan.ok,true,categoryId+"/"+locale+": "+plan.status);
   assert.equal(plan.status,"REVIEWED_FILMED_STORYBOARD");
   assert.equal(plan.sourcePolicy,"filmed_editorially_verified_only");
   assert.equal(plan.shots.length,6);
   assert.deepEqual(plan.shots.map(s=>s.startMs),[0,5000,10000,15000,20000,25000]);
   assert.ok(plan.shots.every(s=>s.durationMs===5000&&!s.loopRequired));
   assert.equal(new Set(plan.shots.map(s=>s.sourceMasterKey)).size,6);
   assert.ok(plan.shots.every(s=>isReviewedFilmedStoryScene(byId.get(s.sceneId),"portrait")));
   assert.ok(plan.shots.every(s=>byId.get(s.sceneId)?.collection==="film-collection-v3"));
   assert.equal(plan.canExport,false);
   assert.equal(plan.publishAuthorized,false);
   assert.ok(isReviewedFilmedStorySequence({scenes:sources,aspect:"portrait",
      shots:plan.shots.map(s=>({sceneId:s.sceneId,startSeconds:s.startMs/1000,
        durationSeconds:s.durationMs/1000}))}));
 }
});

test("graphical MP4s, weak composites and forged licenses cannot enter the reviewed film plan",()=>{
 const graphical=original.scenes[0];
 const composite=catalog.scenes.find(s=>s.id==="lake-mist-dawn");
 const reviewed=catalog.scenes.find(s=>s.id==="sun-trees-forest");
 assert.ok(graphical);
 assert.ok(composite);
 assert.ok(reviewed);
 assert.equal(isReviewedFilmedStoryScene(graphical),false,"encoded animation is not camera footage");
 assert.equal(isReviewedFilmedStoryScene(composite),false,"unreviewed two-shot composite is not a filmed master");
 assert.equal(isReviewedFilmedStoryScene(reviewed),true);
 assert.equal(isReviewedFilmedStoryScene({...reviewed,technicalQuality:{...reviewed.technicalQuality,
   editorialApproved:false}}),false);
 assert.equal(isReviewedFilmedStoryScene({...reviewed,rightsReference:{
   ...reviewed.rightsReference,sourcePage:"https://unapproved.invalid/video/"}}),false);
 assert.equal(isReviewedFilmedStoryScene({...reviewed,poster:"https://example.com/art.jpg"}),false);
 const plan=planReviewedFilmedStory({
   categoryId:"energy-confidence",locale:"en",aspect:"portrait",durationSeconds:30,
   scenes:[graphical,composite,reviewed]
 });
 assert.equal(plan.ok,false);
 assert.equal(plan.status,"INSUFFICIENT_REVIEWED_FILMED_FOOTAGE");
 assert.deepEqual(plan.shots,[]);
});

test("previous montage with one illustrated shot cannot masquerade as reviewed footage",()=>{
 const plan=planReviewedFilmedStory({
   categoryId:"love-relationships",locale:"en",aspect:"portrait",durationSeconds:30,scenes:sources
 });
 assert.equal(plan.ok,true);
 const shots=plan.shots.map(s=>({
   sceneId:s.sceneId,startSeconds:s.startMs/1000,durationSeconds:s.durationMs/1000
 }));
 assert.ok(isReviewedFilmedStorySequence({shots,scenes:sources}));
 assert.equal(isReviewedFilmedStorySequence({
   shots:[...shots.slice(0,2),{...shots[2],sceneId:original.scenes[0].id},...shots.slice(3)],
   scenes:sources
 }),false);
 assert.equal(isReviewedFilmedStorySequence({
   shots:[shots[0],{...shots[1],sceneId:shots[0].sceneId}],
   scenes:sources
 }),false,"duplicate footage is not a second distinct shot");
 assert.equal(isReviewedFilmedStorySequence({
   shots:[{...shots[0],durationSeconds:7}],scenes:sources
 }),false,"do not stretch a five-second source");
});

test("no cartoon fallback for 60s when only eight distinct filmed sources exist",()=>{
 const plan=planReviewedFilmedStory({
  categoryId:"goals-money",locale:"ru",aspect:"portrait",durationSeconds:60,scenes:sources
 });
 assert.equal(plan.ok,false);
 assert.equal(plan.status,"INSUFFICIENT_REVIEWED_FILMED_FOOTAGE");
 assert.equal(plan.requiredUniqueMasters,12);
 assert.ok(plan.availableUniqueMasters<12);
 assert.equal(plan.shots.length,0);
});

test("love as an Ideas topic still produces six filmed story cards",()=>{
 const c=suggestVideoConcept({locale:"ru",goal:"любовь и отношения",theme:"relationships"});
 assert.equal(c.categoryId,"love-relationships");
 const plan=planReviewedFilmedStory({
   categoryId:c.categoryId,locale:"ru",aspect:"portrait",durationSeconds:30,scenes:sources
 });
 assert.equal(plan.ok,true);
 assert.equal(plan.shots.length,6);
 assert.ok(plan.shots.every(s=>byId.get(s.sceneId)?.media==="licensed_mp4"));
});
