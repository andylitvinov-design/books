import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const shell=read("components/services-assist-mobile.tsx");
const shellCss=read("components/services-assist-mobile.module.css");
const top=read("components/assist-top-recommendations.tsx");
const topCss=read("components/assist-top-recommendations.module.css");

test("only the first two rows (six issues) are initially available, with deliberate expand",()=>{
  assert.match(shell,/t\.hints\.slice\(0,expandedIssues\?12:6\)/);
  assert.match(shell,/aria-expanded=\{expandedIssues\}/);
  assert.match(shell,/data-assist-issue-suggestions/);
  assert.match(shellCss,/\.chips\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
});
test("all clarification steps remain within one locally scrolling messenger",()=>{
  assert.match(shell,/data-assist-dialogue/);
  assert.match(shell,/role="log"/);
  assert.match(shell,/chatRef\.current\.scrollTop=chatRef\.current\.scrollHeight/);
  assert.match(shell,/data-assist-question=\{question\}/);
  assert.match(shell,/chooseAnswer\(value,label\)/);
  assert.match(shell,/setTurns\(current=>/);
  assert.doesNotMatch(shell,/scrollIntoView|router\.push|window\.location/);
  assert.doesNotMatch(shell,/className=\{styles\.results\}|<section id="assist-results"/);
  assert.match(shellCss,/\.messages\{display:flex;flex-direction:column;[^}]*overflow-y:auto/);
});
test("recommendations rerank by declared preferences and stay compact below chat",()=>{
  assert.match(shell,/rankAssistOffers\(selection\.focus,preferences\)/);
  assert.match(shell,/matchingIds=\{selection\?suggestions\.map/);
  assert.match(top,/offerToEntry/);
  assert.match(top,/data-assist-recommendation/);
  assert.match(topCss,/\.list\{display:grid;grid-template-columns:1fr/);
  assert.match(topCss,/\.thumbnail\{width:64px;height:65px;min-height:65px/);
  assert(shell.indexOf("styles.conversation")<shell.indexOf("<AssistTopRecommendations"));
});
test("guest privacy, crisis suppression, existing Telegram requests and locales preserved",()=>{
  for(const value of ["ru: {moreIssues:","en: {moreIssues:","es: {moreIssues:","urgent.test(selection.text)","setCritical(true)","!crisis?<AssistTopRecommendations","data-assist-reset","data-assist-tool","data-assist-mobile"])
    assert(shell.includes(value),value);
  assert.match(top,/telegramServiceRequestUrl/);
  assert.doesNotMatch(shell,/localStorage|sessionStorage|fetch\(|sendBeacon|window\.location/);
  assert.match(shellCss,/\.form textarea\{min-height:42px\}/);
});
