import test from "node:test";
import assert from "node:assert/strict";
import {STATE_DEFINITIONS} from "../lib/mandala/state-transition/state-catalog.mjs";
import {EMOTIONAL_VECTORS} from "../lib/mandala/meaning-emotion/idea-engine.mjs";
import {CURRENT_EMOTION_CLUSTERS,DESIRED_EMOTION_CLUSTERS,
 EMOTIONAL_VECTOR_MATRIX,auditEmotionalVectorMatrix,
 listEmotionalVectorMatrix,getEmotionalVector,getEmotionalVectorByStates,
 getEmotionalClusterForState,calculateEmotionalRelief}
 from "../lib/mandala/meaning-emotion/emotional-vector-matrix.mjs";

test("64 distinct directions, 8×8 clusters, 8 old transitions preserved",()=>{
 const result=auditEmotionalVectorMatrix();
 assert.deepEqual(result.errors,[]);
 assert.equal(EMOTIONAL_VECTOR_MATRIX.length,64);
 assert.equal(new Set(EMOTIONAL_VECTOR_MATRIX.map(x=>x.id)).size,64);
 assert.equal(result.counts.cellsWithAnyLegacyIdeas,7);
 assert.equal(result.counts.cellsAwaitingIdeas,57);
 assert.equal(EMOTIONAL_VECTORS.length,8);
 for(const old of EMOTIONAL_VECTORS){
  const cell=getEmotionalVectorByStates(old.currentStateId,old.desiredStateId);
  assert.ok(cell,old.id);
  assert.ok(cell.legacyVectorIds.includes(old.id),old.id);
 }
 const members=[...CURRENT_EMOTION_CLUSTERS,...DESIRED_EMOTION_CLUSTERS]
  .flatMap(x=>x.stateIds);
 assert.deepEqual(new Set(members),new Set(STATE_DEFINITIONS.map(x=>x.id)));
 for(const lang of ["ru","en","es"]){
  const rows=listEmotionalVectorMatrix(lang);
  assert.equal(rows.length,64);
  assert.ok(rows.every(x=>x.label.includes(" → ")));
 }
 assert.equal(getEmotionalClusterForState("anxiety","desired"),null);
 assert.equal(getEmotionalVector("sadness","hope").reviewStatus,"awaiting_idea_editorial");
});
test("nonclinical valence×intensity and energy resource calculation",()=>{
 const result=calculateEmotionalRelief({currentStateId:"anxiety",energy:4,valence:-2,intensity:7});
 assert.deepEqual([result.emotionalCharge,result.resourceIndex],[-14,26]);
 assert.equal(result.nonClinical,true);
 assert.equal(result.valenceSource,"self_report");
 assert.equal(calculateEmotionalRelief({currentStateId:"shame",energy:2,intensity:10}).resourceIndex,0);
 assert.equal(calculateEmotionalRelief({currentStateId:"anxiety",energy:10,valence:3,intensity:10}).resourceIndex,100);
 assert.equal(calculateEmotionalRelief({currentStateId:"anxiety",energy:0,valence:0,intensity:0}).resourceIndex,0);
 assert.equal(calculateEmotionalRelief({currentStateId:"anxiety",energy:null,intensity:6}).resourceIndex,null);
 assert.equal(calculateEmotionalRelief({currentStateId:"anxiety",energy:4,intensity:null}).resourceIndex,null);
 assert.equal(calculateEmotionalRelief({currentStateId:"anxiety",energy:11,intensity:6}).status,"invalid_input");
 assert.equal(calculateEmotionalRelief({currentClusterId:"nonsense",energy:3,intensity:6}).status,"invalid_input");
 assert.equal(calculateEmotionalRelief({currentStateId:"anger",energy:2,intensity:9}).presentationHint,"gentle");
});
