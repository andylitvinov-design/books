import test from "node:test";
import assert from "node:assert/strict";
import {classifyMyTubeRequest} from "../lib/mandala/mytube-prompt-classifier.mjs";
import {auditMyTubeCreativeCoverage,MYTUBE_PROBLEM_COVERAGE_FIXTURES}
  from "../lib/mandala/mytube-coverage-quality.mjs";
test("missing and preexisting RU/EN/ES client issues are provisional neighboring matches",()=>{
 for(const f of MYTUBE_PROBLEM_COVERAGE_FIXTURES){
  const r=classifyMyTubeRequest(f.query,f.locale);
  assert.equal(r?.topicId,f.topicId,f.id+":"+f.locale);
  assert.equal(r?.contextId,f.id,f.id+":"+f.locale);
  assert.equal(r?.matchLevel,"context");
  assert.equal(r?.confidence,"low");
  assert.ok(r.suggestedTopicIds.includes(f.topicId));
 }
});
test("mixed categories are ambiguous, not an invented psychological diagnosis",()=>{
 assert.equal(classifyMyTubeRequest("Я чувствую стыд и гнев","ru"),null);
 assert.equal(classifyMyTubeRequest("","ru"),null);
});
test("full catalog quality audit distinguishes story ideas from media-verified films",async()=>{
 const r=await auditMyTubeCreativeCoverage();
 assert.deepEqual(r.errors,[]);
 assert.equal(r.ok,true);
 assert.equal(r.inventory.categories,4);
 assert.equal(r.inventory.topics,64);
 assert.equal(r.inventory.scenarios,256);
 assert.equal(r.inventory.plotVariants,1536);
 assert.equal(r.inventory.plotBeats,6144);
 assert.equal(r.inventory.localizedSixShotScreenplays,768);
 assert.equal(r.editorial.individuallyDirectedScenarioIds+r.editorial.structuredScreenplayDrafts,256);
 assert.equal(r.editorial.mediaNotVerifiedByScreenplay,256);
 assert.equal(r.editorial.humanReviewCertified,false);
 assert.equal(r.release.productionReadyFromThisAudit,false);
});
