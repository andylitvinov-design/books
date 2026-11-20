import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sessionSecretaryMessage,sessionSecretaryCopy,sessionHasOutcome,
  sessionGoalForText,sessionOfferIds} from '../lib/holistic-support/session-goal-intake.mjs';

const locales=['ru','en','es'];
const explicit=[
  ['ru','Мне нужна системная расстановка','constellations'],
  ['en','I want to book a systemic constellation','constellations'],
  ['es','Quiero reservar una constelación familiar','constellations'],
  ['ru','Хочу на символдраму','imagery'],
  ['en','I need guided imagery therapy','imagery'],
  ['es','Me gustaría terapia de imágenes guiadas','imagery'],
  ['ru','Хочу бесплатный письменный разбор','free-review'],
  ['en','I would like a free written review','free-review'],
  ['es','Quiero una revisión gratuita','free-review'],
  ['ru','Мне нужна бизнес-консультация','business'],
  ['en','I want a business consultation','business'],
  ['es','Quiero consultoría de negocios','business'],
];
test('each named published service maps to its exact pre-existing website option',()=>{
 for(const [locale,text,id] of explicit){
   const result=sessionSecretaryMessage(text,locale);
   assert.equal(result.kind,'service',text);
   assert.equal(result.serviceId,id,text);
   assert.match(result.reply,/запис|book|reserva/i);
   assert.ok(Object.keys(result).every(k=>['kind','serviceId','reply'].includes(k)));
 }
});

test('a situation/feeling is NOT an inferred service or an opt-in',()=>{
 for(const [locale,text,goal] of [
   ['ru','У меня конфликты в отношениях','relationships'],
   ['en',"I keep arguing with my partner",'relationships'],
   ['es','Tengo problemas con mi pareja','relationships'],
   ['ru','У меня стресс на работе','wellbeing'],
 ]){
   const result=sessionSecretaryMessage(text,locale);
   assert.equal(result.kind,'continue',text);
   assert.ok(result.serviceId==null);
   assert.equal(sessionGoalForText(text),goal);
 }
});

test('natural-language corrections replace a rejected service without assuming dual consent',()=>{
 for(const [locale,text,chosen] of [
  ['ru','Не расстановки, а символдраму','imagery'],
  ['en','Not constellations, I want guided imagery therapy','imagery'],
  ['es','No quiero constelaciones, prefiero terapia de imágenes guiadas','imagery'],
 ]){
   const r=sessionSecretaryMessage(text,locale);
   assert.equal(r.kind,'service',text);
   assert.equal(r.serviceId,chosen);
 }
 for(const [locale,text] of [
   ['ru','Не хочу расстановки'],
   ['en','Not interested in constellations'],
   ['es','No quiero constelaciones'],
 ]){
   const r=sessionSecretaryMessage(text,locale);
   assert.equal(r.kind,'no_booking',text);
   assert.equal(r.serviceId,undefined);
 }
});

test('uncertain or mixed services produce ONE clarification, not an invented selection',()=>{
 for(const locale of locales){
   const mixed=locale==='ru'?'Хочу расстановку и символдраму':
     locale==='es'?'Quiero constelaciones y terapia de imágenes guiadas':
       'I want constellations and guided imagery therapy';
   const r=sessionSecretaryMessage(mixed,locale);
   assert.equal(r.kind,'ambiguous',mixed);
   assert.equal(r.serviceId,undefined);
   assert.equal((r.reply.match(/[?？]/gu)||[]).length,1);
 }
});

test('opt-out, no-booking and factual interruptions are brief and do not advance intake',()=>{
 const cases=[
  ['ru','не сейчас','stop'],['en','not now','stop'],['es','ahora no','stop'],
  ['ru','не хочу записываться','no_booking'],
  ['en',"I don't want to book",'no_booking'],
  ['es','No quiero reservar','no_booking'],
  ['ru','привет','greeting'],
  ['en','hello','greeting'],
  ['es','hola','greeting'],
  ['ru','другая тема','topic'],
  ['en','change topic','topic'],
  ['es','cambiar de tema','topic'],
  ['ru','Сколько стоит консультация?','price'],
  ['en','How much does it cost?','price'],
  ['es','¿Cuánto cuesta?','price'],
  ['ru','Есть ли свободное время завтра?','availability'],
  ['en','Are there appointments available?','availability'],
  ['es','¿Hay horarios disponibles?','availability'],
  ['ru','Зачем фото?','photo'],
  ['en','Why a photo?','photo'],
  ['es','¿Por qué la foto?','photo'],
  ['ru','В смысле?','confused'],
  ['en','What do you mean?','confused'],
  ['es','No entiendo','confused'],
  ['ru','Хочу записаться','booking'],
  ['ru','Хочу консультацию','booking'],
  ['en','I want to book','booking'],
  ['en','I want a consultation','booking'],
  ['es','Quiero reservar','booking'],
  ['es','Quiero una consulta','booking'],
 ];
 for(const [locale,text,kind] of cases){
   const r=sessionSecretaryMessage(text,locale);
   assert.equal(r.kind,kind,text);
   assert.equal(r.serviceId,undefined,text);
   assert.ok(r.reply?.length<220,text);
   assert.doesNotMatch(r.reply,/оплат[аы] (?:успеш|подтвержд)|appointment confirmed|pago confirmado/i);
 }
});

test('follow-up questions depend on missing client outcome, not magic word count',()=>{
 for(const input of ['Хочу разобраться в отношениях','I want support at work',
  'Quiero comprender mi situación']){
   assert.equal(sessionHasOutcome(input),true,input);
 }
 for(const input of ['Отношения','Work', 'Stress and anxiety']){
   assert.equal(sessionHasOutcome(input),false,input);
 }
 assert.equal(sessionOfferIds('business').length,2);
 assert.ok(sessionOfferIds('relationships').includes('constellations'));
 assert.equal(sessionSecretaryMessage('/stop','ru').kind,'stop');
 assert.equal(sessionSecretaryMessage('??','en').kind,'confused');
});

test('web Sessions uses signed-page links only and stays separate from psychologist consent',()=>{
 const ui=readFileSync(new URL('../components/holistic-agent-chat.tsx',import.meta.url),'utf8');
 const api=readFileSync(new URL('../app/api/holistic-agent/turn/route.js',import.meta.url),'utf8');
 assert.match(ui,/sessionSecretaryMessage\(text,turnLocale\)/);
 assert.match(ui,/intent\.kind==="stop"\|\|intent\.kind==="no_booking"\|\|intent\.kind==="topic"/);
 assert.match(ui,/!\(projectFlow==="sessions"&&sessionStep\)/);
 assert.match(ui,/intent\.kind==="service"/);
 assert.match(ui,/option\.id===intent\.serviceId/);
 assert.match(ui,/setSessionOffers\(\[chosen\]\)/);
 assert.match(ui,/sessionHasOutcome\(text\)/);
 assert.match(ui,/if\(page\)setPageHelpLink/);
 assert.doesNotMatch(ui,/sessionStep==="goal"&&\(!goal\|\|text\.length<36\)/);
 assert.match(ui,/option\.href\?\.startsWith\("\/"\)/);
 assert.match(ui,/psychInterview==="pending"/);
 assert.match(ui,/localOnly:true/);
 assert.match(api,/requireSameOrigin\(request,config\)/);
 for(const locale of locales){
   const c=sessionSecretaryCopy(locale);
   assert.match(c.price,/price|стоимост|precios/i);
   assert.match(c.selection,/no se ha|пока|nothing has/i);
 }
});

test('price question about named service retains verified page hint but does not select or book',()=>{
 for(const [locale,text,id] of [
  ['ru','Сколько стоит системная расстановка?','constellations'],
  ['en','How much does guided imagery therapy cost?','imagery'],
  ['es','¿Cuánto cuesta una consulta de negocios?','business'],
 ]){
   const r=sessionSecretaryMessage(text,locale);
   assert.equal(r.kind,'price',text);
   assert.equal(r.serviceId,id,text);
   assert.match(r.reply,/карточ|page|página/i);
   assert.doesNotMatch(r.reply,/booked|reserved|забронировал|reservado/i);
 }
});
