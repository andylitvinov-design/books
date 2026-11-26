import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {stageHomeAliHandoff,peekHomeAliHandoff,acknowledgeHomeAliHandoff} from "../lib/home-ali-handoff.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Home keeps every line of the question in private same-tab storage until acceptance",()=>{
  const items=new Map();
  const storage={getItem:key=>items.get(key)??null,
    setItem:(key,value)=>items.set(key,value),
    removeItem:key=>items.delete(key)};
  const message="I need help with my family and a new job.\nPlease keep both questions.";
  assert.equal(stageHomeAliHandoff(storage,{text:message,locale:"en",mode:"self",now:100}),true);
  const request=peekHomeAliHandoff(storage,"en",101);
  assert.equal(request?.text,message);
  assert.equal(request?.mode,"self");
  assert.equal(items.size,1,"question must survive navigation to the chat");
  assert.equal(acknowledgeHomeAliHandoff(storage,request),true);
  assert.equal(items.size,0,"accepted request must be removed once");
});

test("Home submission targets the existing Messenger AI conversation",()=>{
  const home=read("components/home-dialogue-entry.tsx");
  const page=read("app/[locale]/app/messages/page.tsx");
  assert.match(home,/stageHomeAliHandoff\(window\.sessionStorage/);
  assert.match(home,/router\.push\(chatPath\)/);
  assert.match(home,/app\/messages\?section=ai/);
  assert.match(page,/MessagesOrdersClients/);
  assert.doesNotMatch(home,/searchParams\.set\(["'](?:message|prompt|text)/);
});

test("handed-off question opens dialogue immediately, not the landing",()=>{
  const chat=read("components/holistic-agent-chat.tsx");
  assert.match(chat,/setHomeHandoffPreview\(message\)/);
  assert.match(chat,/homeHandoffPreview&&messages\.length===0/);
  assert.match(chat,/data-home-handoff-user-preview/);
  assert.match(chat,/data-hh-chat-turn="user"/);
  assert.match(chat,/!messages\.length&&!homeHandoffPreview&&<>/);
  assert.match(chat,/!messages\.length&&!homeHandoffPreview&&!supportQuizOpen/);
  assert.match(chat,/void sendTurn\(message\)/);
  assert.match(chat,/acknowledgeHomeAliHandoff\(window\.sessionStorage,pending\.payload\)/);
  assert.match(chat,/setHomeHandoffPreview\(null\)/);
  assert.match(chat,/homeHandoffPhase==="retry"/);
});
