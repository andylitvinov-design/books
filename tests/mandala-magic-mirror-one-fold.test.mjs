import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const css=read("components/mandala-magic-mirror-goal.module.css");
const mirror=read("components/mandala-magic-mirror-goal.tsx");
const studio=read("components/mandala-video-mobile.module.css");
const topic=mirror.slice(mirror.indexOf('return <section className={css.goals} data-hh-mirror-screen="topic"'));
const goalCss=css.slice(css.indexOf("/* Owner 2026-11-23 · approved Goal Topic"));

test("Goal Topic has the real textarea and quiz, no duplicate hero, video, stage menu or CTA",()=>{
 assert.ok(goalCss.startsWith("/* Owner 2026-11-23 · approved Goal Topic"));
 for(const absent of ["className={css.therapyHero}","className={css.exampleVideo}",
  "data-hh-mirror-progress","data-hh-mirror-ideas-cta","data-hh-mirror-audience={item}"])
  assert.ok(!topic.includes(absent),absent);
 for(const required of ["data-hh-mirror-wish","data-hh-mirror-composer","data-hh-mirror-open-advanced",
  "data-hh-mirror-next","data-hh-mirror-guide-menu","data-hh-mirror-play-example",
  "data-hh-mirror-back-landing","data-hh-mirror-goal-choice","data-hh-mirror-subcategory",
  "data-hh-mirror-topic"])assert.ok(topic.includes(required),required);
 assert.ok(topic.indexOf("data-hh-mirror-next")<topic.indexOf("data-hh-mirror-goal-choice"));
 assert.match(topic,/\{guideOpen\?<div className=\{css\.guide\}>/);
 assert.match(studio,/data-hh-mirror-video-preview="open"/);
});

test("approved 2x2 photo choices have text contrast, compact toolbar and narrow phone rules",()=>{
 for(const selector of [".card img",".card:after",".cardLabel",".choiceIcon",
  ".composer textarea",".composerToolbar",".toolIcon",".send",
  "max-width:359px","max-height:740px"])assert.ok(goalCss.includes(selector),selector);
 assert.match(goalCss,/grid-template-rows:none!important/);
 assert.match(goalCss,/flex-wrap:nowrap!important/);
 assert.match(goalCss,/linear-gradient\(0deg,rgba\(5,34,31/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(mirror,/petal-hope\.jpg/);
 assert.match(mirror,/mountain-air\.jpg/);
});
