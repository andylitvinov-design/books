import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {understandConversationTurn} from "../lib/holistic-support/conversation-intelligence.mjs";
import {ruleConversationReply} from "../lib/holistic-support/rule-conversation.mjs";

test("RU/EN social turns answer the actual gesture, without a service funnel",()=>{
  for(const [message,locale,act,fragment] of [
    ["Привет","ru","greeting","Привет"],
    ["Как дела?","ru","small_talk","А у тебя как дела"],
    ["Привет, как дела?","ru","small_talk","Спасибо"],
    ["Можно с тобой пообщаться?","ru","chat_invitation","поболтаем"],
    ["Можно с вами пообщаться?","ru","chat_invitation","пообщаться"],
    ["Давай поговорим","ru","chat_invitation","поболтаем"],
    ["Hi","en","greeting","Hi"],
    ["How are you?","en","small_talk","Thanks for asking"],
    ["Can we just talk?","en","chat_invitation","Of course"],
  ]){
    const parsed=understandConversationTurn({message,locale});
    assert.equal(parsed.act,act,message);
    const result=ruleConversationReply({message,locale});
    assert.equal(result.id,"conversation_"+act,message);
    assert.equal(result.source,"conversation-intelligence",message);
    assert.ok(result.reply.includes(fragment),message+": "+result.reply);
    assert.doesNotMatch(result.reply,/сосредоточиться|что вам актуально|выберите вариант|choose (?:a|the) service|choose a test|focus on first/iu,message);
    assert.ok((result.reply.match(/[?？]/g)||[]).length<=1,message);
  }
});

test("social replies respect Russian register and recent context without repetition",()=>{
  const formal=ruleConversationReply({message:"Как у вас дела?",locale:"ru"});
  assert.match(formal.reply,/ваш день/);
  const first=ruleConversationReply({message:"Как дела?",locale:"ru"});
  const second=ruleConversationReply({message:"Как дела?",locale:"ru",
    history:[{role:"user",text:"Как дела?"},{role:"assistant",text:first.reply}]});
  assert.notEqual(first.reply,second.reply);
  const invitation=ruleConversationReply({message:"Можно с тобой пообщаться?",locale:"ru",
    history:[{role:"user",text:"Как дела?"},{role:"assistant",text:first.reply}]});
  assert.match(invitation.reply,/Я слушаю/);
});

test("social routing never claims ownership of task requests or safety escalations",()=>{
  for(const [message,locale,act] of [
    ["Напиши медитацию для сна","ru","direct_request"],
    ["Я не хочу жить","ru","safety_sensitive"],
    ["Create a video about friends","en","direct_request"],
    ["I want to die","en","safety_sensitive"],
  ])assert.equal(understandConversationTurn({message,locale}).act,act,message);
  for(const message of ["Создай видео о дружбе","Привет, создай видео"]){
    assert.ok(!["greeting","small_talk","chat_invitation"].includes(understandConversationTurn({message,locale:"ru"}).act));
  }
  assert.equal(understandConversationTurn({message:"Hola",locale:"es"}).act,"greeting");
});

test("mobile and authenticated API use one verified core without bypassing safety",()=>{
  const ui=readFileSync(new URL("../components/holistic-agent-chat.tsx",import.meta.url),"utf8");
  const api=readFileSync(new URL("../app/api/holistic-agent/turn/route.js",import.meta.url),"utf8");
  assert.ok(ui.includes("ruleConversationReply({message:text,locale:turnLocale,history:messages.slice(-6)})"));
  assert.ok(ui.includes('setSource(friendlyTurn?"":'));
  for(const id of ["conversation_greeting","conversation_small_talk","conversation_chat_invitation"])
    assert.ok(api.includes('"'+id+'"'),id);
  const auth=api.indexOf("await auth.verified()");
  const rate=api.indexOf('await consumeRate(config,{op:"holistic-agent-turn"');
  const safety=api.indexOf("const safety = preflight(body.message");
  const fast=api.indexOf("const fastRule=");
  const judgment=api.indexOf("const inspectedJudgment=");
  assert.ok(auth>=0&&rate>auth&&safety>rate&&judgment>safety&&fast>judgment);
  assert.match(api,/const judgment=inspectedJudgment;/);
  assert.equal((api.match(/\bplanJudgmentTurn\(/g)||[]).length,1);
  assert.ok(api.includes("if(fastRule&&FAST_RULE_IDS.has(fastRule.id))"));
});
