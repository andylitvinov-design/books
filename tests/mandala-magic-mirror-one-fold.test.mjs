import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const css=read("components/mandala-magic-mirror-goal.module.css");
const mirror=read("components/mandala-magic-mirror-goal.tsx");
const studio=read("components/mandala-video-mobile.module.css");
const compact=css.slice(css.indexOf("/* Owner 2026-11-22: one-fold Topic composition"));
test("owner Topic step retains full real controls while avoiding previous tall minimums",()=>{
 assert.ok(compact.startsWith("/* Owner 2026-11-22"));
 for(const anchor of [".therapyHero",".exampleVideo",".progress",".composer textarea",
   ".composerToolbar",".cardLabel",".primaryAction","max-height:740px","max-width:359px"]){
  assert.ok(compact.includes(anchor),anchor);
 }
 assert.match(compact,/\.exampleVideo\{[\s\S]*?height:clamp\(76px,10\.9dvh,96px\)/);
 assert.match(compact,/\.card\{[\s\S]*?grid-template-rows:clamp\(33px,5\.2dvh,43px\)/);
 assert.match(compact,/\.composer textarea\{[\s\S]*?max-height:190px/);
 assert.match(compact,/flex-wrap:nowrap;gap:2px;padding:3px 4px/);
 for(const marker of ["data-hh-mirror-enter=\"me\"","data-hh-mirror-play-example",
   "data-hh-mirror-progress","data-hh-mirror-wish","data-hh-mirror-open-advanced",
   "data-hh-mirror-next","data-hh-mirror-goal-choice","data-hh-mirror-ideas-cta"]){
  assert.ok(mirror.includes(marker),marker);
 }
 assert.match(studio,/data-hh-mirror-video-preview="open"/);
 assert.doesNotMatch(compact,/\.primaryAction\s*\{\s*display:\s*none/);
});
