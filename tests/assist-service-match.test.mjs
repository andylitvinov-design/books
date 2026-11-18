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
  const cards=read("components/assist-top-recommendations.tsx");
  assert(cards.includes("data-assist-recommendation"));
  for(const key of ["inferAssistPreferences","nextAssistQuestion","rankAssistOffers","urgent.test(selection.text)","setPreferences"]){
    assert(component.includes(key),key);
  }
  assert.equal((component.match(/questions:\{/g)||[]).length,3);
  assert(!/localStorage|fetch\(|sendBeacon|analytics\.track/.test(component));
});

test("an explicit human, video, AI or self-guided choice never recommends another interaction",()=>{
  for(const [focus,prefs] of [
    ["relationships",{mode:"human",budget:"free"}],
    ["stress",{mode:"video",budget:"free"}],
    ["work",{mode:"ai",budget:"flexible"}],
    ["stress",{mode:"self",budget:"any"}],
  ]) {
    const ranked=rankAssistOffers(focus,prefs);
    assert(ranked.length>0);
    for(const suggestion of ranked) assert(ASSIST_OFFER_CATALOG[suggestion.id].modes.includes(prefs.mode),suggestion.id);
  }
});
test("online, in-person, asynchronous and free do not claim unsupported options",()=>{
  assert.deepEqual(rankAssistOffers("stress",{mode:"human",channel:"online",budget:"free"}),[]);
  assert(rankAssistOffers("relationships",{mode:"human",channel:"async",budget:"free"}).every(x=>
    ASSIST_OFFER_CATALOG[x.id].channels.includes("async")&&ASSIST_OFFER_CATALOG[x.id].cost==="free"));
  assert(rankAssistOffers("work",{mode:"human",channel:"inperson",budget:"flexible"}).every(x=>
    ASSIST_OFFER_CATALOG[x.id].channels.includes("inperson")));
});
test("RU EN ES explicit formats and prices skip already answered questions",()=>{
  const inputs=[
    ["Мне нужна бесплатная онлайн консультация",{budget:"free",channel:"online",mode:"human"}],
    ["Хочу онлайн сессию с консультантом бесплатно",{budget:"free",channel:"online",mode:"human"}],
    ["video call under €50",{budget:"under50",channel:"online",mode:"human"}],
    ["Quiero una consulta por escrito, gratis",{budget:"free",channel:"async",mode:"human"}],
    ["Хочу посмотреть видео бесплатно",{budget:"free",mode:"video"}],
  ];
  for(const [input,want] of inputs) {
    const preferences=inferAssistPreferences(input);
    assert.deepEqual(preferences,want,input);
    if(preferences.budget) assert.equal(nextAssistQuestion(preferences),null,input);
  }
});
test("negated free and video requests are not interpreted positively",()=>{
  assert.notEqual(inferAssistPreferences("Не хочу бесплатно, только с человеком").budget,"free");
  assert.notEqual(inferAssistPreferences("Not free, I want to talk to a specialist").budget,"free");
  assert.equal(inferAssistPreferences("Не хочу видео, нужна консультация").mode,"human");
  assert.equal(inferAssistPreferences("Не хочу очно, можно заочно").channel,"async");
});
test("the default three stress cards stay stable for in-flight Assist browser acceptance",()=>{
  assert.deepEqual(rankAssistOffers("stress",{}).map(x=>x.id),["mytube","tests","aiCoach"]);
});
