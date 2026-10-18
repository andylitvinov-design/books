import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name) => readFileSync(new URL("../" + name, import.meta.url), "utf8");
const learner = read("components/energywork-ai-learner.tsx");
const stylesheet = read("components/energywork-ai-learner.module.css");
const curriculum = read("data/academy/energywork-ai-curriculum.ts");
const backend = read("data/academy/energywork-ai-schema.js");

test("The entire existing 29-step Reiki journey uses the approved scenic shell", () => {
  assert.match(learner, /data-energywork-design="scenic-v2"/);
  assert.match(stylesheet, /REIKI SCENIC V2/);
  assert.match(stylesheet, /course-focus-mountain-boy\.webp/);
  assert.match(stylesheet, /\.page\[data-energywork-design="scenic-v2"\] \.slide/);
  assert.match(stylesheet, /\.page\[data-energywork-design="scenic-v2"\] \.welcomeSlide/);
  assert.match(stylesheet, /backdrop-filter:blur\(12px\)/);
  assert.match(stylesheet, /\.welcomeBenefits/);
  assert.match(stylesheet, /\.journeyEnd/);
  assert.match(stylesheet, /\.secondary/);
  assert.match(learner, /energyworkSlides\("yggdrasil"\)\.length/);
  assert.match(curriculum, /\.\.\.commonSlides, \.\.\.\(path \? pathSlides\[path\]/);
});

test("Three Reiki traditions are represented as choices, without faked linear completion", () => {
  assert.match(learner, /className=\{styles\.stageRail\}/);
  assert.match(learner, /energyworkPathChoices\.map\(\(choice, stepIndex\) =>/);
  assert.match(learner, /aria-current=\{path === choice\.id \? "step" : undefined\}/);
  assert.match(learner, /data-highlighted=\{path \? path === choice\.id : stepIndex === 0\}/);
  assert.match(learner, /role="progressbar"/);
  assert.match(learner, /aria-valuenow=\{index \+ 1\}/);
  assert.ok(learner.indexOf("className={styles.journeyEnd}") > learner.indexOf("data-energywork-slide-kind={slide.kind}"));
  assert.equal((learner.match(/className=\{styles\.stageRail\}/g) ?? []).length, 1);
});

test("Welcome, teaching, reflection, video, practice and final screen retain one common style", () => {
  for (const kind of ["welcome", "lesson", "video", "practice", "reflection", "path-choice", "finish"]) {
    assert.ok(curriculum.includes('kind: "' + kind + '"'), "Missing original slide type " + kind);
  }
  for (const phrase of ["3 possible Level 1 initiations", "Short lessons", "Practical tasks", "Private progress", "Start free program"]) {
    assert.ok(learner.includes(phrase), "Missing scenic hero text " + phrase);
  }
  assert.match(learner, /<AcademyVideoPlayer/);
  assert.match(learner, /<PracticeTimer/);
  assert.match(learner, /slide\.question\.options\?\.map/);
  assert.match(learner, /type="radio"/);
  assert.match(learner, /type="range" min="0" max="10"/);
  assert.match(learner, /className=\{styles\.final\}/);
});

test("Small-screen layouts retain reachable controls, lesson scrolling and safe saving", () => {
  assert.match(stylesheet, /@media\(max-width:760px\)/);
  assert.match(stylesheet, /height:100dvh/);
  assert.match(stylesheet, /overflow-y:auto/);
  assert.match(stylesheet, /safe-area-inset-bottom/);
  assert.match(stylesheet, /max-height:470px/);
  assert.match(stylesheet, /prefers-reduced-motion/);
  assert.match(stylesheet, /@media print/);
  assert.match(learner, /action: "start", consent: true/);
  assert.match(learner, /expectedRevision: revisionRef\.current/);
  assert.match(learner, /setIndex\(\(current\) => Math\.min/);
  assert.match(learner, /t\.stop/);
  assert.match(learner, /t\.noInitiation/);
  assert.match(learner, /save to My Courses|Save to My Courses/);
  assert.match(backend, /ENERGYWORK_VERSION = '2026-10-17\.p0'/);
  assert.doesNotMatch(learner, /autoplay|autoPlay|localStorage|sessionStorage/);
});
