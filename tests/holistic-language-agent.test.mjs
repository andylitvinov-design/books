import test from "node:test";
import assert from "node:assert/strict";
import {createLanguageSession,turnLanguageAgent,LANGUAGE_AGENT_VERSION} from "../lib/holistic-support/language-agent.mjs";
const video = {id:"abcdefghijk",title:"Published calm practice",topics:["energy"],sourceLanguage:"en"};
const videoRu = {id:"abcDEF12345",title:"Опубликованная практика",topics:["energy"],sourceLanguage:"ru",durationMinutes:8};
const testRu = {key:"stress-test",title:"Проверка состояния",href:"/ru/client?startTests=stress-test",durationMinutes:3};
const catalog={videos:[video,videoRu],tests:{energy:[testRu]}};
const go=(text,previous=createLanguageSession({locale:"ru"}),override=catalog)=>
  turnLanguageAgent({text,previous,catalog:override});
test("version, default no profile or message persistence",()=>{
  const s=createLanguageSession({locale:"ru"});
  assert.equal(s.version,LANGUAGE_AGENT_VERSION);
  assert.deepEqual(s.excluded,[]);
  assert.equal(JSON.stringify(s).includes("rawUtterance"),false);
});
test("RU explicitly excludes video, asks for audio, and never swaps to video",()=>{
  const r=go("Я устал на работе. Видео не хочу, лучше что-то короткое послушать.");
  assert.equal(r.state.topic,"energy");
  assert.equal(r.state.format,"audio");
  assert.deepEqual(r.state.excluded,["video"]);
  assert.equal(r.status,"no_match");
  assert.deepEqual(r.suggestions,[]);
});
test("EN exclusion and language switching preserve the excluded format",()=>{
  const a=go("I am stressed. No video, please. I'd like some audio.");
  assert.equal(a.state.locale,"en");assert.equal(a.state.format,"audio");
  assert.deepEqual(a.state.excluded,["video"]);
  const b=go("Можно тест до 5 минут",a.state);
  assert.equal(b.state.locale,"ru");assert.equal(b.state.format,"test");
  assert.deepEqual(b.state.excluded,["video"]);
});
test("ES locale and a banned format",()=>{
  const r=go("Estoy estresado, sin video. Quiero audio.");
  assert.equal(r.state.locale,"es");assert.deepEqual(r.state.excluded,["video"]);
  assert.equal(r.state.format,"audio");
});
test("trusted published RU video is offered on topic",()=>{
  const r=go("Я устал. Хочу видео.",createLanguageSession({locale:"ru"}));
  assert.equal(r.status,"recommend");assert.equal(r.suggestions[0].id,"youtube:abcDEF12345");
  assert.equal(r.suggestions[0].videoId,"abcDEF12345");
});
test("duration is an actual strict filter, unknown is not claimed",()=>{
  const r=go("Устал, покажи видео до 5 минут");
  assert.equal(r.state.maxDurationMin,5);
  assert.deepEqual(r.suggestions,[]);
  assert.equal(r.status,"no_match");
});
test("real approved guest test is recommended when permitted",()=>{
  const r=go("Я устал и хочу пройти тест");
  assert.equal(r.status,"recommend");assert.equal(r.suggestions[0].href,"/ru/client?startTests=stress-test");
});
test("invalid test URL and id are refused rather than invented",()=>{
  const r=go("Устал, нужен тест",undefined,{tests:{energy:[
    {key:"bad",title:"unsafe",href:"javascript:alert(1)",durationMinutes:3},
    {key:"good-test",title:"unsafe",href:"/ru/client?startTests=../../secrets",durationMinutes:2},
  ]}});
  assert.equal(r.status,"no_match");assert.deepEqual(r.suggestions,[]);
});
test("unpublished video is not present in approved caller catalog",()=>{
  const r=go("Устал, хочу видео",undefined,{videos:[]});
  assert.deepEqual(r.suggestions,[]);
});
test("no explicit topic asks one clarifying question, not random results",()=>{
  const r=go("Хочу посмотреть видео");
  assert.equal(r.status,"clarify");assert.deepEqual(r.suggestions,[]);
});
test("current topic is retained without storing raw client utterance",()=>{
  const a=go("Отношения",createLanguageSession({locale:"ru"}));
  const b=go("Нужен тест",a.state);
  assert.equal(b.state.topic,"love");assert.equal(b.state.format,"test");
  assert.equal(JSON.stringify(b.state).includes("Отношения"),false);
});
test("explicit new topic wins over the previous topic",()=>{
  const a=go("Интересуют отношения");
  const b=go("Теперь важна работа и деньги",a.state);
  assert.equal(b.state.topic,"money");
});
test("avoid suggested format when client says no to it",()=>{
  const a=go("Я устал, хочу видео");
  const b=go("Не хочу видео, нужен аудиоформат",a.state);
  assert.equal(b.state.format,"audio");assert.deepEqual(b.state.excluded,["video"]);
});
test("explicit permission can un-exclude video",()=>{
  const a=go("Не хочу видео. Нужен тест. Устал");
  const b=go("Теперь можно видео, устал",a.state);
  assert.equal(b.state.format,"video");assert.deepEqual(b.state.excluded,[]);
});
test("goal filter permissions are respected",()=>{
  const r=go("Устал, хочу видео",createLanguageSession({locale:"ru",enabledFormats:["test"]}));
  assert.equal(r.status,"not_permitted");assert.deepEqual(r.suggestions,[]);
});
test("no fallback to paid session with a missing catalog",()=>{
  const r=go("Мне нужна консультация о работе");
  assert.deepEqual(r.suggestions,[]);
  assert.equal(r.status,"no_match");
});
test("stop command never recommends material",()=>{
  const a=go("Хочу видео от усталости");
  const r=go("стоп",a.state);
  assert.equal(r.status,"stopped");assert.deepEqual(r.suggestions,[]);
});
test("crisis in a later chunk is detected",()=>{
  const r=go("Устал. ".repeat(45)+"Хочу покончить с собой.");
  assert.equal(r.status,"safety_handoff");assert.deepEqual(r.suggestions,[]);
  assert.equal(r.allowLocalRewrite,false);
});
test("too long to safety screen fails closed",()=>{
  const r=go("а".repeat(4001));
  assert.equal(r.status,"safety_check_required");assert.deepEqual(r.suggestions,[]);
});
test("RU preferences are session-only flags, never silently persisted",()=>{
  const r=go("Я устал, нужен тест. Говори на ты и коротко");
  assert.equal(r.state.brevity,"short");assert.equal(r.state.address,"informal");
  assert.equal(Object.hasOwn(r.state,"user_id"),false);
});
test("wrong-language video is excluded",()=>{
  const r=go("I am tired, want a video",createLanguageSession({locale:"en"}),{videos:[videoRu]});
  assert.deepEqual(r.suggestions,[]);
});
test("zero enabled formats blocks offers",()=>{
  const r=go("Я устал, хочу тест",createLanguageSession({locale:"ru",enabledFormats:[]}));
  assert.equal(r.status,"not_permitted");
});
test("locale is constrained to supported set",()=>{
  assert.equal(createLanguageSession({locale:"xx"}).locale,"en");
});

test("standalone negative video command blocks older video request",()=>{
  const a=go("Я устал, хочу видео");
  const b=go("Не видео. Лучше аудио.",a.state);
  assert.equal(b.state.format,"audio");
  assert.deepEqual(b.state.excluded,["video"]);
  assert.deepEqual(b.suggestions,[]);
});
test("instead-of A B follows the newer format",()=>{
  const a=go("Устал, вместо видео аудио");
  const b=go("Теперь вместо аудио видео",a.state);
  assert.equal(a.state.format,"audio");
  assert.equal(b.state.format,"video");
});
test("privacy / no content claims on empty verified catalog",()=>{
  const r=go("Я устал, хочу видео",createLanguageSession({locale:"ru"}),{videos:[]});
  assert.equal(r.status,"no_match");assert.deepEqual(r.suggestions,[]);
  assert.equal(Object.hasOwn(r.state,"rawUtterance"),false);
});

test("style controls actually shorten responses without changing recommendations",()=>{
  const formal=go("Я устал, хочу видео");
  const shorter=go("Я устал, хочу видео. Отвечай коротко");
  assert.equal(formal.status,shorter.status);
  assert.deepEqual(formal.suggestions,shorter.suggestions);
  assert.ok(shorter.text.length<formal.text.length);
});
test("informal RU makes the same no-match decision in a less formal voice",()=>{
  const formal=go("Работа, нужна консультация");
  const informal=go("Работа, нужна консультация. Общайся на ты");
  assert.equal(formal.status,informal.status);
  assert.deepEqual(formal.suggestions,informal.suggestions);
  assert.ok(informal.text.includes("тво")||informal.text.includes("тебе"));
});
test("detailed wording leaves verified resource ids unchanged",()=>{
  const short=go("Я устал, хочу видео");
  const detailed=go("Я устал, хочу видео. Объясни подробно");
  assert.equal(detailed.status,short.status);
  assert.deepEqual(detailed.suggestions,short.suggestions);
  assert.ok(detailed.text.length>short.text.length);
});


test("RU correction picks the current career focus, not old relationships",()=>{
  const first=go("Меня беспокоили отношения. Хочу видео");
  const corrected=go("Раньше были отношения, а сейчас работа и деньги. Нужен тест",first.state);
  assert.equal(first.state.topic,"love");
  assert.equal(corrected.state.topic,"money");
  assert.equal(corrected.state.format,"test");
  assert.match(corrected.text,/теперь|новой теме/i);
});
test("EN correction prioritizes the last goal after but now",()=>{
  const first=go("I am stressed and need a video",createLanguageSession({locale:"en"}));
  const corrected=go("I was worried about relationships, but now my work and salary matter. A short test please.",first.state);
  assert.equal(corrected.state.locale,"en");
  assert.equal(corrected.state.topic,"money");
  assert.equal(corrected.state.format,"test");
  assert.match(corrected.text,/new topic/i);
});
test("ES correction prioritizes new work request over old love",()=>{
  const first=go("Quiero un video sobre relaciones",createLanguageSession({locale:"es"}));
  const corrected=go("Antes amor, pero ahora trabajo y dinero. Quiero una prueba.",first.state);
  assert.equal(corrected.state.locale,"es");
  assert.equal(corrected.state.topic,"money");
  assert.equal(corrected.state.format,"test");
  assert.match(corrected.text,/nuevo tema/i);
});
test("15-turn dialogue keeps constraints, changes topic, and never invents resources",()=>{
  const turns=[
    "Я устал, хочу видео",
    "Без видео, нужен тест",
    "Можно тест до 5 минут",
    "Без тестов, хочу аудио",
    "Теперь можно видео, снова энергия",
    "Раньше были отношения, а сейчас работа и деньги. Нужен тест",
    "Без тестов, давай консультацию",
    "Не хочу консультацию, лучше видео",
    "Сейчас отношения, хочу видео",
    "Теперь можно тест, отношения",
    "Коротко, на ты",
    "Сейчас про энергию. Хочу видео",
    "Покажи аудио вместо видео",
    "Нужен просто короткий ответ",
    "стоп",
  ];
  let state=createLanguageSession({locale:"ru"});
  const results=[];
  for(const utterance of turns) {
    const result=go(utterance,state);
    results.push(result);
    state=result.state;
    assert.ok(!JSON.stringify(state).includes(utterance),"raw client message persisted in state");
    for(const item of result.suggestions){
      assert.ok(["youtube:abcDEF12345","test:stress-test"].includes(item.id),
        "Only approved fixture resources can be offered");
    }
  }
  assert.equal(results.length,15);
  assert.equal(results[0].state.topic,"energy");
  assert.equal(results[1].state.format,"test");
  assert.ok(results[1].state.excluded.includes("video"));
  assert.ok(results[3].state.excluded.includes("test"));
  assert.equal(results[4].state.excluded.includes("video"),false);
  assert.equal(results[5].state.topic,"money","Explicit current focus overrides earlier topic");
  assert.equal(results[8].state.topic,"love");
  assert.equal(results[11].state.topic,"energy");
  assert.equal(results[11].state.brevity,"short");
  assert.equal(results[14].status,"stopped");
  assert.deepEqual(results[14].suggestions,[]);
});


test("direct clinical treatment or diagnosis requests route to human review in RU EN ES",()=>{
  for(const [locale,message] of [
    ["ru","Поставь мне диагноз тревожного расстройства"],
    ["en","Please diagnose me with a disorder"],
    ["es","Diagnostícame, por favor"],
  ]) {
    const response=go(message,createLanguageSession({locale}));
    assert.equal(response.status,"human_review",locale);
    assert.equal(response.allowLocalRewrite,false,locale);
    assert.deepEqual(response.suggestions,[],locale);
    assert.ok(response.text.length>30,locale);
  }
  const gentle=go("Я переживаю о работе и ищу мягкую поддержку",createLanguageSession({locale:"ru"}));
  assert.notEqual(gentle.status,"human_review","ordinary support requests should not be blocked");
});
test("clinical review cannot be overridden by request for a video",()=>{
  const response=go("Назначь мне лечение. А потом найди видео",createLanguageSession({locale:"ru"}));
  assert.equal(response.status,"human_review");
  assert.deepEqual(response.suggestions,[]);
});
