import test from "node:test";
import assert from "node:assert/strict";
import {assignNarrativeShotSources} from "../lib/mandala/narrative-shot-assignment.mjs";
import {readFileSync} from "node:fs";
import {planReviewedStoryWithPhotos} from "../lib/mandala/reviewed-filmed-story.mjs";
import {buildAlignedStorySceneGuides,isProfessionalVideoIntent}
  from "../lib/mandala/storyboard-content-alignment.mjs";
const c=(groupKey,score,id=groupKey)=>({groupKey,score,source:{id}});
test("global matching saves a unique later-beat clip from greedy selection",()=>{
 const plan=assignNarrativeShotSources([[c("meeting",100),c("desk",90)],[c("meeting",80)]]);
 assert.deepEqual(plan.map(x=>x.source.id),["desk","meeting"]);
});
test("six narrative beats keep their chronological positions and unique sources",()=>{
 const rows=[[c("A",100),c("B",92)],[c("A",90)],
  [c("C",100)],[c("D",100)],[c("E",100)],[c("F",100)]];
 assert.deepEqual(assignNarrativeShotSources(rows).map(x=>x.source.id),
  ["B","A","C","D","E","F"]);
});
test("physical variants of the same master cannot count as independent footage",()=>{
 assert.equal(assignNarrativeShotSources([[c("master",100,"one")],[c("master",100,"two")]]),null);
});
test("missing, invalid and insufficient source matches fail closed",()=>{
 assert.equal(assignNarrativeShotSources([[]]),null);
 assert.equal(assignNarrativeShotSources([[{source:{id:"bad"},groupKey:"x",score:NaN}]]),null);
});
test("ties are stable and choice does not mutate the input",()=>{
 const rows=[[c("A",5),c("B",5)],[c("B",5),c("C",5)]];
 assert.deepEqual(assignNarrativeShotSources(rows),assignNarrativeShotSources(rows));
});
test("scene order follows concept beat, while affirmations remain secondary",()=>{
 const plan=buildAlignedStorySceneGuides({locale:"en",goal:"career progression",
  phrases:["I am confident","I can choose"],count:6,
  concept:{hasPersonalInput:true,styleId:"realistic",
    sceneOutline:["Professional arrives at office","A project is reviewed",
      "Colleagues meet at a table","Next practical step"]}});
 assert.equal(plan.scenes.length,6);
 assert.match(plan.scenes[0].title,/Opening.*office/);
 assert.match(plan.scenes[1].title,/Key detail.*office/);
 assert.equal(plan.scenes[0].sourcePhrase,"I am confident");
 assert.ok(plan.scenes[0].keywords.includes("office"));
});
test("literal RU / ES story objects become searchable English footage anchors",()=>{
 for(const [locale,goal,beat] of [
  ["ru","Спокойствие","Человек открывает дверь квартиры"],
  ["es","Tranquilidad","La persona abre la puerta"]]){
  const result=buildAlignedStorySceneGuides({locale,goal,count:6,
   concept:{hasPersonalInput:true,styleId:"realistic",sceneOutline:[beat,beat,beat,beat]}});
  assert.ok(result.scenes[0].keywords.includes("door"));
  assert.equal(result.scenes[0].requiresLiteralMatch,true);
 }
});
test("work on relationships is not a corporate video",()=>{
 assert.equal(isProfessionalVideoIntent({goal:"I want to work on my relationship"}),false);
 assert.equal(isProfessionalVideoIntent({goal:"I want to improve my salary and career"}),true);
});
test("the last shot is always a closing role for shorter sequences",()=>{
 const guides=buildAlignedStorySceneGuides({locale:"en",count:4,goal:"confidence",
  concept:{sceneOutline:["Start","Understand","Try","Integrate"]}});
 assert.match(guides.scenes[3].title,/Closing/);
});
test("a real concept ending outranks generic workplace closing",()=>{
 const guides=buildAlignedStorySceneGuides({locale:"en",count:6,
  goal:"Business career and salary",
  phrases:["I am capable"],
  concept:{sceneOutline:["Challenge","Details","Choice","Professional meets the client"]}});
 assert.match(guides.scenes[5].title,/Closing.*meets the client/);
});

test("global filmed assignment retains independently licensed real photo fallback",()=>{
 const catalog=JSON.parse(readFileSync(new URL("../data/video-catalog/scene-taxonomy.json",import.meta.url),"utf8"));
 const original=JSON.parse(readFileSync(new URL("../data/video-catalog/original-motion-scenes-v1.json",import.meta.url),"utf8"));
 const scenes=[...catalog.scenes,...original.scenes];
 const concept={categoryId:"goals-money",goal:"I want professional recognition, salary negotiation and career growth",
   hasPersonalInput:true,styleId:"realistic",
   sceneOutline:["Work results stay unnoticed","Prepare documents and reports","Discuss value in a team meeting","Request a fair salary"]};
 const guides=buildAlignedStorySceneGuides({locale:"en",count:6,goal:concept.goal,concept});
 const plan=planReviewedStoryWithPhotos({concept,categoryId:concept.categoryId,locale:"en",
   goal:concept.goal,sceneGuides:guides.scenes,aspect:"portrait",durationSeconds:30,scenes});
 assert.equal(plan.ok,true,plan.status);
 assert.equal(plan.shots.length,6);
 assert.equal(plan.totalPlannedMs,30000);
 assert.equal(new Set(plan.shots.map(shot=>shot.sourceMasterKey)).size,6);
 assert.equal(plan.mediaMix.photo,6);
 assert.ok(plan.shots.every(shot=>shot.sourceKind==="photo"&&shot.mediaKind==="licensed_photo"));
 assert.equal(plan.canExport,false);
 assert.equal(plan.publishAuthorized,false);
});
