import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import master from "../data/video-catalog/scene-taxonomy.json" with {type:"json"};
import {
  MYTUBE_VISUAL_MOTIFS,MYTUBE_VISUAL_STYLES,listMyTubeScenarioMotifs,
  listMyTubeMotifs,listMyTubeStyles,getMyTubeCreativeChoices,
  validateMyTubeCreativeSelection,evaluateMyTubeSceneCreativeMatch,
  evaluateMyTubeMontageCreativeMatch,videoMatchesMyTubeVisualFilter,auditMyTubeCreativeChoices,
} from "../lib/mandala/mytube-creative-choices.mjs";
import {getMyTubeTaxonomy} from "../lib/mandala/mytube-content-taxonomy.mjs";
import {recommendMyTubeTopicStoryClips,rankPublicMyTubeVideo} from "../lib/mandala/mytube-video-tagging.mjs";
import {recommendMyTubePlotMontage} from "../lib/mandala/mytube-plot-montage.mjs";
import {listMyTubePlots} from "../lib/mandala/mytube-scenario-plots.mjs";

test("256 editorial scenarios each suggest exactly five valid unique visual motifs",()=>{
  const audit=auditMyTubeCreativeChoices();
  assert.equal(audit.ok,true,audit.errors.join("\n"));
  assert.deepEqual(audit.counts,{scenarios:256,motifs:46,styles:10,suggestions:1280});
  const taxonomy=getMyTubeTaxonomy();
  const motifs=new Set(MYTUBE_VISUAL_MOTIFS.map(row=>row.id));
  const keys=new Set();
  const families=new Map();
  for(const category of taxonomy.categories)
    for(const subcategory of category.subcategories)
      for(const topic of subcategory.topics)
        for(const scenario of topic.scenarios){
          const choices=listMyTubeScenarioMotifs(scenario.id,"ru");
          assert.equal(choices.length,5,scenario.id);
          assert.equal(new Set(choices.map(x=>x.id)).size,5,scenario.id);
          assert.ok(choices.every(x=>motifs.has(x.id)));
          assert.equal(choices.filter(x=>x.recommended).length,1);
          keys.add(scenario.id);
          const categoryChoiceKey=category.id+"/"+scenario.archetype;
          families.set(categoryChoiceKey,choices);
          const selection=validateMyTubeCreativeSelection({
            topicId:topic.id,scenarioId:scenario.id,motifId:choices[0].id,styleId:"nature",
          });
          assert.equal(selection.ok,true);
          assert.equal(getMyTubeCreativeChoices(scenario.id).plotChoicesUnaffected,true);
        }
  assert.equal(keys.size,256);
  assert.equal(families.size,16);
});

test("localized visual vocabulary is independent of narrative plot and readable in all locales",()=>{
  assert.ok(MYTUBE_VISUAL_MOTIFS.some(x=>x.id==="key"));
  assert.ok(MYTUBE_VISUAL_MOTIFS.some(x=>x.id==="stream"));
  assert.equal(MYTUBE_VISUAL_STYLES.length,10);
  for(const locale of ["ru","en","es"]){
    assert.equal(listMyTubeMotifs(locale).length,46);
    assert.equal(listMyTubeStyles(locale).length,10);
    assert.equal(listMyTubeScenarioMotifs("money-mindset-s1",locale).length,5);
    assert.ok(listMyTubeMotifs(locale).every(x=>x.label&&x.meaning));
    assert.ok(listMyTubeStyles(locale).every(x=>x.label&&x.description));
  }
  assert.deepEqual(listMyTubeScenarioMotifs("unknown-scenario","ru"),[]);
  assert.equal(getMyTubeCreativeChoices("unknown-scenario"),null);
});

test("a motif means a literal source tag, not a generic emotional or category similarity",()=>{
  const falseKey=evaluateMyTubeSceneCreativeMatch({
    motifs:["light"],tags:["flow","new-start","opportunity"],categories:["money"]
  },{motifId:"key",styleId:"symbolic"});
  assert.equal(falseKey.motifMatch,false);
  assert.equal(falseKey.motifFrameVerified,false);
  const literalKey=evaluateMyTubeSceneCreativeMatch({
    motifs:["key"],tags:["nature"],visualMotifsVerified:["key"],visualStyles:["nature"],
  },{motifId:"key",styleId:"nature"});
  assert.equal(literalKey.motifMatch,true);
  assert.equal(literalKey.motifFrameVerified,true);
  assert.equal(literalKey.styleMatch,true);
  const stream=evaluateMyTubeSceneCreativeMatch({
    motifs:["river"],tags:["stream"],categories:["nature"],
  },{motifId:"stream"});
  assert.equal(stream.motifMatch,true);
});

test("motif and style apply to actual four-clip selections and fail closed on insufficient match",()=>{
  const base=["one","two","three","four"].map(id=>({
    id,status:"approved",motifs:[],tags:["calm"],visualStyles:[],
  }));
  const invalid=evaluateMyTubeMontageCreativeMatch({
    clipIds:base.map(x=>x.id),scenes:base,motifId:"key",styleId:"nature",
  });
  assert.equal(invalid.ok,false);
  assert.equal(invalid.status,"insufficient_motif_media");
  const passed=base.map((row,i)=>({
    ...row,motifs:i===0?["key"]:[],visualStyles:i<=2?["nature"]:[],
  }));
  const result=evaluateMyTubeMontageCreativeMatch({
    clipIds:base.map(x=>x.id),scenes:passed,motifId:"key",styleId:"nature",
  });
  assert.equal(result.ok,true);
  assert.equal(result.motifMatches,1);
  assert.equal(result.styleMatches,3);
  assert.equal(result.visualMatchOnly,true);
  const twoStyles=evaluateMyTubeMontageCreativeMatch({
    clipIds:base.map(x=>x.id),scenes:passed.map((row,i)=>i===2?{...row,visualStyles:[]}:row),
    motifId:"key",styleId:"nature",
  });
  assert.equal(twoStyles.ok,false);
  assert.equal(twoStyles.status,"insufficient_style_media");
  const duplicate=evaluateMyTubeMontageCreativeMatch({
    clipIds:["one","two","three","three"],scenes:passed,motifId:"key",
  });
  assert.equal(duplicate.status,"invalid_montage");
  assert.equal(evaluateMyTubeMontageCreativeMatch({
    clipIds:base.map(x=>x.id),scenes:passed,styleId:"alien",
  }).status,"invalid_style");
  assert.equal(evaluateMyTubeMontageCreativeMatch({
    clipIds:base.map(x=>x.id),scenes:passed.map((row,i)=>i===0?{...row,status:"candidate"}:row),motifId:"key",
  }).ok,false);
});

test("no approved literal key footage -> no fabricated key film, but legacy unfiltered montage remains",()=>{
  const opts={topicId:"money-mindset",scenarioId:"money-mindset-s1",scenes:master.scenes};
  const baseline=recommendMyTubeTopicStoryClips(opts);
  assert.equal(baseline.dedicatedFourSceneReady,true);
  assert.equal(baseline.clipIds.length,4);
  const keyFilter=recommendMyTubeTopicStoryClips({...opts,motifId:"key"});
  assert.equal(keyFilter.dedicatedFourSceneReady,false);
  assert.deepEqual(keyFilter.clipIds,[]);
  assert.ok(keyFilter.status==="insufficient_motif_media"||keyFilter.status==="insufficient_topic_media");
  assert.equal(recommendMyTubeTopicStoryClips({...opts,motifId:"alien"}).status,"invalid_motif");
  assert.equal(recommendMyTubeTopicStoryClips({
    topicId:"money-mindset",scenes:master.scenes,motifId:"stream",
  }).status,"scenario_required_for_creative_filter");
  assert.equal(validateMyTubeCreativeSelection({
    topicId:"panic-attacks",scenarioId:"money-mindset-s1",motifId:"key",
  }).status,"invalid_scenario");
});

test("plot-specific suggestions retain four narrative beats but reject unsupported key video",async()=>{
  const [plot]=await listMyTubePlots("money-mindset-s1","ru");
  const original=recommendMyTubePlotMontage({plot,scenes:master.scenes});
  assert.equal(original.hasFourApprovedSources,true);
  const withKey=recommendMyTubePlotMontage({plot,scenes:master.scenes,motifId:"key"});
  assert.equal(withKey.hasFourApprovedSources,false);
  assert.deepEqual(withKey.clipIds,[]);
  const invalidStyle=recommendMyTubePlotMontage({plot,scenes:master.scenes,styleId:"nope"});
  assert.equal(invalidStyle.hasFourApprovedSources,false);
  assert.equal(invalidStyle.status,"invalid_style");
});

test("public MyTube facet selection requires explicitly reviewed literal visual annotations",()=>{
  const candidate={title:"Ключ к изменениям",topicTags:["stress"],visualMotifsVerified:["key"],visualStylesVerified:["nature"]};
  const unreviewed=rankPublicMyTubeVideo(candidate);
  assert.deepEqual(unreviewed.mytubeMotifIds,[]);
  assert.equal(unreviewed.mytubeVisualTagEvidence,"not_verified");
  assert.equal(videoMatchesMyTubeVisualFilter(unreviewed,{motifId:"key"}),false);
  const reviewed=rankPublicMyTubeVideo({...candidate,visualReviewStatus:"human_reviewed"});
  assert.deepEqual(reviewed.mytubeMotifIds,["key"]);
  assert.deepEqual(reviewed.mytubeStyleIds,["nature"]);
  assert.equal(videoMatchesMyTubeVisualFilter(reviewed,{motifId:"key",styleId:"nature"}),true);
  assert.equal(videoMatchesMyTubeVisualFilter(reviewed,{motifId:"stream"}),false);
  assert.equal(videoMatchesMyTubeVisualFilter(reviewed,{styleId:"cinematic"}),false);
  assert.equal(videoMatchesMyTubeVisualFilter(reviewed,{styleId:"unknown"}),false);
  assert.equal(videoMatchesMyTubeVisualFilter(unreviewed),true);
});

test("existing public MyTube tree also displays verified motif/style facets after scenario",()=>{
  const ui=readFileSync(new URL("../components/video-discovery.tsx",import.meta.url),"utf8");
  for(const token of [
    "listMyTubeScenarioMotifs","listMyTubeStyles","videoMatchesMyTubeVisualFilter",
    "data-mytube-visual-filter-extension","data-mytube-motifs","data-mytube-motif=",
    "data-mytube-styles","data-mytube-style=","explicit_human_review",
  ])assert.ok(ui.includes(token),token);
  assert.match(ui,/setMyTubeMotifId\("all"\)/);
  assert.match(ui,/setMyTubeStyleId\("all"\)/);
});

test("existing mobile director exposes five motifs & collapsible styles without losing plots or montage",()=>{
  const ui=readFileSync(new URL("../components/mandala-auto-video-director.tsx",import.meta.url),"utf8");
  for(const token of [
    "data-mytube-motif-choices","data-mytube-motif=",
    "data-mytube-style-filter","data-mytube-style-choices","data-mytube-style=",
    "data-mytube-plot-choices","data-mytube-concept-storyboard",
    "data-auto-video-montage","data-auto-video-timeline-preview",
    "data-auto-video-confirm","data-auto-video-create",
    "selectedMotifId","selectedStyleId","creativeSelectionUnavailable",
    "evaluateMyTubeMontageCreativeMatch",
  ])assert.ok(ui.includes(token),token);
  assert.match(ui,/disabled=\{disabled\|\|plotLacksApprovedClips\}/);
  assert.match(ui,/disabled=\{disabled\|\|!canCreate\|\|plotLacksApprovedClips\}/);
});

// STSE extends this established Mandala/MyTube specialist test lane; no extra workflow.
import "./state-transition-scenarios.test.mjs";

// Reuse existing Mandala specialist MyTube lane without new workflow/runners.
import "./mytube-media-coverage.test.mjs";
