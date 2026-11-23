import test from 'node:test';
import assert from 'node:assert/strict';
import {planEmpathyTurn,EMPATHY_MIND_VERSION} from '../lib/holistic-support/empathy-mind.mjs';

const SAFE={status:'clear'};
const positive={
 ru:[
  ['Мне страшно','fear'],['Я боюсь ошибиться','fear'],['Мне неловко','shame'],
  ['Я злюсь','anger'],['Мне одиноко','sad'],['Я устал','overload'],
  ['Я счастлива','joy'],['Мне стало легче','relief'],
  ['Я хочу начать проект, но боюсь ошибиться','fear'],
  ['Я хочу изменений, но боюсь осуждения','fear']
 ],
 en:[
  ["I'm scared",'fear'],["I'm worried",'fear'],["I'm embarrassed",'shame'],
  ["I'm angry",'anger'],["I feel lonely",'sad'],["I'm exhausted",'overload'],
  ["I'm happy",'joy'],["I feel better",'relief'],
  ["I want to start but I'm afraid of failure",'fear'],
  ["I want to change but I'm afraid of being judged",'fear']
 ],
 es:[
  ['Tengo miedo','fear'],['Me preocupa','fear'],['Me da vergüenza','shame'],
  ['Estoy enojado','anger'],['Me siento solo','sad'],['Estoy cansado','overload'],
  ['Estoy feliz','joy'],['Me siento mejor','relief'],
  ['Quiero empezar pero tengo miedo','fear'],
  ['Quiero cambiar pero tengo miedo','fear']
 ]
};
const roleCases=[
 {role:'secretary',consent:{}},
 {role:'secretary_psychologist',consent:{psychologistMode:true}},
 {role:'coach',consent:{}}
];
for(const [locale,items] of Object.entries(positive))
 for(const [message,expected] of items)
  for(const {role,consent} of roleCases)
   test(locale+'/'+role+': '+message,()=>{
    const a=planEmpathyTurn({message,locale:locale==='ru'?'en':'ru',role,consent,safety:SAFE});
    assert.equal(a?.version,EMPATHY_MIND_VERSION);
    assert.equal(a?.emotion,expected);
    assert.equal(a?.locale,locale);
    assert.equal(a?.role,role);
    assert.equal(a?.evidence,'explicit_current_self_report');
    assert.equal(a?.certainty,'explicit');
    assert.ok(a?.reflection.length>8);
    assert.ok(a?.reply.length<=250);
    assert.ok((a?.reply.match(/[?？]/gu)||[]).length<=1);
    assert.equal(a?.noAction,true);
    assert.equal(a?.noDiagnosis,true);
    assert.equal(a?.noPersistence,true);
    assert.doesNotMatch(a?.reply,/купить|оплатить|записаться на|€|buy now|pay now|diagnos|диагноз/iu);
   });

const negative={
 ru:['Мне не страшно','Я не злюсь','Она сказала: мне страшно',
     'Он боится','Если бы я боялся, я бы спросил','Создай грустное видео',
     'Хочу видео о страхе','Мне страшно и не могу дышать','Стоп'],
 en:["I'm not sad","I'm not scared",'She said: I feel scared',
     'He is angry','If I were scared','I want a sad video',
     'Create a video about being lonely',"I'm scared and have chest pain",'Stop'],
 es:['No tengo miedo','No me siento triste','Ella dijo: tengo miedo',
     'Él está enojado','Si yo fuera triste','Quiero un video triste',
     'Crea un video sobre tristeza','Tengo miedo y no puedo respirar','Basta']
};
for(const [locale,items] of Object.entries(negative))
 for(const message of items)
  test('no emotion hijack '+locale+': '+message,()=>{
   assert.equal(planEmpathyTurn({message,locale,role:'coach',safety:SAFE}),null);
  });
test('safety is mandatory and no external action can be authorized',()=>{
 for(const status of [undefined,'unknown','urgent','human_review','paused'])
  assert.equal(planEmpathyTurn({message:'Мне страшно',safety:{status}}),null);
 assert.equal(planEmpathyTurn({message:'Мне страшно',safety:SAFE}).noAction,true);
});
test('psychologist depth requires explicit mode consent; no yes shortcut',()=>{
 const a=planEmpathyTurn({message:'Мне страшно',role:'secretary_psychologist',safety:SAFE});
 assert.equal(a.role,'secretary');assert.match(a.question,/тревог/u);
 const b=planEmpathyTurn({message:'Мне страшно',role:'secretary_psychologist',consent:{psychologistMode:true},safety:SAFE});
 assert.equal(b.role,'secretary_psychologist');assert.match(b.question,/трудное/u);
});
test('direct factual questions receive priority over feelings',()=>{
 for(const [message,lang] of [
  ['Мне страшно. Сколько стоит консультация?','ru'],
  ["I'm scared. How much does a session cost?",'en'],
  ['Tengo miedo. ¿Cuánto cuesta la sesión?','es']
 ]){
  const a=planEmpathyTurn({message,locale:lang,safety:SAFE});
  assert.equal(a?.move,'answer_directly');assert.equal(a?.reply,null);
  assert.equal(a?.question,null);
 }
});
test('no-advice boundary survives recent client history but can be withdrawn',()=>{
 const h=[{role:'user',text:'Не хочу советов'},{role:'assistant',text:'Хорошо.'}];
 const a=planEmpathyTurn({message:'Мне тревожно',history:h,safety:SAFE,role:'coach'});
 assert.equal(a.move,'listen');assert.equal(a.question,null);assert.equal(a.noAdvice,true);
 const b=planEmpathyTurn({message:'Мне тревожно, дай совет',history:h,safety:SAFE,role:'coach'});
 assert.equal(b.move,'offer_options');assert.equal(b.question,null);assert.equal(b.noAdvice,false);
});
test('do not keep asking the same question after client response',()=>{
 const base=planEmpathyTurn({message:'Мне страшно',role:'coach',safety:SAFE});
 const a=planEmpathyTurn({message:'Мне страшно',role:'coach',safety:SAFE,
  history:[{role:'assistant',text:base.reply}]});
 assert.equal(a.question,null);assert.doesNotMatch(a.reply,/\?/u);
});
test('a correction outranks stale fear; explicit present emotion only',()=>{
 const a=planEmpathyTurn({message:'Нет, я злюсь',safety:SAFE,
  history:[{role:'user',text:'Мне страшно'}]});
 assert.equal(a?.emotion,'anger');
});
test('no raw dialogue, client identity, or private history in the strategy',()=>{
 const marker='PRIVATE_USER_DOCUMENT_AND_EMAIL_123';
 const a=planEmpathyTurn({message:'Мне неловко',safety:SAFE,
  history:[{role:'user',text:marker}]});
 const s=JSON.stringify(a);
 assert.ok(!s.includes(marker));assert.ok(!s.includes('history'));
});
test('input overflow, stop and safety language are all fail closed',()=>{
 for(const message of ['','x'.repeat(3001),'Стоп','Хочу умереть и мне страшно','I want to die. I am afraid'])
  assert.equal(planEmpathyTurn({message,safety:SAFE}),null);
});

test('everyday mixed tiredness receives a specific, accepting first reply',()=>{
 const p=planEmpathyTurn({message:'Я последнее время очень устаю, всё раздражает',locale:'ru',safety:SAFE});
 assert.equal(p?.emotion,'overload');assert.equal(p?.locale,'ru');
 assert.match(p?.reply||'',/усталости и раздражении/u);
 assert.match(p?.reply||'',/с работой, отношениями/u);
 assert.doesNotMatch(p?.reply||'',/чем я могу помочь|запиш|купить/u);
});
test('everyday English and Spanish exhaustion are also understood',()=>{
 for(const [message,locale] of [["I've been really exhausted lately",'en'],['Me cansa todo','es']]){
  const p=planEmpathyTurn({message,locale,safety:SAFE});
  assert.equal(p?.emotion,'overload');assert.equal(p?.locale,locale);
  assert.equal((p?.reply.match(/[?？]/gu)||[]).length,1);
 }
});
