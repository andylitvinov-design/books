import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {reviewPracticeBoundary} from "../lib/holistic-support/practice-boundary.mjs";
import {resolveComplaintTurn} from "../lib/holistic-support/complaint-mind.mjs";
import {ruleConversationReply} from "../lib/holistic-support/rule-conversation.mjs";
import {planJudgmentTurn} from "../lib/holistic-support/judgment-mind.mjs";
const pause=[
 ["ru","Мне страшно продолжать"],["en","I'm scared to continue"],
 ["en","I am afraid to continue"],["en","Please stop"],["ru","Хочу остановиться"],
 ["ru","Не хочу продолжать медитацию"],["es","No quiero continuar"],
 ["en","I don't want to continue the exercise"]
];
const worsening=[
 ["ru","После практики состояние ухудшилось"],["ru","После медитации мне стало хуже"],
 ["ru","Мне стало хуже"],["en","The meditation made me feel worse"],
 ["en","I feel worse after the exercise"],["es","Despues de la practica me siento peor"]
];
const refusal=[
 ["en","Don't suggest exercises"],["en","Please do not recommend exercises"],
 ["en","Stop suggesting practices"],["ru","Не советуй мне практики"],
 ["ru","Не предлагай упражнения"]
];
const neutral=[
 ["ru","Мне тревожно"],["en","I feel anxious"],["ru","После медитации мне стало лучше"],
 ["en","I am not afraid to continue"],["en","I don't want to stop"],
 ["ru","Не хочу остановиться"],["ru","Хочу продолжать обучение"],
 ["en","Create a meditation video"],["ru","Сколько стоит сессия?"]
];
for(const [locale,message] of pause)test("guest practice pause: "+locale+": "+message,()=>{
 const reviewed=reviewPracticeBoundary(message,locale);
 assert.equal(reviewed?.kind,"pause");
 assert.equal(ruleConversationReply({message,locale})?.id,"guest_practice_pause");
 assert.equal(resolveComplaintTurn({message,locale}),null);
 assert.equal(reviewed?.actionExecuted,false);
 assert.ok(!/[?？]/u.test(reviewed.reply));
 const judgment=planJudgmentTurn({message,locale,safety:{status:"clear"}});
 assert.equal(judgment.status,"handoff");
 assert.match(judgment.reply,/останов|stop|param/i);
});
for(const [locale,message] of worsening)test("guest practice worsening: "+locale+": "+message,()=>{
 const reviewed=reviewPracticeBoundary(message,locale);
 assert.equal(reviewed?.kind,"worsening");
 assert.equal(ruleConversationReply({message,locale})?.id,"guest_practice_worsening");
 if(locale!=="es")assert.equal(resolveComplaintTurn({message,locale}),null);
 assert.equal(reviewed?.modelUsed,false);
 assert.equal(reviewed?.memorySaved,false);
 assert.equal(reviewed?.actionExecuted,false);
 const judgment=planJudgmentTurn({message,locale,safety:{status:"clear"}});
 assert.equal(judgment.status,"handoff");
});
for(const [locale,message] of refusal)test("refusal of exercises: "+locale+": "+message,()=>{
 assert.equal(reviewPracticeBoundary(message,locale),null);
 assert.equal(resolveComplaintTurn({message,locale})?.kind,"no_advice");
 assert.equal(ruleConversationReply({message,locale})?.id,"complaint_no_advice");
});
for(const [locale,message] of neutral)test("do not intercept unrelated user intent: "+locale+": "+message,()=>{
 assert.equal(reviewPracticeBoundary(message,locale),null);
 assert.equal(ruleConversationReply({message,locale})?.id?.startsWith("guest_practice_"),false);
});
test("signed route safety still runs before protected experience, Qwen and Consultant",()=>{
 const s=readFileSync(new URL("../app/api/holistic-agent/turn/route.js",import.meta.url),"utf8");
 assert.match(s,/if\(reviewPracticeBoundary\(text,locale\)\)return \{status:"human_review"\}/u);
 assert.ok(s.indexOf("const safety = preflight")>s.indexOf("function preflight"));
 assert.ok(s.indexOf("const complaint=safety.status")>s.indexOf("const safety = preflight"));
 assert.ok(s.indexOf("const enabled=process.env.HH_AGENT_OWNED_ENABLED")>s.indexOf("const safety = preflight"));
});
test("guest Messenger safeguards stop before video wizard and tests",()=>{
 const s=readFileSync(new URL("../components/holistic-agent-chat.tsx",import.meta.url),"utf8");
 assert.match(s,/function requiresProtectedReply[^]*?if\(reviewPracticeBoundary\(text,locale\)\)return true;/u);
 assert.match(s,/const boundaryReply=reviewPracticeBoundary\(text,turnLocale\)\?\.reply\|\|turnStarter\.safety/u);
 assert.ok(s.indexOf("requiresProtectedReply(text,turnLocale)")<s.indexOf("const candidate=planJudgmentTurn({message:text,locale:turnLocale"));
});
