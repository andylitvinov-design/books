import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {storyReviewSignature,storyReviewRequired,validEditorialShotActions}
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
 assert.match(ui,/keywords:shot\.action\.trim\(\)===shotDrafts\[index\]\.trim\(\)/);
 assert.match(ui,/data-video-storyboard-action-edit/);
 assert.match(ui,/data-video-storyboard-confirm/);
 assert.match(ui,/onDraftChange\?\.\(next\)/);
 assert.match(story,/data-storyboard-scene-action/);
 assert.match(story,/data-storyboard-shot-direction/);
 assert.match(story,/data-storyboard-continuity/);
 assert.match(story,/const visibleCount=manualFiveReady\?5:guides\.scenes\.length/);
});
