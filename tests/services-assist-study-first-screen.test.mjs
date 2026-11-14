import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const component=readFileSync(new URL("../components/services-assist-mobile.tsx",import.meta.url),"utf8");
const styles=readFileSync(new URL("../components/services-assist-mobile.module.css",import.meta.url),"utf8");
const page=readFileSync(new URL("../app/[locale]/services/page.tsx",import.meta.url),"utf8");

test("the mobile Services first screen reuses Study check-ins, help methods and real routes",()=>{
  assert.match(component,/data-assist-first-tabs/);
  assert.match(component,/data-assist-study-dashboard/);
  assert.match(component,/checkinKeys\.map\(key=>/);
  assert.match(component,/type="range" min="1" max="10"/);
  assert.match(component,/setCheckinScores\(current=>/);
  assert.match(component,/selectedFocus=editedCheckins\.length/);
  assert.match(component,/onClick=\{findCheckinMatches\}/);
  for(const href of ["/meditations","/services/personal-support","/services/remote-energy-support","/academy/reiki","/masters","/holistic-support/mandala"])assert.ok(component.includes(href),href);
  for(const s of ["1. Check in with yourself","2. Choose what helps","1. Оцени себя сейчас","2. Что помогает","1. Evalúa cómo estás","2. Elige qué te ayuda"])assert.ok(component.includes(s),s);
});
test("legacy public header is hidden only in the mobile Services layout, not removed on desktop",()=>{
  assert.match(page,/<PublicSiteHeader locale=\{locale\}/);
  assert.match(styles,/\.assistPage :global\(\.house-header--services\)\{display:none!important\}/);
  assert.match(styles,/@media\(max-width:760px\)/);
  assert.match(styles,/\.intakeGrid\{display:grid;grid-template-columns:.*minmax\(0,/);
  assert.match(styles,/@media\(max-width:350px\)/);
});
test("WhatsApp-style locally scrolling dialogue retains safe real matching and six initial soft chips",()=>{
  assert.match(component,/ui\.hello/);
  assert.match(component,/styles\.chatAvatarImage/);
  assert.match(component,/t\.hints\.slice\(0,expandedIssues\?12:6\)/);
  assert.match(component,/quickTopicIcons\[index\]/);
  assert.match(component,/role="log"/);
  assert.match(component,/data-assist-composer/);
  assert.match(component,/urgent\.test\(selection\.text\)/);
  assert.match(component,/!crisis&&selection\?<AssistTopRecommendations/);
  assert.match(component,/consultServiceQuestion/);
  assert.doesNotMatch(component,/localStorage|sessionStorage|fetch\(|sendBeacon/);
  assert.match(styles,/\.conversation \.chips button\{display:flex/);
});

test("all locales map confidence requests to growth rather than accidentally matching the English verb work",()=>{
  assert.match(component,/confidence:"I want personal growth, confidence, and clear direction"/);
  assert.match(component,/confidence:"Хочу найти смысл и уверенность/);
  assert.match(component,/confidence:"Quiero crecimiento personal, propósito/);
  for(const selector of [".goalLink",".testsLink",".helpShortcuts a",".mandalaLink"])
    assert.ok(styles.includes(selector),selector);
});
