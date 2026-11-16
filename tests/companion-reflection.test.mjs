import test from 'node:test';
import assert from 'node:assert/strict';
import {companionReflectiveReply,companionImmediateDanger} from '../lib/crm/companion-reflection.mjs';

test('reviewed supportive replies are short, nonclinical, and a single question',()=>{
 const fixtures=[
  ['ru','Мне тревожно и я боюсь ошибиться'],
  ['ru','Не хочу упражнений, хочу поговорить'],
  ['en','I feel anxious about work'],
  ['en',"I don't want exercises"],
  ['es','Estoy preocupada por el trabajo'],
  ['es','No quiero ejercicios'],
 ];
 for(const [locale,text] of fixtures){
  const answer=companionReflectiveReply(text,locale);
  assert.ok(answer,locale+': '+text);
  assert.ok(answer.length<220,answer);
  assert.equal((answer.match(/[?？]/g)||[]).length,1,answer);
  assert.doesNotMatch(answer,/diagnos|диагноз|diagnóstic/i);
 }
});
test('assistant does not invent a personal context or create a memory record',()=>{
 assert.equal(companionReflectiveReply('Как создать видео?','ru'),null);
 assert.equal(companionReflectiveReply('','en'),null);
 assert.equal(companionReflectiveReply('x'.repeat(1201),'en'),null);
});

test('urgent cues route to human safety and not a generic reflective reply',()=>{
 for(const text of ['Не хочу больше жить','I want to kill myself','No quiero vivir']){
  assert.equal(companionImmediateDanger(text),true);
 }
 assert.equal(companionImmediateDanger('Мне грустно'),false);
});
