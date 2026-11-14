import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyTelegramSecretaryQuery,publishedTelegramServiceOffers,
  composeTelegramSecretaryAnswer} from '../lib/crm/telegram-secretary-offers.mjs';
import {inferAssistPreferences} from '../lib/assist/service-match.mjs';

const sample=(patch={})=>({
 id:'eb4ab8cc-dbc1-4603-b674-42b8cd619bf9',
 slug:'remote-energy-support',active:true,status:'published',
 practitioner_slug:'andy-litvinov',practitioner_active:true,
 practitioner_status:'approved',category:'energy_spiritual',
 offering_type:'session',pricing_mode:'from',confirmed_price:'50.00',currency:'EUR',
 localized_copy:{ru:{title:'Энергетическая поддержка цели'},
  en:{title:'Energy Support'},es:{title:'Apoyo energético'}},
 ...patch,
});
const answer=(message,locale='ru',rows=[])=>{
 const query=classifyTelegramSecretaryQuery(message,locale);
 assert.equal(query?.kind,'catalog',message);
 return composeTelegramSecretaryAnswer(query,rows);
};
const publicOnly=response=>{
 for(const btn of response.buttons){
  assert.match(btn.url,/^https:\/\/holistichouse\.vercel\.app\/(ru|en|es)\//);
  assert(btn.text.length<=48);
  assert.doesNotMatch(btn.url,/[\s<>]/);
 }
 assert(response.buttons.length<=3);
};
test('Telegram Business uses Consultant reply for actual first-party service price',()=>{
 const r=answer('Сколько стоит образная психотерапия?');
 assert.match(r.text,/30 минут — €50/);
 assert.match(r.text,/60 минут — €100/);
 assert.deepEqual(r.buttons.map(x=>x.url),
  ['https://holistichouse.vercel.app/ru/services/imagery-therapy']);
 assert.doesNotMatch(r.text,/отправлена заявка|запись подтверждена/u);
 publicOnly(r);
});
test('published practitioner price overrides generic unknown Reiki price',()=>{
 const r=answer('Сколько стоит сеанс Рейки?','ru',[sample()]);
 assert.match(r.text,/от €50/u);
 assert.doesNotMatch(r.text,/Цена не подтверждена в общем каталоге/u);
 assert.equal(r.buttons[0].url,
  'https://holistichouse.vercel.app/ru/services/andy-litvinov/remote-energy-support');
 publicOnly(r);
});
test('contact or missing price never becomes free or €50',()=>{
 for(const row of [
  sample({pricing_mode:'contact',confirmed_price:null,currency:null}),
  sample({pricing_mode:'fixed',confirmed_price:null}),
 ]){
  const r=answer('Сколько стоит сеанс Рейки?','ru',[row]);
  assert.match(r.text,/Уточняется у специалиста/u);
  assert.doesNotMatch(r.text,/€50|Бесплатно/u);
 }
});
test('source-grounded comparative response supplies both exact pages',()=>{
 const r=answer('Чем отличается образная терапия от расстановок?');
 assert.match(r.text,/образная психотерапия/u);
 assert.match(r.text,/системные расстановки/u);
 assert.deepEqual(r.buttons.map(x=>x.url),[
  'https://holistichouse.vercel.app/ru/services/imagery-therapy',
  'https://holistichouse.vercel.app/ru/services/systemic-constellations'
 ]);
 publicOnly(r);
});
test('quality answer is evidence-aware and never invents reviews',()=>{
 const r=answer('Качество психотерапии, отзывы?');
 assert.match(r.text,/проверяемым отзывам/u);
 assert.match(r.text,/результат не гарантируется/u);
 assert.doesNotMatch(r.text,/98%|100%|5 звёзд|пять звёзд/u);
 assert.equal(r.buttons[0].url,'https://holistichouse.vercel.app/ru/services/imagery-therapy');
});
test('no-goal service request clarifies with ONE question and no generic sale',()=>{
 const r=answer('Подбери мне услугу');
 assert.equal(r.kind,'clarify');
 assert.deepEqual(r.buttons,[]);
 assert.equal((r.text.match(/\?/g)||[]).length,1);
});
test('a EUR €50 ceiling requires fixed verified EUR, not price from €50',()=>{
 const from=answer('Подбери сеанс Рейки до €50','ru',[sample()]);
 assert.equal(from.kind,'no_match');
 assert.deepEqual(from.buttons,[]);
 const fixed=answer('Подбери сеанс Рейки до €50','ru',
  [sample({pricing_mode:'fixed',confirmed_price:'50.00'})]);
 assert.equal(fixed.buttons.length,1);
 assert.match(fixed.text,/€50/u);
 const high=answer('Подбери сеанс Рейки до €50','ru',
  [sample({pricing_mode:'fixed',confirmed_price:'65.00'})]);
 assert.equal(high.kind,'no_match');
 assert.deepEqual(high.buttons,[]);
 const usd=answer('Подбери сеанс Рейки до €50','ru',
  [sample({pricing_mode:'fixed',confirmed_price:'50.00',currency:'USD'})]);
 assert.equal(usd.kind,'no_match');
 assert.deepEqual(usd.buttons,[]);
});
test('only relevant published practitioner offer qualifies for a requested goal',()=>{
 const r=answer('Подбери консультацию по отношениям до €50','ru',
  [sample({pricing_mode:'fixed',confirmed_price:'50.00'})]);
 assert(!r.buttons.some(x=>x.url.includes('/andy-litvinov/remote-energy-support')));
 assert(r.buttons.some(x=>x.url.endsWith('/ru/services/systemic-constellations')));
});
test('CAD and USD ceilings never silently become a euro affordability claim',()=>{
 assert.equal(inferAssistPreferences('до $50 CAD').budget,'otherCurrency');
 assert.equal(inferAssistPreferences('up to USD 100').budget,'otherCurrency');
 assert.equal(inferAssistPreferences('до €50').budget,'under50');
 assert.equal(inferAssistPreferences('up to €100').budget,'under100');
 const r=answer('Подбери сеанс Рейки до $50 CAD','ru',[sample()]);
 assert.equal(r.kind,'clarify');
 assert.deepEqual(r.buttons,[]);
 assert.match(r.text,/CAD\/USD/u);
});
test('catalogue navigation remains for explicit informational video/course requests',()=>{
 for(const [msg,l] of [['Show me videos','en'],['Покажи тесты','ru'],
  ['Quiero un curso','es']]){
  const r=answer(msg,l,[sample()]);
  publicOnly(r);
  assert(!r.buttons.some(x=>x.url.includes('/andy-litvinov/')));
 }
});
test('crisis, STOP and unrelated messages never start a commercial listing',()=>{
 for(const l of ['ru','en','es']){
  const msg=l==='ru'?'Хочу покончить с собой, подбери курс':
   l==='en'?'I want to kill myself, suggest a course':
    'Quiero morir, recomiéndame un curso';
  const q=classifyTelegramSecretaryQuery(msg,l);
  assert.equal(q.kind,'safety');
  assert.equal(composeTelegramSecretaryAnswer(q,[sample()]).buttons.length,0);
 }
 for(const msg of ['/stop','Привет','I feel overwhelmed','Не надо']){
  assert.equal(classifyTelegramSecretaryQuery(msg,'ru'),null,msg);
 }
});
test('unknown, hidden or unapproved listings cannot become client offers',()=>{
 const bad=[sample({active:false}),sample({status:'draft'}),
  sample({practitioner_status:'submitted'}),
  sample({slug:'../private'}),sample({localized_copy:{ru:{title:'<script>fake</script>'}}})];
 for(const row of bad)assert.deepEqual(publishedTelegramServiceOffers([row],'ru'),[]);
});
test('EN and ES first-party service questions use actual localized links',()=>{
 const en=answer('What is the price of guided imagery therapy?','en');
 assert.match(en.text,/30 minutes — €50/u);
 assert.equal(en.buttons[0].url,'https://holistichouse.vercel.app/en/services/imagery-therapy');
 const es=answer('¿Cuánto cuesta una consulta de negocio?','es');
 assert.match(es.text,/30 minutos — €50/u);
 assert.equal(es.buttons[0].url,'https://holistichouse.vercel.app/es/services/business-consulting');
});
