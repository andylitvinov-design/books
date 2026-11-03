import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {getMyTubeTaxonomy} from "../lib/mandala/mytube-content-taxonomy.mjs";
import {
  MYTUBE_PLOT_COUNTS,listMyTubePlotChoices,
  buildMyTubePlotPlan,auditMyTubePlotCatalog,
} from "../lib/mandala/mytube-scenario-plots.mjs";

test("four canonical directions, sixty-four topics, 256 scenarios, 1024 distinct selectable plots",()=>{
  const audit=auditMyTubePlotCatalog();
  assert.equal(audit.ok,true,JSON.stringify(audit.errors));
  assert.deepEqual(audit.counts,{topics:64,scenarios:256,plots:1024,shots:4096});
  assert.equal(MYTUBE_PLOT_COUNTS.plots,1024);
  assert.equal(MYTUBE_PLOT_COUNTS.plotsPerScenario,4);
  assert.equal(getMyTubeTaxonomy().categories.length,4);
});

test("each one of the 256 scenarios offers four localized, topic-specific four-shot stories",()=>{
  const ids=new Set();
  const titleSets=Object.fromEntries(["ru","en","es"].map(lang=>[lang,new Set()]));
  let count=0;
  for(const category of getMyTubeTaxonomy().categories)
    for(const subcategory of category.subcategories)
      for(const topic of subcategory.topics){
        const signatures=new Set();
        for(const scenario of topic.scenarios){
          const choices=listMyTubePlotChoices(scenario.id,"ru");
          assert.equal(choices.length,4,scenario.id);
          assert.deepEqual(choices.map(p=>p.plotType),["everyday","nature","symbolic","practice"]);
          const variantSignatures=new Set();
          for(const choice of choices){
            count++;
            assert.equal(choice.scenarioId,scenario.id);
            assert.equal(choice.topicId,topic.id);
            assert.equal(choice.categoryId,category.id);
            assert.equal(choice.storyboard.length,4);
            assert.equal(choice.requiresMediaBinding,true);
            assert.equal(choice.canExport,false);
            assert.equal(choice.sourceStatus,"editorial_only_unbound");
            assert.equal(ids.has(choice.id),false,"duplicate id: "+choice.id);
            ids.add(choice.id);
            const signature=choice.storyboard.map(shot=>shot.visualHint).join("|");
            assert.equal(variantSignatures.has(signature),false,"duplicate plot within "+scenario.id);
            variantSignatures.add(signature);
            assert.ok(choice.storyboard.every((beat,i)=>beat.shot===i+1&&beat.phase&&beat.directorNote&&beat.visualHint));
          }
          // The same base four-shot story must receive a DIFFERENT directorial
          // treatment in all four scenario archetypes.
          const lensSignature=choices[0].storyboard.map(b=>b.directorNote).join("|");
          assert.equal(signatures.has(lensSignature),false,"reused directorial treatment: "+topic.id);
          signatures.add(lensSignature);
          for(const lang of ["ru","en","es"]){
            const translated=listMyTubePlotChoices(scenario.id,lang);
            assert.equal(translated.length,4);
            assert.equal(new Set(translated.map(p=>p.label)).size,4);
            for(const plot of translated){
              assert.ok(plot.fullLabel.includes(scenario.label[lang]),plot.id+" "+lang);
              assert.ok(plot.storyboard.every(b=>b.visualHint&&b.phase&&b.directorNote));
              assert.equal(titleSets[lang].has(plot.fullLabel),false,"duplicate full title: "+plot.fullLabel);
              titleSets[lang].add(plot.fullLabel);
            }
          }
        }
        assert.equal(signatures.size,4,topic.id);
      }
  assert.equal(ids.size,1024);
  assert.equal(count,1024);
  for(const lang of ["ru","en","es"])assert.equal(titleSets[lang].size,1024);
});

test("an editorial plot plan remains source-unbound and cannot accidentally export",()=>{
  const plot=buildMyTubePlotPlan({scenarioId:"life-purpose-s1",plotId:"life-purpose-s1-p3",locale:"ru"});
  assert.ok(plot);
  assert.equal(plot.plotType,"symbolic");
  assert.equal(plot.storyboard.length,4);
  assert.equal(plot.mediaStatus,"unbound");
  assert.equal(plot.canExport,false);
  assert.equal(plot.requiresMediaBinding,true);
  assert.equal(plot.clientDataIncluded,false);
  assert.equal(buildMyTubePlotPlan({scenarioId:"life-purpose-s1",plotId:"life-purpose-s2-p3"}),null);
  assert.deepEqual(listMyTubePlotChoices("invented-scenario","ru"),[]);
});

test("same plot selector is reachable from public MyTube and Video Director with no unsafe export binding",()=>{
  const picker=readFileSync(new URL("../components/mytube-scenario-plot-picker.tsx",import.meta.url),"utf8");
  const mytube=readFileSync(new URL("../components/video-discovery.tsx",import.meta.url),"utf8");
  const director=readFileSync(new URL("../components/mandala-auto-video-director.tsx",import.meta.url),"utf8");
  assert.match(picker,/listMyTubePlotChoices\(scenarioId,locale\)/);
  assert.match(picker,/data-mytube-plot=\{plot.id\}/);
  assert.match(picker,/aria-pressed=\{selected\?\.id===plot.id\}/);
  assert.match(picker,/data-mytube-plot-preview=\{selected.id\}/);
  assert.match(mytube,/mytubeScenarioId!=="all"\?<MyTubeScenarioPlotPicker/);
  assert.match(mytube,/key=\{mytubeScenarioId\}/);
  assert.match(director,/selectedScenarioId\?<MyTubeScenarioPlotPicker/);
  assert.match(director,/key=\{selectedScenarioId\}/);
  assert.doesNotMatch(picker,/\bonApply\b|\bonCreate\b|\bvideoUrl\b|\bcanExport\s*=\s*true/);
});
