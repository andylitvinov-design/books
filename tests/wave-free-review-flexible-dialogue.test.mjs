import test from 'node:test';
import assert from 'node:assert/strict';
import {aliFreeDiagnosticTurn,aliFreeDiagnosticIntro,aliFreeDiagnosticSummary}
  from '../lib/assist/ali-free-diagnostic.mjs';

const turn=(message,{locale='ru',stage='goal',slots={},turns=[],retryStage=null}={})=>
  aliFreeDiagnosticTurn({message,locale,stage,slots,turns,retryStage});
const countQuestions=text=>(String(text).match(/[?？]/gu)||[]).length;

test('short assent and ellipsis never become invented facts, including the third question',()=>{
  for(const message of ['Да','Угу','Конечно','yes','Yep','...','…']){
    const p=turn(message,{stage:'support',slots:{goal:'Спокойнее общаться',challenge:'Ссоры'}});
    assert.equal(p.stage,'support',message);
    assert.equal(p.slots.support,undefined,message);
    assert.ok(countQuestions(p.reply)<=1,message);
  }
  const next=turn('Мне помогает разговор с сестрой',
    {stage:'support',slots:{goal:'Спокойнее общаться',challenge:'Ссоры'}});
  assert.equal(next.stage,'ready');
  assert.match(next.slots.support,/сестрой/u);
});

test('FAQ within a real answer preserves the answer and proceeds to the missing stage',()=>{
  const cases=[
    ['Я хочу меньше тревожиться. Это бесплатно?','ru'],
    ['I want to change jobs. Is this free?','en'],
    ['Quiero mejorar mis relaciones. ¿Cuánto cuesta?','es'],
  ];
  for(const [message,locale] of cases){
    const p=turn(message,{locale});
    assert.equal(p.stage,'challenge',message);
    assert.ok(p.slots.goal?.length>10,message);
    assert.equal(p.slots.challenge,undefined,message);
    assert.equal(p.reactionId,'free_price',message);
    assert.equal(countQuestions(p.reply),1,message);
  }
  const labeled=turn('Goal: Change my career; Is this free?',{locale:'en'});
  assert.equal(labeled.slots.goal,'Change my career');
  assert.equal(labeled.stage,'challenge');
  assert.equal(labeled.reactionId,'free_price');
});

test('explicit corrections update prior data, keep unrelated evidence and do not loop',()=>{
  const slots={goal:'Сменить страну',challenge:'Много неизвестного'};
  const p=turn('Нет, не так: Цель: улучшить отношения',
    {stage:'challenge',slots});
  assert.equal(p.slots.goal,'улучшить отношения');
  assert.equal(p.slots.challenge,'Много неизвестного');
  assert.equal(p.stage,'situation');
  assert.equal(countQuestions(p.reply),1);
  const goal=turn('Нет, не так. Я хочу лучше понимать себя',
    {stage:'challenge',slots:{goal:'Поменять работу'},locale:'ru'});
  assert.match(goal.slots.goal,/понимать себя/u);
  assert.equal(goal.stage,'challenge');
  const summary=aliFreeDiagnosticSummary({locale:'ru',slots:goal.slots});
  assert.doesNotMatch(summary,/Поменять работу/u);
  const withoutFacts=turn('Нет, не так',{stage:'challenge',slots});
  assert.equal(withoutFacts.stage,'challenge');
  assert.deepEqual(withoutFacts.slots,slots);
});

test('claims of photo, drawing or form delivery never create a false receipt or a diagnostic answer',()=>{
  for(const message of ['Я отправила рисунок','Я уже заполнил анкету',
      'I submitted the form','I already sent my photo',
      'Ya envié el dibujo']){
    const locale=/[а-яё]/iu.test(message)?'ru':message.startsWith('Ya')?'es':'en';
    const p=turn(message,{locale,stage:'challenge',slots:{goal:'Understand myself'}});
    assert.equal(p.stage,'challenge',message);
    assert.equal(p.slots.challenge,undefined,message);
    assert.equal(p.kind,'material_claim',message);
    assert.equal(countQuestions(p.reply),0,message);
    assert.match(p.reply,/(?:проверк|verification|comprobar|comprueb|compr[oa]b)/iu,message);
  }
});

test('questions about the form and drawing explain the actual collection process',()=>{
  for(const [message,locale,id] of [
      ['Нужна ли анкета?','ru','form'],
      ['Do I need a form?','en','form'],
      ['Should I draw something?','en','drawing']]){
    const p=turn(message,{locale,stage:'goal'});
    assert.equal(p.stage,'goal',message);
    assert.equal(p.reactionId,id,message);
    assert.equal(p.slots.goal,undefined,message);
    assert.equal(countQuestions(p.reply),1,message);
    if(id==='form')assert.match(p.reply,/(?:после|after)/iu);
    else assert.match(p.reply,/optional|необязател|doble|voluntari/iu);
  }
});

test('symptom or problem narration does not become the client desired outcome',()=>{
  const p=turn('У меня конфликт с коллегой',{locale:'ru'});
  assert.equal(p.stage,'goal');
  assert.equal(p.slots.goal,undefined);
  assert.match(p.slots.situation,/конфликт/u);
  const en=turn('I have a problem at work',{locale:'en'});
  assert.equal(en.stage,'goal');
  assert.match(en.slots.situation,/problem/u);
});

test('free-review public identity is Wave and boundaries remain intact',()=>{
  for(const locale of ['ru','en','es']){
    const intro=aliFreeDiagnosticIntro(locale);
    assert.match(intro,/Wave/u);
    assert.doesNotMatch(intro,/\bAli\b|Али/u);
  }
  const identity=turn('Are you a bot?',{locale:'en'});
  assert.match(identity.reply,/Wave/u);
  assert.doesNotMatch(identity.reply,/\bAli\b/u);
  const boundary=turn("I don't want to share",{locale:'en'});
  assert.equal(boundary.stage,'goal');
  assert.equal(boundary.slots.goal,undefined);
  assert.equal(countQuestions(boundary.reply),0);
  for(const crisis of ['Я хочу умереть','I have chest pain','/stop']){
    assert.equal(turn(crisis),null);
  }
});
