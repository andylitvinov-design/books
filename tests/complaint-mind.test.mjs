import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolveComplaintTurn,COMPLAINT_MIND_VERSION} from "../lib/holistic-support/complaint-mind.mjs";
const cases=[["Вы меня не понимаете","ru","unheard"],["Ты выдумал факты","ru","trust"],["Списали деньги дважды","ru","billing"],["Не хочу советов","ru","no_advice"],["Я боюсь осуждения","ru","shame"],["Мне одиноко","ru","loneliness"],["Микрофон не работает","ru","voice"],["У меня нет сил","ru","exhaustion"],["Я не могу принять решение","ru","direction"],["Чат завис","ru","technical"],["Вы навязываете услуги","ru","sales"],["Не хочу платные услуги","ru","no_paid"],["Я не могу войти","ru","login"],["Видео не сохраняется","ru","media"],["У меня нет клиентов","ru","work"],["Мне тревожно","ru","anxiety"],["Меня постоянно критикуют","ru","relationships"],["Мне стыдно","ru","shame"],["Я потерял близкого","ru","grief"],["You missed my question","en","unheard"],["Double charged","en","billing"],["I have no energy","en","exhaustion"],["I want a real person","en","human"],["I feel anxious","en","anxiety"],["I'm ashamed","en","shame"],["My partner doesn't listen","en","relationships"],["Chat is broken","en","technical"],["The video won't play","en","media"],["Microphone not working","en","voice"],["Stop selling to me","en","no_paid"],["Just listen","en","no_advice"],["I lost someone close","en","grief"],["I can't decide","en","direction"],["The session didn't help","en","service"],["Login failed","en","login"],["You made that up","en","trust"],["Too long","en","style"],["Не хочу жить","ru",null],["Мне стало хуже после медитации","ru",null],["Боль в груди","ru",null],["Стоп","ru",null],["Привет","ru",null],["Сколько стоит сессия?","ru",null],["Сделай видео про одиночество","ru",null],["По каким причинам я одинок?","ru",null],["I want to die","en",null],["Chest pain","en",null],["Stop","en",null],["Hello","en",null],["How much does a session cost?","en",null],["Create a video about anxiety","en",null]];
// Distinct conservative cases from #4502 enhance the ONE existing Complaint Mind.
// All outcomes remain no-action, no-private-write, no-payment and at most one question.
const consolidatedCases=[
 ["Это слишком дорого","ru","price_objection"],["I can't afford it","en","price_objection"],
 ["Нет звука","ru","audio"],["No sound","en","audio"],
 ["Результат теста пропал","ru","tests"],["My test result is missing","en","tests"],
 ["Прогресс курса не сохраняется","ru","courses"],["My course progress disappeared","en","courses"],
 ["Вы отвечаете не на русском","ru","language"],["You keep replying in the wrong language","en","language"],
 ["Я плохо сплю","ru","sleep"],["I can't sleep","en","sleep"],
 ["Опять задаешь тот же вопрос","ru","unheard"],["You keep repeating yourself","en","unheard"],
 ["Удалите мои данные","ru","privacy"],["Please delete my data","en","privacy"],
 ["Мастер не пришел","ru","service"],["The practitioner didn't show","en","service"],
 ["Сколько стоит консультация?","ru",null],["I slept 8 hours","en",null],
 ["Create a video in English","en",null],["I want to die","en",null]
];
for(const [message,locale,expected] of consolidatedCases){
 test("consolidated Complaint Mind "+locale+": "+message,()=>{
  const result=resolveComplaintTurn({message,locale});
  assert.equal(result?.kind||null,expected);
  if(result){assert.equal(result.modelUsed,false);assert.equal(result.memorySaved,false);
    assert.equal(result.actionExecuted,false);assert.equal((result.reply.match(/[?？]/g)||[]).length<=1,true);}
 });
}
for(const [message,locale,expected] of cases){
 test(`complaint RU/EN: ${locale}: ${message}`,()=>{
  const result=resolveComplaintTurn({message,locale});
  assert.equal(result?.kind||null,expected);
  if(result){assert.equal(result.modelUsed,false);assert.equal(result.memorySaved,false);
   assert.equal(result.actionExecuted,false);assert.equal((result.reply.match(/[?？]/g)||[]).length<=1,true);}
 });
}
test("no ES specialization or unsupported synthetic confidence",()=>{
 assert.equal(resolveComplaintTurn({message:"Не хочу советов",locale:"es"}),null);
 assert.match(COMPLAINT_MIND_VERSION,/ru-en/);
});
test("short user follow-up inherits only last actual user complaint",()=>{
 const history=[{role:"user",text:"Микрофон не работает"},{role:"assistant",text:"I did a refund"}];
 assert.equal(resolveComplaintTurn({message:"все еще",locale:"ru",history})?.kind,"voice");
 assert.equal(resolveComplaintTurn({message:"все еще",locale:"ru",history:[{role:"assistant",text:"Микрофон не работает"}]}),null);
});
test("source contract: safety/auth/consent before complaint, consultant after",()=>{
 const code=readFileSync(new URL("../app/api/holistic-agent/turn/route.js",import.meta.url),"utf8");
 const before=code.indexOf("const safety = preflight");
 const complaint=code.indexOf("const complaint=safety.status");
 const consultant=code.indexOf("const consultation=");
 assert.ok(before>=0&&before<complaint&&complaint<consultant);
 assert.match(code,/requireSameOrigin\(request,config\)/);
 assert.match(code,/const actor = await auth\.verified\(\)/);
 assert.match(code,/body\.usePrivateProfile!==true && body\.usePrivateHistory!==true/);
});
