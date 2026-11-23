import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {threeJourneyTurn,threeJourneyOpening,threeJourneyLabel} from '../lib/holistic-support/three-journeys.mjs';

const turn=(path,message,history=[],locale='ru')=>
 threeJourneyTurn({path,message,history,locale});
const historyOf=(reply,text='')=>[
 {role:'user',text},{role:'assistant',text:reply}
];
test('distinct responsive openings and neutral greeting/thanks RU EN ES',()=>{
 for(const locale of ['ru','en','es']){
  for(const path of ['therapy','consultation','goal']){
   assert.ok(threeJourneyOpening(path,locale).length>20);
   assert.ok(threeJourneyLabel(path,locale).length>=3);
   const hello=turn(path,locale==='ru'?'Привет':locale==='es'?'Hola':'Hello',[],locale);
   assert.equal(hello.reaction,'social');
   assert.equal(hello.action,null);
  }
 }
 assert.equal(turn('therapy','Спасибо').reaction,'social');
});
test('therapy reflects reported emotions and is not an unsolicited sales funnel',()=>{
 const emotionCases=[
 ['Мне страшно','reflect_emotion'],['Я злюсь','reflect_emotion'],
 ['Мне грустно','reflect_emotion'],['Мне одиноко','reflect_emotion'],
 ['Я устала','reflect_emotion'],['Я счастлива','reflect_emotion'],
 ];
 for(const [message,kind] of emotionCases){
   const reply=turn('therapy',message);
   assert.equal(reply.reaction,kind,message);
   assert.equal(reply.action,null,message);
   assert.equal(reply.stage,null,message);
   assert.doesNotMatch(reply.reply,/записал вас|купить пакет|диагноз установлен/i);
 }
 assert.equal(turn('therapy','Моя подруга хочет медитацию').action,null);
 assert.equal(turn('therapy','Хочу медитацию').action,'practices');
 assert.equal(turn('therapy','Как успокоиться').action,'practices');
 assert.equal(turn('therapy','Мне нужен психолог').action,'coaches');
});
test('sticky no-advice and no-questions and correction/refusal take priority',()=>{
 const withoutAdvice=[{role:'user',text:'Без советов'}];
 assert.equal(turn('therapy','Может быть медитация?',withoutAdvice).action,null);
 assert.equal(turn('therapy','Хочу медитацию',withoutAdvice).action,null);
 assert.equal(turn('consultation','Подобрать тест',withoutAdvice).action,null);
 assert.equal(turn('goal','Хочу программу 7 встреч',withoutAdvice).action,null);
 const withoutQuestions=[{role:'user',text:'Без вопросов'}];
 assert.doesNotMatch(turn('therapy','Мне грустно',withoutQuestions).reply,/[?？]/);
 assert.doesNotMatch(turn('consultation','Много проблем',withoutQuestions).reply,/[?？]/);
 assert.equal(turn('consultation','Ты не понял',[]).reaction,'correction');
 assert.equal(turn('goal','План не работает',[]).reaction,'rejection');
 assert.equal(turn('therapy','Не готов сейчас',[]).reaction,'refusal');
});
test('unknown and short replies do not hallucinate a consent or completed action',()=>{
 const first=turn('goal','Не знаю');
 const second=turn('goal','Не знаю',[{role:'user',text:'Не знаю'}]);
 assert.equal(first.reaction,'uncertain');assert.equal(second.reaction,'uncertain');
 assert.doesNotMatch(second.reply,/[?？]/);
 assert.equal(turn('goal','Да').reaction,'affirmation');
 assert.equal(turn('goal','Нет').reaction,'refusal');
 assert.equal(turn('goal','Я начну завтра').reaction,'planned_action');
 assert.doesNotMatch(turn('goal','Я начну завтра').reply,/выполнено|успешно достиг/);
 assert.equal(turn('goal','Я сделал первый шаг').stage,7);
});
test('consultation routes explicit requests but not mere nouns or tool malfunction',()=>{
 const requests=[
 ['Подобрать тест','tests'],
 ['Хочу бесплатный разбор','diagnostic'],
 ['Хочу живого специалиста','coaches'],
 ['Can I talk to a human?','coaches','en'],
 ];
 for(const [message,action,locale='ru'] of requests){
  assert.equal(turn('consultation',message,[],locale).action,action,message);
 }
 for(const message of ['Сегодня я проходил тест','У меня был тест вчера']){
  assert.equal(turn('consultation',message).action,null);
 }
 assert.equal(turn('consultation','Тест не открылся'),null);
 assert.equal(turn('consultation','Сколько стоит?'),null);
 const first=turn('consultation','Проблемы на работе');
 const next=turn('consultation','Начальник критикует',historyOf(first.reply,'Проблемы на работе'));
 assert.notEqual(first.reply,next?.reply);
});
test('goal selects bottleneck, explicit step and appropriate progress phase',()=>{
 const cases=[
 ['Хочу бизнес, но боюсь',5],
 ['Нет сил',3],
 ['Мне не хватает мотивации',3],
 ['Не могу начать',5],
 ['Нужен план',4],
 ['Что мне делать?',4],
 ['Тупик и нет вариантов',6],
 ['Хочу ускорить прогресс',7],
 ['Я сделал первый шаг',7],
 ['Хочу этап 4',4],
 ['Хочу свой бизнес',2],
 ];
 for(const [message,step] of cases)
  assert.equal(turn('goal',message).stage,step,message);
 const first=turn('goal','Боюсь неудачи');
 const follow=turn('goal','Всё ещё боюсь',historyOf(first.reply,'Боюсь неудачи'));
 assert.equal(follow.stage,5);assert.notEqual(follow.reply,first.reply);
 assert.equal(turn('goal','Покажи 7 этапов').reaction,'steps_overview');
 assert.equal(turn('goal','Хочу тест').action,'tests');
 assert.equal(turn('goal','Хочу медитацию').action,'practices');
});
test('seven meetings distinguish AI, human, mixed while preserving eight-session course',()=>{
 const initial=turn('goal','Хочу программу 7 встреч');
 assert.equal(initial.action,'program');
 assert.equal(initial.stage,null);
 const formats=[
 ['Хочу 7 встреч с ИИ','ИИ'],
 ['Хочу 7 встреч с живым специалистом','специалист'],
 ['Хочу 7 встреч в смешанном формате','смешанном']
 ];
 for(const [message,word] of formats){
  const reply=turn('goal',message);
  assert.equal(reply.action,'program',message);
  assert.match(reply.reply,new RegExp(word,'i'));
 }
 const mixed=turn('goal','Я выбираю смешанный формат',historyOf(initial.reply,'Хочу программу 7 встреч'));
 assert.equal(mixed.action,'program');
 assert.match(mixed.reply,/смешанном/);
 assert.equal(turn('goal','Quiero 7 sesiones con IA',[],'es').action,'program');
 assert.match(turn('goal','Как устроена программа 7 встреч').reply,/Семь встреч/);
 assert.equal(turn('goal','Запиши меня к специалисту'),null);
});
test('existing messenger and server authority still own actual actions, safety and provider',()=>{
 const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const server=read('app/api/holistic-agent/turn/route.js');
 const chat=read('components/holistic-agent-chat.tsx');
 const landing=read('components/app/messenger-ai-landing.tsx');
 assert.match(server,/journeyPath/);
 assert.match(server,/safety\.status==="clear"/);
 assert.match(server,/threeJourneyTurn/);
 assert.match(chat,/journeyPath:!leaveSupport\?journeyPath:null/);
 assert.match(chat,/onJourneySelect=\{startJourney\}/);
 assert.match(chat,/consentOnStart:true/); // preserves recent iPhone mic fix
 for(const path of ['therapy','consultation','goal'])
  assert.match(landing,new RegExp('data-hh-genie-path-choice="'+path+'"'));
 const lib=read('lib/holistic-support/three-journeys.mjs');
 assert.doesNotMatch(lib,/\bfetch\s*\(|localStorage|paymentIntent|createBooking/);
 assert.doesNotMatch(lib,/diagnosisConfirmed|consent:true/);
});
