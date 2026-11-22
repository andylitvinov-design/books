import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PERSONAL_EIGHT_AXES,validAxisRating,axisDifference,completedAxisCount,completedPersonalAxes}
 from "../lib/mandala/personal-eight-axes.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("eight owner-approved meaning axes have distinct multilingual labels and poster assets",()=>{
 assert.deepEqual(PERSONAL_EIGHT_AXES.map(axis=>axis.id),
  ["anchor","connection","freedom","agency","love","dignity","self-realization","recognition"]);
 assert.deepEqual(PERSONAL_EIGHT_AXES.map(axis=>axis.labels.ru),
  ["Опора","Связь","Свобода","Сила","Любовь","Достоинство","Самореализация","Признание"]);
 for(const axis of PERSONAL_EIGHT_AXES){
  for(const locale of ["en","ru","es"])
   assert.ok(axis.labels[locale].length>=3&&axis.descriptions[locale].length>=7);
  assert.match(axis.photo,/^[a-z-]+\.jpg$/);
  assert.ok(["anchor","connection","freedom","agency","dignity","growth"].includes(axis.meaningAxisId));
 }
});
test("difference is desired minus now, including negative and zero; never invent ratings",()=>{
 assert.equal(axisDifference({now:4,desired:8}),4);
 assert.equal(axisDifference({now:9,desired:4}),-5);
 assert.equal(axisDifference({now:6,desired:6}),0);
 assert.equal(axisDifference({now:0,desired:8}),null);
 assert.equal(axisDifference({now:4}),null);
 assert.equal(validAxisRating(0),false);
 assert.equal(validAxisRating(5),true);
 const values=Object.fromEntries(PERSONAL_EIGHT_AXES.map(axis=>[axis.id,{now:4,desired:8}]));
 assert.equal(completedAxisCount(values),8);
 assert.equal(completedPersonalAxes(values,null),false);
 assert.equal(completedPersonalAxes(values,"recognition"),true);
 assert.equal(completedPersonalAxes({...values,recognition:{now:4}},"recognition"),false);
});
test("existing Personalization leads to one eight-axes page and then existing Concept",()=>{
 const p=read("components/mandala-video-personalization.tsx");
 const screen=read("components/mandala-video-eight-axes.tsx");
 const studio=read("components/mandala-free-video-studio.tsx");
 const composer=read("lib/mandala/video-personal-goal-composer.mjs");
 assert.match(p,/if\(axesScreenOpen\)return <MandalaVideoEightAxes/);
 assert.match(p,/onContinue=\{onContinue\}/);
 assert.match(p,/setAxesScreenOpen\(true\)/);
 assert.doesNotMatch(p,/data-personalization-kind="strength"/);
 assert.match(screen,/PERSONAL_EIGHT_AXES\.map/);
 assert.match(screen,/data-video-meaning-score=/);
 assert.match(screen,/data-video-meaning-difference=/);
 assert.match(screen,/data-video-meaning-focus=/);
 assert.match(screen,/role="radiogroup"/);
 assert.match(screen,/disabled=\{disabled\|\|!completed\}/);
 assert.match(studio,/setIdeasProfileConfirmed\(false\)/);
 assert.match(studio,/setIdeasProfileConfirmed\(true\)/);
 assert.match(composer,/focusAxis/);
 for(const forbidden of ["fetch(","appFetch(","navigator.sendBeacon","localStorage","sessionStorage",
   "getUserMedia(","createQuickVideo(","startFromHero("])
  assert.equal(screen.includes(forbidden),false,forbidden);
});