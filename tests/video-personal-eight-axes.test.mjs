import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PERSONAL_EIGHT_AXES,axisGap,axisCompletedCount,axesFormComplete,isAxisRating} from "../lib/mandala/personal-eight-axes.mjs";
const source=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("exact owner eight-axis vocabulary in EN/RU/ES",()=>{
 assert.deepEqual(PERSONAL_EIGHT_AXES.map(x=>x.ru[0]),["Опора","Связь","Свобода","Сила","Любовь","Достоинство","Самореализация","Признание"]);
 assert.equal(new Set(PERSONAL_EIGHT_AXES.map(x=>x.id)).size,8);
 for(const x of PERSONAL_EIGHT_AXES)for(const l of ["ru","en","es"]){
  assert.ok(x[l][0].length>=3&&x[l][1].length>=8);
 }
});
test("desired-minus-now is signed and never preselected",()=>{
 assert.equal(axisGap({now:4,desired:8}),4);assert.equal(axisGap({now:9,desired:4}),-5);
 assert.equal(axisGap({now:6,desired:6}),0);assert.equal(axisGap({now:0,desired:8}),null);
 assert.equal(axisGap({now:5}),null);assert.equal(isAxisRating(1),true);assert.equal(isAxisRating(11),false);
 const full=Object.fromEntries(PERSONAL_EIGHT_AXES.map(x=>[x.id,{now:4,desired:8}]));
 assert.equal(axisCompletedCount(full),8);assert.equal(axesFormComplete(full,null),false);
 assert.equal(axesFormComplete(full,"recognition"),true);
 assert.equal(axesFormComplete({...full,recognition:{now:4}},"recognition"),false);
});
test("separate Personal screen → existing Concept, not a second video pipeline",()=>{
 const studio=source("components/mandala-free-video-studio.tsx");
 const old=source("components/mandala-video-personalization.tsx");
 const page=source("components/mandala-video-eight-axes.tsx");
 const composer=source("lib/mandala/video-personal-goal-composer.mjs");
 for(const marker of ["data-video-personal-questions-page","data-video-personal-eight-axes-page",
   "setAxesScreenOpen(true)","setAxesScreenOpen(false)",'setIdeasSubtab("concept")'])
  assert.ok(studio.includes(marker),marker);
 assert.ok(!old.includes('data-personalization-kind="strength"'));
 for(const marker of ["data-video-meaning-score=","data-video-meaning-difference=","data-video-meaning-focus=",
  "data-video-axes-all-visible","disabled={disabled||!complete}"])assert.ok(page.includes(marker),marker);
 assert.ok(composer.includes("personalFocusGap"));
 for(const forbidden of ["fetch(","appFetch(","sendBeacon(","localStorage","sessionStorage","createQuickVideo("])
  assert.ok(!page.includes(forbidden),forbidden);
});
