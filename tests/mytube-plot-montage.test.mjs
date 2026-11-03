import test from "node:test";
import assert from "node:assert/strict";
import stock from "../data/video-catalog/scene-taxonomy.json" with {type:"json"};
import {listMyTubePlots} from "../lib/mandala/mytube-scenario-plots.mjs";
import {recommendMyTubePlotMontage} from "../lib/mandala/mytube-plot-montage.mjs";
import {validateMontageClips} from "../lib/mandala/video-montage-sources.mjs";
import {allocateAdaptiveFilmTimeline} from "../lib/mandala/free-film-timeline.mjs";
import {readFileSync} from "node:fs";

test("a plot selection yields four distinct approved topic-matched MP4 scenes, not fake plot footage",async()=>{
  const variants=await listMyTubePlots("money-mindset-s1","ru");
  assert.equal(variants.length,4);
  for(const plot of variants){
    assert.equal(plot.visualCues.length,4);
    const result=recommendMyTubePlotMontage({plot,scenes:stock.scenes});
    assert.equal(result.status,"topic_matched_symbolic_plot_preview");
    assert.equal(result.plotId,plot.id);
    assert.equal(result.clipIds.length,4);
    assert.equal(new Set(result.clipIds).size,4);
    assert.equal(result.stages.length,4);
    assert.equal(result.verifiedFinishedPlot,false);
    assert.equal(result.mediaFidelity,"topic_matched_symbolic_approximation");
    assert.ok(result.stages.every((stage,i)=>
      stage.stage===i+1 && stage.plotBeat===plot.beats[i] && stage.depictedEventVerified===false));
    assert.equal(validateMontageClips(result.clipIds,stock.scenes),true);
    for(const length of [10,15,20,30,60]){
      const timing=allocateAdaptiveFilmTimeline(length,result.clipIds);
      assert.equal(timing.length,4);
      assert.equal(timing.reduce((n,part)=>n+part.durationSeconds,0),length);
    }
  }
});

test("different plots use independent visual cues and describe the storyboard without certifying its scenes",async()=>{
  const plots=await listMyTubePlots("stress-relief-s1","en");
  assert.equal(plots.length,4);
  const plans=plots.map(plot=>recommendMyTubePlotMontage({plot,scenes:stock.scenes}));
  assert.ok(plans.every(plan=>plan.hasFourApprovedSources && plan.verifiedFinishedPlot===false));
  assert.equal(new Set(plots.map(plot=>plot.plotMode)).size,4);
  assert.equal(new Set(plots.map(plot=>plot.visualCues.join("|"))).size,4);
  assert.ok(plans.every(plan=>plan.stages.every(stage=>stage.sourceTopicScore>=65)));
});

test("uncovered subjects cannot masquerade as plot-ready licensed video",async()=>{
  for(const scenarioId of ["panic-attacks-s1","childhood-trauma-s2","couple-conflict-s3"]){
    const [plot]=await listMyTubePlots(scenarioId,"ru");
    const plan=recommendMyTubePlotMontage({plot,scenes:stock.scenes});
    assert.equal(plan.hasFourApprovedSources,false);
    assert.equal(plan.verifiedFinishedPlot,false);
    assert.deepEqual(plan.clipIds,[]);
    assert.ok(plan.candidateCount<4);
  }
});

test("malformed plot IDs, wrong scenario or unapproved/foreign assets fail closed",async()=>{
  const [plot]=await listMyTubePlots("money-mindset-s1","ru");
  const invalid=[
    {...plot,id:"money-mindset-s1-p5"},
    {...plot,scenarioId:"panic-attacks-s1"},
    {...plot,plotMode:"unknown"},
    {...plot,beats:["only one"]},
  ];
  for(const corrupt of invalid){
    const result=recommendMyTubePlotMontage({plot:corrupt,scenes:stock.scenes});
    assert.equal(result.status,"invalid_plot");
    assert.deepEqual(result.clipIds,[]);
  }
  const foreign=stock.scenes.map((scene,i)=>i<41?{...scene,status:"candidate"}:scene);
  assert.equal(recommendMyTubePlotMontage({plot,scenes:foreign}).hasFourApprovedSources,false);
  assert.equal(recommendMyTubePlotMontage({plot,scenes:stock.scenes,excludedMotifs:["unknown"]}).hasFourApprovedSources,false);
});

test("the UI uses plot ranking, exact preset timing, authored captions and explicit nonavailability",()=>{
  const director=readFileSync(new URL("../components/mandala-auto-video-director.tsx",import.meta.url),"utf8");
  assert.match(director,/recommendMyTubePlotMontage/);
  assert.match(director,/timelineForTopic\(selectedTopicId,selectedScenarioId,recommended,plot\)/);
  assert.match(director,/data-mytube-plot-media-status/);
  assert.match(director,/data-mytube-clear-plot/);
  assert.match(director,/plotLacksApprovedClips/);
  assert.match(director,/disabled=\{disabled\|\|plotLacksApprovedClips\}/);
  assert.match(director,/disabled=\{disabled\|\|!canCreate\|\|plotLacksApprovedClips\}/);
  assert.match(director,/captions:plot\?plot\.beats\.map/);
  assert.match(director,/STAGE_CAPTION_LIMIT/);
  assert.match(director,/data-mytube-plot-media-disclaimer/);
});

test("insufficient plot media offers only explicitly opted-in, rights-validated text-led symbolic fallback",()=>{
  const ui=readFileSync(new URL("../components/mandala-auto-video-director.tsx",import.meta.url),"utf8");
  assert.match(ui,/data-mytube-symbolic-caption-fallback/);
  assert.match(ui,/onClick=\{enableSymbolicPlotFallback\}/);
  assert.match(ui,/setSymbolicPlotFallback\(true\)/);
  assert.match(ui,/setSelectedPlotId\(plotId\);setSymbolicPlotFallback\(false\)/);
  assert.match(ui,/setSelectedScenarioId\("");setSelectedPlotId\("");setSymbolicPlotFallback\(false\)/);
  assert.match(ui,/validateMontageClips\(\[\.\.\.chosen\.clips\],scenes,proposal\?\.excludedMotifs\|\|\[\]\)/);
  assert.match(ui,/data-plot-media-mode/);
  assert.match(ui,/fallbackEnabled&&selectedTaxonomyPlot&&chosen/);
  assert.match(ui,/plotLacksApprovedClips/);
  assert.match(ui,/captions:selectedTaxonomyPlot\.beats\.map/);
  assert.match(ui,/role="status" data-mytube-plot-media-status/);
});
