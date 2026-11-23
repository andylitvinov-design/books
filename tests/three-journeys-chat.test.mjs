import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {threeJourneyTurn,threeJourneyOpening,threeJourneyLabel,
  THREE_JOURNEY_PATHS} from '../lib/holistic-support/three-journeys.mjs';

const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('three real journeys, localized openings and stable route selectors',()=>{
 assert.deepEqual([...THREE_JOURNEY_PATHS],['therapy','consultation','goal']);
 for(const locale of ['ru','en','es']){
   for(const path of THREE_JOURNEY_PATHS){
     assert.ok(threeJourneyOpening(path,locale)?.length>20);
     assert.ok(threeJourneyLabel(path,locale)?.length>2);
   }
 }
 assert.equal(threeJourneyTurn({path:'invalid',message:'hi'}),null);
});
test('therapy listens before suggesting resources and only opts in after request',()=>{
 const pain=threeJourneyTurn({path:'therapy',message:'Мне очень грустно',locale:'ru'});
 assert.match(pain.reply,/непростое|слушаю/);
 assert.equal(pain.action,null);
 const request=threeJourneyTurn({path:'therapy',message:'Хочу медитацию',locale:'ru'});
 assert.equal(request.action,'practices');
 assert.equal(threeJourneyTurn({path:'therapy',message:'Просто выслушай, без советов',locale:'ru'}).action,null);
 const blocked=threeJourneyTurn({path:'therapy',message:'Может быть медитация?',locale:'ru',
   history:[{role:'user',text:'Без советов'}]});
 assert.equal(blocked.action,null);
 assert.doesNotMatch(blocked.reply,/попробовать мягкую практику/);
});
test('consultation offers user-invoked tools without implying verified diagnosis or booking',()=>{
 const cases=[
  ['Подобрать тест','tests'],['Нужна бесплатная диагностика ситуации','diagnostic'],
  ['Хочу к живому специалисту','coaches']];
 for(const [message,action] of cases){
  const turn=threeJourneyTurn({path:'consultation',message,locale:'ru'});
  assert.equal(turn.action,action);
  assert.doesNotMatch(turn.reply,/записал вас|диагноз установлен/);
 }
 const original=threeJourneyTurn({path:'consultation',message:'Трудности на работе',locale:'ru'});
 assert.equal(original.action,null);
 const second=threeJourneyTurn({path:'consultation',message:'Вчера была ссора',locale:'ru',
   history:[{role:'assistant',text:original.reply}]});
 assert.notEqual(second.reply,original.reply);
});
test('goal route chooses the bottleneck rather than always restarting from stage one',()=>{
 assert.equal(threeJourneyTurn({path:'goal',message:'У меня уже цель, но боюсь',locale:'ru'}).stage,5);
 assert.equal(threeJourneyTurn({path:'goal',message:'Устал, нет сил',locale:'ru'}).stage,3);
 assert.equal(threeJourneyTurn({path:'goal',message:'Нужен план, с чего начать',locale:'ru'}).stage,4);
 assert.equal(threeJourneyTurn({path:'goal',message:'Нет вариантов, тупик',locale:'ru'}).stage,6);
 assert.equal(threeJourneyTurn({path:'goal',message:'Хочу ускорить прогресс',locale:'ru'}).stage,7);
 assert.equal(threeJourneyTurn({path:'goal',message:'Хочу свой бизнес',locale:'ru'}).stage,2);
});
test('goal mode offers human, AI and mixed seven-meeting concept without fake booking',()=>{
 for(const locale of ['ru','en','es']){
  const turn=threeJourneyTurn({path:'goal',message:'Хочу программу 7 встреч',locale});
  assert.equal(turn.action,'program');
  assert.equal(turn.stage,null);
  assert.match(turn.reply,/7|seven|siete/i);
 }
});
test('multiple turns rotate evidence questions without pretending a stage completed',()=>{
 const history=[];
 const first=threeJourneyTurn({path:'goal',message:'Есть цель, но боюсь начинать',locale:'ru',history});
 history.push({role:'assistant',text:first.reply});
 const second=threeJourneyTurn({path:'goal',message:'Все еще боюсь',locale:'ru',history});
 assert.equal(first.stage,5);assert.equal(second.stage,5);
 assert.notEqual(first.reply,second.reply);
 assert.notEqual(second.action,'program');
});
test('direct operational request, stop and invalid mode keep existing route authority',()=>{
 for(const msg of ['Сколько стоит встреча?','Запиши меня к коучу','Стоп','Создай видео']){
  assert.equal(threeJourneyTurn({path:'goal',message:msg,locale:'ru'}),null);
 }
 assert.equal(threeJourneyTurn({path:null,message:'Хочу цель'}),null);
});
test('implementation respects same Messenger safety/consent route and does not create extra checkout',()=>{
 const server=read('app/api/holistic-agent/turn/route.js');
 const client=read('components/holistic-agent-chat.tsx');
 const landing=read('components/app/messenger-ai-landing.tsx');
 assert.match(server,/journeyPath/);
 assert.match(server,/safety\.status==="clear" && !recentUnsafe && !judgmentPriority/);
 assert.match(server,/threeJourneyTurn/);
 assert.match(client,/journeyPath:!leaveSupport\?journeyPath:null/);
 assert.match(client,/threeJourneyTurn\(\{path:journeyPath,message:text,locale:turnLocale,history:prior,/);
 assert.match(client,/onJourneySelect=\{startJourney\}/);
 for(const id of ['therapy','consultation','goal']){
   assert.ok(landing.includes('data-hh-genie-path-choice="'+id+'"'));
 }
 assert.match(client,/journeyAction==="practices"/);
 assert.match(client,/journeyAction==="tests"/);
 assert.match(client,/journeyAction==="program"/);
 assert.doesNotMatch(read('lib/holistic-support/three-journeys.mjs'),/fetch\s*\(|localStorage|paymentIntent|createBooking/);
});
