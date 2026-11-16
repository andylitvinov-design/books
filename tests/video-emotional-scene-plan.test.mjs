import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import stock from "../data/video-catalog/scene-taxonomy.json" with {type:"json"};
import {listMyTubeMotifScenarios} from "../lib/mandala/mytube-meaning-hierarchy.mjs";
import {getEmotionalVectorByStates} from "../lib/mandala/meaning-emotion/emotional-vector-matrix.mjs";
import {emotionalFilmShotCount,planEmotionDrivenVideo,EMOTIONAL_STRATEGY_TAGS}
 from "../lib/mandala/video-emotional-scene-plan.mjs";

const scenarioId=listMyTubeMotifScenarios("money-mindset","anchor","roots","en")[0].id;
const chosen={topicId:"money-mindset",meaningAxisId:"anchor",motifId:"roots",scenarioId,
 emotional:{currentStateId:"anxiety",desiredStateId:"calm",intensity:9,energy:2,activation:8}};

test("adaptive physical cuts preserve four narrative beats across supported lengths",()=>{
 assert.deepEqual([10,15,20,30,60].map(emotionalFilmShotCount),[4,4,4,6,12]);
 assert.equal(emotionalFilmShotCount(25),null);
 assert.equal(Object.keys(EMOTIONAL_STRATEGY_TAGS).length,8);
});
test("meaning axis → motif → film scenario is validated before any media can be chosen",()=>{
 const wrong=planEmotionDrivenVideo({...chosen,motifId:"key",durationSeconds:30,aspect:"portrait",scenes:stock.scenes});
 assert.equal(wrong.status,"INVALID_MEANING_PATH");
 assert.deepEqual(wrong.clipIds,[]);
 const noEmotion=planEmotionDrivenVideo({...chosen,emotional:null,durationSeconds:30,aspect:"portrait",scenes:stock.scenes});
 assert.equal(noEmotion.status,"NEEDS_EMOTIONAL_SELECTION");
});
test("gentle strategy is selected for high activation and depleted energy, not forced mobilization",()=>{
 const plan=planEmotionDrivenVideo({...chosen,durationSeconds:30,aspect:"portrait",scenes:stock.scenes});
 assert.equal(plan.emotionalAxisId,getEmotionalVectorByStates("anxiety","calm").id);
 assert.equal(plan.emotionalEnvelope.pace,"gentle");
 assert.equal(plan.emotionalEnvelope.allowNegativeDramaticDip,false);
 assert.equal(plan.strategySequence.length,4);
 assert.ok(plan.strategySequence.every(s=>s.startT<s.endT));
 assert.ok(plan.stages.every(s=>s.targetVisualTags.length>0));
});
test("real physical source ratio must be verified, no portrait catalog as landscape",()=>{
 const portrait=stock.scenes.filter(scene=>scene.media==="licensed_mp4"&&
   Array.isArray(scene.allowedAspects)&&scene.allowedAspects.length===1&&
   scene.allowedAspects[0]==="portrait");
 assert.ok(portrait.length>0);
 const p=planEmotionDrivenVideo({...chosen,durationSeconds:30,aspect:"landscape",scenes:portrait});
 assert.equal(p.status,"NEEDS_VERIFIED_MEDIA");
 assert.deepEqual(p.clipIds,[]);
 assert.equal(p.renderReady,false);
});
test("every chosen shot has approved dimensions, matching tags, unique master and no loops",()=>{
 for(const durationSeconds of [10,15,20,30,60]){
  const p=planEmotionDrivenVideo({...chosen,durationSeconds,aspect:"portrait",scenes:stock.scenes});
  assert.ok(["NEEDS_VERIFIED_MEDIA","READY_SYMBOLIC_LOCAL_RENDER"].includes(p.status),p.status);
  assert.equal(p.publishAuthorized,false);
  if(!p.ok)continue;
  assert.equal(p.shots.length,emotionalFilmShotCount(durationSeconds));
  assert.equal(new Set(p.shots.map(s=>s.sourceMasterKey)).size,p.shots.length);
  assert.equal(p.shots.reduce((sum,s)=>sum+s.durationSeconds,0),durationSeconds);
  assert.ok(p.shots.every(s=>s.matchedTags.length>=1&&
    s.durationSeconds<=s.sourceDurationSeconds&&!s.loopRequired&&
    s.sourceKind==="licensed_mp4"&&!s.depictedEventVerified));
 }
});
test("adapters use scene-script media and preserve existing four-shot contract",()=>{
 const ui=readFileSync(new URL("../components/mandala-auto-video-director.tsx",import.meta.url),"utf8");
 const parent=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
 const loader=readFileSync(new URL("../lib/mandala/free-film-source-loader.mjs",import.meta.url),"utf8");
 assert.match(ui,/planEmotionDrivenVideo/);
 assert.match(ui,/data-emotional-scene-plan/);
 assert.match(parent,/allocateVariableFilmTimeline/);
 assert.match(parent,/verifiedCategorySource/);
 assert.match(loader,/adaptive===true/);
});
