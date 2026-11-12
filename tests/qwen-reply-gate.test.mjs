import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewQwenOwnedReply,removeEmptyQwenThink} from '../lib/holistic-support/qwen-reply-gate.mjs';
const gate = (locale, userMessage, response, role='coach') => reviewQwenOwnedReply({locale,userMessage,response,role});
test('Qwen empty think wrapper is removed but substantive thought rejected',()=>{
 assert.equal(removeEmptyQwenThink('<think>\n</think>\nHello.'),'Hello.');
 assert.equal(gate('en','I want to talk.','<think>private thoughts</think>Hello.').reason,'reasoning_or_role_token_leak');
 assert.equal(gate('en','I want to talk.','<think>\n</think>\nHello.').text,'Hello.');
});
test('real Qwen Russian stop error in English is rejected',()=>{
 const r=gate('ru','Не хочу никаких советов и вопросов. На этом закончим.', 'Understood. We will conclude our conversation here. Have a great day!');
 assert.equal(r.accepted,false);assert.equal(r.reason,'clearly_wrong_language');
});
test('real Russian Qwen pre-goal advice is rejected',()=>{
 const r=gate('ru','На работе какая-то путаница, и я не понимаю, с чего начать.',
 'Какая-то путаница на работе — это не редкость. Давайте подумаем, с чего можно начать? Например, можно попробовать разбить задачи на более маленькие части, или обратиться к коллегам за помощью. Что именно вызывает у вас путаницу?');
 assert.equal(r.accepted,false);
});
test('real English Qwen valid goal-first response is retained',()=>{
 const reply='One practical first step is to schedule a brief conversation with your manager to discuss your current priorities and ask for clarification.';
 const r=gate('en','My goal is to ask my manager for clearer priorities this week. What is one practical first step?',reply);
 assert.equal(r.accepted,true);assert.equal(r.text,reply);
});
test('real English Qwen goal-clarification is retained',()=>{
 const r=gate('en','I feel stuck with my team but have not figured out what I want to change.',
 'What do you hope to achieve by making a change in your team?');
 assert.equal(r.accepted,true);
});
test('Russian and English one focused question is accepted',()=>{
 assert.equal(gate('ru','Я не знаю, что изменить.', 'Какого результата вам хотелось бы достичь?').accepted,true);
 assert.equal(gate('en','I am unsure what to do.','What outcome matters to you most?').accepted,true);
});
test('explicit stopping refuses suggestions or more questions',()=>{
 assert.equal(gate('en','No more advice or questions. End this conversation.', 'Understood. Could we talk later?').accepted,false);
 assert.equal(gate('ru','Хватит, закончим.','Понял, предлагаю сначала подумать.').accepted,false);
 assert.equal(gate('en','Stop now.','Understood. We can end here.').accepted,true);
 assert.equal(gate('ru','Стоп.','Хорошо, на этом завершим.').accepted,true);
});
test('role-specific goal gate rejects premature advice',()=>{
 const u='I feel lost and unsure.';
 assert.equal(gate('en',u,'You should schedule a meeting.', 'coach').reason,'advice_before_goal');
 assert.equal(gate('en',u,'You can find courses in the learning section.', 'secretary').accepted,true);
});
test('rejects multiple questions and unverified action claims',()=>{
 assert.equal(gate('en','I want to prepare for a meeting.','What date? What time?').reason,'too_many_questions');
 assert.equal(gate('ru','Хочу поговорить.','Я уже забронировал время.').reason,'unverified_action_claim');
 assert.equal(gate('en','I would like to talk.','I booked your appointment.').reason,'unverified_action_claim');
});
test('English responses in Russian and Russian in English reject without translating',()=>{
 assert.equal(gate('ru','Моя цель — выбрать курс.','A good first step would be to browse your options.').reason,'clearly_wrong_language');
 assert.equal(gate('en','I want to choose a class.','Ваш первый шаг — выбрать один курс.').reason,'clearly_wrong_language');
});
test('Spanish behavior is preserved with no new RU/EN optimization',()=>{
 const r=gate('es','No quiero consejos.','Entendido. Terminamos aquí.');
 assert.equal(r.accepted,true);assert.equal(r.text,'Entendido. Terminamos aquí.');
});
test('no intent or model grant / no network / no private records',()=>{
 const x=gate('ru','Привет','Привет!');
 assert.equal(x.accepted,true);
 assert.equal('modelAllowed' in x,false);
 assert.equal('userId' in x,false);
});
import {readFileSync} from 'node:fs';
test('all six recorded Qwen teacher samples are evaluated against human-reviewed decisions',()=>{
 const fixture=JSON.parse(readFileSync(new URL('../data/holistic-support/qwen-observations-ru-en-v1.json',import.meta.url),'utf8'));
 assert.equal(fixture.cases.length,6);
 for(const row of fixture.cases){
  const r=gate(row.locale,row.user,row.response,row.role);
  assert.equal(r.accepted,row.expertAccepted,`Observed Qwen response ${row.id}: ${r.reason}`);
 }
});