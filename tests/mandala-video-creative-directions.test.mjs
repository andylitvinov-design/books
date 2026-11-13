import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import catalog from "../data/video-catalog/scene-taxonomy.json" with {type:"json"};
import original from "../data/video-catalog/original-motion-scenes-v1.json" with {type:"json"};
import {suggestVideoConcept,videoConceptIsValid} from "../lib/mandala/auto-video-concept.mjs";
import {getVideoCreativeDirections,applyVideoCreativeDirection} from "../lib/mandala/video-creative-directions.mjs";
import {buildConceptShotSketch} from "../lib/mandala/video-concept-semantic.mjs";
import {buildAlignedStorySceneGuides} from "../lib/mandala/storyboard-content-alignment.mjs";
import {planReviewedFilmedStory} from "../lib/mandala/reviewed-filmed-story.mjs";

const personal={
 currentState:"Tired · Sad · Uncertain",desiredState:"Safe · Joyful · Connected",
 focus:"Meaning · Connection · Support",
 currentIds:["fatigue","sadness","uncertain"],desiredIds:["safe","joyful","connected"],
 focusIds:["meaning","connection","support"],energyStart:4,energyTarget:9
};
const labels={en:"Ready for a Relationship",ru:"Готовность к отношениям",es:"Preparación para una relación"};
const sources=[...catalog.scenes,...original.scenes];

test("specific relationship goal yields three DIFFERENT authored stories in RU/EN/ES, not a restatement of the filters",()=>{
 for(const locale of ["ru","en","es"]){
  const base=suggestVideoConcept({
   locale,goal:labels[locale],theme:"relationships",
   selectedTopicId:"ready-relationship",personalization:personal
  });
  assert.equal(base.topicId,"ready-relationship");
  const directions=getVideoCreativeDirections(base,locale);
  assert.deepEqual(directions.map(x=>x.id),["space","real","crossing"]);
  assert.equal(new Set(directions.map(x=>x.idea)).size,3);
  assert.equal(new Set(directions.map(x=>x.story)).size,3);
  for(const direction of directions){
   assert.ok(direction.title.length>=8);
   assert.ok(direction.idea.length>=75);
   assert.ok(direction.story.length>=300);
   assert.ok(direction.story.length<=1200);
   assert.doesNotMatch(direction.idea,/tired\s*·\s*sad|устав.*груст.*неувер|4\/10|9\/10/i);
   assert.doesNotMatch(direction.story,/six shots|30 seconds|intended energy|6 кадров|30 секунд|fotogramas/i);
   assert.equal(direction.stages.length,4);
   assert.equal(direction.storyboard.length,6);
   assert.equal(new Set(direction.storyboard.map(x=>x.action)).size,6);
   assert.ok(direction.storyboard.every(x=>x.title&&x.action&&x.emotion&&x.keywords.length>=2));
   const selected=applyVideoCreativeDirection(base,direction);
   assert.equal(videoConceptIsValid(selected),true,locale+":"+direction.id);
   assert.equal(selected.baseSignature,base.signature);
   assert.notEqual(selected.signature,base.signature);
   assert.equal(selected.conceptText,direction.story);
   assert.equal(selected.storyboard.length,6);
   assert.equal(selected.emotionalProgram.length,4);
   assert.deepEqual(selected.parameters.emotionalProgram.value,direction.arc);
   assert.deepEqual(selected.parameters.visualActions.value,direction.storyboard.map(x=>x.action));
   assert.equal(selected.parameters.visualWorld.value,direction.world);
   assert.equal(selected.parameters.plotMode.value,direction.plotMode);
   assert.equal(selected.creativeSymbol,direction.symbol);
   assert.equal(selected.mediaBindingStatus,"editorial_only_unverified");
   assert.equal(selected.parameters.currentState.value,personal.currentState);
   assert.equal(selected.parameters.desiredState.value,personal.desiredState);
   const sketch=buildConceptShotSketch(selected,30);
   assert.deepEqual(sketch.map(x=>x.startSeconds),[0,5,10,15,20,25]);
   assert.deepEqual(sketch.map(x=>x.endSeconds),[5,10,15,20,25,30]);
   assert.deepEqual(sketch.map(x=>x.beat),direction.storyboard.map(x=>x.action));
   assert.ok(sketch.every(x=>x.sourceVerified===false));
   const guides=buildAlignedStorySceneGuides({
    locale,goal:labels[locale],concept:selected,count:6,phrases:[],pace:"slow"
   });
   assert.equal(guides.scenes.length,6);
   assert.deepEqual(guides.scenes.map(x=>x.visual),direction.storyboard.map(x=>x.action));
   assert.ok(guides.scenes.every(x=>x.requiresLiteralMatch===true));
  }
 }
});

test("only a specific goal gets cinematic biography suggestions; transcripts remain source-authoritative",()=>{
 for(const locale of ["ru","en","es"]){
  const general=suggestVideoConcept({locale,goal:"Love",theme:"relationships"});
  assert.equal(getVideoCreativeDirections({...general,semanticConfidence:"low"},locale).length,0);
  const speaking=suggestVideoConcept({locale,goal:labels[locale],theme:"relationships",
   selectedTopicId:"ready-relationship",speechTranscript:{text:"Create a video from what I am saying"}});
  assert.equal(getVideoCreativeDirections(speaking,locale).length,0);
  const income=suggestVideoConcept({locale,goal:"Income Growth",theme:"money",selectedTopicId:"income-growth"});
  const alt=getVideoCreativeDirections(income,locale);
  assert.equal(alt.length,3);
  assert.equal(new Set(alt.map(x=>x.scenarioId)).size,3);
  assert.ok(alt.every(x=>videoConceptIsValid(applyVideoCreativeDirection(income,x))));
 }
});

test("specific exclusion is respected and no story claims its video footage exists",()=>{
 const base=suggestVideoConcept({locale:"en",goal:"Ready for a Relationship",theme:"relationships",
  selectedTopicId:"ready-relationship"});
 const noWater=getVideoCreativeDirections({...base,avoidImagery:["water","forest"]},"en");
 assert.equal(noWater.length,3);
 assert.ok(noWater.every(x=>x.id!=="crossing"));
 assert.ok(noWater.every(x=>!x.story.toLowerCase().includes("across the river")));
});

test("shot-matching fails closed for a literal film action absent from VERIFIED source metadata",()=>{
 const base=suggestVideoConcept({locale:"en",goal:"Ready for a Relationship",theme:"relationships",
   selectedTopicId:"ready-relationship"});
 const directed=applyVideoCreativeDirection(base,getVideoCreativeDirections(base,"en")[0]);
 const guides=buildAlignedStorySceneGuides({locale:"en",goal:base.goal,concept:directed,count:6});
 const impossible=guides.scenes.map((s,i)=>i===0?{
  ...s,keywords:["unobtainium"],requiresLiteralMatch:true
 }:s);
 const matched=planReviewedFilmedStory({
  categoryId:"love-relationships",locale:"en",aspect:"portrait",durationSeconds:30,
  scenes:sources,sceneGuides:impossible
 });
 assert.equal(matched.ok,false);
 assert.equal(matched.canExport,false);
 assert.equal(matched.status,"INSUFFICIENT_RELEVANT_STAGE_FOOTAGE");
 assert.deepEqual(matched.shots,[]);
});

test("mobile editor selects directions, hides advanced settings, and carries approval to Montage",()=>{
 const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
 const editor=read("components/mandala-video-concept.tsx");
 const css=read("components/mandala-video-concept.module.css");
 const studio=read("components/mandala-free-video-studio.tsx");
 const montage=read("components/mandala-automatic-storyboard.tsx");
 assert.match(editor,/data-video-concept-directions/);
 assert.match(editor,/data-video-concept-direction=\{direction\.id\}/);
 assert.match(editor,/aria-pressed=\{selectedDirection\?\.id===direction\.id\}/);
 assert.match(editor,/data-video-concept-main-idea/);
 assert.match(editor,/<details className=\{css\.parameters\} data-video-concept-all-parameters>/);
 assert.ok(editor.indexOf("data-video-concept-main-idea")<editor.indexOf("data-video-concept-all-parameters"));
 assert.match(css,/\.directionGrid\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/\.panel \.actions\{position:fixed/);
 assert.match(studio,/selectedTopic=\{selectedConceptTopic\}/);
 assert.match(studio,/!approved\.storyboard\?\.length&&cinematicPlan/);
 assert.match(montage,/approvedConcept\?\.baseSignature===suggested\.signature/);
 assert.match(montage,/selectedTopicId:selectedTopic\?\.topicId/);
 assert.match(montage,/buildAlignedStorySceneGuides/);
});
