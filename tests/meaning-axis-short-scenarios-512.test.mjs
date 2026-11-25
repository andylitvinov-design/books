import test from "node:test";
import assert from "node:assert/strict";
import {
  auditMeaningAxisShortScenarios,MEANING_AXIS_SHORT_SCENARIOS_COUNTS,
  listMeaningAxisShortAxes,listMeaningAxisShortScenarios,
  getMeaningAxisShortScenarioById,getMeaningAxisShortScenarioBySubsector,
} from "../lib/mandala/meaning-axis-short-scenarios.mjs";

test("64 × 8 is 512 distinct short scenarios, while 256 old scripts remain separate",()=>{
  const result=auditMeaningAxisShortScenarios();
  assert.equal(result.ok,true,result.errors.slice(0,10).join("\n"));
  assert.deepEqual(result.counts,{topics:64,meaningAxes:8,newDrafts:512,existingCanonicalDrafts:256});
  assert.equal(MEANING_AXIS_SHORT_SCENARIOS_COUNTS.totalScenarioConceptsAcrossBothLibraries,768);
});
test("each topic has eight differentiated films in all locales",()=>{
  const expectedAxes=["anchor","connection","freedom","agency","love","dignity","self-realization","recognition"];
  for(const locale of ["en","ru","es"]){
    assert.deepEqual(listMeaningAxisShortAxes(locale).map(x=>x.id),expectedAxes);
    for(const topicId of ["stress-relief","breakup-recovery","financial-stability","childhood-trauma","apathy"]){
      const films=listMeaningAxisShortScenarios(topicId,locale);
      assert.deepEqual(films.map(s=>s.axisId),expectedAxes);
      assert.equal(new Set(films.map(s=>s.sceneOutline.join(" > "))).size,8);
      for(const film of films){
        assert.equal(film.durationMs,14000);
        assert.equal(film.sceneOutline.length,4);
        assert.equal(film.captionDrafts.length,3);
        assert.ok(film.captionDrafts.every(c=>Array.from(c).length<=36));
        assert.equal(film.voiceoverDraft.length,2);
        assert.equal(film.conceptOnly,true);
        assert.equal(film.canRender,false);
        assert.equal(film.mediaMatched,false);
      }
    }
  }
});
test("stable IDs resolve; unknown IDs never fall back to unrelated medical topics",()=>{
  assert.equal(getMeaningAxisShortScenarioBySubsector("panic-attacks__dignity","ru").axisId,"dignity");
  assert.equal(getMeaningAxisShortScenarioById("panic-attacks__dignity__short-film-v1","en").topicId,"panic-attacks");
  assert.equal(getMeaningAxisShortScenarioById("does-not-exist","es"),null);
  assert.deepEqual(listMeaningAxisShortScenarios("not-known","ru"),[]);
});