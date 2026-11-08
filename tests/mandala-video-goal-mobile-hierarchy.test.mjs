import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=(name)=>readFileSync(new URL("../components/"+name,import.meta.url),"utf8");
const director=read("mandala-auto-video-director.tsx");
const studio=read("mandala-free-video-studio.tsx");
const layout=read("mandala-video-goal-refresh.css");
const mobile=layout.slice(layout.indexOf("/* Goal 1: owner mobile correction"));

test("Goal keeps one live audience toggle in the same mobile title row",()=>{
  assert.match(studio,/data-video-director-audience-controls/);
  assert.match(studio,/1\. Choose your goal/);
  assert.match(studio,/1\. Выберите цель/);
  assert.match(studio,/1\. Elige tu objetivo/);
  assert.match(director,/createPortal\(audienceBar,audienceTarget\)/);
  assert.match(mobile,/grid-template-columns:minmax\(0,1fr\) auto!important/);
  assert.match(mobile,/white-space:nowrap!important/);
});
test("Subcategories are a distinct prominent step with touch-sized choices",()=>{
  assert.match(director,/data-auto-video-subcategories/);
  assert.match(director,/2\. Choose a subcategory/);
  assert.match(director,/2\. Выберите подкатегорию/);
  assert.match(director,/2\. Elige una subcategoría/);
  assert.match(mobile,/\[data-auto-video-subcategories\]/);
  assert.match(mobile,/\[data-mytube-subcategories\]/);
  assert.match(mobile,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
  assert.match(mobile,/min-height:62px!important/);
  assert.match(director,/data-auto-video-subcategory=\{item\.id\}/);
});
test("Only six existing taxonomy topics are offered on the first Goal screen",()=>{
  assert.match(director,/const visibleQuickTopicIds=\[\.\.\.new Set\(\[[\s\S]*?\]\)\]\.slice\(0,6\)/);
  assert.match(director,/data-video-goal-topic-chips/);
  assert.match(director,/data-video-optional-topic/);
  assert.match(mobile,/\[data-video-goal-topic-chips\] button/);
  assert.match(mobile,/min-height:60px!important/);
});

test("legacy CSS cannot hide mobile subcategory heading or shrink choice buttons",()=>{
  assert.match(mobile,/\[data-auto-video-goal-panel\] \[data-auto-video-subcategories\] > p\[data-video-goal-category-title\]\s*\{\s*display:block!important;/);
  assert.match(mobile,/\[data-auto-video-goal-panel\] \[data-auto-video-subcategories\] \[data-mytube-subcategories\] button\[data-auto-video-subcategory\]\s*\{[^}]*min-height:62px!important;[^}]*font:750 clamp\(14px,3\.9vw,16px\)/);
  assert.match(mobile,/button\[data-auto-video-subcategory\] span\s*\{\s*font:inherit!important;/);
  assert.match(mobile,/button\[data-auto-video-subcategory\]\[aria-pressed="true"\]\s*\{[^}]*border:2px solid #087f69!important;/);
});
