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
test('3 minute audio uses 36 contiguous five-second non-looping cuts in four stages',()=>{
  const result=compileDotStoryCutPlan({plotId:plot.id,audioDurationMs:180000,scenes});
  assert.equal(result.ok,true);
  assert.equal(result.cutCount,36);
  assert.ok(result.shots.every(x=>x.durationMs<=x.sourceDurationMs&&!x.loopRequired));
  assert.equal(result.uniqueSceneCount,6);
  assert.equal(result.shots[0].startMs,0);
  assert.equal(result.shots.at(-1).startMs+result.shots.at(-1).durationMs,180000);
  assert.deepEqual([...new Set(result.shots.map(x=>x.stage))],[0,1,2,3]);
  assert.equal(result.publishAuthorized,false);
  assert.equal(result.needsPhysicalMediaVerification,true);
  assert.ok(result.shots.every(x=>x.relevance>0));
  assert.ok(result.shots.every((x,i)=>i===0||x.startMs===result.shots[i-1].startMs+result.shots[i-1].durationMs));
});
test('30 minute soundtrack is bounded when verified masters are long enough',()=>{
  const longerMasters=scenes.map(scene=>({...scene,durationSeconds:20}));
  const r=compileDotStoryCutPlan({plotId:plot.id,audioDurationMs:1800000,scenes:longerMasters});
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

test('four story beats never repeat a clip at the beat boundary',()=>{
 const ids=scenes.slice(0,4).map(s=>s.id);
 const result=compileDotStoryCutPlan({plotId:plot.id,audioDurationMs:180000,
   scenes:scenes.slice(0,4),stageClipIds:ids});
 assert.equal(result.ok,true);
 assert.ok(result.shots.every((shot,i)=>i===0||shot.sceneId!==result.shots[i-1].sceneId));
});

test('short licensed masters cannot be silently looped to fill 30 minutes',()=>{
  const r=compileDotStoryCutPlan({plotId:plot.id,audioDurationMs:1800000,scenes});
  assert.equal(r.code,'NON_LOOPING_SOURCE_COVERAGE_INSUFFICIENT');
  assert.ok(r.requiredCuts>r.maxCuts);
});
test('under-three-second footage is excluded from real non-looping cuts',()=>{
  const short=scenes.map(x=>({...x,durationSeconds:1}));
  assert.equal(compileDotStoryCutPlan({
    plotId:plot.id,audioDurationMs:180000,scenes:short,
  }).code,'VERIFIED_SCENE_COVERAGE_INSUFFICIENT');
});
test('four editorial anchors retain all six relevant vetted sources',()=>{
  const ids=scenes.slice(0,4).map(scene=>scene.id);
  const r=compileDotStoryCutPlan({plotId:plot.id,audioDurationMs:180000,
    scenes,stageClipIds:ids});
  assert.equal(r.ok,true);
  assert.equal(r.uniqueSceneCount,6);
  assert.deepEqual([0,1,2,3].map(stage=>
    r.shots.find(shot=>shot.stage===stage).sceneId),ids);
  assert.ok(r.shots.every((shot,i)=>
    !shot.loopRequired&&shot.durationMs<=shot.sourceDurationMs&&
    (!i||shot.sceneId!==r.shots[i-1].sceneId)));
});

test('trusted ranked alternatives join four fixed narrative anchors without looping',()=>{
  const ids=scenes.slice(0,4).map(x=>x.id);
  const extras=scenes.slice(4).map(x=>({
    ...x,tags:['unrelated editor beat'],motifs:['different-tag'],
  }));
  const r=compileDotStoryCutPlan({plotId:plot.id,audioDurationMs:180000,
    scenes:[...scenes.slice(0,4),...extras],stageClipIds:ids});
  assert.equal(r.ok,true);
  assert.equal(r.uniqueSceneCount,6);
  assert.deepEqual([0,1,2,3].map(stage=>
    r.shots.find(x=>x.stage===stage).sceneId),ids);
  assert.ok(r.shots.every((s,i)=>!s.loopRequired&&s.durationMs<=s.sourceDurationMs&&
    (!i||s.sceneId!==r.shots[i-1].sceneId)));
});

test('unique owner montage protects all four act anchors and never repeats a scene',()=>{
 const anchors=scenes.slice(0,4).map(x=>x.id);
 const result=compileDotStoryCutPlan({plotId:plot.id,audioDurationMs:30000,
   scenes,stageClipIds:anchors,allowRepetition:false});
 assert.equal(result.ok,true);
 assert.equal(result.uniqueSceneCount,result.cutCount);
 assert.equal(result.cutCount,6);
 assert.deepEqual([0,1,2,3].map(stage=>
   result.shots.find(x=>x.stage===stage).sceneId),anchors);
 assert.ok(result.shots.every(x=>!x.loopRequired));
});
test('unique owner montage fails closed rather than recycling scenes',()=>{
 const result=compileDotStoryCutPlan({plotId:plot.id,audioDurationMs:180000,
   scenes,stageClipIds:scenes.slice(0,4).map(x=>x.id),
   allowRepetition:false});
 assert.equal(result.code,'UNIQUE_SCENES_INSUFFICIENT');
 assert.equal(result.requiredCount,36);
 assert.equal(result.approvedRelevantCount,6);
});

test('strict montage rejects two cropped variants of one original master',()=>{
 const ids=scenes.slice(0,4).map(s=>s.id);
 const same=scenes.map((s,i)=>({...s,
   originMasterKeys:[i===4||i===5?'same':'source-'+i]}));
 const result=compileDotStoryCutPlan({plotId:plot.id,audioDurationMs:30000,
   scenes:same,stageClipIds:ids,allowRepetition:false});
 assert.equal(result.code,'UNIQUE_FILMED_SOURCES_INSUFFICIENT');
});
