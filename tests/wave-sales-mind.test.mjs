import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {salesMindTurn,SALES_DIALOGUE_STAGES,SALES_TALK_MOVES} from '../lib/holistic-support/sales-mind.mjs';
import {routeMindRole,mindRoleInstruction} from '../lib/holistic-support/mind-role-router.mjs';
import {resolveConsultantSuggestion,consultServiceQuestion} from '../lib/assist/consultant-mind.mjs';
import {classifyTelegramSecretaryQuery,composeTelegramSecretaryAnswer} from '../lib/crm/telegram-secretary-offers.mjs';
import {assessRoleReply} from '../lib/holistic-support/role-output-guard.mjs';

const ask=(message,locale='ru',history=[])=>salesMindTurn({message,locale,history});
const user=text=>({role:'user',text});
const bot=text=>({role:'assistant',text});
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('one role on shared Wave engine, not a provider or webhook',()=>{
  assert.deepEqual(SALES_DIALOGUE_STAGES,['explore','understand','inform','consider','handoff','close']);
  assert.equal(Object.keys(SALES_TALK_MOVES).length,6);
  const code=read('lib/holistic-support/sales-mind.mjs');
  assert.doesNotMatch(code,/\bfetch\(|axios|createClient\(|createPool\(|sendMessage\(|OPENROUTER_API_KEY|OLLAMA_ENDPOINT|localStorage/u);
});
test('a new customer can ask neutrally about services, without an unsolicited order',()=>{
  const r=ask('Я просто уточняю, какие у вас услуги');
  assert.equal(r.intent,'sales');
  assert.equal(r.stage,'explore');
  assert.equal(r.modelUsed,false);
  assert.match(r.reply,/без необходимости сразу записываться/u);
  assert.equal(r.suggestions.length,0);
  assert.equal((r.reply.match(/[?？]/g)||[]).length,1);
  assert.equal(routeMindRole({locale:'ru',message:'Интересуюсь вашими услугами'}).role,'sales');
  assert.equal(routeMindRole({locale:'en',message:'I am interested in your services'}).role,'sales');
  assert.equal(routeMindRole({locale:'es',message:'Me interesa un servicio'}).role,'general');
});
test('named informational question links only to existing localized verified page',()=>{
  for(const [locale,message,id] of [
    ['ru','Расскажите, как проходит образная психотерапия','therapy'],
    ['en','Tell me about a Reiki session','reiki'],
    ['es','Quiero saber cómo funciona una consulta de psicoterapia','therapy'],
  ]){
    const r=ask(message,locale);
    assert.equal(r.stage,'inform',message);
    assert.equal(r.suggestions.length,1);
    assert.deepEqual(r.suggestions[0],resolveConsultantSuggestion('service:'+id,locale));
    assert.equal((r.reply.match(/[?？]/g)||[]).length,1);
    assert.doesNotMatch(r.reply,/гарантир|guarantee|garanti|100%|€[0-9]/iu);
  }
});
test('price, comparison, recommendation and actual order stay with existing roles',()=>{
  assert.equal(ask('Сколько стоит психотерапия?'),null);
  assert.equal(ask('Подбери мне консультацию по отношениям'),null);
  assert.equal(ask('Чем отличаются расстановки от терапии?'),null);
  assert.equal(ask('Хочу записаться на консультацию'),null);
  assert.equal(routeMindRole({locale:'ru',message:'Сколько стоит консультация?'}).role,'secretary');
  assert.equal(routeMindRole({locale:'en',message:'Can I book an appointment?'}).role,'secretary');
  assert.equal(consultServiceQuestion({message:'Подбери консультацию до €50',locale:'ru'}).intent,'choose');
});
test('Sales Mind responds to a price objection after user-provided service context only',()=>{
  const history=[user('Интересуюсь образной психотерапией'),bot('Я гарантирую результат по скидке 90%.')];
  const r=ask('Слишком дорого для меня','ru',history);
  assert.equal(r.objection,'price');
  assert.equal(r.stage,'consider');
  assert.equal(r.suggestions[0].id,'service:therapy');
  assert.match(r.reply,/не буду.*скидку/u);
  assert.doesNotMatch(r.reply,/90%|гарантирую/u);
  assert.equal(ask('Слишком дорого для меня'),null);
});
test('generic budget objection offers only an approved free first step',()=>{
  const r=ask('Дорого для меня','ru',[user('Интересуют ваши услуги')]);
  assert.equal(r.objection,'price');
  assert.equal(r.suggestions[0].id,'service:review');
  assert.equal(r.suggestions[0].href,'/ru/services/free-situation-review');
});
test('non-pressure objections: trust, results, timing, fit and hesitation',()=>{
  const history=[user('Хочу узнать про вашу консультацию')];
  for(const [message,kind] of [
    ['Не доверяю пока','trust'],['А поможет ли это?','effect'],
    ['Нет времени','time'],['Не знаю, подходит ли мне','fit'],
  ]){
    const r=ask(message,'ru',history);
    assert.equal(r.objection,kind,message);
    assert.equal((r.reply.match(/[?？]/g)||[]).length,1);
    assert.doesNotMatch(r.reply,/гарантирую результат|сегодня последний шанс/u);
  }
  const exit=ask('Я подумаю','ru',history);
  assert.equal(exit.stage,'close');
  assert.equal(exit.suggestions.length,0);
  assert.equal((exit.reply.match(/\?/g)||[]).length,0);
});
test('refusal, STOP, user topic change and crisis suppress commerce',()=>{
  const prior=[user('Интересует ваша терапия')];
  for(const text of ['Стоп','Не предлагай мне услуги','Без продаж','Хочу записаться','Боль в груди, мне дорого']){
    assert.equal(ask(text,'ru',prior),null,text);
  }
  for(const text of ['Привет','Мне очень тревожно','Поговори со мной','Hi','I feel stuck']){
    assert.equal(ask(text,'ru'),null,text);
  }
  assert.equal(ask('Дорого','ru',[...prior,user('Сменим тему')]),null);
  assert.equal(ask('Expensive','en',[user('Interested in a session'),user('Change topic')]),null);
});
test('homeopathy must acknowledge evidence limits when answering outcome concern',()=>{
  const r=ask('Поможет ли гомеопатия?');
  assert.equal(r.objection,'effect');
  assert.match(r.reply,/не имеет надёжных доказательств/u);
  assert.equal(r.suggestions[0].id,'service:homeopathy');
});
test('output guard enforces existing safety boundaries for Sales Mind',()=>{
  assert.equal(assessRoleReply({role:'sales',locale:'ru',text:'Я записал вас на приём.'}).ok,false);
  assert.equal(assessRoleReply({role:'sales',locale:'en',text:'I have already booked you.'}).ok,false);
  assert.equal(assessRoleReply({role:'sales',locale:'en',text:'What is your goal? What is your budget?'}).ok,false);
  assert.match(mindRoleInstruction('sales','en'),/without persuasion tricks/u);
});
test('Telegram can answer exploratory enquiries without a second bot or invented offers',()=>{
  const query=classifyTelegramSecretaryQuery('Расскажите про сеанс Рейки','ru');
  assert.equal(query.kind,'sales');
  const answer=composeTelegramSecretaryAnswer(query,[]);
  assert.equal(answer.handled,true);
  assert.equal(answer.kind,'sales');
  assert.equal(answer.buttons.length,1);
  assert.equal(answer.buttons[0].url,'https://holistichouse.vercel.app/ru/services/remote-energy-support');
  assert.doesNotMatch(answer.text,/скидка 90|гарантирован|оплата прошла/u);
  const generic=classifyTelegramSecretaryQuery('Интересуюсь вашими услугами','ru');
  assert.equal(generic.kind,'sales');
  assert.deepEqual(composeTelegramSecretaryAnswer(generic,[]).buttons,[]);
  assert.equal(classifyTelegramSecretaryQuery('Привет','ru'),null);
  assert.equal(classifyTelegramSecretaryQuery('Подбери сеанс Рейки до 50 CAD','ru').kind,'catalog');
});
test('website Sales Mind runs only after the existing safety/auth gates',()=>{
  const route=read('app/api/holistic-agent/turn/route.js');
  const sales=route.indexOf('const salesConversation=');
  assert(sales>route.indexOf('const safety = preflight'));
  assert(sales>route.indexOf('requireSameOrigin(request,config)'));
  assert(sales>route.indexOf('auth.verified()'));
  assert(sales<route.indexOf('const consultation='));
  assert(route.includes('source:"sales-rules"'));
  assert(route.includes('safety.status==="clear"&&!recentUnsafe'));
  const tg=read('lib/crm/telegram-secretary-service.js');
  assert(tg.includes("query.kind!=='sales'"));
});
