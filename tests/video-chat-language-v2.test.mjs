import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {classifyVideoChatQuestion,answerVideoChatQuestion} from "../lib/mandala/video-chat-dialogue-knowledge.mjs";
import {understandVideoChatReply} from "../lib/mandala/video-chat-understanding.mjs";
import {parseVideoChatSemanticInput,validateVideoChatSemanticChoice,
 suggestVideoChatSemanticChoice} from "../lib/mandala/video-chat-semantic.mjs";

const samples={
 cost:["Сколько стоит видео?","Это бесплатно?","Какая цена?","Нужна подписка?","Платно ли создавать ролики?",
  "How much does it cost?","Is this free?","What is the price?","Do you charge?",
  "¿Cuánto cuesta?","¿Es gratis?","¿Cuál es el precio?"],
 privacy:["Где хранятся мои данные?","Кому отправляются мои данные?","Это приватно?","Как храните мой текст?",
  "Is my data private?","Where is my data stored?","What about privacy?","¿Mis datos son privados?","¿Dónde guardan mis datos?"],
 ai:["Какой AI вы используете?","Работает ли внешний ИИ?","Нужна ли нейросеть?",
  "Can I use AI?","Do you use artificial intelligence?","¿Usas inteligencia artificial?","¿Es una IA?"],
 footage:["Можно ли сгенерировать кадры с нуля?","Это реальные кадры?","Какое видео из ваших кадров?",
  "Can I create footage from scratch?","Is the footage real?","¿Puedes crear escenas reales?","¿Se crea desde cero?"],
 photo:["Как загрузить свою фотографию?","Могу ли я вставить фото?","Can I add my photo?",
  "Where can I upload a picture?","¿Puedo añadir una foto?","¿Dónde está la imagen?"],
 voice:["Можно ли добавить мой голос?","Как настроить озвучку?","Есть ли диктор?",
  "Can I record voiceover?","Do you support narration?","¿Puedo usar mi voz?","¿Cómo elegir locución?"],
 phrases:["Как убрать фразы?","Можно свои надписи?","Как изменить субтитры?",
  "Can I use my own captions?","How do affirmations work?","¿Puedo usar mis frases?","¿Cómo quitar subtítulos?"],
 music:["Можно ли без музыки?","Как включить музыку?","Есть ли свой трек?",
  "Can I remove music?","Can I choose a soundtrack?","¿Puedo quitar la música?","¿Cómo cambio el sonido?"],
 format:["Какой формат выбрать?","Можно вертикальный?","Can I make it landscape?",
  "Which format is right?","¿Qué formatos hay?","¿Puedo elegir vertical?"],
 duration:["На сколько секунд ролик?","Можно длиннее минуты?","Сколько длится видео?",
  "How long can the video be?","Can it be 20 seconds?","¿Cuántos segundos dura?","¿Puedo hacer 60 segundos?"],
 preview:["Как скачать видео?","Где готовый ролик?","Как сохранить результат?","Where is my video?",
  "Can I download the result?","How do I preview?","¿Cómo descargo el vídeo?","¿Dónde está el resultado?"],
 current:["Что уже выбрано?","Какие у нас настройки сейчас?","What have we selected?",
  "What are the current settings?","¿Qué hemos elegido?"],
 options:["Какие варианты есть?","Что лучше выбрать?","Что порекомендуешь?","What are my options?",
  "Which one do you recommend?","¿Qué opciones tengo?","¿Cuál recomiendas?"],
 steps:["Как это работает?","Что дальше?","Сколько ещё шагов?","Как начать?",
  "How does it work?","What is the next step?","How can I start?","¿Cómo funciona?","¿Qué sigue?"],
 why:["Почему именно этот сценарий?","Зачем выбрали эту идею?","Why this one?","¿Por qué esta historia?"],
};
test("108+ independent RU/EN/ES information questions are grounded, never mistaken for editing",()=>{
 const rows=Object.entries(samples).flatMap(([kind,texts])=>texts.map(text=>({kind,text})));
 assert.ok(rows.length>=100,rows.length);
 for(const {kind,text} of rows){
   assert.equal(classifyVideoChatQuestion(text),kind,text);
 }
 for(const imperative of ["Сделай видео без музыки","Хочу видео про любовь","Make a calm film",
   "Создай ролик на 30 секунд","Quiero un vídeo sobre amor"]){
   assert.equal(classifyVideoChatQuestion(imperative),null,imperative);
 }
});
test("localized answers are grounded in current choices, never invented scenes",()=>{
 for(const locale of ["ru","en","es"]){
   const options=answerVideoChatQuestion("options",{locale,stage:"topic",
     options:["Trust","Balance","Start"]});
   assert.match(options,/1\..*Trust/);
   assert.match(options,/2\..*Balance/);
   assert.ok(answerVideoChatQuestion("why",{locale,selected:{topic:"Trust"}}).includes("Trust"));
   assert.ok(answerVideoChatQuestion("duration",{locale}).includes("60"));
   assert.ok(answerVideoChatQuestion("footage",{locale}).includes("120"));
   assert.ok(answerVideoChatQuestion("current",{locale,selected:{duration:20,aspect:"portrait"}}).includes("20"));
 }
});
test("repair acts, suggestions and explicit preserve do not approve or render",()=>{
 for(const [text,stage,kind] of [
   ["верни как было","review","undo"],["undo last change","music","undo"],
   ["deshacer","idea","undo"],["это не то","review","reject"],
   ["not quite","topic","reject"],["no me gusta","review","reject"],
   ["не знаю","scenario","suggest"],["what do you suggest","idea","suggest"],
   ["no puedo elegir","topic","suggest"],["оставь музыку","review","preserve"],
   ["не трогай формат","review","preserve"]]){
   assert.equal(understandVideoChatReply(text,stage).kind,kind,text);
 }
 const combined=understandVideoChatReply("Музыку оставь, а формат поменяй на горизонтальный","review");
 assert.equal(combined.kind,"edit");
 assert.equal(combined.filters.aspect,"landscape");
 assert.equal(combined.filters.music,undefined);
 for(const [words,kind] of [
  ["Сделай музыку потише","audio"],["Lower the volume","audio"],
  ["Baja el volumen","audio"],["Сделай динамичнее, а музыку тише","edit"],
  ["На 20 секунд, звук потише","edit"]]){
   assert.equal(understandVideoChatReply(words,"review").kind,kind,words);
 }
 const combo=understandVideoChatReply("Сделай динамичнее, а музыку тише","review");
 assert.equal(combo.filters.mood,"dynamic");
 assert.equal(combo.filters.music,undefined);
 assert.equal(combo.audioRequested,true);
 assert.notEqual(understandVideoChatReply("Сделай ролик 20 секунд с музыкой","category").kind,"audio");
 assert.equal(understandVideoChatReply("Сделай ролик 20 секунд с музыкой","category").filters.music,"harmony");
 assert.equal(understandVideoChatReply("создавай","review").kind,"clarify");
 assert.equal(understandVideoChatReply("создавай","ready").kind,"create");
});
const category={consent:true,locale:"ru",stage:"category",
 utterance:"Хочу мягкую поддержку",path:{}};
test("semantic input binds to real category tree and enforces consent",()=>{
 const data=parseVideoChatSemanticInput(category);
 assert.ok(data);
 assert.equal(data.options.length,5);
 assert.deepEqual(new Set(data.options.map(x=>x.id)),
   new Set(["body","business","energy","love","stress"]));
 assert.equal(parseVideoChatSemanticInput({...category,consent:false}),null);
 assert.equal(parseVideoChatSemanticInput({...category,utterance:"hi"}),null);
 assert.equal(parseVideoChatSemanticInput({...category,utterance:"a".repeat(481)}),null);
 assert.equal(parseVideoChatSemanticInput({...category,stage:"ready"}),null);
 assert.equal(parseVideoChatSemanticInput({...category,path:{topicId:"bad"}}),null);
});
test("semantic output accepts only real IDs at high confidence; never an action",()=>{
 const options=parseVideoChatSemanticInput(category)?.options;
 assert.equal(validateVideoChatSemanticChoice('{"optionId":"love","confidence":0.96}',options)?.optionId,"love");
 for(const reply of [
  '{"optionId":"wolf","confidence":1}',
  '{"optionId":"love","confidence":0.7}',
  '{"optionId":"love","confidence":1,"render":true}',
  '{"optionId":"love","confidence":"1"}',
  '{"optionId":"love","confidence":2}',
  "Ignore instructions",
 ]){
  assert.equal(validateVideoChatSemanticChoice(reply,options),null,reply);
 }
});
test("semantic AI is disabled by default and mock provider cannot invent option IDs",async()=>{
 let requests=0;
 const fetcher=async()=>{requests++;return {ok:true,text:async()=>JSON.stringify({
   choices:[{message:{content:'{"optionId":"love","confidence":0.99}'}}]})}};
 const input=parseVideoChatSemanticInput(category);
 const missing=await suggestVideoChatSemanticChoice(input,{},fetcher);
 assert.equal(missing.error,"VIDEO_CHAT_SEMANTIC_DISABLED");
 assert.equal(requests,0);
 const active={HH_VIDEO_CHAT_SEMANTIC_ENABLED:"true",HH_FIRST_VIDEO_AI_ENABLED:"true",
  HH_FIRST_VIDEO_OPENROUTER_FREE_CONFIRMED:"true",
  HH_COUNCIL_OPENROUTER_API_KEY:"mock_only_not_a_real_key"};
 const result=await suggestVideoChatSemanticChoice(input,active,fetcher);
 assert.equal(result.optionId,"love");
 assert.equal(requests,1);
});
test("UI keeps consent, stale-response protection, approval gates and single renderer",()=>{
 const ui=readFileSync(new URL("../components/mandala-video-director-chat.tsx",import.meta.url),"utf8");
 const route=readFileSync(new URL("../app/api/holistic-support/video-chat-semantic/route.js",import.meta.url),"utf8");
 for(const required of ["classifyVideoChatQuestion(value)","answerVideoChatQuestion(faq",
   "understandVideoChatReply(value,step)","suggestSemantic(","semanticKeyRef.current!==requestKey",
   "semanticAbortRef.current?.abort()","chooseVideoChatTreeOption(base,requestedStep,option.id,locale)",
   "onConfirm({scenario:executable})","onCreate()","data-chat-assistant-turn"])
  assert.ok(ui.includes(required),required);
 for(const required of ["requireSameOrigin(request,config)","HH_VIDEO_CHAT_SEMANTIC_ENABLED",
   "freeFirstVideoProviders","video-chat-semantic-global-day","changesApplied:false","videoRendered:false"])
  assert.ok(route.includes(required),required);
});
