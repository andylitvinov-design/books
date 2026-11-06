import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ruleConversationReply,RULE_CONVERSATION_VERSION} from "../lib/holistic-support/rule-conversation.mjs";
import {explainUserQuestion} from "../lib/holistic-support/guide-dialogue.mjs";
import {prepareNaturalDialogue,finishNaturalDialogue} from "../lib/holistic-support/natural-dialogue.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const ask=(message,locale="ru",history=[])=>ruleConversationReply({message,locale,history});
const cases=[
 [
  "Привет Ау",
  "en",
  "hello",
  "ru"
 ],
 [
  "Ау",
  "ru",
  "hello"
 ],
 [
  "Hello there",
  "en",
  "hello"
 ],
 [
  "Hola",
  "en",
  "hello",
  "es"
 ],
 [
  "Спасибо",
  "ru",
  "thanks"
 ],
 [
  "Нет",
  "ru",
  "no"
 ],
 [
  "Начать сначала",
  "ru",
  "restart"
 ],
 [
  "Кто ты?",
  "ru",
  "identity"
 ],
 [
  "Ты человек?",
  "ru",
  "identity"
 ],
 [
  "Что умеешь?",
  "ru",
  "capabilities"
 ],
 [
  "Можно по-русски?",
  "en",
  "language",
  "ru"
 ],
 [
  "Сколько стоит видео?",
  "ru",
  "price"
 ],
 [
  "Это бесплатно?",
  "ru",
  "price"
 ],
 [
  "Конфиденциальность переписки",
  "ru",
  "privacy"
 ],
 [
  "Как войти в кабинет?",
  "ru",
  "login"
 ],
 [
  "Не работает чат",
  "ru",
  "technical"
 ],
 [
  "Не отвечает бот",
  "ru",
  "technical"
 ],
 [
  "Хочу создать видео про отношения",
  "ru",
  "video_start"
 ],
 [
  "Как построить сценарий ролика?",
  "ru",
  "video_story"
 ],
 [
  "Что такое видеотерапия?",
  "ru",
  "video_definition"
 ],
 [
  "Сколько сцен нужно в видео?",
  "ru",
  "video_scenes"
 ],
 [
  "Можно видео без музыки?",
  "ru",
  "video_audio"
 ],
 [
  "Сколько минут должно длиться видео?",
  "ru",
  "video_length"
 ],
 [
  "Где моё видео?",
  "ru",
  "video_status"
 ],
 [
  "Отправь ролик в Telegram",
  "ru",
  "video_delivery"
 ],
 [
  "Как скачать видео?",
  "ru",
  "video_download"
 ],
 [
  "Помоги подобрать медитацию",
  "ru",
  "meditation_start"
 ],
 [
  "Хочу свою личную медитацию",
  "ru",
  "meditation_custom"
 ],
 [
  "Как послушать медитацию",
  "ru",
  "meditation_listen"
 ],
 [
  "Голос в медитации",
  "ru",
  "meditation_voice"
 ],
 [
  "Сколько минут для медитации?",
  "ru",
  "meditation_duration"
 ],
 [
  "Хочу спать",
  "ru",
  "sleep"
 ],
 [
  "Меня тревожит работа",
  "ru",
  "stress"
 ],
 [
  "Мало энергии",
  "ru",
  "tired"
 ],
 [
  "Мне одиноко",
  "ru",
  "relationship"
 ],
 [
  "Не хватает уверенности",
  "ru",
  "confidence"
 ],
 [
  "Хочу попробовать Рейки",
  "ru",
  "reiki"
 ],
 [
  "Нужен ритуал",
  "ru",
  "ritual"
 ],
 [
  "Найди курс",
  "ru",
  "course"
 ],
 [
  "Хочу пройти тест",
  "ru",
  "test"
 ],
 [
  "Как понять баллы теста?",
  "ru",
  "results"
 ],
 [
  "Нужен личный разбор ситуации",
  "ru",
  "analysis"
 ],
 [
  "Где мой заказ?",
  "ru",
  "orders"
 ],
 [
  "Поговорить с мастером",
  "ru",
  "human_help"
 ],
 [
  "Как записаться на сессию?",
  "ru",
  "booking"
 ],
 [
  "Мне нужен план для работы",
  "ru",
  "work"
 ],
 [
  "Не вижу смысла жизни",
  "ru",
  "purpose"
 ],
 [
  "Что посоветуешь?",
  "ru",
  "uncertain"
 ],
 [
  "Не понимаю",
  "ru",
  "confused"
 ],
 [
  "I'd like a meditation",
  "en",
  "meditation_start",
  "en"
 ],
 [
  "Where is my video render?",
  "en",
  "video_status",
  "en"
 ],
 [
  "How many scenes for a video?",
  "en",
  "video_scenes",
  "en"
 ],
 [
  "What can you do?",
  "en",
  "capabilities",
  "en"
 ],
 [
  "I am lonely",
  "en",
  "relationship",
  "en"
 ],
 [
  "I feel stressed",
  "en",
  "stress",
  "en"
 ],
 [
  "Quiero crear un video",
  "es",
  "video_start",
  "es"
 ],
 [
  "Como descargar el video",
  "es",
  "video_download",
  "es"
 ],
 [
  "Me siento cansada",
  "es",
  "tired",
  "es"
 ],
 [
  "Necesito una meditacion",
  "es",
  "meditation_start",
  "es"
 ],
 [
  "Cuanto cuesta?",
  "es",
  "price",
  "es"
 ],
 [
  "Hola",
  "es",
  "hello",
  "es"
 ],
 [
  "10 минут",
  "ru",
  "video_minutes",
  null,
  [
   {
    "role": "user",
    "text": "Хочу создать видео"
   }
  ]
 ],
 [
  "10 минут",
  "ru",
  "meditation_minutes",
  null,
  [
   {
    "role": "user",
    "text": "Помоги подобрать медитацию"
   }
  ]
 ],
 [
  "Про любовь",
  "ru",
  "video_topic",
  null,
  [
   {
    "role": "user",
    "text": "Хочу видео"
   }
  ]
 ],
 [
  "Да",
  "ru",
  "video_context",
  null,
  [
   {
    "role": "user",
    "text": "Хочу видео"
   }
  ]
 ],
 [
  "Да",
  "ru",
  "meditation_context",
  null,
  [
   {
    "role": "user",
    "text": "Хочу медитацию"
   }
  ]
 ],
 [
  "Спокойствие",
  "ru",
  "video_emotion",
  null,
  [
   {
    "role": "user",
    "text": "Хочу видео"
   }
  ]
 ],
 [
  "Спокойствие",
  "ru",
  "meditation_emotion",
  null,
  [
   {
    "role": "user",
    "text": "Хочу медитацию"
   }
  ]
 ],
 [
  "Медитацию",
  "ru",
  "meditation_start",
  null,
  [
   {
    "role": "user",
    "text": "Хочу видео"
   }
  ]
 ]
];

test("dictionary v2 covers 50+ meaningful intents and RU/EN/ES free-form utterances",()=>{
 assert.equal(RULE_CONVERSATION_VERSION,"hh-rule-conversation-v2");
 assert.ok(cases.length>=65);
 const seen=new Set;
 for(const [message,locale,expected,language,history] of cases){
   const reply=ask(message,locale,history||[]);
   assert.equal(reply?.id,expected,message);
   assert.equal(reply.locale,language||locale,message+" locale");
   assert.equal(reply.source,"reviewed-rules",message);
   assert.ok(reply.reply.length>=20&&reply.reply.length<500,message+" quality");
   assert.ok(!reply.reply.includes(message)&&reply.reply.length<500 || reply.reply.length>=20,
     "never echo a long private utterance");
   seen.add(reply.id);
 }
 assert.ok(seen.size>=43,"meaningfully distinct conversation paths");
});

test("short context never treats an assistant reply as user intent, and respects reset",()=>{
 const video=[{role:"user",text:"Хочу создать видео"}];
 const meditation=[{role:"user",text:"Помоги подобрать медитацию"}];
 assert.equal(ask("10 минут","ru",video)?.id,"video_minutes");
 assert.equal(ask("10 минут","ru",meditation)?.id,"meditation_minutes");
 assert.equal(ask("Да","ru",video)?.id,"video_context");
 assert.equal(ask("Да","ru",meditation)?.id,"meditation_context");
 assert.equal(ask("Про любовь","ru",video)?.id,"video_topic");
 const more=[...video,{role:"assistant",text:"Расскажите о смысле"},{role:"user",text:"10 минут"}];
 assert.equal(ask("Спокойствие","ru",more)?.id,"video_emotion");
 assert.equal(ask("Спокойствие","ru",[...meditation,{role:"user",text:"10 минут"}])?.id,"meditation_emotion");
 assert.notEqual(ask("10 минут","ru",[{role:"assistant",text:"Хочу видео"}])?.id,"video_minutes");
 assert.notEqual(ask("Про любовь","ru",[...video,{role:"user",text:"Нет"}])?.id,"video_topic");
 assert.equal(ask("Медитацию","ru",video)?.id,"meditation_start",
    "new explicit medium overrides previous choice");
});

test("unrecognized prompts respond gently; no fabricated media or side effects",()=>{
 assert.equal(ask("Как написать сценарий ролика?")?.id,"video_story");
 assert.equal(ask("Сцены для видео")?.id,"video_scenes");
 assert.equal(ask("Сколько стоит видеоролик?")?.id,"price");
 assert.equal(ask("Жёлтый летающий слон")?.id,"generic");
 assert.equal(ask(""),null);
 assert.equal(ask("..."),null);
 assert.deepEqual(ask("Хочу видео"),ask("Хочу видео"));
 const unknown=ask("x".repeat(5000));
 assert.ok(unknown?.reply.length<500);
 const code=read("lib/holistic-support/rule-conversation.mjs");
 assert.doesNotMatch(code,/\bfetch\(|XMLHttpRequest|localStorage|sessionStorage|process\.env|createBooking/);
});

test("safety/policy priority and external model consent remain enforced",async()=>{
 for(const unsafe of ["Я хочу умереть","I want to die","Quiero morir"]){
   assert.equal(ask(unsafe),null,unsafe);
 }
 for(const state of ["safety_handoff","human_review","unavailable"]){
   assert.equal(explainUserQuestion("Подбери медитацию","ru",{status:state}),null,state);
 }
 assert.equal(explainUserQuestion("Неожиданный неизвестный вопрос","ru",{status:"no_match"}),null);
 const reply=explainUserQuestion("Подбери медитацию","ru",{status:"clarify"},[]);
 assert.equal(reply,ask("Подбери медитацию")?.reply);
 const envelope=prepareNaturalDialogue({locale:"ru",message:"Подбери медитацию",
   decision:{status:"clarify",message:reply},channel:"none"});
 const finished=await finishNaturalDialogue(envelope);
 assert.equal(finished.text,reply);
 assert.equal(finished.modelUsed,false);
});

test("server-side quick rules run only after rate/safety/verified owner",()=>{
 const route=read("app/api/holistic-agent/turn/route.js");
 const origin=route.indexOf("requireSameOrigin(request,config)");
 const auth=route.indexOf("await auth.verified()");
 const input=route.indexOf("const body = inputOf(await readBody");
 const rate=route.indexOf('await consumeRate(config,{op:"holistic-agent-turn"');
 const safety=route.indexOf("const safety = preflight");
 const fast=route.indexOf("const fastRule=");
 assert.ok(origin>=0&&origin<auth&&auth<input&&input<rate&&rate<safety&&safety<fast,
   "never send an unverified/unscreened answer");
 assert.ok(route.includes('body.mode==="rules"&&safety.status==="clear"&&!recentUnsafe'));
 assert.ok(route.includes("if(fastRule&&FAST_RULE_IDS.has(fastRule.id))"));
 assert.ok(route.includes('modelUsed:false'));
 assert.ok(route.includes('suggestions:[],usedSavedTestEvidence:false,usedSavedVideoHistory:false'));
 assert.ok(route.includes("buildHolisticGuidedTurn("),"canonical catalog remains");
 assert.ok(route.includes('if(body.mode!=="rules"&&!experimentalEnabled)'));
 assert.ok(route.includes("ownedInferenceConsent"));
 assert.ok(route.includes('return {status:"urgent"}'));
});
