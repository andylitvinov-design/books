import test from 'node:test';
import assert from 'node:assert/strict';
import {friendConversationReply} from '../lib/holistic-support/friend-mind.mjs';
const run=(message,locale='ru',other={})=>friendConversationReply({message,locale,...other});

test('Friend Mind speaks warmly in RU/EN/ES without a service funnel or diagnosis',()=>{
 for(const [locale,message] of [['ru','Мне одиноко'],['en','I feel lonely'],['es','Me siento sola']]){
  const answer=run(message,locale);
  assert.equal(answer.source,'friend-mind');
  assert.ok(answer.reply.length>=30 && answer.reply.length<=280,answer.reply);
  assert.ok((answer.reply.match(/[?？]/g)||[]).length<=1,answer.reply);
  assert.doesNotMatch(answer.reply,/запис|купить|диагноз|book a session|buy now|diagnos|comprar|diagn[oó]sti/iu);
 }
});
test('explicit conversational tone never causes explicit erotic output or false reciprocal love',()=>{
  for(const [locale,message] of [['ru','Хочу нежности'],['en','I need a hug'],['es','Quiero ternura']]){
    const answer=run(message,locale,{tone:'tender'});
    assert.equal(answer.tone,'tender');
    assert.equal(answer.kind,'closeness');
    assert.doesNotMatch(answer.reply,/я тебя люблю|ты только мой|you are mine|i love you|te amo/iu);
  }
  assert.equal(run('Пофлиртуй со мной').kind,'romantic_request');
  assert.match(run('Пофлиртуй со мной').reply,/выбору/iu);
  assert.match(run('Ты меня любишь?').reply,/цифровой собеседник/iu);
  assert.equal(run('Опиши половой акт').kind,'graphic');
});
test('boundaries, refusal and possible minors override closeness and stop coercion',()=>{
  const opts={tone:'tender',history:[{role:'user',text:'Мне не хватает нежности'}]};
  assert.equal(run('Без флирта','ru',opts).tone,'friendly');
  assert.equal(run('Мне 15 лет, хочу поговорить','ru',opts).kind,'young');
  assert.equal(run('Давай без советов','ru',opts).kind,'no_advice');
  assert.equal(run('Не задавай вопросов','ru',opts).kind,'no_questions');
  assert.doesNotMatch(run('Привет','ru',{history:[{role:'user',text:'Без вопросов'}]}).reply,/\?/u);
  for(const text of ['Стоп','Сменим тему','Я не хочу жить','Не могу дышать','Запиши меня на консультацию','Создай видео'])
    assert.equal(run(text),null,text);
});
test('conversational continuity uses only the user turns and avoids identical answer loops',()=>{
  const first=run('Привет');
  const second=run('Привет','ru',{history:[{role:'user',text:'Привет'},{role:'assistant',text:first.reply}]});
  assert.notEqual(first.reply,second.reply);
  const fromUser=run('Продолжай','ru',{history:[{role:'user',text:'Я поссорилась с мужем'}]});
  assert.equal(fromUser.kind,'relationship_followup');
  const fromAssistant=run('Продолжай','ru',{history:[{role:'assistant',text:'Давай поговорим про мужа'}]});
  assert.equal(fromAssistant.kind,'follow_up');
  assert.equal(run('','ru'),null);
  assert.equal(run('x'.repeat(2001),'ru'),null);
});
