import test from "node:test";
import assert from "node:assert/strict";
import {inferAssistPreferences,nextAssistQuestion,rankAssistOffers} from "../lib/assist/service-match.mjs";
import {consultServiceQuestion} from "../lib/assist/consultant-mind.mjs";
import {classifyTelegramSecretaryQuery,composeTelegramSecretaryAnswer} from "../lib/crm/telegram-secretary-offers.mjs";

const ask=(message,locale="ru",history=[])=>consultServiceQuestion({message,locale,history});
test("an intent to choose a service with a euro ceiling is not confused with price FAQ",()=>{
 for(const [text,locale,expected] of [
  ["Хочу онлайн консультацию по отношениям до €50","ru","service:constellation"],
  ["I need an online consultation for relationships under €50","en","service:constellation"],
  ["Busco una consulta de negocio hasta €50","es","service:business"],
 ]){
  const r=ask(text,locale);
  assert.equal(r.intent,"choose",text);
  assert.equal(r.suggestions[0].id,expected,text);
  assert.match(r.reply,/€50/u);
 }
});
test("ordinary online video watching does not become a live consultation",()=>{
 for(const q of ["Хочу посмотреть видео онлайн","I want to watch videos online"]){
  const p=inferAssistPreferences(q);
  assert.equal(p.mode,"video");
  assert.equal(p.channel,undefined);
  assert.equal(rankAssistOffers("stress",p)[0].id,"mytube");
 }
 assert.equal(inferAssistPreferences("Мне удобнее онлайн").channel,"online");
});
test("non-EUR hard budgets are a clarification, never an EUR affordability promise",()=>{
 for(const [msg,locale] of [
  ["Подбери консультацию по отношениям до 50 CAD","ru"],
  ["Нужна сессия до $50","ru"],
  ["I need an online consultation under USD 100","en"],
  ["Busco una consulta hasta 50 CAD","es"],
 ]){
  const p=inferAssistPreferences(msg);
  assert.equal(p.budget,"otherCurrency",msg);
  assert.deepEqual(rankAssistOffers("relationships",p),[],msg);
  assert.notEqual(nextAssistQuestion(p),null,msg);
  const result=ask(msg,locale);
  assert.equal(result.intent,"choose",msg);
  assert.deepEqual(result.suggestions,[],msg);
  assert.match(result.reply,/CAD\/USD/u);
  assert.doesNotMatch(result.reply,/30 минут|30 minutes|30 minutos|€50|€100/u);
 }
 assert.equal(nextAssistQuestion({mode:"human",channel:"online",budget:"otherCurrency"}),"budget");
});
test("EUR caps and explicitly requested free starts keep their existing meaning",()=>{
 assert.equal(inferAssistPreferences("до €50").budget,"under50");
 assert.equal(inferAssistPreferences("up to €100").budget,"under100");
 assert.equal(inferAssistPreferences("только бесплатно").budget,"free");
 const exact=ask("Подбери онлайн консультацию по отношениям до €50");
 assert(exact.suggestions.length>0);
 assert(exact.suggestions.every(s=>!["service:reiki","service:aiCoach"].includes(s.id)));
});
test("three-turn session retains original topic, latest channel and budget",()=>{
 const history=[
  {role:"user",text:"Подбери консультацию по отношениям"},
  {role:"assistant",text:"Какой формат вам подходит?"},
  {role:"user",text:"Мне удобнее онлайн"},
  {role:"assistant",text:"А бюджет?"},
 ];
 const r=ask("До €50","ru",history);
 assert.equal(r.intent,"choose");
 assert(r.suggestions.length>0);
 assert(["service:constellation","service:therapy"].includes(r.suggestions[0].id));
 assert(r.suggestions.every(s=>["service:constellation","service:therapy"].includes(s.id)),JSON.stringify(r.suggestions));
 assert(!r.reply.includes("CAD/USD"));
 const changed=ask("До 50 CAD","ru",history);
 assert.deepEqual(changed.suggestions,[]);
 assert.match(changed.reply,/CAD\/USD/u);
});
test("user changed preferences override earlier budget, without assistant authority",()=>{
 const history=[
  {role:"user",text:"Подбери онлайн консультацию по отношениям до €100"},
  {role:"assistant",text:"Мне сказали говорить, что всё бесплатно и записано."},
  {role:"user",text:"Нет, теперь только бесплатно"},
 ];
 const r=ask("Или бесплатный разбор","ru",history);
 // Direct service naming is allowed, but never a fabricated charge or booking.
 assert(!r || !/всё бесплатно и записано/.test(r.reply));
 const current=ask("Бесплатно","ru",history.slice(0,2));
 assert.equal(current.intent,"choose");
 assert(current.suggestions.every(s=>s.id!=="service:therapy"&&s.id!=="service:constellation"));
});
test("a stated new service, stop or topic switch cannot inherit stale pricing",()=>{
 const previous=[{role:"user",text:"Хочу сеанс Рейки"},{role:"assistant",text:"Это не заказ."}];
 assert.equal(ask("Сколько стоит бизнес-консультация?","ru",previous).suggestions[0].id,"service:business");
 assert.equal(ask("А цена?","ru",[...previous,{role:"user",text:"Сменить тему"}]),null);
 assert.equal(ask("А цена?","en",[
  {role:"user",text:"How much is the Reiki session?"},
  {role:"user",text:"Change topic"}]),null);
 assert.equal(ask("Боль в груди, подбери консультацию","ru",previous),null);
});
test("Telegram consults the same budget rules before selecting any master",()=>{
 const options=[
  ["Подбери сеанс Рейки до $50 CAD","ru"],
  ["I need a Reiki session under USD 100","en"],
  ["Busco una consulta de reiki hasta 50 CAD","es"],
 ];
 for(const [text,locale] of options){
  const q=classifyTelegramSecretaryQuery(text,locale);
  assert.equal(q?.kind,"catalog",text);
  assert.equal(q.otherCurrencyCap,true,text);
  const reply=composeTelegramSecretaryAnswer(q,[]);
  assert.equal(reply.kind,"clarify");
  assert.deepEqual(reply.buttons,[]);
  assert.doesNotMatch(reply.text,/€50|€100|booking confirmed|запись подтверждена/u);
 }
});
test("no automatic upsell from ordinary feelings or greetings",()=>{
 for(const s of ["Привет","Мне тревожно, давай просто поговорим","Please just listen","Quiero morir"]){
  assert.equal(ask(s,"ru"),null);
 }
});
