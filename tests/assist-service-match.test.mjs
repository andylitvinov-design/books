import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ASSIST_OFFER_CATALOG, inferAssistPreferences, nextAssistQuestion, rankAssistOffers} from "../lib/assist/service-match.mjs";
const read = path => readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("only missing questions; human needs channel, video does not",()=>{
  assert.equal(nextAssistQuestion({}),"mode");
  assert.equal(nextAssistQuestion({mode:"human"}),"channel");
  assert.equal(nextAssistQuestion({mode:"human",channel:"online"}),"budget");
  assert.equal(nextAssistQuestion({mode:"video"}),"budget");
  assert.equal(nextAssistQuestion({mode:"video",budget:"any"}),null);
});
test("infer already explicit free online human request without redundant questions",()=>{
  const p=inferAssistPreferences("Хочу онлайн сессию с консультантом бесплатно");
  assert.deepEqual(p,{mode:"human",channel:"online",budget:"free"});
  assert.equal(nextAssistQuestion(p),null);
});
test("personal video preference prioritizes available MyTube",()=>{
  const a=rankAssistOffers("stress",{mode:"video",budget:"free"});
  assert.equal(a[0].id,"mytube");
  assert(a.every(x=>ASSIST_OFFER_CATALOG[x.id].cost==="free"));
});
test("in-person need never promises an online-only service",()=>{
  const a=rankAssistOffers("relationships",{mode:"human",channel:"inperson",budget:"flexible"});
  assert(a.length>0);
  assert(a.every(x=>ASSIST_OFFER_CATALOG[x.id].channels.includes("inperson")));
});
test("rankings deterministic, diverse and no homeopathy medical recommendations",()=>{
  const a=rankAssistOffers("health",{mode:"any",budget:"any"});
  assert.deepEqual(a,rankAssistOffers("health",{mode:"any",budget:"any"}));
  assert(a.slice(0,2).every(x=>["tests","review","therapy"].includes(x.id)));
  assert(!a.some(x=>x.id==="homeopathy"));
});
test("negation never reverses a stated preference",()=>{
  assert.equal(inferAssistPreferences("Не хочу видео, нужна помощь с человеком").mode,"human");
  assert.equal(inferAssistPreferences("Не хочу очно, можно заочно").channel,"async");
});
test("mobile page wires all localized questions while preserving crisis and guest privacy",()=>{
  const component=read("components/services-assist-mobile.tsx");
  for(const key of ["inferAssistPreferences","nextAssistQuestion","rankAssistOffers","data-assist-recommendation","urgent.test(selection.text)","setPreferences"]){
    assert(component.includes(key),key);
  }
  assert.equal((component.match(/questions:\{/g)||[]).length,3);
  assert(!/localStorage|fetch\(|sendBeacon|analytics\.track/.test(component));
});
