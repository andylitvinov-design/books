import test from 'node:test';
import assert from 'node:assert/strict';
import { progressDialogueReply, progressConversationTurn } from '../lib/holistic-support/dialogue-progression.mjs';
import { ruleConversationReply } from '../lib/holistic-support/rule-conversation.mjs';

const base = 'Давайте разберёмся. Сейчас важнее близость, ясность в отношениях или поддержка после конфликта?';
const h = [
 {role:'user',text:'Грустно'}, {role:'assistant',text:'Как ты?'},
 {role:'user',text:'Любовь'}, {role:'assistant',text:base}
];
test('Russian closeness advances from already answered choices', () => {
 const result = progressDialogueReply({message:'Близость',locale:'ru',history:h,intent:'relationship',reply:base});
 assert.notEqual(result,base); assert.match(result,/конкретным человеком/); assert.equal((result.match(/\?/g)||[]).length,1);
});
test('same selection progresses to different aspect, not a repeat', () => {
 const r1=progressDialogueReply({message:'Близость',locale:'ru',history:h,intent:'relationship',reply:base});
 const r2=progressDialogueReply({message:'Близость',locale:'ru',history:[...h.slice(2),{role:'user',text:'Близость'},{role:'assistant',text:r1}],intent:'relationship',reply:base});
 assert.notEqual(r2,r1); assert.match(r2,/разговора|внимания|понимают/);
});
test('follow-up for specific person and argument, without sales',()=>{
 const r1=progressDialogueReply({message:'С конкретным человеком',locale:'ru',history:h,intent:'generic',reply:'Как помочь?'});
 assert.match(r1,/общаетесь/);
 const r2=progressDialogueReply({message:'После ссоры',locale:'ru',history:h,intent:'generic',reply:'Как помочь?'});
 assert.match(r2,/быть услышанным/); assert.doesNotMatch(r2,/услуг|тест|диагност|купить/u);
});
test('does not override safety, direct commands, non-repeating unrelated answers',()=>{
 for(const message of ['Хочу умереть','Боль в груди','Создай видео','']){
  assert.equal(progressDialogueReply({message,locale:'ru',history:h,intent:'relationship',reply:base}),base);
 }
 assert.equal(progressDialogueReply({message:'как дела?',locale:'ru',history:h,intent:'generic',reply:'Свежий ответ'}),'Свежий ответ');
});
test('English and Spanish selected closeness advance without repetition',()=>{
 const hh=[{role:'user',text:'Love'},{role:'assistant',text:'Is closeness, clarity or support more important?'}];
 assert.match(progressDialogueReply({message:'Closeness',locale:'en',history:hh,reply:'Is closeness, clarity or support more important?',intent:'relationship'}),/someone specific/);
 assert.match(progressDialogueReply({message:'Cercanía',locale:'es',history:hh,reply:'¿Cercanía, claridad o apoyo?',intent:'relationship'}),/persona concreta/);
});
test('same canned replies in other categories deepen instead of repeating',()=>{
 const last='Это звучит непросто. Что важнее?';
 const result=progressDialogueReply({message:'Спокойствие',locale:'ru',history:[{role:'assistant',text:last}],reply:last,intent:'stress'});
 assert.notEqual(result,last);assert.match(result,/момент/);
});
test('short sadness and love are heard and specified, without upsell',()=>{
 const a=progressConversationTurn({message:'Грустно',locale:'ru'});
 assert.match(a.reply,/грустно/); assert.doesNotMatch(a.reply,/услуг|тест|диагност/);
 const b=progressConversationTurn({message:'Любовь',locale:'ru',history:[{role:'user',text:'Грустно'},{role:'assistant',text:a.reply}]});
 assert.match(b.reply,/конкретного человека/);
});
test('existing video/meditation flows and direct asks are not intercepted',()=>{
 const history=[{role:'user',text:'Хочу создать видео'},{role:'assistant',text:'Давайте выберем тему видео'}];
 assert.equal(progressConversationTurn({message:'Любовь',locale:'ru',history}),null);
 assert.equal(progressConversationTurn({message:'Близость',locale:'ru',history}),null);
 assert.equal(progressConversationTurn({message:'Хочу заказать консультацию',locale:'ru'}),null);
 assert.equal(progressConversationTurn({message:'В целом',locale:'ru',history:[{role:'user',text:'Мне трудно на работе'}]}),null);
});
test('actual guest rules dialogue moves forward on screenshot sequence',()=>{
 const a=ruleConversationReply({message:'Грустно',locale:'ru',history:[]});
 const b=ruleConversationReply({message:'Любовь',locale:'ru',history:[{role:'user',text:'Грустно'},{role:'assistant',text:a.reply}]});
 const c=ruleConversationReply({message:'Близость',locale:'ru',history:[
   {role:'user',text:'Грустно'},{role:'assistant',text:a.reply},
   {role:'user',text:'Любовь'},{role:'assistant',text:b.reply}]});
 assert.match(a.reply,/грустно/);
 assert.match(b.reply,/конкретного человека/);
 assert.match(c.reply,/конкретным человеком/);
 assert.notEqual(c.reply,b.reply);
 assert.equal(c.source,'reviewed-rules');
});
test('real rule path respects video wizard and explicit alternatives',()=>{
 const history=[{role:'user',text:'Хочу создать видео'},{role:'assistant',text:'Какая тема видео?'}];
 const reply=ruleConversationReply({message:'Любовь',locale:'ru',history});
 assert.ok(reply?.id==='video_topic'||reply?.id==='relationship');
 assert.notEqual(reply?.reply,progressConversationTurn({message:'Любовь',locale:'ru'})?.reply);
});

test('repeated sadness changes question instead of looping',()=>{
 const first=progressConversationTurn({message:'Грустно',locale:'ru'});
 const second=progressConversationTurn({message:'Грустно',locale:'ru',history:[
  {role:'user',text:'Грустно'},{role:'assistant',text:first.reply}]});
 assert.ok(second?.reply); assert.notEqual(second.reply,first.reply);
});
