import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const root = new URL("../components/", import.meta.url);
const component = readFileSync(new URL("assist-top-recommendations.tsx", root), "utf8");
const shell = readFileSync(new URL("services-assist-mobile.tsx", root), "utf8");
const css = readFileSync(new URL("assist-top-recommendations.module.css", root), "utf8");

test("mobile Assist has three mixed-direction default recommendations", () => {
  assert.match(component, /forMe:\s*\["homeopathy","coaching","reiki"\]/);
  for (const id of ["homeopathy","coaching","reiki"]) assert.match(component, new RegExp(id + ': \\{ path:'));
  assert.match(component, /data-assist-best-three/);
  assert.match(shell, /<AssistTopRecommendations locale=\{locale\} focus=\{selection\?\.focus\?\?null\}/);
});
test("topic switch shows three cards and does not send private question to providers", () => {
  for (const category of ["health","relationships","energy","learning","spiritual"]) {
    assert.match(component, new RegExp(category + ': \\["[^"]+","[^"]+","[^"]+"\\]'));
  }
  assert.match(component, /aria-pressed=\{active===direction\}/);
  assert.match(component, /byFocus\[focus\]/);
  assert.doesNotMatch(component, /fetch\(|localStorage|sessionStorage/);
});
test("existing public navigation, safe actions and mobile touch targets", () => {
  assert.match(component, /services\/psychohomeopathy/);
  assert.match(component, /services\/imagery-therapy/);
  assert.match(component, /services\/remote-energy-support/);
  assert.match(component, /prefetch=\{false\}/);
  assert.match(component, /confirmed booking|подтверждённую запись/);
  assert.match(css, /min-height:50px/);
  assert.match(css, /min-height:42px/);
  assert.doesNotMatch(component, /onClick=.*payment|automaticBooking/);
});

test("Services starts with a compact three-column problem dialogue before service cards", () => {
  const panel=readFileSync(new URL("services-assist-mobile.module.css",root),"utf8");
  const cards=readFileSync(new URL("assist-top-recommendations.module.css",root),"utf8");
  assert.match(shell,/data-assist-dialogue/);
  assert.match(shell,/data-assist-issue-suggestions/);
  assert.equal((shell.match(/hints:\[\[/g)||[]).length,3);
  assert(shell.indexOf("styles.conversation")<shell.indexOf("<AssistTopRecommendations"));
  for(const label of ["Стресс / тревога","Плохой сон","Ссоры в семье","Stress / anxiety","Relationship conflict","Sleep problems","Body symptoms","Estrés / ansiedad","Problemas de sueño"]) assert(shell.includes(label),label);
  assert.match(shell,/aria-pressed=\{false\}/);
  assert.match(shell,/focus==="general"/);
  assert.match(shell,/urgent\.test\(selection\.text\)/);
  assert.match(panel,/\.chips\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(panel,/\.chips button\{[^}]*min-height:44px/);
  assert.match(cards,/\.list\{display:grid;grid-template-columns:1fr/);
  assert.doesNotMatch(shell,/localStorage|sendBeacon|fetch\(/);
});
