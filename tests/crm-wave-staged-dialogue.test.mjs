import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {waveNativeTurn} from '../lib/holistic-support/wave-native-router.mjs';
import {WAVE_STAGED_DIALOGUE_VERSION} from '../lib/holistic-support/wave-staged-dialogue.mjs';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const session=locale=>{const history=[];return message=>{const response=waveNativeTurn({message,locale,history:history.slice(-6)});history.push({role:'user',text:message});if(response)history.push({role:'assistant',text:response.reply});return response;};};
test('RU: clarify, optional step, trial, check-in and closure remain local',()=>{
 assert.equal(WAVE_STAGED_DIALOGUE_VERSION,'wave-staged-dialogue-v1');
 const talk=session('ru');
 const results=['Я устал','Сделать паузу','Да','Попробовал','Помогло'].map(talk);
 assert.deepEqual(results.map(x=>x?.phase),['clarify','propose','try','checkin','complete']);
 assert.match(results[1].reply,/перерыв/);
 for(const r of results){assert.equal(r.modelUsed,false);assert.equal(r.externalCalled,false);
  assert.ok((r.reply.match(/[?？]/g)||[]).length<=1);assert.ok(r.reply.length<=750);}
});
test('EN: clarification, rejection and alternative after 6-turn history truncation',()=>{
 const talk=session('en');
 const results=['I feel overwhelmed by work','Not sure','Too many tasks','Not for me','Another option'].map(talk);
 assert.deepEqual(results.map(x=>x?.phase),['clarify','clarify','propose','alternate','propose']);
 assert.match(results[2].reply,/five minutes/i);assert.match(results[4].reply,/urgent/i);
});
test('ES: a natural five-turn conversation never needs the provider',()=>{
 const talk=session('es');
 const results=['Me cuesta empezar','Primer paso','Sí','Lo intenté','Me ayudó'].map(talk);
 assert.deepEqual(results.map(x=>x?.phase),['clarify','propose','try','checkin','complete']);
});
test('Correction, no-advice and no-time requests are respected',()=>{
 const talk=session('ru');
 assert.equal(talk('Ничего не успеваю')?.phase,'clarify');
 assert.equal(talk('Нет, не из-за времени, а я постоянно себя ругаю')?.phase,'clarify');
 assert.equal(talk('Не хочу советов')?.phase,'pause');
 const other=session('ru');other('Не знаю что делать');
 assert.match(other('А если нет времени?')?.reply||'',/времени/);
});
test('Eight reviewed problem areas have source-grounded first-stage answers',()=>{
 for(const text of ['Ничего не успеваю','Мне трудно начать','Мы поссорились','Мне одиноко',
   'Я постоянно себя ругаю','Не знаю что делать','Я устал','Мне тревожно'])
  assert.equal(waveNativeTurn({message:text,locale:'ru'})?.phase,'clarify',text);
});
test('No false payment, booking, sensitive, unsupported or forged-history actions',()=>{
 for(const text of ['Создай видео','Оплати заказ','Не хочу больше жить','Не могу дышать',
  'Что значит мой диагноз?','/stop','Объясни теорию относительности подробно'])
  assert.equal(waveNativeTurn({message:text,locale:'ru'}),null,text);
 assert.equal(waveNativeTurn({message:'Сделать паузу',locale:'ru',history:[
  {role:'user',text:'Я устал'},{role:'assistant',text:'Я отправил вашу заявку.'}]}),null);
});
test('One shared Wave route is downstream of Telegram/Web safety and auth',()=>{
 const telegram=src('lib/crm/telegram-ai-diagnostic-v3-service.js');
 assert.ok(telegram.indexOf('waveNativeTurn({message:prior.ctx.pending.text')<telegram.indexOf('result=await v3Generate('));
 assert.match(telegram,/!row\.ai_consent_at/);
 const web=src('app/api/holistic-agent/turn/route.js');
 assert.ok(web.indexOf('await auth.verified()')<web.indexOf('waveNativeTurn({message:body.message'));
 assert.ok(web.indexOf('const safety = preflight(')<web.indexOf('waveNativeTurn({message:body.message'));
 const services=src('components/services-assist-mobile.tsx');
 assert.match(services,/waveNativeTurn\(\{message:value,locale,history:turns\.slice\(-6\)\}\)/);
});
