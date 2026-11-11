import test from "node:test";
import assert from "node:assert/strict";
import master from "../data/video-catalog/scene-taxonomy.json" with {type:"json"};
import stock from "../data/video-catalog/free-stock-scenes.json" with {type:"json"};
import {rankApprovedMyTubeScene,rankAllApprovedMyTubeScenes,
  rankPublicMyTubeVideo,auditMyTubeSceneTagging,recommendMyTubeTopicStoryClips,exactOriginalMotionTopicHint} from "../lib/mandala/mytube-video-tagging.mjs";

test("all 56 physically present scene variants receive ranked topics",()=>{
  const summary=auditMyTubeSceneTagging(master.scenes);
  assert.equal(summary.approvedUnique,56);
  assert.equal(summary.ranked,56);
  assert.deepEqual(summary.missing,[]);
  assert.equal(summary.topicPlacements,168);
  assert.equal(summary.scenarioVisualMatches,672);
  assert.equal(Object.values(summary.primaryCategoryCounts).reduce((n,v)=>n+v,0),56);
  for(const [category,min] of Object.entries({"goals-money":23,"love-relationships":1,"energy-confidence":20,"stress-anxiety":4}))
    assert.ok(summary.primaryCategoryCounts[category]>=min,category);
  const ranked=rankAllApprovedMyTubeScenes(master.scenes);
  assert.equal(new Set(ranked.map(x=>x.sceneId)).size,56);
  for(const scene of ranked){
    assert.equal(scene.humanReviewed,false);
    assert.equal(scene.sourcePublishStatus,"unchanged");
    assert.equal(scene.matches.length,3);
    assert.equal(scene.primary,scene.matches[0]);
    assert.ok(scene.matches[0].score>=scene.matches[1].score);
    for(const match of scene.matches){
      assert.ok(match.categoryId&&match.subcategoryId&&match.topicId);
      assert.equal(match.scenarios.length,4);
      assert.equal(new Set(match.scenarios.map(s=>s.scenarioId)).size,4);
      assert.ok(match.scenarios.every(s=>s.score>=0&&s.score<=100));
    }
  }
});

test("12 existing composites are not new sources; the four newly licensed masters are distinct",()=>{
  const ids=new Set(master.scenes.map(scene=>scene.id));
  assert.equal(stock.length,24);
  assert.equal(stock.filter(s=>s.sourceKind==="licensed_two_shot_composite").length,12);
  assert.equal(stock.filter(s=>s.sourceKind==="licensed_single_shot_edit").length,4);
  assert.equal(stock.filter(scene=>ids.has(scene.id)).length,24);
  const repeated=master.scenes.concat(master.scenes[0]);
  assert.equal(rankAllApprovedMyTubeScenes(repeated).length,56);
});


test("four HD films have individually curated visual-topic rankings, but no fabricated plot certification",()=>{
  const cases=[
    ["sun-trees-forest","recovery-after-load"],
    ["snow-forest-winter","recovery-after-load"],
    ["fall-foliage-forest","life-transitions"],
    ["warm-clouds-sunset","evening-fatigue"],
  ];
  for(const [sceneId,topicId] of cases){
    const scene=master.scenes.find(row=>row.id===sceneId);
    assert.ok(scene&&scene.allowedAspects?.includes("portrait"),sceneId);
    assert.deepEqual(scene.allowedAspects,["portrait"]);
    const row=rankApprovedMyTubeScene(sceneId);
    assert.equal(row.primary.topicId,topicId);
    assert.equal(row.humanReviewed,false);
    assert.equal(row.sourcePublishStatus,"unchanged");
    assert.equal(row.matches.length,3);
    assert.ok(row.matches.every(item=>item.scenarios.length===4));
  }
});

test("stock tagging never promotes unknown or unapproved material",()=>{
  assert.equal(rankApprovedMyTubeScene("invented-scene"),null);
  const rows=rankAllApprovedMyTubeScenes([
    {id:"invented-scene",media:"licensed_mp4",status:"approved"},
    {id:"golden-rain",media:"licensed_mp4",status:"candidate"},
    {id:"golden-rain",media:"licensed_mp4",status:"approved"},
  ]);
  assert.deepEqual(rows.map(x=>x.sceneId),["golden-rain"]);
});

test("full-video public metadata can match a specific canonical theme",()=>{
  const selected=rankPublicMyTubeVideo({title:"Снятие стресса: мягкая медитация",
    description:"Практика на расслабление",topicTags:["stress"]},{locale:"ru"});
  assert.equal(selected.mytubeRankings[0].topicId,"stress-relief");
  assert.equal(selected.mytubeRankings[0].categoryId,"stress-anxiety");
  assert.equal(selected.mytubeRankings[0].score,96);
  assert.equal(selected.mytubeRankings[0].scenarios.length,4);
});

test("legacy generic tags never fabricate topic- or scenario-specific evidence",()=>{
  const selected=rankPublicMyTubeVideo({title:"Holistic House introduction",
    description:"A teaching video",topicTags:["energy","practices"]},{locale:"en"});
  assert.equal(selected.mytubeRankings.length,0);
  assert.equal(selected.mytubeScenarioIds.length,0);
  assert.equal(selected.mytubeNeedsReview,true);
  assert.ok(selected.mytubeCategoryCandidates.some(x=>
    x.categoryId==="energy-confidence"&&x.evidence==="legacy_category_tag"&&x.score===42));
});

test("explicit phrase in approved public video metadata is not multiplied into unrelated sibling topics",()=>{
  const selected=rankPublicMyTubeVideo({title:"Как найти любовь",description:"",topicTags:["love"]},{locale:"ru"});
  assert.equal(selected.mytubeRankings[0].topicId,"find-love");
  assert.ok(!selected.mytubeTopicIds.includes("rebuilding-trust"));
});


test("four real, distinct, approved clips are chosen for a well-covered topic",()=>{
  const result=recommendMyTubeTopicStoryClips({topicId:"money-mindset",scenes:master.scenes});
  assert.equal(result.status,"four_approved_scene_candidates");
  assert.equal(result.dedicatedFourSceneReady,true);
  assert.equal(result.clipIds.length,4);
  assert.equal(new Set(result.clipIds).size,4);
  assert.ok(result.clipIds.every(id=>master.scenes.some(scene=>
    scene.id===id&&scene.status==="approved"&&scene.media==="licensed_mp4")));
  assert.equal(result.verifiedFinishedScript,false);
});

test("story choice changes ranking but cannot invent assets or titles",()=>{
  const topic=recommendMyTubeTopicStoryClips({topicId:"money-mindset",scenes:master.scenes});
  const scenario=recommendMyTubeTopicStoryClips({topicId:"money-mindset",
    scenarioId:"money-mindset-s3",scenes:master.scenes});
  assert.equal(scenario.status,"four_approved_scene_candidates");
  assert.equal(scenario.clipIds.length,4);
  assert.notDeepEqual(scenario.clipIds,topic.clipIds,
    "individual story archetypes should affect source ranking");
  assert.equal(recommendMyTubeTopicStoryClips({topicId:"money-mindset",scenarioId:"panic-attacks-s1",
    scenes:master.scenes}).status,"invalid_scenario");
  assert.equal(recommendMyTubeTopicStoryClips({topicId:"not-real",scenes:master.scenes}).status,"unknown_topic");
});

test("uncovered anxiety and trauma themes remain explicit gaps, never fabricated videos",()=>{
  for(const id of ["constant-anxiety","childhood-trauma","panic-attacks"]){
    const result=recommendMyTubeTopicStoryClips({topicId:id,scenes:master.scenes});
    assert.equal(result.status,"insufficient_topic_media");
    assert.equal(result.dedicatedFourSceneReady,false);
    assert.deepEqual(result.clipIds,[]);
  }
});

test("editor rejects unapproved, foreign, unlicensed and excluded footage",()=>{
  const input=master.scenes.filter(x=>x.theme==="money");
  const unrelated={...input[0],id:"foreign-unlicensed",video:"https://example.com/movie.mp4"};
  const rejected={...input[1],status:"candidate"};
  const blocked=recommendMyTubeTopicStoryClips({topicId:"money-mindset",
    scenes:[unrelated,rejected,...input.slice(2)]});
  assert.ok(!blocked.clipIds.includes("foreign-unlicensed"));
  assert.ok(!blocked.clipIds.includes(input[1].id));
  const noWater=recommendMyTubeTopicStoryClips({topicId:"breathing-practices",
    scenes:master.scenes,excludedMotifs:["water"]});
  assert.ok(noWater.clipIds.every(id=>{
    const scene=master.scenes.find(s=>s.id===id);
    return scene&&!["sea","ocean","water","river","beach","lake","coast"]
      .some(x=>scene.motifs.includes(x));
  }));
  const invalidExclusion=recommendMyTubeTopicStoryClips({topicId:"money-mindset",
    scenes:master.scenes,excludedMotifs:["medical-treatment"]});
  assert.equal(invalidExclusion.status,"insufficient_topic_media");
  assert.deepEqual(invalidExclusion.clipIds,[]);
});

test("MyTube UI and director consume the same ranked selector and expose real coverage",async()=>{
  const {readFileSync}=await import("node:fs");
  const mytube=readFileSync(new URL("../components/video-discovery.tsx",import.meta.url),"utf8");
  const cards=readFileSync(new URL("../components/library-feed.tsx",import.meta.url),"utf8");
  const director=readFileSync(new URL("../components/mandala-auto-video-director.tsx",import.meta.url),"utf8");
  assert.match(mytube,/data-mytube-scenarios/);
  assert.match(mytube,/mytubeRankings/);
  assert.match(mytube,/mytubeFocus/);
  assert.match(cards,/data-mytube-ranking/);
  assert.match(director,/recommendMyTubeTopicStoryClips/);
  assert.match(director,/timelineForTopic\(topicId,null,recommended\)/);
  assert.match(director,/data-auto-video-topic-coverage/);
  assert.match(director,/data-scenario-source-coverage/);
  assert.match(director,/onApply\(chosen\.id,length/,"the user still confirms the real montage");
});

test("future project-original motion clips use exact canonical topic IDs only, never legacy alias guessing",()=>{
  const videoId="motion-goals-money-goal-setting-v1";
  const authenticMetadata={
    id:videoId,sourceId:"goal-setting",collection:"original-motion-v1",
    media:"original_motion_mp4",status:"approved",
    rightsReference:{kind:"project_generated_original",thirdPartyFootage:false},
    visualOrigin:"original_procedural_non_photographic",
    video:"/videos/holistic-house/original-motion-v1/"+videoId+".mp4",
    sha256:"a".repeat(64),tags:["goal-setting","horizon","abstract"],motifs:["horizon"],
    theme:"goals",
  };
  assert.deepEqual(exactOriginalMotionTopicHint(authenticMetadata,"goal-setting"),{
    topicId:"goal-setting",score:84,evidence:"exact_original_abstract_motion_source_id",
  });
  assert.equal(exactOriginalMotionTopicHint(authenticMetadata,"goal-follow-through"),null);
  assert.equal(exactOriginalMotionTopicHint({...authenticMetadata,sourceId:"goal-achievement"},"goal-setting"),null);
  assert.equal(exactOriginalMotionTopicHint({...authenticMetadata,sourceId:"goal-achievement"},"goal-achievement"),null,
    "legacy topic not present in current taxonomy must not become exact match");
  assert.equal(exactOriginalMotionTopicHint({...authenticMetadata,media:"licensed_mp4"},"goal-setting"),null);
  assert.equal(exactOriginalMotionTopicHint({...authenticMetadata,visualOrigin:"photographed"},"goal-setting"),null);
  assert.equal(exactOriginalMotionTopicHint({...authenticMetadata,rightsReference:{kind:"dareful_cc_by_4_0"}},"goal-setting"),null);
  assert.equal(exactOriginalMotionTopicHint({...authenticMetadata,video:"https://other.example/x.mp4"},"goal-setting"),null);
  assert.equal(exactOriginalMotionTopicHint({...authenticMetadata,tags:["abstract"]},"goal-setting"),null);
  assert.equal(exactOriginalMotionTopicHint({...authenticMetadata,sha256:"not-a-hash"},"goal-setting"),null);
  assert.equal(exactOriginalMotionTopicHint({...authenticMetadata,status:"candidate"},"goal-setting"),null);
  const v10={...authenticMetadata,id:"motion-goals-money-goal-setting-v10",video:"/videos/holistic-house/original-motion-v1/motion-goals-money-goal-setting-v10.mp4"};
  assert.equal(exactOriginalMotionTopicHint(v10,"goal-setting")?.topicId,"goal-setting");
  assert.equal(exactOriginalMotionTopicHint({...v10,id:"motion-goals-money-goal-setting-v11",video:"/videos/holistic-house/original-motion-v1/motion-goals-money-goal-setting-v11.mp4"},"goal-setting"),null);

});

test("MyTube source ranking refuses portrait-only masters for landscape and square",()=>{
  const portraitIds=new Set(["sun-trees-forest","snow-forest-winter",
    "fall-foliage-forest","warm-clouds-sunset"]);
  const input={topicId:"recovery-after-load",scenarioId:"recovery-after-load-s2",scenes:master.scenes};
  const vertical=recommendMyTubeTopicStoryClips({...input,targetAspect:"portrait"});
  const landscape=recommendMyTubeTopicStoryClips({...input,targetAspect:"landscape"});
  const square=recommendMyTubeTopicStoryClips({...input,targetAspect:"square"});
  assert.ok(vertical.candidates.some(x=>x.sceneId==="sun-trees-forest"));
  assert.ok(vertical.candidates.some(x=>x.sceneId==="snow-forest-winter"));
  assert.ok(vertical.candidateCount>landscape.candidateCount);
  for(const x of [landscape,square]){
    assert.ok(x.candidates.every(row=>!portraitIds.has(row.sceneId)));
    assert.ok(x.clipIds.every(id=>!portraitIds.has(id)));
  }
  const invalid=recommendMyTubeTopicStoryClips({...input,targetAspect:"ultrawide"});
  assert.equal(invalid.status,"invalid_aspect");
  assert.deepEqual(invalid.clipIds,[]);
});
