import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildWaveGoalMenu,readWaveGoalMenu,waveGoalDialogueTurn} from '../lib/holistic-support/wave-goal-dialogue.mjs';
test('money immediately opens seven localized ordered steps and ends with the first-step invitation',()=>{
 for(const [locale,message,closing] of [['ru','Деньги','Можем начать с 1 пункта.'],['en','money','We can start with step 1.'],['es','dinero','Podemos empezar por el punto 1.']]){
  const turn=waveGoalDialogueTurn({message,locale});
  const menu=readWaveGoalMenu(turn.reply);
  assert.equal(turn.kind,'menu');assert.equal(menu.topic,'money');
  assert.equal(menu.stages.length,7);assert.ok(turn.reply.endsWith(closing));
  for(const [index,label] of menu.stages.entries()){
   const next=waveGoalDialogueTurn({message:label,locale,history:[{role:'user',text:message},{role:'assistant',text:turn.reply}]});
   assert.equal(next.stage,index+1);assert.equal(next.topic,'money');
   assert.notEqual(next.reply,turn.reply);assert.match(next.reply,/\?$/);
  }
 }
});
test('first step can be selected by text, number or consent without asking the topic again',()=>{
 const history=[{role:'user',text:'Деньги'},{role:'assistant',text:buildWaveGoalMenu('money','ru').reply}];
 for(const message of ['1','1 пункт','Да','Давай начнем']){
  const turn=waveGoalDialogueTurn({message,locale:'ru',history});
  assert.equal(turn.stage,1);assert.match(turn.reply,/финансовой жизни/);
 }
});
test('support, understanding, safety and explicit flows are not forced into coaching',()=>{
 assert.equal(waveGoalDialogueTurn({message:'Нужна поддержка',locale:'ru'}).kind,'support');
 assert.equal(waveGoalDialogueTurn({message:'Хочу разобраться',locale:'ru'}).kind,'understanding');
 for(const message of ['не могу дышать','создай видео','оплати заказ','не хочу жить'])assert.equal(waveGoalDialogueTurn({message,locale:'ru'}),null);
 assert.equal(waveGoalDialogueTurn({message:'Деньги',locale:'ru',allowNewGoal:false}),null);
});
test('messenger goal menu uses real buttons and selected stage handler',()=>{
 const source=readFileSync(new URL('../components/holistic-agent-chat.tsx',import.meta.url),'utf8');
 assert.match(source,/data-hh-wave-goal-menu/);
 assert.match(source,/data-hh-wave-goal-step=\{i\+1\}/);
 assert.match(source,/onClick=\{\(\)=>void sendTurn\(label\)\}/);
 assert.match(source,/data-hh-wave-goal-closing/);
 assert.match(source,/requiresProtectedReply\(text,turnLocale\)\s*\?waveDialogueEntryTurn/);
});
