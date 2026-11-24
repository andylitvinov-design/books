import test from 'node:test';
import assert from 'node:assert/strict';
import {waveNativeTurn} from '../lib/holistic-support/wave-native-router.mjs';
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
test('money income exploration in RU EN ES is local and nontransactional',()=>{
 for(const [locale,initial,area,goal,yes] of [['ru','Деньги','Доходы','Хочу больше зарабатывать','Да'],['en','Money','Income','I want to earn more','Yes'],['es','Dinero','Ingresos','Ganar más','Sí']]){
  const send=session(locale),one=send(initial),two=send(area),three=send(goal),four=send(yes);
  assert.match(one?.reply||'',/доход|income|ingresos/u);
  assert.equal(two?.phase,'clarify');assert.equal(three?.phase,'propose');assert.equal(four?.phase,'try');
  assert.equal(three.externalCalled,false);
  assert.doesNotMatch(three.reply,/guarantee|гарантир|garant|https?:\/\//iu);
 }
});
test('safety and action boundaries never leak into the native staged chat',()=>{
 for(const text of ['Оплати заказ','Создай видео','Не хочу больше жить','Не могу дышать','/stop'])
  assert.equal(waveNativeTurn({message:text,locale:'ru'}),null,text);
});
