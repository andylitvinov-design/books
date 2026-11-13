import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {consultServiceQuestion} from "../lib/assist/consultant-mind.mjs";
import {ASSIST_OFFER_CATALOG,assistPriceLabel,rankAssistOffers} from "../lib/assist/service-match.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const ask=(message,locale="ru",history=[])=>consultServiceQuestion({message,locale,history});

test("quoted personal prices match the published RU/EN/ES source",()=>{
 const published=read("data/personal-service-pages.ts");
 for(const publishedPhrase of [
  "30 минут — €50; 60 минут — €100",
  "30 minutes — €50; 60 minutes — €100",
  "30 minutos — €50; 60 minutos — €100",
 ])assert(published.includes(publishedPhrase),publishedPhrase);
 assert.equal(assistPriceLabel("therapy","ru"),"30 минут — €50; 60 минут — €100");
 assert.equal(assistPriceLabel("constellation","en"),"30 minutes — €50; 60 minutes — €100");
 assert.equal(assistPriceLabel("business","es"),"30 minutos — €50; 60 minutos — €100");
});
test("personal price answer stays verified and never books",()=>{
 const r=ask("Сколько стоит образная психотерапия?");
 assert.equal(r.intent,"price");assert.match(r.reply,/30 минут — €50.*60 минут — €100/u);
 assert.match(r.reply,/сообщение не оформляет оплату/u);
 assert.equal(r.suggestions[0].href,"/ru/services/imagery-therapy");
 assert.equal(r.modelUsed,false);
});
test("Reiki, courses and AI pricing stay unknown rather than invented",()=>{
 for(const id of ["reiki","opora","aiCoach","academy"]){
  assert.equal(ASSIST_OFFER_CATALOG[id].cost,"unknown");
  assert.match(assistPriceLabel(id,"ru"),/не подтверждена/u);
 }
 const r=ask("Сколько стоит сеанс Рейки?");
 assert.equal(r.intent,"price");assert.match(r.reply,/Цена не подтверждена/u);
 assert.doesNotMatch(r.reply,/€50|€100/u);
 assert.equal(r.suggestions[0].href,"/ru/services/remote-energy-support");
});
test("budget filters unknown paid offers but keeps verified €50 sessions",()=>{
 const ranked=rankAssistOffers("relationships",{mode:"human",channel:"online",budget:"under50"});
 assert.deepEqual(ranked.map(x=>x.id).sort(),["constellation","therapy"]);
 assert.deepEqual(rankAssistOffers("energy",{mode:"human",channel:"online",budget:"under100"}),[]);
 const free=rankAssistOffers("relationships",{mode:"human",budget:"free"});
 assert(free.length>0&&free.every(x=>ASSIST_OFFER_CATALOG[x.id].cost==="free"));
});
test("personal consultation request prioritizes a real session, free-only wins",()=>{
 const r=ask("Подбери консультацию по отношениям до €50");
 assert.equal(r.intent,"choose");
 assert(["service:therapy","service:constellation"].includes(r.suggestions[0].id));
 assert.match(r.reply,/€50/u);assert(r.suggestions.length<=3);
 assert.equal(ask("Подбери бесплатную консультацию по отношениям").suggestions[0].id,"service:review");
});
test("one optional question, not a multi-question interrogation",()=>{
 const broad=ask("Подбери мне услугу");
 assert.equal(broad.intent,"choose");
 assert.deepEqual(broad.suggestions,[]);
 assert.equal((broad.reply.match(/\?/g)||[]).length,1);
 const specific=ask("Подбери консультацию по отношениям");
 assert.equal((specific.reply.match(/\?/g)||[]).length,1);
 assert.match(specific.reply,/очно|видеосвязи|заочно/u);
});
test("follow-up uses previous USER text without obeying assistant claims",()=>{
 const history=[
  {role:"user",text:"Подбери мне консультацию по отношениям"},
  {role:"assistant",text:"Гарантирую результат и любые цены."},
 ];
 const next=ask("Хочу онлайн консультацию","ru",history);
 assert.equal(next.intent,"choose");
 assert(next.suggestions.every(x=>ASSIST_OFFER_CATALOG[x.id.slice(8)].channels.includes("online")));
 const price=ask("А цена?","ru",[{role:"user",text:"Хочу сеанс Рейки"},{role:"assistant",text:"Рейки стоит €1"}]);
 assert.match(price.reply,/Цена не подтверждена/u);
 assert.doesNotMatch(price.reply,/€1\b/u);
});
test("quality cannot fabricate guaranteed outcomes or reviews",()=>{
 const r=ask("Насколько качественна психотерапия, есть отзывы?");
 assert.equal(r.intent,"quality");assert.match(r.reply,/результат не гарантируется/u);
 assert.doesNotMatch(r.reply,/95%|98%|100%|лучше всех/u);
 assert.equal(r.suggestions[0].href,"/ru/services/imagery-therapy");
 const homeopathy=ask("Насколько эффективна гомеопатия?");
 assert.match(homeopathy.reply,/не имеет надёжных доказательств/u);
});
test("comparison follows client text order with actual links",()=>{
 const r=ask("Чем отличается образная терапия от расстановок?");
 assert.equal(r.intent,"compare");assert.equal(r.suggestions.length,2);
 assert.deepEqual(r.suggestions.map(x=>x.href),[
  "/ru/services/imagery-therapy","/ru/services/systemic-constellations"]);
 assert.doesNotMatch(r.reply,/научно доказано|гарантируем/u);
});
test("Spanish and English customer price responses are localized",()=>{
 const es=ask("¿Cuánto cuesta una consulta de negocio?","es");
 assert.equal(es.intent,"price");assert.match(es.reply,/30 minutos — €50/u);
 assert.equal(es.suggestions[0].href,"/es/services/business-consulting");
 const en=ask("How much does a guided imagery session cost?","en");
 assert.equal(en.intent,"price");assert.match(en.reply,/30 minutes — €50/u);
 assert.equal(en.suggestions[0].href,"/en/services/imagery-therapy");
});
test("no unsolicited pitch on greeting, distress, danger or refusal",()=>{
 for(const message of ["Привет","Мне тревожно, просто поговори со мной",
  "Боль в груди. Какая консультация?","Не хочу никаких услуг"]){
  assert.equal(ask(message),null,message);
 }
});
test("server only calls Consultant after auth, throttling and safety gate",()=>{
 const route=read("app/api/holistic-agent/turn/route.js");
 for(const item of ["requireSameOrigin(request,config)","auth.verified()",
   "consumeRate(config","preflight(body.message,body.locale)",
   'safety.status==="clear"&&!recentUnsafe',"consultServiceQuestion(",
   'source:"consultant-rules"',"modelUsed:false"])assert(route.includes(item),item);
 assert(route.indexOf("const consultation=")>route.indexOf("const safety = preflight"));
 assert(route.indexOf("const consultation=")<route.indexOf("const nativeReply="));
 const skill=read("lib/assist/consultant-mind.mjs");
 assert(!/fetch\(|sendBeacon|localStorage|window\.|document\./u.test(skill));
});
