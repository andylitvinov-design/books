import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseVideoChatIntent, parseVideoChatStepChoice, nextVideoChatStep, mergeVideoChatPreferences, suggestVideoChatDefaults, goalFirstVideoChatDraft, hasVideoChatFilter, isGenericVideoRequest, parseVideoChatAction} from '../lib/mandala/video-chat-intent.mjs';

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

test('automatic choices preserve explicit user settings and fill only the rest',()=>{
 const d={goal:'Видео про отношения',mood:null,aspect:'square',duration:20,music:'none',phrases:null};
 assert.deepEqual(suggestVideoChatDefaults(d,'relationships'),{...d,mood:'slow',phrases:false});
 assert.equal(suggestVideoChatDefaults({...d,music:null,aspect:null},'relationships').music,'love');
 assert.equal(suggestVideoChatDefaults({...d,music:null},'health').music,'meditation');
});
test('a reply can supply several filters even when a single question is pending',()=>{
 const d={goal:'Видео о любви',mood:null,aspect:null,duration:null,music:null,phrases:null};
 const next=mergeVideoChatPreferences(d,'мягкий вертикальный ролик 30 секунд с музыкой');
 assert.equal(next.mood,'slow');assert.equal(next.aspect,'portrait');
 assert.equal(next.duration,30);assert.equal(next.music,'harmony');
 assert.equal(nextVideoChatStep(next),'phrases');
 assert.equal(hasVideoChatFilter('сделай вертикально'),true);
 assert.equal(hasVideoChatFilter('просто привет'),false);
});

test('minutes are not silently misread as seconds',()=>{
 assert.equal(parseVideoChatIntent('Сделай фильм на 10 минут').duration,null);
 assert.equal(parseVideoChatIntent('A 20 minute film').duration,null);
 assert.equal(parseVideoChatIntent('Сделай фильм на 30 секунд').duration,30);
 assert.equal(parseVideoChatIntent('Need a 60s reel').duration,60);
});


test('generic video request asks for a goal instead of selecting a random subject',()=>{
 for(const v of ['Video','Сделай видео','I want a video','Vídeo','Хочу ролик'])
   assert.equal(isGenericVideoRequest(v),true,v);
 for(const v of ['Видео про любовь','Video about nature','Reel о спокойствии'])
   assert.equal(isGenericVideoRequest(v),false,v);
});


test('imperatives only perform a stage-appropriate explicit user action',()=>{
 assert.equal(parseVideoChatAction('Подтверждаю','review'),'confirm');
 assert.equal(parseVideoChatAction('Confirm story','review'),'confirm');
 assert.equal(parseVideoChatAction('Создай видео','ready'),'create');
 assert.equal(parseVideoChatAction('Create video','ready'),'create');
 assert.equal(parseVideoChatAction('Открой видео','done'),'open');
 assert.equal(parseVideoChatAction('Видео о любви','ready'),null);
 assert.equal(parseVideoChatAction('Создай видео','review'),null);
 assert.equal(parseVideoChatAction('Подтверждаю','ready'),null);
});
test('inflected food and person requests require honest symbolic consent',()=>{
  for(const term of ['Еду','Едой','Супы и блюда','Женщина на улице','A woman cooking']){
    assert.equal(parseVideoChatIntent('Сделай видео: '+term).specificVisual,true,term);
  }
  assert.equal(parseVideoChatIntent('Любовь и спокойствие').specificVisual,false);
});

test("chat intent reads 800-character visual request rather than truncating at 160",()=>{
  const story="Длинная история. ".repeat(25)+"В конце горы, 30 секунд без музыки.";
  assert.ok(story.length>160&&story.length<=800);
  const interpreted=parseVideoChatIntent(story);
  assert.equal(interpreted.text.length,story.length);
  assert.equal(interpreted.duration,30);
  assert.equal(interpreted.music,"none");
});

test('one meaningful goal immediately gives a reviewable plan without five questions',()=>{
  const ru=goalFirstVideoChatDraft('Любовь и близость','relationships');
  assert.ok(ru);
  assert.equal(ru.goal,'Любовь и близость');
  assert.deepEqual([ru.mood,ru.aspect,ru.duration,ru.music,ru.phrases],
    ['slow','portrait',30,'love',false]);
  assert.equal(nextVideoChatStep(ru),'review');
  const en=goalFirstVideoChatDraft('A calm 20 seconds landscape film without music or captions','health');
  assert.equal(en.duration,20);
  assert.equal(en.aspect,'landscape');
  assert.equal(en.music,'none');
  assert.equal(en.phrases,false);
  assert.equal(nextVideoChatStep(en),'review');
  const es=goalFirstVideoChatDraft('Vídeo sobre amor horizontal 60 segundos sin música','relationships');
  assert.equal(es.aspect,'landscape');
  assert.equal(es.duration,60);
  assert.equal(es.music,'none');
  assert.equal(nextVideoChatStep(es),'review');
});
test('generic request still asks for a real goal; explicit selections win',()=>{
  for(const goal of ['','Видео','Сделай видео','I want a video','Vídeo'])
    assert.equal(goalFirstVideoChatDraft(goal,'energy'),null,goal);
  const film=goalFirstVideoChatDraft('Сделай ролик про спокойствие на 10 секунд без фраз','health');
  assert.equal(film.duration,10);
  assert.equal(film.phrases,false);
  assert.equal(film.music,'meditation');
  assert.equal(nextVideoChatStep(film),'review');
});
test('one-message plan uses the same confirmation/render and optional filter chips',()=>{
  const ui=readFileSync(new URL('../components/mandala-video-director-chat.tsx',import.meta.url),'utf8');
  assert.match(ui,/goalFirstVideoChatDraft\(value,recommended.theme\)/);
  assert.match(ui,/setStep\("review"\);addLine\("assistant",t.review\)/);
  assert.match(ui,/data-video-chat-change-filter=\{key\}/);
  assert.match(ui,/data-video-chat-confirm/);
  assert.match(ui,/data-video-chat-create/);
  assert.match(ui,/onConfirm\(\{scenario:executable\}\)/);
});
