import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {detectConversationLocale} from "../lib/holistic-support/conversation-locale.mjs";
const source=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("RU and EN user turns override stale page language, including mixed video vocabulary",()=>{
  for(const [message,before,after] of [["Хочу денег","en","ru"],["Хочу AI-Video","en","ru"],["Привет","en","ru"],["I need money","ru","en"],["Can you help me?","ru","en"],["I need Яндекс","ru","en"],["Quiero dinero","en","es"],["https://example.com/help","ru","ru"],["Google","ru","ru"],["42 🙏","es","es"],["No","es","es"],["I","ru","en"],["хочу денег","en","ru"],["work","ru","en"]])
    assert.equal(detectConversationLocale(message,before),after,message);
});
test("Messenger owns locale without losing the transcript or advancing unrelated tabs",()=>{
  const ui=source("components/holistic-agent-chat.tsx");
  const hub=source("components/app/messages-orders-clients.jsx");
  const wrapper=source("components/app/messenger-ai-workspace.jsx");
  assert.match(ui,/const turnLocale=messengerView&&judgmentChoice===null/);
  assert.match(ui,/locale:turnLocale,message:text,mode,history:prior/);
  assert.match(ui,/setMessages\(prev=>\[\.\.\.prev/);
  assert.match(ui,/onConversationLocaleChange\?\.\(turnLocale\)/);
  assert.match(ui,/planJudgmentTurn\(\{message:text,locale:turnLocale,/);
  assert.match(ui,/used==="browser"\?turnCopy.used/);
  assert.match(hub,/onConversationLocaleChange=\{chooseLocale\}/);
  assert.match(hub,/className=\{styles.root\} lang=\{locale\}/);
  assert.match(wrapper,/onConversationLocaleChange=\{onConversationLocaleChange\}/);
  assert.match(ui,/onCreateVideo=\{\(\)=>startContent\(\)\}/);
  assert.match(ui,/startContent\(turnLocale\)/);
  assert.match(ui,/chooseContentKind\(selected,turnLocale\)/);
  assert.match(ui,/chooseContentSource\(selected,turnLocale\)/);
  assert.match(ui,/answerVideo\(text,text,turnLocale\)/);
  assert.match(ui,/function answerVideo\(value:string,label=value,language:PublicLocale=locale\)/);
  assert.match(ui,/guestAnswer\(text,prior,turnLocale\)/);
  assert.match(ui,/function guestAnswer\(text:string,prior:Message\[\],language:PublicLocale=locale\)/);
});
test("server chooses user-message language for verified rules and source titles while preserving signed-choice context",()=>{
  const route=source("app/api/holistic-agent/turn/route.js");
  assert.match(route,/if\(body.judgmentChoice==null\)body.locale=detectConversationLocale\(body.message,body.locale\)/);
  assert.match(route,/await auth.verified\(\)/);
  assert.match(route,/preflight\(body.message,body.locale\)/);
  assert.match(route,/coreServiceOffers\(body.locale\)/);
});
