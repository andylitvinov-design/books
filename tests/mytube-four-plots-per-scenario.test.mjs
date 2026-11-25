import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  MYTUBE_PLOT_COUNTS, getMyTubePlotCount,
  listMyTubePlots, auditMyTubePlots,
} from "../lib/mandala/mytube-scenario-plots.mjs";
import {getMyTubeTaxonomy} from "../lib/mandala/mytube-content-taxonomy.mjs";

const langs=["ru","en","es"];
const taxonomy=getMyTubeTaxonomy();
const allScenarios=taxonomy.categories.flatMap(category=>
  category.subcategories.flatMap(subcategory=>
    subcategory.topics.flatMap(topic=>topic.scenarios)));

test("full tree: 256 scenarios have exactly six independent plots, 1536 total",async()=>{
  assert.equal(allScenarios.length,256);
  assert.equal(MYTUBE_PLOT_COUNTS.totalPlots,1536);
  assert.equal(MYTUBE_PLOT_COUNTS.plotsPerScenario,6);
  assert.equal(MYTUBE_PLOT_COUNTS.storyBeatsPerPlot,4);
  const audit=await auditMyTubePlots();
  assert.equal(audit.ok,true,audit.errors.join("\n"));
  assert.deepEqual(audit.counts,{categories:4,scenarios:256,plots:1536,storyBeats:6144});
  for(const lang of langs){
    assert.equal(audit.uniquePlotTitles[lang],1536);
    assert.equal(audit.uniquePlotStoryboards[lang],1536);
  }
});

test("six plots are NOT the four scenes of one scenario",async()=>{
  for(const scenario of allScenarios){
    assert.equal(getMyTubePlotCount(scenario.id),6);
    for(const lang of langs){
      const plots=await listMyTubePlots(scenario.id,lang);
      assert.equal(plots.length,6,scenario.id+"/"+lang);
      assert.deepEqual(plots.map(plot=>plot.id),[1,2,3,4,5,6].map(n=>scenario.id+"-p"+n));
      assert.equal(new Set(plots.map(plot=>plot.plotMode)).size,6);
      assert.equal(new Set(plots.map(plot=>plot.label.toLowerCase())).size,4);
      assert.equal(new Set(plots.map(plot=>plot.beats[0])).size,4);
      for(const plot of plots){
        assert.equal(plot.scenarioId,scenario.id);
        assert.equal(plot.beats.length,4);
        assert.ok(plot.synopsis.length>20);
        assert.ok(plot.transformationIdea.length>20);
        assert.equal(plot.conceptOnly,true);
        assert.equal(plot.canExport,false);
        assert.equal(plot.sourceStatus,"editorial_only_unbound");
      }
    }
  }
});

test("plot IDs and localization remain stable across languages",async()=>{
  const id="life-purpose-s1";
  const [ru,en,es]=await Promise.all(langs.map(l=>listMyTubePlots(id,l)));
  assert.equal(ru[0].label.includes("Чужой компас"),true);
  assert.deepEqual(ru.map(p=>p.id),en.map(p=>p.id));
  assert.deepEqual(ru.map(p=>p.id),es.map(p=>p.id));
  assert.deepEqual(ru.map(p=>p.plotMode),[
    "grounded_dilemma","symbolic_quest","relational_mirror","branching_future",
    "documentary_observation","quiet_rehearsal"
  ]);
  assert.deepEqual(await listMyTubePlots("invalid-scenario","ru"),[]);
  assert.equal(getMyTubePlotCount("invalid-scenario"),0);
});

test("director displays a selectable fourth level and preserves media-rights checks",()=>{
  const director=readFileSync(new URL("../components/mandala-auto-video-director.tsx",import.meta.url),"utf8");
  assert.match(director,/data-mytube-scenario=\{scenario.id\}/);
  assert.match(director,/data-mytube-plot-choices/);
  assert.match(director,/data-mytube-plot=\{plot.id\}/);
  assert.match(director,/data-mytube-selected-plot-outline/);
  assert.match(director,/listMyTubePlots\(selectedScenarioId,locale\)/);
  assert.match(director,/recommendMyTubeTopicStoryClips/);
  assert.match(director,/data-auto-video-storyboard/);
  assert.doesNotMatch(director,/plot\.canExport\s*=\s*true/);
});
