import {planJudgmentTurn} from '../lib/holistic-support/judgment-mind.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {waveNativeTurn} from '../lib/holistic-support/wave-native-router.mjs';
import {prepareNaturalDialogue} from '../lib/holistic-support/natural-dialogue.mjs';
import {normalizeGenerativeCoachInput} from '../lib/coaching/generative-persona.mjs';
import {coachSessionDirective,coachSessionDirectivePrompt,directedCoachOfflineReply} from '../lib/coaching/coach-session-director.mjs';

test('Wave first-party native path reflects new mixed feelings with no model/provider',()=>{
 const a=waveNativeTurn({message:'Я хочу начать проект, но боюсь ошибиться',locale:'ru'});
 assert.match(a?.intent||'',/^empathy\.fear$/);
 assert.match(a?.reply||'',/ошибиться/u);
 assert.equal(a?.modelUsed,false);assert.equal(a?.externalCalled,false);
 assert.ok((a?.reply.match(/[?？]/gu)||[]).length<=1);
});
test('Ali keeps a concrete, accepting conversation across several short client turns',()=>{
 const firstMessage='Я последнее время очень устаю, всё раздражает';
 const first=waveNativeTurn({message:firstMessage,locale:'ru'});
 assert.match(first?.reply||'',/усталости и раздражении/u);
 assert.match(first?.reply||'',/с работой, отношениями/u);
 const nextMessage='Работа. Постоянно чего-то требуют.';
 const second=waveNativeTurn({message:nextMessage,locale:'ru',history:[
  {role:'user',text:firstMessage},{role:'assistant',text:first.reply}
 ]});
 assert.match(second?.reply||'',/постоянно чего-то требуют/u);
 assert.match(second?.reply||'',/отключаться после рабочего дня/u);
 const final=waveNativeTurn({message:'Хочу научиться отключаться после работы.',locale:'ru',history:[
  {role:'user',text:firstMessage},{role:'assistant',text:first.reply},
  {role:'user',text:nextMessage},{role:'assistant',text:second.reply}
 ]});
 assert.match(final?.reply||'',/рабочих мыслей/u);
 assert.doesNotMatch(final?.reply||'',/записаться|оплатить|диагноз/u);
 assert.ok((final?.reply.match(/[?？]/gu)||[]).length<=1);
});
test('Wave native direct task is not hijacked by an emotion preface',()=>{
 assert.equal(waveNativeTurn({message:'Мне страшно. Сколько стоит консультация?',locale:'ru'}),null);
});
test('Natural Dialogue uses empathy for safe provider-free fallback in RU/EN/ES',()=>{
 for(const [locale,message,needle] of [
  ['ru','Я хочу изменений, но боюсь осуждения',/осуждения/u],
  ['en',"I want to change but I'm afraid of being judged",/judged/u],
  ['es','Quiero cambiar pero tengo miedo',/preocupa|miedo/u]
 ]){
  const a=prepareNaturalDialogue({message,locale,decision:{status:'clarify',message:'Fallback.'}});
  assert.match(a.replyFallback,needle);assert.equal(a.modelAllowed,false);
  assert.equal(a.action,null);
 }
});
test('Natural Dialogue respects factual-answer priority and avoids a feeling-question trap',()=>{
 const a=prepareNaturalDialogue({message:'Мне страшно. Сколько стоит консультация?',locale:'ru',
  decision:{status:'no_match',message:'Уточните выбранную услугу.'}});
 assert.equal(a.replyFallback,'Уточните выбранную услугу.');
 assert.doesNotMatch(a.replyFallback,/пугает|страшно|тревожно/u);
});
test('Emotional distress does not silently trigger a catalogue sale',()=>{
 const a=prepareNaturalDialogue({message:'Мне неловко',locale:'ru',
  decision:{status:'recommend',message:'Consider our service',suggestions:[
    {id:'service:demo',kind:'service',title:'Sell it',href:'/ru/services',reasons:[]}
  ]}});
 assert.equal(a.action,null);
});
test('Coach Director receives empathy as an advisory without stage takeover',()=>{
 const {input,persona}=normalizeGenerativeCoachInput({
  personaId:'mira',locale:'ru',consent:true,
  message:'Я хочу начать проект, но боюсь ошибиться',turns:[]
 });
 const d=coachSessionDirective(input,persona);
 assert.match(d.empathyReflection||'',/ошибиться/u);
 assert.match(coachSessionDirectivePrompt(d),/Empathy Mind advisory/);
 assert.equal(d.methodLocked,true);
 assert.equal(d.canOfferAction,false);
 const offline=directedCoachOfflineReply(input,d);
 assert.match(offline.reflection,/ошибиться/u);
 assert.equal(offline.planSuggestion,'');
 assert.ok((offline.question.match(/[?？]/gu)||[]).length<=1);
});
test('Coach no-advice and correction rules are still Director-owned',()=>{
 const {input,persona}=normalizeGenerativeCoachInput({
  personaId:'mira',locale:'ru',consent:true,
  message:'Мне тревожно, без советов',turns:[]
 });
 const d=coachSessionDirective(input,persona);
 assert.equal(d.canOfferAction,false);
 assert.equal(d.methodLocked,true);
 assert.match(d.empathyReflection||'',/тревожно|страшно/u);
});
test('No new provider or hidden data writes in the empathy integration',()=>{
 const code=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const empathy=code('lib/holistic-support/empathy-mind.mjs');
 for(const source of [
  'lib/holistic-support/wave-native-router.mjs',
  'lib/holistic-support/natural-dialogue.mjs',
  'lib/coaching/coach-session-director.mjs'
 ])assert.match(code(source),/planEmpathyTurn/);
 assert.doesNotMatch(empathy,/\bfetch\(|\bsupabase\b|openrouter|localStorage|process\.env/iu);
});

test('Host Judgment must never intercept direct service questions with emotion prompts',()=>{
 const safe={status:'clear'};
 for(const [locale,message] of [
  ['ru','Мне страшно. Сколько стоит консультация?'],
  ['en',"I'm scared. How much does a consultation cost?"],
  ['es','Tengo miedo. ¿Cuánto cuesta la consulta?']
 ]){
  const result=planJudgmentTurn({message,locale,safety:safe});
  assert.equal(result.status,'abstain',locale+': '+JSON.stringify(result));
  assert.notEqual(result.state,'emotion_acknowledged');
 }
});
