import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("../components/sitewide-ihelp.tsx",import.meta.url),"utf8");
test("iHelp does not preload the heavyweight conversation CSS before a user opens the dialog",()=>{
  assert.match(source,/const HolisticAgentChat = lazy\(/);
  assert.match(source,/import\("@\/components\/holistic-agent-chat"\)/);
  assert.doesNotMatch(source,/const HolisticAgentChat = dynamic\(/);
  assert.match(source,/\{mounted&&<div/);
  assert.match(source,/<Suspense fallback=\{null\}><HolisticAgentChat/);
});
test("the one real chat, its context, quick prompts, and explicit tap remain unchanged",()=>{
  assert.match(source,/setMounted\(true\);\s*setOpen\(true\);/);
  assert.match(source,/<HolisticAgentChat locale=\{locale\} compact messengerView pageHelp=\{context\} quickPrompt=\{quickPrompt\}/);
  assert.match(source,/data-hh-ihelp-trigger/);
  assert.match(source,/if\(!open\)return;/);
  assert.match(source,/window\.dispatchEvent\(new Event\("hh:voice-companion-stop"\)\)/);
});
