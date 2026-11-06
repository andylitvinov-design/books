import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ruleConversationReply,RULE_CONVERSATION_VERSION} from "../lib/holistic-support/rule-conversation.mjs";
import {explainUserQuestion} from "../lib/holistic-support/guide-dialogue.mjs";
import {prepareNaturalDialogue,finishNaturalDialogue} from "../lib/holistic-support/natural-dialogue.mjs";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const ask=(message,locale="ru",history=[])=>ruleConversationReply({message,locale,history});
const samples=[
 ["Привет Ау","hello","en","ru"],["Ау","hello"],["Hello","hello","en"],
 ["Hola","hello","en","es"],["Спасибо","thanks"],["Пока","bye"],
 ["Начать сначала","restart"],["Нет","no"],["Да","yes"],
 ["Ты человек?","identity"],["Что умеешь?","capabilities"],
 ["Можно по-русски?","language","en","ru"],["Это бесплатно?","price"],
 ["Конфиденциальность","privacy"],["Как войти в кабинет?","login"],
 ["Не работает чат","technical"],["Где мой заказ?","orders"],
 ["Хочу создать видео про отношения","video_start"],
 ["Как построить сценарий ролика?","video_story"],
 ["Что такое видеотерапия?","video_definition"],
 ["Сколько сцен нужно в видео?","video_scenes"],
 ["Можно видео без музыки?","video_audio"],
 ["Какова длительность видео?","video_length"],
 ["Где моё видео?","video_status"],
 ["Отправь ролик в Telegram","video_delivery"],
 ["Как скачать видео?","video_download"],
 ["Помоги подобрать медитацию","meditation_start"],
 ["Хочу свою личную медитацию","meditation_custom"],
 ["Как послушать медитацию?","meditation_listen"],
 ["Голос в медитации","meditation_voice"],
 ["Сколько минут для медитации?","meditation_duration"],
 ["Хочу спать","sleep"],["Меня тревожит работа","stress"],
 ["Мало энергии","tired"],["Мне одиноко","relationship"],
 ["Не хватает уверенности","confidence"],["Найди курс","course"],
 ["Хочу попробовать Рейки","reiki"],["Нужен ритуал","ritual"],
 ["Хочу пройти тест","test"],["Как понять баллы теста?","results"],
 ["Нужен личный разбор ситуации","analysis"],
 ["Поговорить с мастером","human_help"],
 ["Как записаться на сессию?","booking"],
 ["Мне нужен план для работы","work"],["Не вижу смысла жизни","purpose"],
 ["Что посоветуешь?","uncertain"],["Не понимаю","confused"],
 ["I'd like a meditation","meditation_start","en"],
 ["Where is my video render?","video_status","en"],
 ["How many scenes for a video?","video_scenes","en"],
 ["What can you do?","capabilities","en"],
 ["I am lonely","relationship","en"],["I feel stressed","stress","en"],
 ["Quiero crear un video","video_start","es"],
 ["Como descargar el video","video_download","es"],
 ["Me siento cansada","tired","es"],
 ["Necesito una meditacion","meditation_start","es"],
 ["Cuanto cuesta?","price","es"],
 ["Hola","hello","es"]
];

test("broad no-model dictionary: natural questions RU EN ES",()=>{
 assert.equal(RULE_CONVERSATION_VERSION,"hh-rule-conversation-v2");
 assert.ok(samples.length>=55);
 for(const [phrase,intent,locale="ru",responseLocale=locale] of samples){
  const result=ask(phrase,locale);
  assert.equal(result?.id,intent,phrase);
  assert.equal(result.locale,responseLocale,phrase+": language");
  assert.ok(result.reply.length>18&&result.reply.length<500,phrase);
  assert.equal(result.source,"reviewed-rules");
 }
});

test("short conversational replies inherit a verified user medium, not assistant suggestions",()=>{
 const video=[{role:"user",text:"Хочу создать видео"}];
 const meditation=[{role:"user",text:"Помоги подобрать медитацию"}];
 assert.equal(ask("10 минут","ru",video)?.id,"video_minutes");
 assert.equal(ask("10 минут","ru",meditation)?.id,"meditation_minutes");
 assert.equal(ask("Да","ru",video)?.id,"video_context");
 assert.equal(ask("Да","ru",meditation)?.id,"meditation_context");
 assert.equal(ask("Про любовь","ru",video)?.id,"video_topic");
 const more=[...video,{role:"assistant",text:"В каком настроении?"},{role:"user",text:"10 минут"}];
 assert.equal(ask("Спокойствие","ru",more)?.id,"video_emotion");
 assert.equal(ask("Спокойствие","ru",[...meditation,{role:"user",text:"10 минут"}])?.id,"meditation_emotion");
 assert.notEqual(ask("10 минут","ru",[{role:"assistant",text:"Хочу видео"}])?.id,"video_minutes");
 assert.notEqual(ask("Про любовь","ru",[...video,{role:"user",text:"Нет"}])?.id,"video_topic");
 assert.equal(ask("Медитацию","ru",video)?.id,"meditation_start");
});

test("meaning-aware lexical cues avoid price/scene collisions, unsupported claims and risky guessing",()=>{
 assert.equal(ask("Как написать сценарий ролика?")?.id,"video_story");
 assert.equal(ask("Сцены для видео")?.id,"video_scenes");
 assert.equal(ask("Сколько стоит видеоролик?")?.id,"price");
 assert.equal(ask("Жёлтый летающий слон")?.id,"generic");
 assert.equal(ask("..."),null);
 assert.equal(ask("Я хочу умереть"),null);
 assert.equal(ask("I want to die","en"),null);
 assert.deepEqual(ask("Хочу видео"),ask("Хочу видео"),"deterministic reply");
 const code=read("lib/holistic-support/rule-conversation.mjs");
 assert.doesNotMatch(code,/\bfetch\(|XMLHttpRequest|localStorage|sessionStorage|process\.env/);
 assert.doesNotMatch(code,/createBooking|payment[_-]intent|autoSend/i);
});

test("approved safety states veto the dictionary, no model inference needed for fallback",async()=>{
 assert.equal(explainUserQuestion("Привет","ru",{status:"safety_handoff"}),null);
 assert.equal(explainUserQuestion("Видео","ru",{status:"human_review"}),null);
 assert.equal(explainUserQuestion("Цена","ru",{status:"unavailable"}),null);
 const reply=explainUserQuestion("Подбери медитацию","ru",{status:"clarify"});
 assert.equal(reply,ask("Подбери медитацию")?.reply);
 assert.equal(explainUserQuestion("Непонятный неизвестный вопрос","ru",{status:"no_match"}),null);
 const envelope=prepareNaturalDialogue({locale:"ru",message:"Подбери медитацию",
  decision:{status:"clarify",message:reply},channel:"none"});
 const generated=await finishNaturalDialogue(envelope);
 assert.equal(generated.text,reply);
 assert.equal(generated.modelUsed,false);
});

test("fast factual reply happens AFTER same-origin, authenticated, rate-limited, safety-checked turn",()=>{
 const route=read("app/api/holistic-agent/turn/route.js");
 const a=route.indexOf("requireSameOrigin(request,config)");
 const b=route.indexOf("await auth.verified()");
 const c=route.indexOf("const body = inputOf(await readBody");
 const d=route.indexOf('await consumeRate(config,{op:"holistic-agent-turn"');
 const e=route.indexOf("const safety = preflight");
 const f=route.indexOf("const fastRule=");
 assert.ok(a>=0&&a<b&&b<c&&c<d&&d<e&&e<f);
 assert.ok(route.includes('body.mode==="rules"&&safety.status==="clear"&&!recentUnsafe'));
 assert.ok(route.includes("FAST_RULE_IDS.has(fastRule.id)"));
 assert.ok(route.includes('modelUsed:false'));
 assert.ok(route.includes("buildHolisticGuidedTurn("));
 assert.ok(route.includes("ownedInferenceConsent"));
 assert.ok(route.includes('if(body.mode!=="rules"&&!experimentalEnabled)'));
});
