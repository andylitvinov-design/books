import test from "node:test";
import assert from "node:assert/strict";
import master from "../data/video-catalog/scene-taxonomy.json" with {type:"json"};
import stock from "../data/video-catalog/free-stock-scenes.json" with {type:"json"};
import {rankApprovedMyTubeScene,rankAllApprovedMyTubeScenes,
  rankPublicMyTubeVideo,auditMyTubeSceneTagging} from "../lib/mandala/mytube-video-tagging.mjs";

test("all 44 unique approved first-party movie scenes receive ranked primary and alternatives",()=>{
  const summary=auditMyTubeSceneTagging(master.scenes);
  assert.equal(summary.approvedUnique,44);
  assert.equal(summary.ranked,44);
  assert.deepEqual(summary.missing,[]);
  assert.equal(summary.topicPlacements,132);
  assert.equal(summary.scenarioVisualMatches,528);
  assert.deepEqual(summary.primaryCategoryCounts,{
    "goals-money":22,"love-relationships":1,"energy-confidence":17,"stress-anxiety":4,
  });
  const ranked=rankAllApprovedMyTubeScenes(master.scenes);
  assert.equal(new Set(ranked.map(x=>x.sceneId)).size,44);
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

test("the separately recorded 12 composites are duplicates, not twelve more videos",()=>{
  const ids=new Set(master.scenes.map(scene=>scene.id));
  assert.equal(stock.length,12);
  assert.equal(stock.filter(scene=>ids.has(scene.id)).length,12);
  const repeated=master.scenes.concat(master.scenes[0]);
  assert.equal(rankAllApprovedMyTubeScenes(repeated).length,44);
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
