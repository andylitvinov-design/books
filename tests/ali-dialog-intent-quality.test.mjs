import test from 'node:test';
import assert from 'node:assert/strict';
import {aliGuidedIntakeTurn,aliGuidedIntakeSummary} from '../lib/assist/ali-guided-intake.mjs';

const turn=(locale,message,serviceRequest='coaching',stage='goal',slots={},turns=[])=>
  aliGuidedIntakeTurn({message,locale,serviceRequest,stage,slots,turns});
const countQuestions=x=>(x.match(/[?？]/gu)||[]).length;

test('RU/EN/ES problem-first accounts are remembered as situations, NOT invented desired goals',()=>{
 for(const [locale,message] of [
  ['ru','Я поссорилась с мужем, и мы не разговариваем уже неделю'],
  ['en',"I keep arguing with my partner and we haven't spoken for a week"],
  ['es','Discutí con mi pareja y ahora no hablamos desde hace una semana'],
 ]) {
  const r=turn(locale,message);
  assert.equal(r.stage,'goal',locale);
  assert.equal(r.slots.goal,undefined,locale);
  assert.equal(r.slots.situation,message,locale);
  assert.equal(countQuestions(r.reply),1,locale);
  assert.ok(r.reply.length<200,locale);
  assert.doesNotMatch(r.reply,/diagnosis|диагноз|diagnóstico/i,locale);
 }
});
test('the client question about repeated conflict is not classified as an achieved goal',()=>{
 const r=turn('ru','Почему я постоянно ссорюсь с мужем?');
 assert.equal(r.stage,'goal');
 assert.equal(r.slots.goal,undefined);
 assert.equal(r.slots.situation,'Почему я постоянно ссорюсь с мужем?');
 assert.equal(countQuestions(r.reply),1);
});
test('a problem-first dialogue moves to result, then stops collecting after sufficient answers',()=>{
 const situation='Я поссорилась с мужем, и мы не разговариваем уже неделю';
 const first=turn('ru',situation);
 const goal=turn('ru','Хочу найти способ спокойно поговорить','coaching',first.stage,first.slots);
 assert.equal(goal.stage,'challenge');
 const last=turn('ru','Боюсь, что он снова будет кричать','coaching',goal.stage,goal.slots);
 assert.equal(last.stage,'ready');
 assert.equal(countQuestions(last.reply),0);
 const summary=aliGuidedIntakeSummary({locale:'ru',slots:last.slots});
 for(const text of [situation,'Хочу найти способ спокойно поговорить','Боюсь, что он снова будет кричать'])
  assert.ok(summary.includes(text),text);
});
test('clear booking intent jumps to user-approved draft, without more questions',()=>{
 for(const [locale,message] of [
  ['ru','Можно сразу записаться?'],
  ['en','Can I book an appointment?'],
  ['es','¿Puedo reservar una sesión?'],
 ]){
  const result=turn(locale,message);
  assert.equal(result.stage,'ready',locale);
  assert.equal(result.slots.goal,message,locale);
  assert.equal(countQuestions(result.reply),0,locale);
 }
 const general=turn('ru','Как записаться?',null);
 assert.equal(general.stage,'goal');
 assert.equal(countQuestions(general.reply),1);
 assert.deepEqual(general.slots,{});
});
test('booking refusal and interruptions are respected without losing pending stage',()=>{
 for(const [locale,message] of [
  ['ru','Не хочу записываться'],
  ['en',"I don't want to book"],
  ['es','No quiero reservar'],
 ]){
  const r=turn(locale,message,'coaching','challenge',{goal:'I want clarity'});
  assert.equal(r.stage,'challenge');
  assert.deepEqual(r.slots,{goal:'I want clarity'});
  assert.equal(countQuestions(r.reply),0);
 }
 for(const [locale,question] of [
  ['ru','Сколько стоит?'],['ru','Почему фото'],
  ['en','How much does it cost?'],['es','¿Cuánto cuesta?'],
 ]){
  const r=turn(locale,question);
  assert.equal(r.stage,'goal');
  assert.deepEqual(r.slots,{});
  assert.equal(countQuestions(r.reply),0);
  assert.ok(r.reply.length<220,question);
 }
});
test('safety, opt-out and non-service rules are not bypassed by the shorter dialogue',()=>{
 assert.equal(turn('ru','/stop'),null);
 assert.equal(turn('en','I want to die'),null);
 const general=turn('en','I want direction',null);
 assert.equal(general.stage,'challenge');
 assert.equal(countQuestions(general.reply),1);
});
