import test from "node:test";
import assert from "node:assert/strict";
import {suggestVideoConcept} from "../lib/mandala/auto-video-concept.mjs";
import {getVideoCreativeDirections,applyVideoCreativeDirection} from "../lib/mandala/video-creative-directions.mjs";
import {buildAlignedStorySceneGuides} from "../lib/mandala/storyboard-content-alignment.mjs";
import {describeStoryboardSceneGraphic} from "../lib/mandala/storyboard-scene-graphic.mjs";

test("Making Room for Love: six graphic cards use exact scene props, not unrelated stock tags",()=>{
 for(const locale of ["ru","en","es"]){
  const base=suggestVideoConcept({locale,goal:"Ready for a Relationship",
   theme:"relationships",selectedTopicId:"ready-relationship"});
  const direction=getVideoCreativeDirections(base,locale).find(x=>x.id==="space");
  assert.ok(direction,"the selected story must exist in "+locale);
  const concept=applyVideoCreativeDirection(base,direction);
  const plan=buildAlignedStorySceneGuides({locale,goal:concept.goal,concept,count:6}).scenes;
  assert.equal(plan.length,6);
  const graphics=plan.map((scene,index)=>describeStoryboardSceneGraphic({
   action:scene.visual,visualSubject:concept.storyboard[index].visualSubject,
   // Adversarial tags must not override the objects visible in the story.
   keywords:[...concept.storyboard[index].keywords,"ocean","forest"]
  }));
  assert.deepEqual(plan.map(scene=>scene.visual),direction.storyboard.map(shot=>shot.action));
  for(const [index,cue] of graphics.entries()){
   assert.equal(cue.sourceAction,direction.storyboard[index].action);
   assert.equal(cue.visualStatus,"editorial_scene_sketch_unverified");
   assert.equal(cue.hasLiteralObjectEvidence,true,"scene "+(index+1)+": "+cue.sourceAction);
   assert.ok(!cue.cueIds.includes("water")&&!cue.cueIds.includes("tree"));
  }
  assert.ok(graphics[0].cueIds.includes("luggage"));
  assert.ok(graphics[1].cueIds.includes("chair")&&graphics[1].cueIds.includes("luggage"));
  assert.ok(graphics[2].cueIds.includes("photograph"));
  assert.ok(graphics[3].cueIds.includes("shelf"));
  assert.ok(graphics[4].cueIds.some(id=>["phone","message","invitation"].includes(id)));
  assert.ok(graphics[5].cueIds.includes("chair")||graphics[5].cueIds.includes("light"));
 }
});
test("a new action replaces old pictograms and never inherits the former film props",()=>{
 const old=describeStoryboardSceneGraphic({
  action:"A suitcase rests on the second chair",keywords:["luggage","chair"]});
 const revised=describeStoryboardSceneGraphic({
  action:"A person writes a new idea in a notebook",keywords:["luggage","chair","forest"]});
 assert.ok(old.cueIds.includes("luggage"));
 assert.ok(revised.cueIds.includes("notebook"));
 assert.ok(!revised.cueIds.includes("luggage"));
 assert.ok(!revised.cueIds.includes("tree"));
});
