import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {routeMindRole, MIND_ROLE_ROUTER_VERSION, mindRoleInstruction} from '../lib/holistic-support/mind-role-router.mjs';
import {assessRoleReply} from '../lib/holistic-support/role-output-guard.mjs';

// Original synthetic, no private messages. A routing regression fixture, NOT
// a blind real-model quality evaluation.
const cases = [
['ru','Сколько стоит консультация?','secretary'],
['ru','Где найти мою подписку?','secretary'],
['ru','Я хочу записаться на коучинг','secretary'],
['ru','Кнопка входа не работает','secretary'],
['ru','Как оплатить заказ?','secretary'],
['ru','Не приходит письмо с подтверждением','secretary'],
['ru','Хочу скачать файл из кабинета','secretary'],
['ru','Мне тревожно, но сколько стоит консультация?','secretary'],
['ru','Не хочу коучинг, только факты','secretary','goals'],
['ru','Не надо давать советы','secretary','goals'],
['ru','Другая тема, пожалуйста','secretary','relationships'],
['ru','Стоп','secretary','energy'],
['ru','Моя цель — сменить работу','coach'],
['ru','Мне сложно выбрать, куда двигаться дальше','coach'],
['ru','Я застряла и не знаю, чего хочу','coach'],
['ru','Я боюсь выступать перед людьми','coach'],
['ru','Мне трудно решиться на перемены','coach'],
['ru','Хочу разобраться со своей целью','coach'],
['ru','У меня пропала мотивация','coach'],
['ru','Мне страшно начинать новый проект','coach'],
['ru','Не хочу записываться, я хочу разобраться в отношениях','coach'],
['ru','Да','coach',null,[{role:'user',text:'Моя цель — выстроить режим'},{role:'assistant',text:'Как вы смотрите на это?'}]],
['ru','Продолжи','coach',null,[{role:'user',text:'Мне тяжело принимать решения'}]],
['ru','А как?','secretary',null,[{role:'user',text:'Как оплатить подписку?'}]],
['ru','Привет, расскажи, как устроен сайт','secretary'],
['en','How much does a session cost?','secretary'],
['en','I cannot log in to my account','secretary'],
['en','Can I book a consultation?','secretary'],
['en','What is the refund policy?','secretary'],
['en',"I can't find the download button",'secretary'],
['en','I feel stuck but how do I book a session?','secretary'],
['en','Please cancel my subscription','secretary'],
['en','Just answer, no coaching','secretary','goals'],
['en','Change the topic, please','secretary','energy'],
['en','Stop','secretary','goals'],
['en','What next?','secretary',null,[{role:'user',text:'How much does it cost?'},{role:'assistant',text:'I feel lost'}]],
['en','Where can I find the course catalog?','secretary'],
['en','I feel stuck with my goal','coach'],
['en',"I can't decide between two jobs",'coach'],
['en','I want to write a book this year','coach'],
['en',"I'm afraid to give a presentation",'coach'],
['en',"I'm struggling with motivation",'coach'],
['en','I want to improve my mornings','coach'],
['en',"I don't want to book an appointment; I want to understand my goals",'coach'],
['en','I feel lost about my relationships','coach'],
['en','Tell me more','coach',null,[{role:'user',text:'My goal is to start writing'}]],
['en','I feel anxious about changing careers','coach'],
['en','Can you explain?','coach',null,[{role:'assistant',text:'How much to book?'},{role:'user',text:'I feel stuck'}]],
['en','I am not sure what I want','coach'],
['en','Hi, what can you do?','secretary'],
['en',"Let's discuss",'coach','meaning'],
['es','Quiero cambiar mi vida','general'],
];
test('52 bilingual routing scenarios preserve boundaries and conversation context',()=>{
  let passed=0;
  for (const [locale,message,expected,selectedGoal,history] of cases){
    const routed=routeMindRole({locale,message,selectedGoal,history});
    assert.equal(routed.version,MIND_ROLE_ROUTER_VERSION);
    if(routed.role===expected)passed++;
    else console.error('Mismatch',locale,message,expected,routed.role);
  }
  assert.equal(cases.length,52);
  assert.ok(passed/cases.length>=.95,passed+'/'+cases.length);
  console.log('RU/EN routing gold: '+passed+'/'+cases.length);
});
test('role policy is server-owned and keeps the same single-model contract',()=>{
  assert.match(mindRoleInstruction('secretary','ru'),/only verified trusted context/);
  assert.match(mindRoleInstruction('coach','en'),/BEFORE offering advice/);
  assert.match(mindRoleInstruction('coach','en'),/not a human or therapist/);
  assert.match(mindRoleInstruction('unknown'),/neutral/);
  assert.doesNotMatch(mindRoleInstruction('coach','ru'),/api_key|https?:\/\//i);
});
test('output quality allows natural RU/EN replies and rejects false actions',()=>{
 const positive=[
  ['ru','Понимаю. Что для вас сейчас важнее?','coach'],
  ['en','That sounds difficult. What would help you most right now?','coach'],
  ['ru','Уточните, какая именно кнопка не работает.','secretary'],
  ['en','The current price is shown on the service page.','secretary'],
  ['ru','Если захотите, можно начать с пяти минут завтра.','coach']
 ];
 const negative=[
  ['en','I have booked your session for tomorrow.','secretary'],
  ['en','Your appointment has been confirmed.','secretary'],
  ['en','You have depression, and your life will improve.','coach'],
  ['ru','Я уже записал вас на консультацию.','secretary'],
  ['ru','Ваша запись подтверждена.','secretary'],
  ['ru','У вас депрессия, я уверен.','coach'],
  ['en','What matters? How soon?','coach'],
  ['ru','Я слышу вас. Что случилось? И что дальше?','coach'],
  ['ru','This is a long English response to the Russian user question.','coach'],
  ['en','Это длинное сообщение полностью написано на русском языке и содержит много разных слов.','coach'],
  ['en','1. Do this\n2. Do that','coach'],
 ];
 for(const [locale,text,role] of positive) assert.equal(assessRoleReply({text,locale,role}).ok,true,text);
 for(const [locale,text,role] of negative) assert.equal(assessRoleReply({text,locale,role}).ok,false,text);
 assert.equal(assessRoleReply({text:'¿En qué puedo ayudarte?',locale:'es',role:'general'}).ok,true);
});
test('synthetic SFT seed has distinct balanced source examples without client data',()=>{
 const doc=JSON.parse(readFileSync(new URL('../data/holistic-support/qwen-dialogue-sft-seed-v1.json',import.meta.url),'utf8'));
 assert.equal(doc.version,'hh-qwen-synthetic-sft-seed-v1');
 const data=doc.examples; assert.equal(data.length,40);
 const ids=new Set();
 for(const row of data){
  assert.ok(!ids.has(row.id));ids.add(row.id);
  assert.ok(['ru','en'].includes(row.locale));
  assert.ok(['coach','secretary'].includes(row.role));
  assert.ok(row.user && row.assistant);
  assert.equal(assessRoleReply({text:row.assistant,locale:row.locale,role:row.role}).ok,true,row.id);
  assert.doesNotMatch(JSON.stringify(row),/https?:\/\/|@gmail\.com|private_clinical_note|api_key/i);
 }
 for(const locale of ['ru','en'])for(const role of ['coach','secretary'])
  assert.equal(data.filter(x=>x.locale===locale&&x.role===role).length,10);
});
