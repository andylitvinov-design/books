import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {storyReviewSignature,storyReviewRequired,conceptSceneAlignment,validEditorialShotActions}
 from "../lib/mandala/video-story-review.mjs";
const storyboard=Array.from({length:6},(_,index)=>({
 title:"Scene "+(index+1),emotion:"A distinct feeling "+index,
 action:"An adult performs concrete observable action number "+(index+1)+" in a room."
}));
const original={mainMessage:"One gentle choice can open new possibilities.",
 conceptText:"A person makes an honest choice, leading to an open ending.",
 storyboard,userEditedFields:[]};
test("approved six-shot film stays ready until an actual manual rewrite",()=>{
 assert.ok(storyReviewSignature(original));
 assert.equal(storyReviewRequired(original),false);
 assert.equal(storyReviewRequired({...original,userEditedFields:["caption"]}),false);
});
test("revised narrative must be explicitly reconciled with all six actions",()=>{
 const changed={...original,conceptText:"A very different meeting happens on a distant platform.",
  userEditedFields:["conceptText"]};
 assert.equal(storyReviewRequired(changed),true);
 const reviewed={...changed,storyReviewSignature:storyReviewSignature(changed)};
 assert.equal(storyReviewRequired(reviewed),false);
 assert.equal(storyReviewRequired({...reviewed,mainMessage:"An entirely different film idea."}),true);
 assert.equal(storyReviewRequired({...reviewed,storyboard:[
  {...storyboard[0],shotType:"wide"},...storyboard.slice(1)
 ]}),true);
 assert.equal(storyReviewRequired({...reviewed,storyboard:[
  {...storyboard[0],action:"A changed first scene shows the traveller leaving a room."},
  ...storyboard.slice(1)
 ]}),true);
});
test("only six distinct, concrete physical actions can replace a storyboard",()=>{
 assert.equal(validEditorialShotActions(storyboard.map(x=>x.action)),true);
 assert.equal(validEditorialShotActions(storyboard.slice(0,5).map(x=>x.action)),false);
 assert.equal(validEditorialShotActions(storyboard.map((x,i)=>i===5?storyboard[0].action:x.action)),false);
 assert.equal(validEditorialShotActions(storyboard.map((x,i)=>i===5?"Feel better":x.action)),false);
 assert.equal(storyReviewSignature({...original,storyboard:[]}),null);
});
test("Ideas and Montage connect explicit editorial review to the same shot actions",()=>{
 const ui=readFileSync(new URL("../components/mandala-video-concept.tsx",import.meta.url),"utf8");
 const story=readFileSync(new URL("../components/mandala-automatic-storyboard.tsx",import.meta.url),"utf8");
 assert.match(ui,/const storyboardNeedsReview=storyReviewRequired\(concept\)/);
 assert.match(ui,/!storyboardNeedsReview/);
 assert.match(ui,/keywords:changed\?\[\]:\[\.\.\.shot\.keywords\]/);
 assert.match(ui,/conceptText=conceptText\.replace\(before,after\)/);
 assert.match(ui,/visualSubject:changed\?"human_action":shot\.visualSubject/);
 assert.match(ui,/data-video-storyboard-action-edit/);
 assert.match(ui,/data-video-storyboard-confirm/);
 assert.match(ui,/onDraftChange\?\.\(next\)/);
 assert.match(story,/data-storyboard-scene-action/);
 assert.match(story,/data-storyboard-shot-direction/);
 assert.match(story,/data-storyboard-continuity/);
 assert.match(story,/const visibleCount=manualFiveReady\?5:guides\.scenes\.length/);
});

test("a verified editorial signature cannot override a changed or reordered physical screenplay",()=>{
 const source=storyboard.map((shot,index)=>({
  id:"plot:scene:"+(index+1),action:shot.action,narrative:shot.action
 }));
 const selected={...original,conceptScenes:source,
  conceptText:source.map(x=>x.narrative).join("\n\n"),
  storyboard:storyboard.map((shot,index)=>({...shot,sceneId:source[index].id}))};
 assert.equal(conceptSceneAlignment(selected).aligned,true);
 assert.equal(storyReviewRequired(selected),false);
 const reordered={...selected,conceptText:source.map(x=>x.action).reverse().join("\n\n")};
 assert.equal(conceptSceneAlignment(reordered).aligned,false);
 assert.equal(storyReviewRequired(reordered),true);
 assert.equal(storyReviewRequired({...reordered,
  userEditedFields:["conceptText"],storyReviewSignature:storyReviewSignature(reordered)}),true);
 const replaced={...selected,storyboard:selected.storyboard.map((shot,index)=>
   index===2?{...shot,action:"A mountain appears unrelated to this selected scenario."}:shot)};
 assert.equal(conceptSceneAlignment(replaced).aligned,false);
 assert.equal(storyReviewRequired(replaced),true);
});
test("Ideas and Montage render source-bound story graphics without claiming stock video",()=>{
 const ideas=readFileSync(new URL("../components/mandala-video-concept.tsx",import.meta.url),"utf8");
 const montage=readFileSync(new URL("../components/mandala-automatic-storyboard.tsx",import.meta.url),"utf8");
 assert.match(ideas,/data-video-concept-scene-graphic/);
 assert.match(ideas,/MandalaStoryboardSceneSketch locale=\{locale\} action=\{shot\.beat\}/);
 assert.match(montage,/MandalaStoryboardSceneSketch locale=\{locale\} action=\{guide\.visual\}/);
 assert.match(montage,/data-storyboard-graphics-mode="screenplay-scene-sketch"/);
 assert.match(montage,/scriptSceneAlignment\.aligned&&!scriptNeedsReview/);
 assert.match(montage,/data-video-story-media-missing/);
});
