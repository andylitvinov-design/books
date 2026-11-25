import test from "node:test";
import assert from "node:assert/strict";
import {VIDEO_GOAL_SCENARIOS,VIDEO_GOAL_TOPICS,VIDEO_GOAL_CATEGORIES} from "../lib/mandala/video-goal-taxonomy.mjs";
import {createGoalTreeMediaQueue,auditGoalTreeMedia} from "../lib/mandala/video-goal-media-coverage.mjs";
import {isUsableFilm} from "../lib/mandala/scenario-media-coverage.mjs";
import scenes from "../data/video-catalog/scene-taxonomy.json" with {type:"json"};
test("five-axis narrative tree has 120 non-exportable four-shot stories",()=>{
 const result=auditGoalTreeMedia();
 assert.equal(VIDEO_GOAL_CATEGORIES.length,5);
 assert.equal(VIDEO_GOAL_TOPICS.length,30);
 assert.equal(VIDEO_GOAL_SCENARIOS.length,120);
 assert.equal(result.scenarios,120);
 assert.equal(result.requiredFourShotSlots,480);
 assert.equal(result.currentlyBoundSlots,0);
 assert.equal(result.readyForExport,0);
 for(const c of Object.values(result.byCategory))
   assert.deepEqual(c,{topics:6,scenarios:24,shots:96,bound:0});
});
test("all 480 missing media bindings have unique safe editorial records",()=>{
 const q=createGoalTreeMediaQueue();
 assert.equal(q.slots.length,480);
 assert.equal(new Set(q.slots.map(x=>x.id)).size,480);
 assert.ok(q.approvedLegacyClipMasters>=44);
 assert.equal(q.optimisticMinimumNewUniqueMasters,480-q.approvedLegacyClipMasters);
 const verified=new Set(scenes.scenes.filter(isUsableFilm).map(x=>x.id));
 for(const row of q.slots){
   assert.equal(row.assetId,null);
   assert.equal(row.rightsVerifiedForThisBinding,false);
   assert.equal(row.sourceStatus,"unbound");
   assert.equal(row.canExport,false);
   assert.ok(row.shot>=1&&row.shot<=4);
   assert.ok(row.candidateApprovedClipIds.every(id=>verified.has(id)));
 }
});
test("unlicensed footage never becomes approved source or video output",()=>{
 const q=createGoalTreeMediaQueue({scenes:[{id:"bad",theme:"health",status:"pending",
   media:"licensed_mp4",collection:"film-collection-v3",video:"https://bad.example/bad.mp4",
   poster:"/bad.jpg",tags:["forest"],motifs:["forest"],rightsReference:{kind:"unknown"}}]});
 assert.equal(q.approvedLegacyClipMasters,0);
 assert.equal(q.readyForExport,0);
 assert.ok(q.slots.every(x=>x.candidateApprovedClipIds.length===0));
 assert.throws(()=>createGoalTreeMediaQueue({limit:20}));
});
