import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("alternative answers use only the explicitly selected on-device model",()=>{
  const chat=read("components/holistic-agent-chat.tsx");
  assert.match(chat,/if\(data\.browserModelAllowed&&data\.decision/);
  assert.match(chat,/async function requestAlternativeAnswer/);
  assert.match(chat,/native\.availability\(caps\)/);
  assert.match(chat,/native\.create\(caps\)/);
  assert.match(chat,/prepareNaturalDialogue\(/);
  assert.match(chat,/channel:"browser"/);
  assert.match(chat,/session\.prompt\(prompt,\{signal:abort\.signal\}\)/);
  assert.match(chat,/session\.destroy\?\.\(\)/);
  assert.doesNotMatch(chat,/openrouter\/free|gemini-.*free|api\.openrouter\.ai/);\n  const route=read("app/api/holistic-agent/turn/route.js");\n  assert.match(route,/browserModelAllowed:experimentalEnabled && body\.mode!==\"owned\" && safety\.status===\"clear\" && !recentUnsafe/);\n  assert.match(route,/if\(body\.mode!==\"rules\"&&!experimentalEnabled\)/);
});

test("alternative retry preserves the source answer and appends a labelled version",()=>{
  const chat=read("components/holistic-agent-chat.tsx");
  assert.match(chat,/lastAnswerRef\.current=\{message:text,history:prior,decision:data\.decision,locale:turnLocale\}/);
  assert.match(chat,/variant\?:"alternative"/);
  assert.match(chat,/variant==="alternative"/);
  assert.match(chat,/setMessages\(prev=>\[\.\.\.prev,\{role:"assistant",text:generated\.text,variant:"alternative"\}\]/);
  assert.match(chat,/data-hh-alternative-actions/);
  assert.match(chat,/Another answer/);
  assert.match(chat,/Объяснить проще/);
  assert.match(chat,/Подробнее/);
});

test("alternative retry is abortable, language-aware, and fails closed for protected content",()=>{
  const chat=read("components/holistic-agent-chat.tsx");
  assert.match(chat,/requiresProtectedReply\(context\.message,context\.locale\)/);
  assert.match(chat,/const languages=\[context\.locale\]/);
  assert.match(chat,/alternativeAbortRef\.current\?\.abort\(\)/);
  assert.match(chat,/This browser does not support a free on-device model/);
  assert.match(chat,/Your original answer is unchanged/);
  assert.match(chat,/function resetConversation\(\)\{alternativeAbortRef\.current\?\.abort\(\)/);
});

test("alternative answer controls have mobile tap targets and no paid provider",()=>{
  const css=read("components/holistic-agent-chat.module.css");
  const chat=read("components/holistic-agent-chat.tsx");
  assert.match(css,/\.answerActions button\{min-height:42px/);
  assert.match(chat,/The browser's free on-device model when available/);
  assert.doesNotMatch(chat,/requestAlternativeAnswer[\s\S]{0,2000}fetch\(/);
});
