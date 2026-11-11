import test from "node:test";
import assert from "node:assert/strict";
import { understandConversationTurn, CONVERSATION_INTELLIGENCE_VERSION } from "../lib/holistic-support/conversation-intelligence.mjs";
import { prepareNaturalDialogue, finishNaturalDialogue } from "../lib/holistic-support/natural-dialogue.mjs";
import { ruleConversationReply } from "../lib/holistic-support/rule-conversation.mjs";
const history = message => [{role:"user",text:message},{role:"assistant",text:"Как продолжим?"}];

test("corrections prioritize the corrected topic",()=>{
 const ru=understandConversationTurn({message:"Не про любовь, а про деньги",locale:"ru"});
 assert.equal(ru.act,"correction"); assert.equal(ru.topic,"work_money");
 assert.match(ru.replyFallback,/работа и деньги/);
 const en=understandConversationTurn({message:"Actually, I meant my relationship",locale:"en"});
 assert.equal(en.act,"correction"); assert.equal(en.topic,"relationships");
 const shortEnglish=understandConversationTurn({message:"Not love, but work",locale:"en"});
 assert.equal(shortEnglish.act,"correction"); assert.equal(shortEnglish.topic,"work_money");
 const es=understandConversationTurn({message:"No me refiero al trabajo, sino a mi relación",locale:"es"});
 assert.equal(es.act,"correction"); assert.equal(es.topic,"relationships");
});
test("short follow-ups use recent user context, never assistant-suggested topics",()=>{
 const x=understandConversationTurn({message:"А почему?",locale:"ru",history:history("Мне сложно в отношениях")});
 assert.equal(x.act,"follow_up"); assert.equal(x.contextTopic,"relationships");
 assert.match(x.replyFallback,/отношения/);
 const y=understandConversationTurn({message:"Why?",locale:"en",history:[{role:"assistant",text:"Let's discuss work"}]});
 assert.equal(y.contextTopic,null); assert.ok(y.replyFallback);
});
test("mixed wishes and concerns are recognized without choosing a side",()=>{
 assert.equal(understandConversationTurn({message:"Я хочу сменить работу, но боюсь подвести команду",locale:"ru"}).act,"ambivalence");
 assert.equal(understandConversationTurn({message:"I want to leave my job but I am worried about my team",locale:"en"}).act,"ambivalence");
});
test("handles disclosure, feedback, rejection and affirmation",()=>{
 assert.equal(understandConversationTurn({message:"Сегодня был тяжелый день",locale:"ru"}).act,"disclosure");
 assert.equal(understandConversationTurn({message:"Too long, please be shorter",locale:"en"}).act,"feedback");
 assert.equal(understandConversationTurn({message:"Нет",locale:"ru"}).act,"rejection");
 const yes=understandConversationTurn({message:"Yes",locale:"en"});
 assert.equal(yes.act,"affirmation"); assert.match(yes.replyFallback,/does not trigger actions/);
});
test("localizes greetings and preserves explicit domain commands",()=>{
 for(const [message,locale] of [["Привет","ru"],["Hello","en"],["Hola","es"]])
  assert.equal(understandConversationTurn({message,locale}).act,"greeting");
 assert.equal(understandConversationTurn({message:"Напиши медитацию для сна",locale:"ru"}).act,"direct_request");
 assert.equal(understandConversationTurn({message:"Create a video about love",locale:"en"}).act,"direct_request");
});
test("safety-sensitive turns do not get a casual answer",()=>{
 const x=understandConversationTurn({message:"Я не хочу больше жить",locale:"ru"});
 assert.equal(x.act,"safety_sensitive"); assert.equal(x.replyFallback,null);
});
test("natural dialogue uses contextual fallback only for no-match",async()=>{
 const x=prepareNaturalDialogue({message:"Не про любовь, а про деньги",locale:"ru",decision:{status:"no_match",message:"Общий ответ"}});
 assert.match(x.replyFallback,/работа и деньги/);
 const y=prepareNaturalDialogue({message:"Спасибо",locale:"ru",decision:{status:"recommend",message:"Вот вариант",suggestions:[]}});
 assert.match(y.replyFallback,/Вот вариант/);
 const done=await finishNaturalDialogue(x); assert.equal(done.modelUsed,false);
 assert.match(done.text,/работа и деньги/);
});
test("owned model gets compact understanding metadata, not added permission",()=>{
 const x=prepareNaturalDialogue({message:"А почему?",locale:"ru",history:history("Мне сложно в отношениях"),
  decision:{status:"no_match",message:"Уточните вопрос"},access:{authenticated:true,ownerScoped:true},
  consent:{ownedInference:true,agentMemory:false},channel:"owned"});
 assert.equal(x.modelAllowed,true);
 const serialized=x.modelRequest.messages.map(m=>m.content||"").join("\n");
 assert.match(serialized,/conversationUnderstanding/); assert.match(serialized,/follow_up/);
 assert.match(serialized,/relationships/); assert.doesNotMatch(serialized,/approvedConsent/);
});
test("bounded and versioned",()=>{
 const x=understandConversationTurn({message:"x".repeat(3001)});
 assert.equal(x.act,"over_limit"); assert.equal(x.replyFallback,null);
 assert.equal(CONVERSATION_INTELLIGENCE_VERSION,"hi-conversation-intelligence-v1");
});

test("the default deterministic chat uses dialogue intelligence before broad topic rules",()=>{
 const correction=ruleConversationReply({message:"Не про любовь, а про деньги",locale:"ru"});
 assert.equal(correction.source,"conversation-intelligence");
 assert.equal(correction.understanding.topic,"work_money");
 const followup=ruleConversationReply({message:"А почему?",locale:"ru",history:history("Мне сложно в отношениях")});
 assert.equal(followup.understanding.act,"follow_up");
 assert.match(followup.reply,/отношения/);
 const ambivalence=ruleConversationReply({message:"Я хочу сменить работу, но боюсь подвести команду",locale:"ru"});
 assert.equal(ambivalence.understanding.act,"ambivalence");
 const direct=ruleConversationReply({message:"Напиши медитацию для сна",locale:"ru"});
 assert.notEqual(direct.source,"conversation-intelligence");
});
test("question punctuation is accepted for short follow-up turns",()=>{
 assert.equal(understandConversationTurn({message:"А почему?",locale:"ru"}).act,"follow_up");
 assert.equal(understandConversationTurn({message:"Why?",locale:"en"}).act,"follow_up");
});
test("Spanish sino-sobre correction selects the final explicit topic",()=>{
 const x=understandConversationTurn({message:"No sobre amor sino sobre trabajo",locale:"es"});
 assert.equal(x.act,"correction");
 assert.equal(x.topic,"work_money");
 const reply=ruleConversationReply({message:"No sobre amor sino sobre trabajo",locale:"es"});
 assert.equal(reply.source,"conversation-intelligence");
 assert.equal(reply.understanding.topic,"work_money");
 assert.match(reply.reply,/trabajo y el dinero/);
});
test("explicit video-to-meditation switches stay on the existing domain route",()=>{
 for(const [message,locale,id] of [
  ["Not video but meditation","en","meditation_start"],
  ["No quiero video sino meditacion","es","meditation_start"],
  ["Нет, не медитацию, а видео","ru","video_start"],
 ]){
  const result=ruleConversationReply({message,locale});
  assert.equal(result.id,id,message);
  assert.equal(result.source,"reviewed-rules",message);
 }
});
