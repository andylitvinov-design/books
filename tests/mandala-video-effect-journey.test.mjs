import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VIDEO_EFFECT_AREAS,completeVideoEffectScores,isVideoEffectScore,compareVideoEffectScores} from '../lib/mandala/video-effect-measurement.mjs';

test('exactly seven neutral positive-direction subjective scales are localized',()=>{
  assert.equal(VIDEO_EFFECT_AREAS.length,7);
  assert.equal(new Set(VIDEO_EFFECT_AREAS.map(area=>area.id)).size,7);
  for(const area of VIDEO_EFFECT_AREAS)for(const locale of ['ru','en','es'])
    assert.ok(area.label[locale]?.length>3,area.id+' '+locale);
});
test('zero and ten are valid, a missing answer is not silently scored as five',()=>{
  assert.equal(isVideoEffectScore(0),true);
  assert.equal(isVideoEffectScore(10),true);
  for(const invalid of [-1,11,5.5,NaN,undefined,null,'5'])assert.equal(isVideoEffectScore(invalid),false);
  assert.equal(completeVideoEffectScores([0,1,2,3,4,5,null]),false);
  assert.equal(completeVideoEffectScores([0,1,2,3,4,5,6,7]),false);
  assert.throws(()=>compareVideoEffectScores([0,1,2,3,4,5,null],[1,2,3,4,5,6,7]),/seven_answers/);
});
test('reports all signed changes including decline, improvement and no movement',()=>{
  const out=compareVideoEffectScores([0,5,10,4,4,9,2],[1,5,6,7,4,8,10]);
  assert.deepEqual(out.rows.map(row=>row.delta),[1,0,-4,3,0,-1,8]);
  assert.deepEqual([out.improved,out.unchanged,out.decreased],[3,2,2]);
  assert.equal(out.meanBefore,4.9);
  assert.equal(out.meanAfter,5.9);
  assert.equal(out.meanDelta,1);
});
test('website includes real progress, post-play feedback and does not claim an unverified effect',()=>{
  const source=readFileSync(new URL('../components/mandala-video-effect-journey.tsx',import.meta.url),'utf8');
  const studio=readFileSync(new URL('../components/mandala-free-video-studio.tsx',import.meta.url),'utf8');
  assert.match(source,/videoStarted\|\|videoEnded\|\|confirmedWatched/);
  assert.match(source,/!hasBefore&&phase==="before"/);
  assert.match(source,/disabled=\{!viewed\}/);
  assert.match(source,/data-video-effect-reaction=\{key\}/);
  assert.match(source,/data-effect-delta=\{area.id\}/);
  assert.match(source,/not evidence that the video caused/);
  assert.match(studio,/setVideoEffectSession\(current=>current\+1\)/);
  assert.match(studio,/onPlay=\{\(\)=>setVideoEffectStarted\(true\)\}/);
  assert.match(studio,/MandalaVideoEffectJourney/);
  assert.match(studio,/status=\{preparing\?"preparing":recording\?"rendering"/);
});
