import test from 'node:test';
import assert from 'node:assert/strict';
import {readWaveGoalMenu} from '../lib/holistic-support/wave-goal-dialogue.mjs';
import {repairDialogueTopic} from '../lib/holistic-support/dialogue-topic-repair.mjs';
import {ruleConversationReply} from '../lib/holistic-support/rule-conversation.mjs';
import {waveNativeTurn} from '../lib/holistic-support/wave-native-router.mjs';
import {friendConversationReply} from '../lib/holistic-support/friend-mind.mjs';
const history=[{"role":"assistant","text":"Хочу понять ваш запрос, а не угадывать. Что интереснее — конкретный ответ, видео, медитация или практика?"},{"role":"user","text":"Деньги"},{"role":"assistant","text":"Понял, вопрос касается работы. Важнее цель, энергия для действий или отношения с людьми?"}];
test('money remains money in free rules, native and friend routes',()=>{
 for(const turn of [ruleConversationReply,waveNativeTurn,friendConversationReply]){
  const first=turn({message:'Деньги',locale:'ru',history:history.slice(0,1)});
  if(turn===friendConversationReply)assert.match(first.reply,/доход/);
  else assert.equal(readWaveGoalMenu(first.reply)?.topic,'money');
  const repaired=turn({message:'Я ж сказал уже',locale:'ru',history});
  assert.match(repaired.reply,/Деньги|финансы/);assert.doesNotMatch(repaired.reply,/конкретный ответ, видео/);
 }
});
test('advance a finance answer; avoid asking a previous question again',()=>{
 const first=repairDialogueTopic({message:'Деньги',locale:'ru'});
 const prior=[{role:'user',text:'Деньги'},{role:'assistant',text:first.reply}];
 assert.equal(repairDialogueTopic({message:'доход',locale:'ru',history:prior}).id,'money_detail');
 assert.notEqual(repairDialogueTopic({message:'Деньги',locale:'ru',history:prior}).reply,first.reply);
});
test('explicit reset and media choice break old context; ordinary commands stay unhandled',()=>{
 for(const text of ['сменить тему','хочу видео'])assert.equal(repairDialogueTopic({message:'Я ж сказал уже',locale:'ru',history:[...history,{role:'user',text}]}),null);
 for(const text of ['создай видео','не могу дышать','оплати заказ'])assert.equal(repairDialogueTopic({message:text,locale:'ru',history}),null);
});
test('English and Spanish repairs carry the named topic',()=>{
 for(const [locale,topic,message,label] of [['en','money','I already said that','Money'],['es','dinero','Ya te lo dije','Dinero']])assert.match(repairDialogueTopic({message,locale,history:[{role:'user',text:topic}]}).reply,new RegExp(label));
});
