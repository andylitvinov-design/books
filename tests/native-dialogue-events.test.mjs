import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeDialogueEventFromUtterance as event} from '../lib/holistic-support/conversation-intelligence.mjs';
const consultation={goal:{value:'consultation',confirmed:true,sourceTurnId:'prior'},topic:{value:'relationships',confirmed:true,sourceTurnId:'prior'}};
const declined={...consultation,declinedMeditation:{value:'meditation',confirmed:true,sourceTurnId:'prior'}};
test('explicit RU/EN turns provide bounded dialogue events',()=>{
 for(const [locale,message,expected] of [
  ['ru','Хочу консультацию',{type:'set_goal',value:'consultation'}],['en','I want a consultation',{type:'set_goal',value:'consultation'}],
  ['ru','Про отношения',{type:'set_topic',value:'relationships'}],['en','About relationships',{type:'set_topic',value:'relationships'}],
  ['ru','Лучше вечером',{type:'set_time',value:'evening'}],['en','In the evening, please',{type:'set_time',value:'evening'}],
  ['ru','Нет, не записывай, просто поговорим',{type:'cancel_to_talk'}],['en','No, do not book, just talk',{type:'cancel_to_talk'}],
  ['ru','Ты меня не понял: не коучинг, а консультация',{type:'set_goal',value:'consultation'}],['en','You misunderstood: not coaching, but a consultation',{type:'set_goal',value:'consultation'}],
  ['ru','Второй вариант',{type:'choose',ordinal:2}],['en','The second option',{type:'choose',ordinal:2}],
  ['ru','Не про отношения, а про работу',{type:'set_topic',value:'work'}],['en','Not about relationships, but about work',{type:'set_topic',value:'work'}],
  ['ru','Не утром, а вечером',{type:'set_time',value:'evening'}],['en','Not in the morning, but in the evening',{type:'set_time',value:'evening'}],
 ])assert.deepEqual(event({locale,message,state:consultation}),expected,message);
});
test('a standalone refusal to book is respected without inventing a new goal',()=>{
 for(const [locale,message] of [['ru','Пожалуйста, не записывайте меня пока.'],['en',"Please don't book anything yet."],
  ['ru','Я пока не хочу записываться.'],['ru','Я ещё не готова записываться.'],
  ['en',"I don't want to book yet."],['en',"I'm not ready to book yet."]])
  assert.deepEqual(event({locale,message,state:consultation}),{type:'decline_booking'},message);
 for(const [locale,message] of [['ru','Не записывайте меня?'],['en',"Don't book anything?"],
  ['ru','Я пока не хочу записываться?'],['en',"I'm not ready to book yet?"]])
  assert.notEqual(event({locale,message,state:consultation}).type,'decline_booking',message);
});
test('short yes/no changes advice permission only after a server-held clarification',()=>{
 const pending={...consultation,declinedAdvice:{value:'advice',confirmed:true,sourceTurnId:'prior'},pendingAdviceConfirmation:true};
 for(const [locale,yes,no] of [['ru','Да','Нет'],['en','Yes','No']]){
  assert.equal(event({locale,message:yes,state:pending}).type,'allow_advice');
  assert.equal(event({locale,message:no,state:pending}).type,'retain_advice');
  assert.notEqual(event({locale,message:yes+'?',state:pending}).type,'allow_advice');
  assert.notEqual(event({locale,message:yes,state:{...pending,pendingAdviceConfirmation:false}}).type,'allow_advice');
 }
});
test('a one-sentence explanation refers only to a server-owned selected choice',()=>{
 for(const [locale,message] of [['ru','Поясни одним предложением.'],['en','Explain that in a single sentence.']]){
  assert.deepEqual(event({locale,message,state:{...consultation,selectedChoiceId:'test:work'}}),{type:'explain_choice'});
  assert.notEqual(event({locale,message,state:consultation}).type,'explain_choice');
 }
});
test('natural time corrections require an affirmative replacement and are not questions',()=>{
 for(const [locale,message] of [['ru','Утром мне неудобно, вечером удобнее.'],['en',"Mornings don't work for me, evenings are better."]]){
  assert.deepEqual(event({locale,message,state:consultation}),{type:'set_time',value:'evening'},message);
  assert.notEqual(event({locale,message:message.replace(/\.$/,'?'),state:consultation}).type,'set_time');
 }
 for(const [locale,message] of [['ru','Утром мне неудобно, утром удобнее'],['en',"Mornings don't work for me, mornings are better"]])
  assert.notEqual(event({locale,message,state:consultation}).type,'set_time',message);
});
test('natural cancellation, correction and ordinal phrasing stay bounded',()=>{
 for(const [locale,message,expected] of [
  ['ru','Нет, не записывай меня, просто поговорим.',{type:'cancel_to_talk'}],
  ['en',"No, don't book anything. Let's just talk.",{type:'cancel_to_talk'}],
  ['ru','Точнее: нужна консультация, не коучинг.',{type:'set_goal',value:'consultation',corrected:true}],
  ['en','Correction: I mean a consultation, not coaching.',{type:'set_goal',value:'consultation',corrected:true}],
  ['ru','Тогда второй вариант.',{type:'choose',ordinal:2}],
  ['en','Then I prefer the second option.',{type:'choose',ordinal:2}],
 ])assert.deepEqual(event({locale,message,state:consultation}),expected,message);
 for(const [locale,message] of [
  ['ru','Не нужна консультация, давай коучинг'],['en','I do not want a consultation, I want coaching'],
  ['ru','Может быть, второй вариант?'],['en','Should I pick the second option?'],
 ])assert.notEqual(event({locale,message,state:consultation}).type,message.includes('вариант')||message.includes('option')?'choose':'set_goal',message);
});
test('an explicit conversational goal is retained without treating questions or actions as goals',()=>{
 for(const [locale,message] of [
  ['ru','Хочу спокойнее обсуждать задачи с руководителем.'],
  ['en','I want a calmer conversation with my manager.'],
 ])assert.deepEqual(event({locale,message,state:null}),{type:'set_goal_statement',value:message},message);
 for(const [locale,message] of [
  ['ru','Хочу записаться на консультацию'],['ru','Хочу не обсуждать это'],['ru','Хочу умереть'],['ru','Хочу причинить себе вред'],
  ['en','I want to book an appointment'],['en','I want to die'],['en','I want to hurt myself'],['en','I want not to discuss it'],
  ['en','I want a calmer conversation?'],
 ])assert.notEqual(event({locale,message,state:null}).type,'set_goal_statement',message);
});
test('goal recall and an explicit topic change produce separate bounded events',()=>{
 for(const [locale,message,expected] of [
  ['ru','Какую цель мы сейчас обсуждаем?',{type:'recall_goal'}],
  ['en','What goal are we discussing now?',{type:'recall_goal'}],
  ['ru','Меняем тему: хочу поговорить об отношениях.',{type:'set_topic',value:'relationships',newTopic:true}],
  ['en','New topic: I want to talk about relationships.',{type:'set_topic',value:'relationships',newTopic:true}],
  ['ru','Давай сменим тему и поговорим об отношениях.',{type:'set_topic',value:'relationships',newTopic:true}],
  ['en',"Let's change the subject and talk about relationships.",{type:'set_topic',value:'relationships',newTopic:true}],
 ])assert.deepEqual(event({locale,message,state:consultation}),expected,message);
 for(const [locale,message] of [['ru','Я не хочу менять тему.'],['en','I do not want to change the subject.']])
  assert.deepEqual(event({locale,message,state:consultation}),{type:'ordinary'},message);
});
test('short follow-up questions about time or price are not confirmations',()=>{
 for(const [locale,message,expected] of [
  ['ru','Можно вечером?',{type:'ask_time'}],['en','Could we do it in the evening?',{type:'ask_time'}],
  ['ru','А сколько это стоит?',{type:'ask_price'}],['en','How much would that cost?',{type:'ask_price'}],
 ])assert.deepEqual(event({locale,message,state:consultation}),expected,message);
});
test('correcting or forgetting a stated goal uses explicit bounded events',()=>{
 for(const [locale,message,expected] of [
  ['ru','Нет, точнее я хочу научиться говорить спокойнее.',{type:'set_goal_statement',value:'я хочу научиться говорить спокойнее.',corrected:true}],
  ['en','No, actually I want to speak more calmly.',{type:'set_goal_statement',value:'I want to speak more calmly.',corrected:true}],
  ['ru','Пожалуйста, забудь мою цель.',{type:'clear_goal_statement'}],
  ['en','Please forget my goal.',{type:'clear_goal_statement'}],
  ['ru','Не сохраняй мою цель.',{type:'clear_goal_statement'}],
  ['en','Do not remember my goal.',{type:'clear_goal_statement'}],
 ])assert.deepEqual(event({locale,message,state:consultation}),expected,message);
 for(const [locale,message] of [
  ['ru','Я хочу удалить свои данные'],['ru','Хочу отправить сообщение специалисту'],
  ['en','I want to delete my data'],['en','I want to send a message to a specialist'],
 ])assert.notEqual(event({locale,message,state:consultation}).type,'set_goal_statement',message);
});
test('explicit RU/EN meditation refusal and reversal do not authorize actions',()=>{
 for(const [locale,message,expected,state] of [
  ['ru','Не предлагайте мне больше медитации',{type:'refuse_meditation'},consultation],['en','Please do not suggest meditation anymore',{type:'refuse_meditation'},consultation],
  ['ru','Я не хочу медитацию; покажите курс',{type:'refuse_meditation',mixed:true},consultation],['en','I do not want meditation; I would like a course',{type:'refuse_meditation',mixed:true},consultation],
  ['ru','Я не хочу медитацию; на самом деле я хочу медитацию',{type:'allow_meditation'},declined],['en','I do not want meditation; actually I want a meditation',{type:'allow_meditation'},declined],
 ])assert.deepEqual(event({locale,message,state}),expected,message);
 for(const [locale,message] of [['ru','Не предлагай медитацию, я хочу умереть'],['en',"Don't suggest meditation, I want to die"]])assert.deepEqual(event({locale,message,state:consultation}),{type:'ordinary'});
});
test('a request to avoid advice persists until an explicit later reversal',()=>{
 for(const [locale,message,expected] of [
  ['ru','Продолжим про отношения, но без советов.',{type:'refuse_advice'}],
  ['en',"Let's stay on relationships, but no advice.",{type:'refuse_advice'}],
  ['ru','Пожалуйста, не давай советов.',{type:'refuse_advice'}],
  ['en','Please do not give me advice.',{type:'refuse_advice'}],
  ['ru','Мне не нужны советы.',{type:'refuse_advice'}],
  ['ru','Пожалуйста, без советов.',{type:'refuse_advice'}],
  ['en',"I don't want advice.",{type:'refuse_advice'}],
  ['en','No advice, please.',{type:'refuse_advice'}],
  ['ru','Теперь можешь дать совет.',{type:'allow_advice'}],
  ['en','Now you can offer advice.',{type:'allow_advice'}],
 ])assert.deepEqual(event({locale,message,state:consultation}),expected,message);
 for(const [locale,message] of [['ru','Не давай советов, я хочу умереть'],['en',"Don't give advice, I want to die"]])
  assert.deepEqual(event({locale,message,state:consultation}),{type:'ordinary'},message);
});
test('a corrected time with an explicit not-yet booking refusal keeps the time without booking',()=>{
 for(const [locale,message] of [
  ['ru','Не утром, а вечером, но пока не записывайте меня.'],
  ['en','Not in the morning, evenings are better, but please do not book anything yet.'],
 ])assert.deepEqual(event({locale,message,state:consultation}),{type:'set_time',value:'evening',bookingDeferred:true});
 for(const [locale,message] of [['ru','Не вечером, а утром'],['en','Not in the evening, in the morning instead']])
  assert.notDeepEqual(event({locale,message,state:consultation}),{type:'set_time',value:'evening',bookingDeferred:true});
});
test('a rejected saved time clears only that preference, never a question or another time',()=>{
 const saved={...consultation,timePreference:{value:'morning',confirmed:true,sourceTurnId:'prior'}};
 for(const [locale,message] of [['ru','Утром мне неудобно.'],['ru','Утром не получится.'],
  ['en',"Mornings don't work for me."],['en','I cannot do the morning.']])
  assert.deepEqual(event({locale,message,state:saved}),{type:'clear_time',value:'morning'},message);
 for(const [locale,message] of [['ru','Утром мне неудобно?'],['ru','Вечером мне неудобно.'],
  ['en',"Mornings don't work for me?"],['en',"Evenings don't work for me."]])
  assert.notEqual(event({locale,message,state:saved}).type,'clear_time',message);
});
test('a tentative consultation request establishes an explicit goal without treating negation as consent',()=>{
 for(const [locale,message] of [
  ['ru','Я думаю о консультации по работе'],
  ['en','I was thinking about a consultation about work.'],
 ])assert.deepEqual(event({locale,message,state:null}),{type:'set_goal',value:'consultation',topic:'work'});
 for(const [locale,message] of [['ru','Я не думаю о консультации по работе'],['en','I am not thinking about a consultation about work']])
  assert.notEqual(event({locale,message,state:null}).type,'set_goal');
});
test('conversational time preferences are recognized only in an active consultation context',()=>{
 for(const [locale,message] of [['ru','Мне удобнее вечером'],['en','Evening would work for me']]){
  assert.deepEqual(event({locale,message,state:consultation}),{type:'set_time',value:'evening'});
  assert.deepEqual(event({locale,message,state:null}),{type:'ordinary'});
 }
});
test('natural time preferences do not turn negation or questions into a preference',()=>{
 for(const [locale,message,value] of [
  ['ru','По вечерам мне удобнее','evening'],['ru','Утром мне обычно удобнее','morning'],
  ['en','Evenings usually work best for me','evening'],['en','Mornings are usually better for me','morning'],
 ]){
  assert.deepEqual(event({locale,message,state:consultation}),{type:'set_time',value},message);
  assert.deepEqual(event({locale,message,state:null}),{type:'ordinary'},message);
 }
 for(const [locale,message] of [
  ['ru','По вечерам мне неудобно'],['ru','Утром мне не удобнее'],['ru','По вечерам мне удобнее?'],
  ['ru','Мне удобнее вечером?'],['en','Evening works for me?'],
  ['en','Evenings do not work for me'],['en','Are evenings better for me?'],
 ])assert.deepEqual(event({locale,message,state:consultation}),{type:'ordinary'},message);
});
