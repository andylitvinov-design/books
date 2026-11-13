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

test('render progress and the optional one-at-a-time check-in in a centered, dismissible mobile dialog',()=>{
  const source=readFileSync(new URL('../components/mandala-video-effect-journey.tsx',import.meta.url),'utf8');
  const css=readFileSync(new URL('../components/mandala-video-effect-journey.module.css',import.meta.url),'utf8');
  assert.match(source,/createPortal\(modalOpen/);
  assert.match(source,/data-video-effect-overlay/);
  assert.match(source,/role="dialog" aria-modal="true"/);
  assert.match(source,/aria-labelledby="video-effect-journey-title"/);
  assert.match(source,/document\.body\.style\.overflow="hidden"/);
  assert.match(source,/event\.key==="Escape"/);
  assert.match(source,/data-video-effect-reopen/);
  assert.match(source,/if\(status==="ready"\)\{setModalOpen\(false\);return;\}/);
  assert.match(source,/if\(status==="failed"\)setModalOpen\(true\)/);
  assert.doesNotMatch(source,/videoEnded\|\|status==="failed"/);
  assert.match(source,/data-video-effect-watch/);
  assert.match(source,/onClick=\{\(\)=>chooseScore\(value\)\}/);
  assert.match(css,/\.overlay\{position:fixed;inset:0;z-index:11000/);
  assert.match(css,/\.modal\{box-sizing:border-box;width:min\(100%,440px\)/);
  assert.match(css,/max-height:calc\(100dvh/);
  assert.match(css,/overflow-y:auto/);
  assert.match(css,/safe-area-inset-bottom/);
  assert.match(css,/\.reopen\{position:fixed/);
});
