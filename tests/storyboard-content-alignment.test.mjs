import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import catalog from "../data/video-catalog/scene-taxonomy.json" with {type:"json"};
import original from "../data/video-catalog/original-motion-scenes-v1.json" with {type:"json"};
import {buildAlignedStorySceneGuides,isProfessionalVideoIntent,
 matchesFilmedStorySubject} from "../lib/mandala/storyboard-content-alignment.mjs";
import {planReviewedFilmedStory} from "../lib/mandala/reviewed-filmed-story.mjs";

const root=new URL("../",import.meta.url);
const storyboard=readFileSync(new URL("components/mandala-automatic-storyboard.tsx",root),"utf8");
const studio=readFileSync(new URL("components/mandala-free-video-studio.tsx",root),"utf8");
const goal="Finding a little more steadiness, one step at a time";
const phrases=[
 "I can notice new opportunities",
 "I can take a step toward my goal",
 "I can develop useful skills",
 "I choose a clear plan of action",
 "My work can have meaning"
];
const sources=[...catalog.scenes,...original.scenes];

test("all five selected Text phrases drive 30-second Story scenes in order",()=>{
 assert.equal(isProfessionalVideoIntent({goal,phrases}),true);
 for(const locale of ["en","ru","es"]){
  const guide=buildAlignedStorySceneGuides({locale,goal,phrases,count:6,pace:"dynamic"});
  assert.equal(guide.professional,true);
  assert.equal(guide.scenes.length,6);
  assert.deepEqual(guide.scenes.slice(0,5).map(s=>s.sourcePhrase),phrases);
  assert.equal(new Set(guide.scenes.map(s=>s.title)).size,6);
  assert.ok(guide.scenes.every(s=>s.visual.length>20));
  assert.equal(guide.scenes[0].index,1);
  assert.equal(guide.scenes[5].index,6);
  assert.equal(guide.scenes[2].keywords.includes("training"),true);
  assert.ok(guide.scenes[5].title.length>5);
 }
});
test("work subject excludes forests, nature and generic people-only sources",()=>{
 for(const id of ["fall-foliage-forest","sun-autumn-hills","sun-golden-aspen"]){
  const scene=sources.find(s=>s.id===id);
  assert.ok(scene,id);
  assert.equal(matchesFilmedStorySubject(scene,{professional:true}),false,id);
 }
 assert.equal(matchesFilmedStorySubject({tags:["people","forest"]},{professional:true}),false);
 assert.equal(matchesFilmedStorySubject({tags:["office","client","meeting"]},{professional:true}),true);
 assert.equal(matchesFilmedStorySubject({tags:["office","client","meeting"]},{
  professional:true,excludedVisuals:["forest"]}),true);
});
test("no nature clip can be called matching business footage: six-card plan remains editorial",()=>{
 const guide=buildAlignedStorySceneGuides({locale:"en",goal,phrases,count:6,pace:"dynamic"});
 const plan=planReviewedFilmedStory({
  categoryId:"goals-money",locale:"en",aspect:"portrait",durationSeconds:30,
  scenes:sources,goal,phrases,sceneGuides:guide.scenes,pace:"dynamic",styleId:"cinematic"
 });
 assert.equal(plan.ok,false);
 assert.equal(plan.status,"INSUFFICIENT_RELEVANT_FILMED_FOOTAGE");
 assert.equal(plan.subjectPolicy,"real_workplace_footage_required");
 assert.equal(plan.shots.length,0);
 assert.equal(plan.canExport,false);
 assert.equal(plan.publishAuthorized,false);
});
test("explicit relationship request is not overwritten by incidental work phrases",()=>{
 assert.equal(isProfessionalVideoIntent({goal:"Love and relationships",phrases}),false);
 assert.equal(isProfessionalVideoIntent({goal:"Работа и развитие",phrases:[]}),true);
 assert.equal(isProfessionalVideoIntent({goal:"Negocio y carrera",phrases:[]}),true);
});
test("Story receives exact user choices and cannot apply irrelevant films",()=>{
 assert.match(storyboard,/buildAlignedStorySceneGuides/);
 assert.match(storyboard,/guides\.scenes\.map/);
 assert.match(storyboard,/data-video-story-media-missing/);
 assert.match(storyboard,/data-video-story-missing-relevant-media/);
 assert.match(storyboard,/appliedStoryKey===storyKey/);
 assert.match(storyboard,/data-storyboard-media-ready=\{eligible\}/);
 assert.match(storyboard,/!applied&&eligible\?/);
 assert.match(storyboard,/personalizationKey/);
 assert.match(storyboard,/pace,goal:concept\.goal\|\|goal/);
 assert.match(storyboard,/excludedVisuals:concept\.avoidImagery\|\|\[\]/);
 assert.match(studio,/summarizeVideoGoalProfile\(ideasProfile,locale\)/);
 assert.match(studio,/appliedStoryKey=\{appliedStoryKey\}/);
 assert.match(studio,/pace=\{speed\}/);
 assert.match(studio,/setAppliedStoryKey\(key\)/);
 assert.match(studio,/captionTexts:shots\.map\(\(_,index\)=>captions\[index\]\|\|""\)/);
});
