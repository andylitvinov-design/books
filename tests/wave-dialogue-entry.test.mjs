import test from 'node:test';
import assert from 'node:assert/strict';
import {buildWaveEntryMenu,readWaveEntryMenu,waveDialogueEntryTurn,waveJourneyPathFromHistory} from '../lib/holistic-support/wave-dialogue-entry.mjs';
import {buildWaveGoalMenu,readWaveGoalMenu,WAVE_GOAL_STAGE_IDS,waveDialoguePreferences,waveGoalStageFromHistory} from '../lib/holistic-support/wave-goal-dialogue.mjs';
import {threeJourneyTurn,threeJourneyLabel} from '../lib/holistic-support/three-journeys.mjs';
import {ruleConversationReply} from '../lib/holistic-support/rule-conversation.mjs';
import {waveNativeTurn} from '../lib/holistic-support/wave-native-router.mjs';

test('the ordinary fallback asks about exactly the three owner intents',()=>{
 const expected=['Поговорить и снять напряжение','Понять, что происходит','Найти и достичь цель'];
 const menu=buildWaveEntryMenu('ru');
 assert.deepEqual(menu.choices.map(c=>c.label),expected);
 assert.deepEqual(menu.choices.map(c=>c.id),['therapy','consultation','goal']);
 for(const message of ['абракадабра','Что ты можешь?','Начать сначала']){
  const answer=ruleConversationReply({message,locale:'ru'});
  assert.ok(readWaveEntryMenu(answer.reply),message);
  assert.doesNotMatch(answer.reply,/видео|медитаци|практик/iu);
 }
});

test('localized intent labels and entry numbers choose the same stable paths',()=>{
 for(const locale of ['ru','en','es']){
  const menu=buildWaveEntryMenu(locale);
  const history=[{role:'assistant',text:menu.reply}];
  for(const [index,choice] of menu.choices.entries()){
   for(const message of [choice.label,String(index+1)]){
    const answer=waveDialogueEntryTurn({message,locale,history});
    assert.equal(answer.path,choice.id,`${locale}: ${message}`);
    if(choice.id==='goal')assert.equal(readWaveGoalMenu(answer.reply).stages.length,7);
    else assert.doesNotMatch(answer.reply,/7 встреч|seven.meeting|siete sesiones/iu);
   }
  }
 }
 assert.equal(waveDialogueEntryTurn({message:'Понять что происходит',locale:'ru'}).path,'consultation');
 assert.equal(waveDialogueEntryTurn({message:'2',locale:'ru'}),null);
});

test('the screenshot money request reaches all seven steps in rules and native routes',()=>{
 for(const [locale,requests] of [['ru',['Деньги','Дай денег','Хочу увеличить доход']],['en',['money','Give me money','I want to earn more']],['es',['dinero','Dame dinero','Quiero ganar más']]]){
  for(const message of requests)for(const turn of [ruleConversationReply,waveNativeTurn]){
   const answer=turn({message,locale,history:[{role:'user',text:'Привет'},{role:'assistant',text:buildWaveEntryMenu(locale).reply}]});
   const menu=readWaveGoalMenu(answer?.reply);
   assert.equal(menu?.topic,'money',`${locale}: ${message}`);
   assert.equal(menu.stages.length,7);
   assert.ok(menu.reply.endsWith(menu.closing));
  }
 }
});

test('money as a topic does not override support or understanding intent',()=>{
 for(const [message,path] of [
  ['Мне нужна поддержка, я переживаю из-за денег','therapy'],
  ['Мне страшно из-за денег','therapy'],
  ['Хочу понять, почему постоянно не хватает денег','consultation'],
  ['Почему я боюсь денег?','consultation'],
  ['I need support because I am worried about money','therapy'],
  ['Quiero entender por qué me falta dinero','consultation'],
 ]){
  const answer=waveDialogueEntryTurn({message,locale:'ru'});
  assert.equal(answer?.path,path,message);
  assert.equal(readWaveGoalMenu(answer.reply),null);
 }
 for(const path of ['therapy','consultation']){
  assert.equal(waveDialogueEntryTurn({message:'Деньги',locale:'ru',path}),null);
  assert.equal(waveDialogueEntryTurn({message:'Хочу увеличить доход',locale:'ru',path}).path,'goal');
 }
});

test('stage labels, numbers and first-step invitation retain the money topic',()=>{
 const menu=buildWaveGoalMenu('money','ru');
 const history=[{role:'user',text:'Дай денег'},{role:'assistant',text:menu.reply}];
 for(let i=0;i<7;i++)for(const message of [menu.stages[i],String(i+1)]){
  const turn=waveDialogueEntryTurn({message,locale:'ru',history,path:'goal'});
  assert.equal(turn.stage,i+1);assert.equal(turn.stageId,WAVE_GOAL_STAGE_IDS[i]);
  assert.equal(turn.topic,'money');assert.match(turn.reply,/финанс/iu);
 }
 for(const message of ['Да','Давай','Давай начнём','1 пункт']){
  assert.equal(waveDialogueEntryTurn({message,locale:'ru',history}).stage,1);
  assert.equal(threeJourneyTurn({message,locale:'ru',history,path:'goal'}).stage,1);
 }
});

test('topic repair, route restore and resets use only shareable conversation evidence',()=>{
 const history=[{role:'user',text:'Дай денег'},{role:'assistant',text:'Что ты имеешь в виду?'}];
 assert.equal(readWaveGoalMenu(waveDialogueEntryTurn({message:'Я ж сказал уже',locale:'ru',history}).reply).topic,'money');
 assert.equal(waveJourneyPathFromHistory([{role:'assistant',text:buildWaveGoalMenu('money','ru').reply}]),'goal');
 const privateHistory=[{role:'assistant',text:buildWaveGoalMenu('money','ru').reply,localOnly:true}];
 assert.equal(waveJourneyPathFromHistory(privateHistory),null);
 assert.equal(waveDialogueEntryTurn({message:'1',locale:'ru',history:privateHistory}),null);
 for(const reset of ['сменить тему','new topic','otro tema']){
  const reply=waveDialogueEntryTurn({message:reset,locale:'ru',history,path:'goal'});
  assert.equal(reply.kind,'entry_menu');assert.equal(reply.path,null);
 }
 assert.equal(waveJourneyPathFromHistory([{role:'user',text:threeJourneyLabel('therapy','ru')}]),'therapy');
});

test('entry navigation does not intercept verified actions, safety, factual or media requests',()=>{
 for(const message of ['Создай видео о деньгах','Подбери медитацию','Переведи деньги','Оплати заказ','Запиши меня к коучу',
  'Мне страшно, я хочу умереть','Я хочу понять, почему боль в груди','Не могу дышать','Что такое инфляция?',
  'Хочу понять, как исправить ошибку JavaScript','I want to understand how to pay for an order']){
  assert.equal(waveDialogueEntryTurn({message,locale:'ru'}),null,message);
 }
});

test('no-advice and no-questions preferences also govern a fresh goal menu',()=>{
 for(const preferences of [{preferenceNoAdvice:true},{preferenceNoQuestions:true}]){
  assert.equal(waveDialogueEntryTurn({message:'Деньги',locale:'ru',path:'goal',...preferences}),null);
  const turn=threeJourneyTurn({message:'Деньги',locale:'ru',path:'goal',...preferences});
  assert.equal(readWaveGoalMenu(turn.reply),null);
 }
 assert.equal(waveDialogueEntryTurn({message:'Деньги',locale:'ru',history:[{role:'user',text:'Без советов'}]}),null);
});

test('switching paths retains a known topic, and a restored stage is still a goal',()=>{
 const history=[{role:'user',text:'Хочу понять, почему не хватает денег'},{role:'assistant',text:'Давай разберёмся.'}];
 for(const locale of ['ru','en','es']){
  const turn=waveDialogueEntryTurn({message:threeJourneyLabel('goal',locale),locale,path:'consultation',history});
  assert.equal(readWaveGoalMenu(turn.reply).topic,'money');
 }
 const menu=buildWaveGoalMenu('money','ru');
 const previous=[{role:'assistant',text:menu.reply},{role:'user',text:menu.stages[0]}];
 assert.equal(waveJourneyPathFromHistory(previous),'goal');
 assert.equal(waveNativeTurn({message:'1',locale:'ru',history:previous.slice(0,1)}).journey.stage,1);
 assert.equal(waveJourneyPathFromHistory([{role:'user',text:'Мне тревожно из-за денег'}]),'therapy');
});

test('named topics inside an explicit media flow stay in that flow',()=>{
 for(const request of ['Хочу создать видео','Хочу медитацию','I want to create video','Quiero crear video']){
  const history=[{role:'user',text:request},{role:'assistant',text:'На какую тему?'}];
  assert.equal(waveDialogueEntryTurn({message:'Деньги',locale:'ru',history}),null,request);
  assert.equal(readWaveGoalMenu(ruleConversationReply({message:'Деньги',locale:'ru',history})?.reply),null,request);
  assert.equal(readWaveGoalMenu(waveNativeTurn({message:'Деньги',locale:'ru',history})?.reply),null,request);
 }
});

test('restored boundaries also suppress menu questions, including a typed Yes',()=>{
 const history=[{role:'user',text:'Без вопросов'},{role:'assistant',text:buildWaveGoalMenu('money','ru').reply}];
 assert.deepEqual(waveDialoguePreferences(history),{noAdvice:false,noQuestions:true});
 assert.equal(waveDialogueEntryTurn({message:'Да',locale:'ru',history}),null);
 const selected=waveDialogueEntryTurn({message:threeJourneyLabel('goal','ru'),locale:'ru',history});
 assert.equal(selected.path,'goal');assert.doesNotMatch(selected.reply,/\?/u);
 for(const [locale,message] of [['en','Give me money'],['es','Dame dinero']]){
  assert.equal(waveDialogueEntryTurn({message,locale,path:'consultation'}).path,'goal');
 }
});

test('an answer within a selected step does not reopen the menu or change intent after restore',()=>{
 const menu=buildWaveGoalMenu('money','ru');
 const history=[{role:'user',text:'Дай денег'},{role:'assistant',text:menu.reply}];
 const selected=waveDialogueEntryTurn({message:'1',locale:'ru',history});
 history.push({role:'user',text:'1'},{role:'assistant',text:selected.reply});
 assert.equal(waveGoalStageFromHistory(history).stage,1);
 assert.equal(waveDialogueEntryTurn({message:'Доход',locale:'ru',history,path:'goal'}),null);
 assert.equal(waveJourneyPathFromHistory([...history,{role:'user',text:'Мне страшно из-за денег'}]),'goal');
 assert.equal(waveJourneyPathFromHistory([...history,{role:'user',text:'Мне нужна поддержка'}]),'therapy');
 for(const boundary of ['Сменить тему','Хочу создать видео','Поговорить и снять напряжение','Понять, что происходит']){
  assert.equal(waveGoalStageFromHistory([...history,{role:'user',text:boundary}]),null,boundary);
 }
 assert.equal(waveGoalStageFromHistory([...history,{role:'assistant',text:menu.reply}]),null);
});
