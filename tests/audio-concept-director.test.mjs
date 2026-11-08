import test from "node:test";
import assert from "node:assert/strict";
import {deriveAudioVideoConcept} from "../lib/mandala/audio-concept-director.mjs";
const transcript={text:"Солнце восходит, я вижу рассвет и новый путь.",
 durationSeconds:15,segments:[{startSeconds:0,endSeconds:6,text:"Солнце восходит"},
 {startSeconds:6,endSeconds:15,text:"Новый путь"}]};
const plan={canExport:true,durationSeconds:15,excludedMotifs:[],
 shots:[{sceneId:"original-sun-1",startSeconds:0,endSeconds:6,
    concepts:["sun","morning"],matchedConcepts:["sun"],spokenText:"Солнце восходит",needsReview:false},
  {sceneId:"original-path-2",startSeconds:6,endSeconds:15,
    concepts:["path","growth"],matchedConcepts:["path"],spokenText:"Новый путь",needsReview:false}]};
test("audio concept stays usable without matching footage, but never authorizes export",()=>{
 assert.equal(deriveAudioVideoConcept(),null);
 const noVideo=deriveAudioVideoConcept({transcript,plan:{...plan,canExport:false,shots:[]}});
 assert.ok(noVideo);
 assert.equal(noVideo.canExport,false);
 assert.equal(noVideo.stages.length,0);
 assert.ok(noVideo.keywords.some(k=>k.id==="sun"));
 assert.equal(noVideo.symbol?.sourceVerified,false);
 assert.ok(deriveAudioVideoConcept({transcript})?.goal.text);
 assert.equal(deriveAudioVideoConcept({transcript:{...transcript,text:""},plan}),null);
});
test("every field is grounded and displayed across three locales without media claims",()=>{
 for(const locale of ["ru","en","es"]){
  const c=deriveAudioVideoConcept({transcript,plan,locale});
  assert.equal(c.locale,locale);
  assert.ok(c.goal.text.includes("Солнце"));
  assert.equal(c.goal.origin,"quoted_source_not_generated");
  assert.ok(c.purpose&&c.category&&c.style.label);
  assert.ok(c.symbol?.label);
  assert.equal(c.symbol.sourceVerified,false);
  assert.equal(c.style.sourceVerified,false);
  assert.equal(c.stages.length,2);
  assert.deepEqual(c.stages.map(x=>x.sceneId),plan.shots.map(x=>x.sceneId));
  assert.equal(c.aspect,"9:16");
  assert.equal(c.durationSeconds,15);
  assert.equal(c.requiresReview,true);
  assert.deepEqual(c.keywords.map(x=>x.id),["sun","morning","path","growth"]);
  assert.equal(c.keywords.find(x=>x.id==="sun").seenInSelectedClips,true);
  assert.equal(c.keywords.find(x=>x.id==="growth").seenInSelectedClips,false);
 }
});
test("negative visual constraints remove forbidden motifs, never invent ones",()=>{
 const c=deriveAudioVideoConcept({transcript,plan:{
  ...plan,excludedMotifs:["water","forest"],
  shots:[{...plan.shots[0],concepts:["water","forest","sun"],
    matchedConcepts:["water","sun"]},plan.shots[1]]
 }});
 assert.ok(c);
 assert.equal(c.keywords.some(x=>["water","forest"].includes(x.id)),false);
 assert.notEqual(c.symbol?.id,"forest");
 assert.notEqual(c.symbol?.id,"river");
});
test("direct style words use existing catalog, no new footage or external provider",()=>{
 const c=deriveAudioVideoConcept({
  transcript:{...transcript,text:"Это интервью о моём проекте в городе."},plan,locale:"ru"});
 assert.equal(c.style.id,"urban");
 assert.equal(c.style.origin,"explicit_phrase");
 assert.equal(c.previewOnly,true);
});
