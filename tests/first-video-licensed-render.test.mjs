import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {buildFirstVideoDraft} from '../lib/mandala/first-video-director.mjs';

const catalog=JSON.parse(readFileSync(new URL('../data/video-catalog/scene-taxonomy.json',import.meta.url),'utf8'));
const approved=new Map(catalog.scenes.filter(scene=>scene.status==='approved'&&scene.media==='licensed_mp4')
  .map(scene=>[scene.id,scene]));

test('First Video proposes exactly the four approved MP4 scenes that its renderer will use',()=>{
  for(const locale of ['ru','en','es']) for(const durationSeconds of [20,30,60]){
    const draft=buildFirstVideoDraft({locale,wish:'Тихое утро на солнечном лугу',durationSeconds});
    assert.equal(draft.plan.version,'hh-local-stock-compilation-v1');
    assert.equal(draft.plan.shots.length,4);
    assert.equal(new Set(draft.plan.shots.map(shot=>shot.sceneId)).size,4);
    assert.equal(draft.plan.shots.reduce((sum,shot)=>sum+shot.durationSeconds,0),durationSeconds);
    for(const shot of draft.plan.shots){
      const scene=approved.get(shot.sceneId);
      assert.ok(scene,`unlicensed scene ${shot.sceneId}`);
      assert.equal(shot.theme,scene.theme);
      assert.match(scene.video,/^\/videos\/holistic-house\/.*\.mp4$/);
      assert.ok(existsSync(new URL('../public'+scene.video,import.meta.url)),`missing source ${scene.video}`);
      assert.ok(draft.prompt.includes(scene.description[locale]),'shown scenario must describe the actual clip');
    }
  }
});

test('explicit water exclusion applies to licensed footage, not only a scene label',()=>{
  const draft=buildFirstVideoDraft({locale:'ru',wish:'Новая дорога к цели',durationSeconds:60,avoid:'море и вода'});
  for(const shot of draft.plan.shots){
    const scene=approved.get(shot.sceneId);
    const content=[scene.id,...scene.tags,...scene.motifs].join(' ');
    assert.doesNotMatch(content,/sea|ocean|coast|water|river|stream|falls|shore|beach/i);
  }
});

test('too many exclusions never silently reintroduce an excluded clip',()=>{
  assert.throws(()=>buildFirstVideoDraft({locale:'ru',wish:'спокойствие',
    avoid:'солнце, свет, вода, лес, ночь, горы, цветы'}),/no_compatible_licensed_scenes/);
});

test('an exclusion that cannot be checked does not silently become an unrestricted film',()=>{
  assert.throws(()=>buildFirstVideoDraft({locale:'en',wish:'a calm morning',
    avoid:'unrecognized purple spacecraft'}),/unsupported_scene_exclusion/);
});

test('unrelated words do not accidentally count as supported exclusions',()=>{
  for(const avoid of ['морковь','лестница','season'])
    assert.throws(()=>buildFirstVideoDraft({locale:'ru',wish:'тихое утро',avoid}),/unsupported_scene_exclusion/);
});
