import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {getMyTubeTaxonomy,listMyTubeScenarios} from "../lib/mandala/mytube-content-taxonomy.mjs";
import {listMyTubeMeaningAxes,listMyTubeMeaningMotifs,listMyTubeMotifScenarios,
 getMyTubeTopicMeaningTree,validateMyTubeMeaningPath,auditMyTubeMeaningHierarchy,
 MYTUBE_MEANING_COUNTS} from "../lib/mandala/mytube-meaning-hierarchy.mjs";
import {validateMyTubeCreativeSelection} from "../lib/mandala/mytube-creative-choices.mjs";
import {recommendMyTubeTopicStoryClips} from "../lib/mandala/mytube-video-tagging.mjs";
test("64 × 8 × 4 × 4 meaning-to-film paths preserve all original template IDs",()=>{
 const audit=auditMyTubeMeaningHierarchy();
 assert.deepEqual(audit.errors,[]);
 assert.deepEqual([audit.counts.editorialPaths,audit.counts.originalScenarioTemplates],[8192,256]);
 assert.equal(MYTUBE_MEANING_COUNTS.pathsPerTopic,128);
 for(const topic of getMyTubeTaxonomy().categories.flatMap(c=>c.subcategories.flatMap(s=>s.topics))){
  for(const axis of listMyTubeMeaningAxes(topic.id)){
   const motifs=listMyTubeMeaningMotifs(topic.id,axis.id);
   assert.equal(motifs.length,4);
   for(const m of motifs){
    const scenarios=listMyTubeMotifScenarios(topic.id,axis.id,m.id);
    assert.deepEqual(scenarios.map(s=>s.id),topic.scenarios.map(s=>s.id));
    assert.ok(scenarios.every(s=>s.conceptOnly&&!s.canExport));
   }
  }
 }
});
test("three locales and strict meaning-motif validation do not fabricate sources",()=>{
 for(const l of ["ru","en","es"]){
  const tree=getMyTubeTopicMeaningTree("life-purpose",l);
  assert.equal(tree.meaningAxes.length,8);
  assert.ok(tree.meaningAxes.every(x=>x.label&&x.motifs.length===4));
 }
 const v={topicId:"life-purpose",meaningAxisId:"anchor",motifId:"roots",scenarioId:listMyTubeScenarios("life-purpose")[0].id};
 assert.equal(validateMyTubeMeaningPath(v).ok,true);
 assert.equal(validateMyTubeCreativeSelection(v).ok,true);
 assert.equal(validateMyTubeCreativeSelection({...v,motifId:"key"}).status,"invalid_meaning_motif");
 assert.equal(recommendMyTubeTopicStoryClips({...v,motifId:"key",scenes:[]}).status,"invalid_meaning_motif");
});
test("editor orders meaning → motif → film scenario",()=>{
 const s=readFileSync(new URL("../components/mandala-auto-video-director.tsx",import.meta.url),"utf8");
 const pos=["data-mytube-meaning-axes","data-mytube-motif-choices","data-mytube-scenario-concepts"].map(x=>s.indexOf(x));
 assert.ok(pos[0]>=0&&pos[0]<pos[1]&&pos[1]<pos[2]);
 assert.match(s,/listMyTubeMotifScenarios\(selectedTopicId,selectedMeaningAxisId,selectedMotifId,locale\)/);
});
