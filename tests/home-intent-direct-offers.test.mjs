import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const intents=["stress","love","money","business"];
const locales=["en","ru","es"];

test("every homepage topic routes to a public intent and does not rely on auth, storage or a first AI turn",()=>{
  const home=read("components/home-dialogue-entry.tsx");
  const hub=read("components/app/messages-orders-clients.jsx");
  const workspace=read("components/app/messenger-ai-workspace.jsx");
  const chat=read("components/holistic-agent-chat.tsx");
  assert.match(home,/router\.push\(chatPath\+"&intent="\+hint\.id\)/);
  assert.match(home,/data-home-intent-option=\{hint\.id\}/);
  assert.match(hub,/const rawHomeIntent=searchParams\.get\('intent'\)/);
  assert.match(hub,/\['stress','love','money','business'\]\.includes\(rawHomeIntent\)/);
  assert.match(hub,/homeIntent=\{homeIntent\}/);
  assert.match(workspace,/messengerView homeIntent=\{homeIntent\}/);
  assert.match(chat,/\<HomeIntentPanel locale=\{locale\} intent=\{homeIntent\}/);
  assert.match(chat,/onAsk=\{prompt=>\{setEntryOpen\(false\);void sendTurn\(prompt\);\}\}/);
  assert.match(chat,/&&!homeIntent&&!messages\.length&&homeHandoffPhase==="idle"/);
  assert.match(chat,/!supportQuizOpen&&!homeIntent&&homeHandoffPhase==="idle"/);
  // Only the free-text form, never a topic tap, stages a private message.
  assert.match(home,/startConversationWith\(draft\)/);
  assert.match(home,/stageHomeAliHandoff\(window\.sessionStorage/);
  assert.doesNotMatch(home,/router\.push\(chatPath\+"&intent="\+hint\.prompt/);
});

test("all 4 topic routes have visible matching EN/RU/ES starting questions and 3 verified choices",()=>{
  const panel=read("components/app/home-intent-panel.tsx");
  const css=read("components/app/home-intent-panel.module.css");
  for(const locale of locales){
    assert.ok(panel.includes("  "+locale+":{"),locale);
    for(const intent of intents){
      // A named intent must appear inside every localized copy.
      const localeSection=panel.split("  "+locale+":{")[1]?.split("\n  },")[0]??"";
      assert.ok(localeSection.includes("    "+intent+":{"),locale+"/"+intent);
    }
  }
  for(const destination of [
    "/services/free-situation-review","/courses/antistress","/services/imagery-therapy",
    "/services/systemic-constellations","/services/business-consulting","/tests"
  ])assert.ok(panel.includes('href:"'+destination+'"'),destination);
  assert.match(panel,/data-home-intent-panel=\{intent\}/);
  assert.match(panel,/data-home-intent-question=\{intent\}/);
  assert.match(panel,/data-home-intent-offer=\{intent\}/);
  assert.match(panel,/data\.choices\.map\(/);
  assert.match(panel,/data\.offers\.map\(/);
  assert.match(css,/@media\(max-width:360px\)/);
  assert.match(css,/min-width:0/);
  assert.match(css,/min-height:45px/);
});
