import test from "node:test";
import assert from "node:assert/strict";
import {understandConversationTurn} from "../lib/holistic-support/conversation-intelligence.mjs";
import {ruleConversationReply} from "../lib/holistic-support/rule-conversation.mjs";
import {waveNativeTurn} from "../lib/holistic-support/wave-native-router.mjs";

const history=[
  {role:"user",text:"Привет"},
  {role:"assistant",text:"Привет! 🙂 Как проходит твой день?"},
  {role:"user",text:"Поговорим?"},
  {role:"assistant",text:"Конечно, давайте поговорим 🌿 Я слушаю. О чём вам хочется поговорить?"}
];
test("screenshot regression: third turn 'О тебе' gets an Ali answer, not a generic intake question",()=>{
 const parsed=understandConversationTurn({message:"О тебе",locale:"ru",history});
 assert.equal(parsed.act,"small_talk");assert.equal(parsed.evidence,"explicit_assistant_topic");
 assert.match(parsed.replyFallback,/Я Ali/);assert.doesNotMatch(parsed.replyFallback,/сосредоточиться|сначала|проблема|цель/iu);
 const native=waveNativeTurn({message:"О тебе",locale:"ru",history});
 assert.ok(native?.reply);assert.match(native.reply,/Ali/);
 assert.equal(native.modelUsed,false);assert.equal(native.externalCalled,false);
 const rules=ruleConversationReply({message:"О тебе",locale:"ru",history});
 assert.equal(rules.id,"conversation_small_talk");assert.match(rules.reply,/Ali/);
});
test("RU/EN/ES short assistant self-topic requests work via shared parser and rules",()=>{
 for(const [locale,message] of [
  ["ru","А о тебе?"],["ru","Про тебя"],["ru","Поговорим о тебе"],["ru","Расскажи про себя"],
  ["ru","О вас"],["en","About you"],["en","Tell me about you"],
  ["es","Sobre ti"],["es","¿Sobre ti?"],["es","Cuéntame de ti"]
 ]){
  const understood=understandConversationTurn({locale,message,history});
  assert.equal(understood.act,"small_talk",message);
  assert.equal(understood.evidence,"explicit_assistant_topic",message);
  assert.match(understood.replyFallback,/Ali/,message);
  assert.ok((understood.replyFallback.match(/[?？]/gu)||[]).length<=1,message);
  assert.doesNotMatch(understood.replyFallback,/OpenRouter|Qwen|booked|записал|diagnos/i,message);
  assert.match(ruleConversationReply({locale,message,history}).reply,/Ali/,message);
 }
});
test("assistant self-topic cannot overrule refusals, booking, urgent or personal content",()=>{
 for(const [locale,message] of [
  ["ru","Не про тебя, а про работу"],["ru","Хочу записаться на консультацию"],
  ["ru","Я хочу умереть"],["ru","Мне сегодня тревожно"],["ru","Поговорим о работе"],
  ["en","I want a video about you"],["en","Book a session"],["es","No sobre ti sino sobre trabajo"]
 ]){
  assert.notEqual(understandConversationTurn({locale,message,history}).evidence,"explicit_assistant_topic",message);
 }
 assert.equal(understandConversationTurn({locale:"ru",message:"Я хочу умереть"}).act,"safety_sensitive");
});
