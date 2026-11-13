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
  assert.doesNotMatch(shell,/router\.push|window\.location/);
  assert.doesNotMatch(shell,/className=\{styles\.results\}|<section id="assist-results"/);
  assert.match(shellCss,/\.messages\{display:flex;flex-direction:column;[^}]*overflow-y:auto/);
});
test("recommendations rerank by declared preferences and stay compact below chat",()=>{
  assert.match(shell,/rankAssistOffers\(selection\.focus,preferences\)/);
  assert.match(shell,/matchingIds=\{suggestions\.map/);
  assert.match(top,/rankAssistProducts/);
  assert.match(top,/data-assist-recommendation/);
  assert.match(topCss,/\.list\{display:grid;grid-template-columns:1fr/);
  assert.match(topCss,/\.product\{display:grid;grid-template-columns:67px/);
  assert.match(shell,/preferences=\{preferences\}/);
  assert(shell.indexOf("styles.conversation")<shell.indexOf("<AssistTopRecommendations"));
});
test("guest privacy, crisis suppression, existing Telegram requests and locales preserved",()=>{
  for(const value of ["ru: {moreIssues:","en: {moreIssues:","es: {moreIssues:","urgent.test(selection.text)","setCritical(true)","!crisis&&selection?<AssistTopRecommendations","data-assist-reset","data-assist-tool","data-assist-mobile"])
    assert(shell.includes(value),value);
  assert.match(top,/telegramServiceRequestUrl/);
  assert.doesNotMatch(shell,/localStorage|sessionStorage|fetch\(|sendBeacon|window\.location/);
  assert.match(shellCss,/\.form textarea\{min-height:42px\}/);
});

test("completed dialogue offers a large accessible CTA that scrolls to matching cards only on tap",()=>{
  assert.match(shell,/data-assist-view-matches/);
  assert.match(shell,/onClick=\{scrollToRecommendations\}/);
  assert.match(shell,/aria-controls="assist-recommendations"/);
  assert.match(shell,/document\.getElementById\("assist-recommendations"\)/);
  assert.match(shell,/target\.focus\(\{preventScroll:true\}\)/);
  assert.match(shell,/target\.scrollIntoView\(\{/);
  assert.match(shell,/prefers-reduced-motion: reduce/);
  assert.match(top,/id="assist-recommendations" tabIndex=\{-1\}/);
  assert.match(topCss,/scroll-margin-top:calc\(14px \+ env\(safe-area-inset-top/);
  assert.match(shellCss,/\.viewMatches\{[^}]*width:100%;min-height:56px/);
  for(const label of ["Посмотреть подходящие мне варианты","View my matching options","Ver mis opciones recomendadas"])
    assert(shell.includes(label),label);
  assert.doesNotMatch(shell,/Your matching options are just below\.|Подходящие варианты уже показаны ниже\./);
});

// Services virtual-keyboard regression: iOS Safari zooms an input below 16px,
// shifting the entire page outside the visible phone viewport.
test("Services composer stays at unzoomed iPhone scale and clears the mobile dock",()=>{
  const banner=read("components/sitewide-antistress-banner.tsx");
  for(const token of ["data-assist-composer","formRef=useRef<HTMLFormElement>(null)",
    "window.visualViewport","dockRect.top","window.scrollBy(",
    'document.activeElement===inputRef.current']) assert.ok(shell.includes(token),token);
  assert.match(shellCss,/\\.form\\{display:flex;[^}]*width:100%;max-width:100%;min-width:0;/);
  assert.match(shellCss,/\\.conversation\\{min-width:0;max-width:100%;/);
  assert.match(shellCss,/\\.form textarea\\{flex:1;[^}]*font-size:16px;/);
  assert.match(shellCss,/@media\\(max-width:350px\\)[^\\n]*\\.form textarea\\{font-size:16px\\}/);
  assert.match(shellCss,/\\.assistPage\\{padding-bottom:calc\\(var\\(--hh-unified-nav-height,77px\\) \\+ 22px\\)\\}/);
  assert.ok(banner.includes("The Services AI dialogue already handles personal situation review"));
  assert.ok(banner.includes("services\\\\/?$/.test(pathname) ||"));
  assert.doesNotMatch(shellCss,/\\.conversation \\.form\\{[^}]*position:(?:sticky|fixed)/);
});
