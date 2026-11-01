import test from 'node:test';
import assert from 'node:assert/strict';
import {parseVideoChatIntent, parseVideoChatStepChoice, nextVideoChatStep, mergeVideoChatPreferences} from '../lib/mandala/video-chat-intent.mjs';

test('RU composite prompt fills known filters but leaves optional questions', () => {
  const item = parseVideoChatIntent('Сделай вертикальный ролик о любви на 30 секунд с музыкой и фразами');
  assert.equal(item.aspect, 'portrait');
  assert.equal(item.duration, 30);
  assert.equal(item.music, 'harmony');
  assert.equal(item.phrases, true);
});
test('EN / ES filters and unsupported literal subjects', () => {
  const en = parseVideoChatIntent('A calm 20 seconds reel without music about a wolf');
  assert.equal(en.aspect, 'portrait'); assert.equal(en.duration,20);
  assert.equal(en.music,'none'); assert.equal(en.specificVisual,true);
  const es = parseVideoChatIntent('Vídeo horizontal 60 segundos sin música');
  assert.equal(es.aspect,'landscape'); assert.equal(es.duration,60); assert.equal(es.music,'none');
});
test('single step choice always validates the requested filter',()=>{
  assert.equal(parseVideoChatStepChoice('duration','400'),null);
  assert.equal(parseVideoChatStepChoice('duration','15'),15);
  assert.equal(parseVideoChatStepChoice('phrases','Да'),true);
  assert.equal(parseVideoChatStepChoice('phrases','нет'),false);
  assert.equal(parseVideoChatStepChoice('aspect','квадрат'), 'square');
});
test('followup changes only explicitly stated settings',()=>{
  const draft={goal:'Про любовь',aspect:'landscape',duration:30,mood:'slow',music:'love',phrases:true};
  assert.deepEqual(mergeVideoChatPreferences(draft,'Сделай вертикально'),{...draft,aspect:'portrait'});
  assert.deepEqual(mergeVideoChatPreferences(draft,'Без музыки'),{...draft,music:'none'});
});
test('next question skips filters provided in initial prompt',()=>{
 const draft={goal:'Любовь',mood:'slow',aspect:'portrait',duration:30,music:null,phrases:null};
 assert.equal(nextVideoChatStep(draft),'music');
 assert.equal(nextVideoChatStep({...draft,music:'love',phrases:false}),'review');
});