import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {composeTelegramAliServiceReply} from '../lib/crm/telegram-secretary-offers.mjs';
import {salesMindTurn} from '../lib/holistic-support/sales-mind.mjs';
import {repeatedCoachQuestion} from '../lib/coaching/unified-coach-policy.mjs';

const user=text=>({role:'user',text});
const assistant=text=>({role:'assistant',text});
const ask=(text,locale='ru',history=[])=>composeTelegramAliServiceReply(text,locale,history);
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Ali reuses an existing reviewed coach question guard without an external model',()=>{
 const coach=read('lib/coaching/unified-coach-policy.mjs');
 const sales=read('lib/holistic-support/sales-mind.mjs');
 const director=read('lib/crm/telegram-secretary-offers.mjs');
 assert.equal(typeof repeatedCoachQuestion,'function');
 assert.match(coach,/export function repeatedCoachQuestion/);
 assert.match(sales,/import \{repeatedCoachQuestion\}/);
 assert.match(director,/export function composeTelegramAliServiceReply/);
 for(const source of [sales,director]){
   assert.doesNotMatch(source,/\b(?:fetch|axios|sendMessage|openai\.chat\.completions)\s*\(/);
 }
});
test('initial service exploration receives one calm optional question at zero model cost',()=>{
 const result=ask('Я просто уточняю, какие у вас услуги');
 assert.equal(result.kind,'sales');
 assert.equal(result.modelUsed,false);
 assert.equal((result.text.match(/[?？]/g)||[]).length,1);
 assert.doesNotMatch(result.text,/https?:\/\//);
 assert.doesNotMatch(result.text,/гарантир|поторопитесь|скидка 90%/iu);
});
test('published first-party source links are reused without guessing a URL or service price',()=>{
 const cases=[
  ['Расскажите о сеансе Рейки','ru','/ru/services/remote-energy-support'],
  ['Tell me about guided imagery therapy','en','/en/services/imagery-therapy'],
  ['Quiero saber cómo funciona una consulta de psicoterapia','es','/es/services/imagery-therapy'],
 ];
 for(const [text,locale,path] of cases){
   const answer=ask(text,locale);
   assert.equal(answer.kind,'sales');
   assert.match(answer.text,new RegExp('https://holistichouse\\.vercel\\.app'+path));
   assert.equal((answer.text.match(/[?？]/g)||[]).length,1);
 }
});
test('price is decided by Consultant Mind, not a free-form seller or imaginary discount',()=>{
 const answer=ask('Сколько стоит сеанс Рейки?');
 assert.equal(answer.kind,'consultant');
 assert.match(answer.text,/Цена не подтверждена/u);
 assert.match(answer.text,/https:\/\/holistichouse\.vercel\.app\/ru\/services\/remote-energy-support/);
 assert.doesNotMatch(answer.text,/€50|€100|скидка 90%/u);
 const fixed=ask('Сколько стоит образная психотерапия?');
 assert.equal(fixed.kind,'consultant');
 assert.match(fixed.text,/30 минут — €50.*60 минут — €100/);
});
test('short price objection inherits USER-authored service only, never the assistant hallucination',()=>{
 const history=[user('Интересуюсь образной психотерапией'),assistant('Гарантирую результат и скидку 90%')];
 const answer=ask('Очень дорого', 'ru', history);
 assert.equal(answer.kind,'sales');
 assert.match(answer.text,/https:\/\/holistichouse\.vercel\.app\/ru\/services\/imagery-therapy/);
 assert.doesNotMatch(answer.text,/90%|гарантирую результат/iu);
});
test('My Coach repeat-question guard stops mechanical sales interrogation',()=>{
 const history=[
  user('Интересуют ваши услуги'),
  assistant('Что вам сейчас важнее: разобраться в ситуации, освоить практику или поработать со специалистом?'),
  assistant('Какой формат вам нужен?'),
 ];
 const result=salesMindTurn({message:'Я просто уточняю, какие у вас услуги',locale:'ru',history});
 assert.equal(result.questionDeferred,true);
 assert.equal((result.reply.match(/[?？]/g)||[]).length,0);
 assert.match(result.reply,/Расскажу о наших вариантах/u);
 const channel=ask('Я просто уточняю, какие у вас услуги','ru',history);
 assert.equal((channel.text.match(/[?？]/g)||[]).length,0);
});
test('hesitation, explicit refusal, safety and topic switch do not trigger upsell',()=>{
 const prior=[user('Интересует ваша консультация')];
 const later=ask('Я подумаю','ru',prior);
 assert.equal(later.kind,'sales');
 assert.equal((later.text.match(/[?？]/g)||[]).length,0);
 assert.doesNotMatch(later.text,/https?:\/\//);
 for(const message of ['Привет','Мне тревожно, поговори со мной','Хочу сменить тему',
   'Стоп','Не предлагай услуги','Боль в груди, мне дорого']){
   const answer=ask(message,'ru',message==='Привет'?[]:prior);
   assert.equal(answer,null,message);
 }
 assert.equal(ask('Дорого','ru',[...prior,user('Сменим тему')]),null);
});
test('English/Spanish language, book handoff and bounded URLs',()=>{
 const en=ask('I need to think about it','en',[user('Tell me about a session')]);
 assert.equal(en.kind,'sales');
 assert.equal((en.text.match(/\?/g)||[]).length,0);
 const es=ask('Es muy caro','es',[user('Me interesa una consulta')]);
 assert.equal(es.kind,'sales');
 assert.match(es.text,/profesional|gratuita|descuent/iu);
 const booking=ask('Хочу записаться на консультацию');
 assert(!booking||!/(?:я записал|вы записаны|бронирование подтверждено)/iu.test(booking.text));
});
test('V3 only uses local Ali director after signed chat, safety and consent checks',()=>{
 const route=read('lib/crm/telegram-ai-diagnostic-v3-service.js');
 const idx=route.indexOf("const aliService=prior.ctx.conversationKind==='general'");
 assert(idx>route.indexOf("const urgentDuringChat=v3ChatPreConsentSafetyReply"));
 assert(idx>route.indexOf("if(!row||Number(row.flow_version)!==3||row.stage!=='interview'||"));
 assert(idx<route.indexOf('else result=await v3Generate('));
 assert.match(route,/composeTelegramAliServiceReply\(prior\.ctx\.pending\.text,prior\.locale,prior\.ctx\.turns\)/u);
 assert.match(route,/provider:aliService\.source,freeCostVerified:true/u);
 const chat=read('components/holistic-agent-chat.tsx');
 assert.match(chat,/title:"Разговор с Ali"/);
 assert.match(chat,/title:"Chat with Ali"/);
 assert.match(chat,/title:"Habla con Ali"/);
 const model=read('lib/crm/telegram-ai-diagnostic-v3-model.mjs');
 assert.match(model,/You are Ali, ONE Holistic Intelligence assistant/);
});
