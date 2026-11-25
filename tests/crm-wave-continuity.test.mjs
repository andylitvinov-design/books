import test from 'node:test';
import assert from 'node:assert/strict';
import {waveNativeTurn} from '../lib/holistic-support/wave-native-router.mjs';
import {readWaveGoalMenu} from '../lib/holistic-support/wave-goal-dialogue.mjs';
const session=locale=>{const history=[];return text=>{const reply=waveNativeTurn({message:text,locale,history:history.slice(-6)});history.push({role:'user',text});if(reply)history.push({role:'assistant',text:reply.reply});return reply;};};
test('repeated uncertainty stops a forced-choice loop in three locales',()=>{
 for(const [locale,start,unknown] of [['ru','Я устал','Не знаю'],['en','I feel tired','Not sure'],['es','Estoy cansado','No se']]){
  const send=session(locale),first=send(start),second=send(unknown),third=send(unknown);
  assert.equal(first?.phase,'clarify');assert.equal(second?.phase,'clarify');assert.equal(third?.phase,'listen');
  assert.notEqual(second.reply,third.reply);assert.equal(third.externalCalled,false);
 }
});
test('no time is not treated as explicit consent to a choice',()=>{
 const send=session('ru');send('Мне трудно начать');
 assert.equal(send('А если нет времени?')?.phase,'pause');
});
test('a natural other-option request avoids repeating exhausted reviewed steps',()=>{
 const send=session('ru');send('Я устал');send('Сделать паузу');
 assert.equal(send('А что ещё?')?.phase,'propose');
 assert.equal(send('Не подходит')?.phase,'exhausted');
});
test('second English alternative is not offered in a loop after six turns',()=>{
 const send=session('en'),responses=['I feel overwhelmed by work','Not sure','Too many tasks','Not for me','Another option','Not for me'].map(send);
 assert.deepEqual(responses.map(x=>x?.phase),['clarify','clarify','propose','alternate','propose','exhausted']);
});
test('no advice survives bounded transcript through reviewed listening answers',()=>{
 const send=session('en'),responses=["I don't want advice",'I feel tired','Not sure','Not sure','Not sure','I feel tired'].map(send);
 assert.deepEqual(responses.map(x=>x?.phase),['pause','listen','listen','listen','listen','listen']);
});
test('money opens seven steps and continues the chosen stage locally in RU EN ES',()=>{
 for(const [locale,initial,area,detail,yes,closing] of [
  ['ru','Деньги','Доходы','Мой доход нерегулярный','Да','Можем начать с 1 пункта.'],
  ['en','Money','Income','My income is irregular','Yes','We can start with step 1.'],
  ['es','Dinero','Ingresos','Mis ingresos son irregulares','Sí','Podemos empezar por el punto 1.'],
 ])for(const choice of ['1',yes]){
  const send=session(locale),results=[initial,choice,area,detail].map(send);
  const menu=readWaveGoalMenu(results[0]?.reply);
  assert.equal(menu?.topic,'money');assert.equal(menu.stages.length,7);
  assert.ok(results[0].reply.endsWith(closing));
  assert.deepEqual(results.map(r=>r?.journey?.path),['goal','goal','goal','goal']);
  assert.deepEqual(results.map(r=>r?.journey?.stage),[null,1,1,1]);
  for(const r of results){
   assert.equal(r.modelUsed,false);assert.equal(r.externalCalled,false);
   assert.doesNotMatch(r.reply,/guarantee|гарантир|garant|https?:\/\/|плат[её]ж (?:выполнен|отправлен)|payment (?:sent|completed)|pago (?:enviado|completado)/iu);
  }
  for(const r of results.slice(1))assert.equal(readWaveGoalMenu(r.reply),null);
  assert.match(results[1].reply,/финанс|financ/iu);
  assert.match(results[3].reply,/доход|income|ingresos/iu);
 }
});
test('safety and action boundaries never leak into the native staged chat',()=>{
 for(const text of ['Оплати заказ','Создай видео','Не хочу больше жить','Не могу дышать','/stop'])
  assert.equal(waveNativeTurn({message:text,locale:'ru'}),null,text);
});
