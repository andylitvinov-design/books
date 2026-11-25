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
  "video_scene_count"
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
  "complaint_loneliness"
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
  "video_scene_count",
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
  "complaint_loneliness",
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
 assert.equal(RULE_CONVERSATION_VERSION,"hh-rule-conversation-v3");
 assert.ok(cases.length>=65);
 const seen=new Set;
 for(const [message,locale,expected,language,history] of cases){
   const reply=ask(message,locale,history||[]);
   assert.equal(reply?.id,expected,message);
   assert.equal(reply.locale,language||locale,message+" locale");
   assert.equal(reply.source,expected==="conversation_disclosure"?"conversation-intelligence":expected.startsWith("complaint_")?"complaint-mind":"reviewed-rules",message);
   if(expected==="conversation_disclosure"){
     assert.match(reply.reply,language==="en"?/thank you|heard/i:/спасибо|выслуш/i,message);
     assert.doesNotMatch(reply.reply,/диагноз|записал|booked|diagnos/i,message);
   }
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

const extendedV3Cases=[
  [
    "video_four_goals",
    "Какие четыре категории видео?"
  ],
  [
    "video_purpose",
    "Какая цель моего видео?"
  ],
  [
    "video_category",
    "Как выбрать категорию видео?"
  ],
  [
    "video_subtopic",
    "Подтема видео"
  ],
  [
    "video_idea",
    "Как выбрать идею для видео?"
  ],
  [
    "video_meaning_axis",
    "Нужна смысловая ось"
  ],
  [
    "video_motive",
    "Как выбрать мотив видео?"
  ],
  [
    "video_script",
    "Как написать сценарий видео?"
  ],
  [
    "video_storyboard",
    "Сделай раскадровку"
  ],
  [
    "video_emotional_vector",
    "Что такое эмоциональный вектор?"
  ],
  [
    "video_emotional_strategy",
    "Эмоциональная стратегия"
  ],
  [
    "video_scene_count",
    "Сколько сцен?"
  ],
  [
    "video_scene_tags",
    "Какие ключевые теги сцен?"
  ],
  [
    "video_footage",
    "Как подобрать видеоряд?"
  ],
  [
    "video_unique_footage",
    "Видео без повторов кадров"
  ],
  [
    "video_orientation",
    "Вертикальное видео 9:16"
  ],
  [
    "video_style",
    "Выбор стиля видео"
  ],
  [
    "video_text",
    "Как добавить текст на видео?"
  ],
  [
    "video_affirmations",
    "Хочу аффирмации"
  ],
  [
    "video_text_motion",
    "Анимация текста"
  ],
  [
    "video_voiceover",
    "Голос для видео"
  ],
  [
    "video_music",
    "Музыка для видео"
  ],
  [
    "video_mix",
    "Как микшировать аудио?"
  ],
  [
    "video_preview",
    "Предпросмотр"
  ],
  [
    "video_render",
    "Как сделать рендер видео?"
  ],
  [
    "video_render_queue",
    "Видео в очереди"
  ],
  [
    "video_export",
    "Как экспортировать видео?"
  ],
  [
    "video_license",
    "Лицензия клипа"
  ],
  [
    "video_delivery_queue",
    "Готовое видео в Телеграм"
  ],
  [
    "meditation_script",
    "Написать текст медитации"
  ],
  [
    "meditation_imagery",
    "Визуализация"
  ],
  [
    "meditation_breath",
    "Дыхательная медитация"
  ],
  [
    "meditation_grounding",
    "Заземление"
  ],
  [
    "meditation_sleep",
    "Медитация для сна"
  ],
  [
    "meditation_anxiety",
    "Медитация при тревоге"
  ],
  [
    "meditation_duration_short",
    "Короткая медитация"
  ],
  [
    "meditation_personalize",
    "Персонализация медитации"
  ],
  [
    "meditation_voice",
    "Голос для медитации"
  ],
  [
    "meditation_music",
    "Музыка для медитации"
  ],
  [
    "meditation_silent",
    "Медитация без голоса"
  ],
  [
    "meditation_repeat",
    "Как часто медитировать?"
  ],
  [
    "chat_voice_message",
    "Как записать голосовое сообщение?"
  ],
  [
    "chat_telegram",
    "Как подключить Телеграм бот?"
  ],
  [
    "chat_whatsapp",
    "Как подключить Whatsapp?"
  ],
  [
    "chat_history",
    "История переписки"
  ],
  [
    "chat_delete",
    "Как удалить переписку?"
  ],
  [
    "complaint_technical",
    "Чат не отвечает"
  ],
  [
    "complaint_technical",
    "Клавиатура закрывает поле ввода"
  ],
  [
    "chat_modes",
    "Режим ответа без нейросети"
  ],
  [
    "chat_guest",
    "Чат без регистрации"
  ],
  [
    "chat_live_person",
    "Хочу поговорить с живым оператором"
  ],
  [
    "tests_stress",
    "Тест на стресс"
  ],
  [
    "tests_relationship",
    "Тест отношений"
  ],
  [
    "tests_explain",
    "Как читать результат теста?"
  ],
  [
    "course_reiki",
    "Курс Рейки"
  ],
  [
    "course_opora",
    "Курс ОПОРА"
  ],
  [
    "course_progress",
    "Прогресс курса"
  ],
  [
    "reiki_initiation",
    "Инициация Рейки"
  ],
  [
    "wu_xing",
    "Профиль У-Син"
  ],
  [
    "personal_review",
    "Бесплатный разбор ситуации"
  ],
  [
    "session_booking",
    "Как записаться к мастеру?"
  ],
  [
    "video_scene_count",
    "How many scenes?",
    "en"
  ],
  [
    "video_style",
    "How to choose video style?",
    "en"
  ],
  [
    "video_script",
    "How to write a video script?",
    "en"
  ],
  [
    "video_storyboard",
    "How to make a storyboard?",
    "en"
  ],
  [
    "video_music",
    "Music for video",
    "en"
  ],
  [
    "video_export",
    "How to export video?",
    "en"
  ],
  [
    "video_render_queue",
    "Video queued",
    "en"
  ],
  [
    "meditation_breath",
    "Breathing meditation",
    "en"
  ],
  [
    "meditation_script",
    "Meditation script",
    "en"
  ],
  [
    "meditation_voice",
    "Meditation voice",
    "en"
  ],
  [
    "chat_telegram",
    "Connect Telegram",
    "en"
  ],
  [
    "chat_guest",
    "Chat without login",
    "en"
  ],
  [
    "course_reiki",
    "Reiki course",
    "en"
  ],
  [
    "video_purpose",
    "Objetivo del video",
    "es"
  ],
  [
    "video_meaning_axis",
    "Eje de sentido",
    "es"
  ],
  [
    "video_scene_count",
    "Cuantas escenas?",
    "es"
  ],
  [
    "video_text",
    "Agregar texto al video",
    "es"
  ],
  [
    "video_orientation",
    "Formato vertical",
    "es"
  ],
  [
    "meditation_music",
    "Musica para meditacion",
    "es"
  ],
  [
    "chat_voice_message",
    "Mensaje de voz en chat",
    "es"
  ],
  [
    "chat_whatsapp",
    "Conectar Whatsapp",
    "es"
  ],
  [
    "reiki_initiation",
    "Iniciacion de Reiki",
    "es"
  ],
  [
    "course_reiki",
    "Curso de Reiki",
    "es"
  ],
  [
    "personal_review",
    "Revision gratuita",
    "es"
  ]
];

test("v3 has 117 reviewed intents; new vocabulary follows the user's actual subject in RU EN ES",()=>{
 const cases=extendedV3Cases;
 assert.ok(cases.length>=80);
 for(const [intent,text,language="ru"] of cases){
  const reply=ask(text,language);
  assert.equal(reply?.id,intent,text);
  assert.equal(reply.locale,language,text+" language");
  assert.equal(reply.source,intent.startsWith("complaint_")?"complaint-mind":"reviewed-rules");
  assert.ok(reply.reply.length>=20&&reply.reply.length<500,text+" quality");
 }
});

test("v3 distinguishes scenecount, cost, status, special video questions and safety",()=>{
 for(const [text,expected,language="ru"] of [
  ["Сколько сцен нужно в видео?","video_scene_count"],
  ["Сколько стоит видео?","price"],
  ["Как написать сценарий ролика?","video_story"],
  ["Видео в очереди","video_render_queue"],
  ["Where is my video render?","video_status","en"],
  ["Quiero crear un video","video_start","es"],
  ["Como descargar el video","video_download","es"],
  ["Привет Ау","hello"],
 ]){
  assert.equal(ask(text,language)?.id,expected,text);
 }
 for(const text of ["Я хочу умереть","I want to die","Quiero morir"]){
  assert.equal(ask(text),null,text);
 }
 const guide=read("lib/holistic-support/rule-conversation.mjs");
 assert.match(guide,/matchVideoRuleV3\(s\)/);
 assert.match(guide,/matchSupportRuleV3\(s\)/);
 assert.match(guide,/const expanded=matchSupportRuleV3\(s\)\|\|matchVideoRuleV3\(s\)/);
 for(const path of ["lib/holistic-support/rule-video-v3.mjs","lib/holistic-support/rule-support-v3.mjs"]){
  const content=read(path);
  assert.doesNotMatch(content,/\bfetch\(|XMLHttpRequest|localStorage|sessionStorage|process\.env|createBooking/);
 }
});
