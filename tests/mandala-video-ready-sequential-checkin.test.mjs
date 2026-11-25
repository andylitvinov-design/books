import test from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {
  READY_CHECKIN_MEDIA,READY_CHECKIN_COPY,initialReadyCheckIn,scoreReadyCheckIn
} from "../lib/mandala/ready-generation-checkin.mjs";

const ready=readFileSync(new URL("../components/mandala-video-ready.tsx",import.meta.url),"utf8");
const widget=readFileSync(new URL("../components/mandala-video-ready-checkin.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/mandala-video-ready.module.css",import.meta.url),"utf8");

test("Ready check-in shows seven distinct, available first-party photos and translated questions",()=>{
  assert.equal(READY_CHECKIN_MEDIA.length,7);
  assert.equal(new Set(READY_CHECKIN_MEDIA.map(item=>item.id)).size,7);
  assert.equal(new Set(READY_CHECKIN_MEDIA.map(item=>item.src)).size,7);
  for(const item of READY_CHECKIN_MEDIA){
    assert.ok(item.src.startsWith("/videos/holistic-house/film-collection-v2/"));
    assert.ok(existsSync(fileURLToPath(new URL("../public"+item.src,import.meta.url))),
      "first-party photo must exist: "+item.src);
  }
  for(const locale of ["en","ru","es"]){
    const copy=READY_CHECKIN_COPY[locale];
    assert.ok(copy&&copy.title&&copy.guidance&&copy.complete&&copy.privacy);
    assert.equal(copy.questions.length,7,locale+" question count");
    assert.equal(copy.labels.length,7,locale+" label count");
    assert.ok(copy.questions.every(q=>q.length>15));
    assert.equal(new Set(copy.questions).size,7);
  }
});
test("single score from 0 through 10 advances exactly one question without mutating the old answer",()=>{
  const initial=initialReadyCheckIn();
  let next=scoreReadyCheckIn(initial,0);
  assert.equal(initial.index,0);
  assert.ok(initial.answers.every(x=>x===null));
  assert.equal(next.index,1);
  assert.equal(next.answers[0],0);
  assert.equal(next.answers[1],null);
  assert.notEqual(next.answers,initial.answers);
  const before=next;
  next=scoreReadyCheckIn(next,10);
  assert.equal(next.index,2);
  assert.equal(next.answers[1],10);
  assert.equal(before.answers[1],null);
  assert.equal(scoreReadyCheckIn(next,11),next);
  assert.equal(scoreReadyCheckIn(next,-1),next);
  assert.equal(scoreReadyCheckIn(next,4.5),next);
  for(let i=2;i<7;i++)next=scoreReadyCheckIn(next,i);
  assert.equal(next.index,7);
  assert.equal(next.answers.length,7);
  assert.equal(scoreReadyCheckIn(next,8),next,"completed wizard cannot accept an eighth answer");
});
test("Ready replaces four sliders only in the generating panel; Goal owns its existing scales",()=>{
  assert.match(ready,/data-ready-checkin/);
  assert.match(ready,/<ReadyGenerationCheckIn locale=\{locale\}/);
  assert.doesNotMatch(ready,/data-ready-checkin>\{progressQuestionnaire\}/);
  assert.match(ready,/\(\(waiting&&!completed\)\|\|checkinEngaged\)/);
  assert.match(widget,/data-ready-sequential-checkin/);
  assert.match(widget,/data-ready-checkin-score=\{value\}/);
  assert.match(widget,/SCORES=\[0,1,2,3,4,5,6,7,8,9,10\]/);
  assert.match(widget,/onClick=\{\(\)=>answer\(value\)\}/);
  assert.match(widget,/role="group" aria-labelledby="ready-checkin-question"/);
  assert.match(widget,/data-ready-checkin-complete/);
  assert.match(widget,/onDismiss/);
  assert.match(css,/\.checkinNumbers\{display:grid;grid-template-columns:repeat\(6/);
  assert.match(css,/@media\(max-width:360px\)/);
  assert.match(css,/repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(css,/min-height:46px/);
});

test("real macOS WebKit verifies the seven-card Ready self-check during an actual export",()=>{
  const browser=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
  const watch=browser.indexOf("window.__hhReadyCheckInObserver=new MutationObserver(scan)");
  const click=browser.indexOf("await readyGenerate.click()",watch);
  assert.ok(watch>=0&&click>watch,"watch real Ready DOM before trusted Generate click");
  assert.match(browser,/\[data-ready-checkin\] \[data-ready-sequential-checkin\]/);
  assert.match(browser,/\[data-ready-checkin-score\]/);
  assert.match(browser,/\[data-ready-generating\]/);
  assert.match(browser,/observation\.scoreButtons,11/);
  assert.match(browser,/readyCheckin\.locator\('\[data-ready-checkin-score="5"\]'\)\.click\(\)/,
    "tap a real 0–10 answer in the running video and advance to the next photo");
  assert.match(browser,/data-ready-meditation/,
    "keep the existing Ready → Therapy mobile navigation acceptance");
  assert.match(browser,/window\.__hhReadyInlineCheckInEvidence/,
    "capture fast transient Ready DOM without faking video readiness");
  assert.doesNotMatch(browser,/\[data-ready-checkin\] \[data-video-checkin\]/,
    "no stale four-slider selector after the approved seven-question design");
  assert.doesNotMatch(browser,/\[data-video-effect-reopen\]/,
    "the removed floating survey pill is not a valid acceptance criterion");
});
