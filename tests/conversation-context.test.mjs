import test from "node:test";
import assert from "node:assert/strict";
import {resolveConversationFocus} from "../lib/holistic-support/conversation-context.mjs";

test("current focus beats previous user text or selected filter",()=>{
 const result=resolveConversationFocus({locale:"ru",message:"Хочу про отношения",
   selectedGoal:"money",history:[{role:"user",text:"Хочу больше энергии"}]});
 assert.equal(result.goal,"relationships");
 assert.equal(result.source,"current");
});
test("real follow-up keeps explicitly expressed recent topic only",()=>{
 const r=resolveConversationFocus({locale:"ru",message:"А почему?",
   history:[{role:"assistant",text:"Деньги важны"},{role:"user",text:"Хочу больше энергии"}]});
 assert.equal(r.goal,"energy");
 assert.equal(r.act,"follow_up");
});
test("an assistant's topic is never promoted to the client's goal",()=>{
 assert.equal(resolveConversationFocus({message:"Why?",locale:"en",
   history:[{role:"assistant",text:"Let's discuss money"}]}).goal,null);
});
test("switching and stopping never carry a stale goal",()=>{
 for(const msg of ["Другая тема","Стоп","Начнём сначала","Ты меня не понял"]){
 const r=resolveConversationFocus({message:msg,locale:"ru",
   history:[{role:"user",text:"Хочу про деньги"}]});
 assert.equal(r.goal,null);
 }
});
test("unrelated new message never silently reuses old focus",()=>{
 const r=resolveConversationFocus({locale:"ru",message:"Поговорим о другом",
  history:[{role:"user",text:"Деньги"}]});
 assert.equal(r.goal,null);
});
test("history source is bounded and only confirmed user utterances are considered",()=>{
 const r=resolveConversationFocus({locale:"ru",message:"А почему?",
   history:[{role:"user",text:"Хочу про отношения"},
     ...Array.from({length:6},()=>({role:"assistant",text:"Money"})),
     {role:"assistant",text:"energy"}]});
 assert.equal(r.goal,null);
});
test("client-selected goal is valid without inferred symptoms",()=>{
 const r=resolveConversationFocus({locale:"es",message:"Hola",
    selectedGoal:"meaning"});
 assert.equal(r.goal,"meaning");
 assert.equal(r.source,"explicit_filter");
});
test("invalid history inputs fail closed",()=>{
 for(const input of [null,{},[null,{role:"admin",text:"money"}]]) {
  assert.equal(resolveConversationFocus({message:"Why?",history:input,locale:"en"}).goal,null);
 }
});
