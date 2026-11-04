import test from 'node:test';
import assert from 'node:assert/strict';
import {listTelegramStoryCategories,listTelegramStorySubcategories,listTelegramStoryTopics,
  listTelegramStoryScenarios,listTelegramStoryPlots} from '../lib/mandala/telegram-story-plots.mjs';
import {compileDotStoryCutPlan} from '../lib/mandala/dot-story-cut-plan.mjs';

const category=listTelegramStoryCategories()[0];
const sub=listTelegramStorySubcategories(category.id)[0];
const topic=listTelegramStoryTopics(category.id,sub.id)[0];
const scenario=listTelegramStoryScenarios(topic.id)[0];
const plot=listTelegramStoryPlots(scenario.id)[1];
const scenes=Array.from({length:6},(_,i)=>({
  id:'nature-scene-'+i,theme:'life',collection:'film-collection-v3',
  rightsReference:{kind:'dareful_cc_by_4_0'},status:'approved',
  media:'licensed_mp4',video:'/videos/holistic-house/film-collection-v3/nature-scene-'+i+'.mp4',
  motifs:['nature','light'],tags:['landscape'],durationSeconds:5,
}));
test('3 minute audio maps to 15 exact contiguous 12-second cuts and four stages',()=>{
  const result=compileDotStoryCutPlan({plotId:plot.id,audioDurationMs:180000,scenes});
  assert.equal(result.ok,true);
  assert.equal(result.cutCount,15);
  assert.equal(result.uniqueSceneCount,6);
  assert.equal(result.shots[0].startMs,0);
  assert.equal(result.shots.at(-1).startMs+result.shots.at(-1).durationMs,180000);
  assert.deepEqual([...new Set(result.shots.map(x=>x.stage))],[0,1,2,3]);
  assert.equal(result.publishAuthorized,false);
  assert.equal(result.needsPhysicalMediaVerification,true);
  assert.ok(result.shots.every(x=>x.relevance>0));
  assert.ok(result.shots.every((x,i)=>i===0||x.startMs===result.shots[i-1].startMs+result.shots[i-1].durationMs));
});
test('30 minute soundtrack is bounded, with exact last millisecond',()=>{
  const r=compileDotStoryCutPlan({plotId:plot.id,audioDurationMs:1800000,scenes});
  assert.equal(r.ok,true);
  assert.equal(r.cutCount,150);
  assert.equal(r.shots.at(-1).startMs+r.shots.at(-1).durationMs,1800000);
});
test('Unbound and invalid footage fail closed',()=>{
  assert.equal(compileDotStoryCutPlan({plotId:plot.id,audioDurationMs:180000,scenes:[]}).code,'VERIFIED_SCENE_COVERAGE_INSUFFICIENT');
  assert.equal(compileDotStoryCutPlan({plotId:plot.id,audioDurationMs:180000,scenes:scenes.slice(0,3)}).ok,false);
  assert.equal(compileDotStoryCutPlan({plotId:plot.id,audioDurationMs:180000,scenes:scenes.map(x=>({...x,status:'pending'}))}).ok,false);
  assert.equal(compileDotStoryCutPlan({plotId:plot.id,audioDurationMs:180000,scenes:scenes.map(x=>({...x,video:'https://evil.example/clip.mp4'}))}).ok,false);
  assert.equal(compileDotStoryCutPlan({plotId:plot.id,audioDurationMs:180000,scenes:scenes.map(x=>({...x,rightsReference:{kind:'unknown'}}))}).ok,false);
  assert.equal(compileDotStoryCutPlan({plotId:plot.id,audioDurationMs:180000,scenes,excludedMotifs:['dark','unknown']}).ok,false);
});
test('Reject invalid duration, arbitrary plot and excessive cuts',()=>{
  assert.equal(compileDotStoryCutPlan({plotId:'fake',audioDurationMs:180000,scenes}).code,'PLOT_UNKNOWN');
  assert.equal(compileDotStoryCutPlan({plotId:plot.id,audioDurationMs:1800001,scenes}).code,'AUDIO_DURATION_INVALID');
  assert.equal(compileDotStoryCutPlan({plotId:plot.id,audioDurationMs:0,scenes}).code,'AUDIO_DURATION_INVALID');
  assert.equal(compileDotStoryCutPlan({plotId:plot.id,audioDurationMs:180000,scenes,targetCutMs:1000}).code,'CUT_LENGTH_INVALID');
  assert.equal(compileDotStoryCutPlan({plotId:plot.id,audioDurationMs:180000,scenes,allowRepetition:false}).code,'UNIQUE_SCENES_INSUFFICIENT');
});

test('four canonically ranked MyTube stage sources survive entire audio edit',()=>{
 const ids=scenes.slice(0,4).map(s=>s.id);
 const r=compileDotStoryCutPlan({plotId:plot.id,audioDurationMs:180000,
  scenes,stageClipIds:ids});
 assert.equal(r.ok,true);
 assert.deepEqual(r.stageClipIds,ids);
 assert.equal(r.audioDurationMs,180000);
 const first=[0,1,2,3].map(stage=>r.shots.find(shot=>shot.stage===stage)?.sceneId);
 assert.deepEqual(first,ids);
 assert.equal(r.shots.at(-1).startMs+r.shots.at(-1).durationMs,180000);
 assert.equal(compileDotStoryCutPlan({plotId:plot.id,
   audioDurationMs:60000,scenes,stageClipIds:[ids[0],ids[0],ids[2],ids[3]]}).code,
  'PLOT_STAGE_SOURCE_INVALID');
 assert.equal(compileDotStoryCutPlan({plotId:plot.id,
   audioDurationMs:60000,scenes,stageClipIds:[ids[0],ids[1],ids[2],'unlicensed']}).code,
  'PLOT_STAGE_SOURCE_INVALID');
});
