import test from "node:test";
import assert from "node:assert/strict";
import { understandConversationTurn, CONVERSATION_INTELLIGENCE_VERSION } from "../lib/holistic-support/conversation-intelligence.mjs";
import { prepareNaturalDialogue, finishNaturalDialogue } from "../lib/holistic-support/natural-dialogue.mjs";
import { ruleConversationReply } from "../lib/holistic-support/rule-conversation.mjs";
import { reasonAboutConversationTurn } from "../lib/holistic-support/reasoning-mind.mjs";
const history = message => [{role:"user",text:message},{role:"assistant",text:"Как продолжим?"}];

test("emotional disclosures stay conversational and ambiguous affirmations do not choose a format",()=>{
 const disclosure=ruleConversationReply({message:"Мне одиноко",locale:"ru"});
 assert.equal(disclosure.id,"complaint_loneliness");
 for(const message of ["I am lonely","I'm lonely"]){
  const english=ruleConversationReply({message,locale:"en"});
  assert.equal(english.id,message==="I am lonely"?"complaint_loneliness":"conversation_disclosure",message);
  assert.doesNotMatch(english.reply,/book|buy|diagnos/i,message);
 }
 const ambiguous=ruleConversationReply({message:"Да",locale:"ru",history:[{role:"assistant",text:"Видео или медитация?"}]});
 assert.notEqual(ambiguous.id,"video_context");
 assert.notEqual(ambiguous.id,"meditation_context");
 const refused=ruleConversationReply({message:"Да",locale:"ru",history:[{role:"user",text:"Не хочу видео"}]});
 assert.notEqual(refused.id,"video_context");
});

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
test("a topic reset or rejection prevents later follow-ups from reviving the old topic",()=>{
 for(const [locale,first,reset,follow] of [
  ['ru','Мне сложно на работе','Сменить тему','Почему?'],
  ['ru','Мне сложно на работе','Не про работу','Почему?'],
  ['en','Work has been difficult','Change topic','Why?'],
  ['en','Work has been difficult','Not about work','Why?'],
 ]){
  const history=[{role:'user',text:first},{role:'user',text:reset},{role:'assistant',text:'Let us continue.'}];
  const understood=understandConversationTurn({locale,message:follow,history});
  const reasoning=reasonAboutConversationTurn({locale,message:follow,history});
  assert.equal(understood.topic,null,reset);assert.equal(understood.contextTopic,null,reset);
  assert.equal(reasoning.contextTopic,null,reset);assert.equal(reasoning.nextMove,'ask_what_to_clarify',reset);
 }
 for(const [locale,correction] of [['ru','Не про отношения, а про работу'],['en','Not about relationships, but about work']]){
  const history=[{role:'user',text:correction}];
  assert.equal(understandConversationTurn({locale,message:locale==='ru'?'Почему?':'Why?',history}).contextTopic,'work_money');
  assert.equal(reasonAboutConversationTurn({locale,message:locale==='ru'?'Почему?':'Why?',history}).contextTopic,'work_money');
 }
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
test("RU/EN questions, requests and emotional statements have distinct acts",()=>{
 for(const [locale,message,act] of [
  ['ru','Когда вы работаете?','question'],['en','When are you open?','question'],
  ['ru','Можете объяснить порядок записи?','direct_request'],['en','Could you explain how to get started?','direct_request'],
  ['ru','Мне сейчас тяжело','disclosure'],['en','I feel overwhelmed','disclosure'],
 ]){
  const parsed=understandConversationTurn({locale,message});
  assert.equal(parsed.act,act,message);
  const reasoning=reasonAboutConversationTurn({locale,message});
  assert.equal(reasoning.act,act,message);
  if(act==='disclosure')assert.equal(reasoning.nextMove,'acknowledge_before_advice');
 }
});
test("an unknown opening-hours question does not become a personal work topic",()=>{
 for(const [locale,message,uncertain] of [
  ['ru','Когда вы работаете?',/не (?:знаю|могу подтвердить)/i],
  ['en','When are you open?',/(?:do not know|cannot confirm|can.t confirm)/i],
 ]){
  const response=ruleConversationReply({locale,message});
  assert.match(response.reply,uncertain,message);
  assert.doesNotMatch(response.reply,/\b\d{1,2}[:.]\d{2}\b/,message);
  assert.notEqual(response.id,'work',message);
 }
});
test("explicit RU/EN refusals are acknowledged without suggesting the refused action",()=>{
 for(const [locale,message] of [
  ['ru','Не показывай мне больше курсы'],['ru','Не отправляйте мои данные кому-либо'],
  ['en','Please do not recommend any services to me'],['en','Do not send my information to anyone'],
 ]){
  const understanding=understandConversationTurn({locale,message});
  assert.equal(understanding.act,'rejection',message);
  const response=ruleConversationReply({locale,message});
  assert.equal(response.id,'conversation_rejection',message);
  assert.doesNotMatch(response.reply,/выбрать курс|recommend|предлагаю|запишу/i,message);
 }
 for(const [locale,message] of [['ru','Не показывай курсы, я хочу умереть'],['en','Do not show courses, I want to die']])
  assert.equal(understandConversationTurn({locale,message}).act,'safety_sensitive');
});
test('mixed refusal and follow-up request keeps both parts in RU/EN',()=>{
 for(const [locale,message,refusal,question] of [
  ['ru','Не записывайте меня, но расскажите о консультации.',/не буду/i,/консультац/i],
  ['en','Do not book anything, but tell me about the consultation.',/not do/i,/consultation/i],
  ['ru','Не показывай курсы, просто хочу поговорить о работе.',/не буду/i,/работ/i],
  ['en','Do not show courses; I just want to talk about work.',/not do/i,/work/i],
 ]){
  const result=ruleConversationReply({locale,message});
  assert.equal(result.id,'conversation_rejection',message);
  assert.match(result.reply,refusal,message);
  assert.match(result.reply,question,message);
  assert.ok((result.reply.match(/\?/g)||[]).length<=1,message);
 }
});
test('explicit closing and no-advice requests are respected without a question',()=>{
 for(const [locale,message,expected] of [
  ['ru','Спасибо, давай закончим.','conversation_goodbye'],
  ['en',"Thank you, let's finish here.",'conversation_goodbye'],
  ['ru','Спасибо за разговор, до встречи.','conversation_goodbye'],
  ['en','Thanks for our conversation, see you later.','conversation_goodbye'],
  ['ru','Продолжим про отношения, но без советов.','complaint_no_advice'],
  ['en',"Let's stay on relationships, but no advice.",'complaint_no_advice'],
 ]){
  const result=ruleConversationReply({locale,message});
  assert.equal(result.id,expected,message);assert.doesNotMatch(result.reply,/\?/u,message);
  assert.doesNotMatch(result.reply,/попробуйте|рекомендую|you should|i recommend/i,message);
 }
 for(const [locale,message] of [['ru','Не заканчивай, я хочу поговорить'],['en',"Don't finish, I want to talk"]])
  assert.notEqual(ruleConversationReply({locale,message}).id,'conversation_goodbye');
 for(const [locale,message] of [['ru','Спасибо за разговор, пока не знаю, что делать'],['en',"Thanks for the chat, see you around the topic of work"]])
  assert.notEqual(ruleConversationReply({locale,message}).id,'conversation_goodbye');
});
test('a request for one sentence gets at most one sentence',()=>{
 for(const [locale,message] of [['ru','Поясни одним предложением.'],['en','Explain that in a single sentence.']]){
  const result=ruleConversationReply({locale,message});
  assert.equal(result.id,'conversation_concise_explanation',message);
  assert.doesNotMatch(result.reply,/[.!?]\s+\p{L}/u,message);
 }
});
test('a confused personal situation is treated as a disclosure rather than a topic reset',()=>{
 const result=understandConversationTurn({locale:'ru',message:'У меня путаница с работой.'});
 assert.equal(result.act,'disclosure');
 assert.doesNotMatch(result.replyFallback,/изменить тему|сменить тему/i);
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
