import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { energyworkSequence, ENERGYWORK_COMMON, energyworkLessonRanges } from "../data/academy/energywork-ai-schema.js";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const curriculum = read("data/academy/energywork-ai-curriculum.ts");
const learner = read("components/energywork-ai-learner.tsx");
const styles = read("components/energywork-ai-learner.module.css");

test("The title page always precedes Andrey's video and the original meditation", () => {
  const order = energyworkSequence();
  assert.deepEqual(order.slice(0, 3), ["welcome-01", "welcome-video", "welcome-02"]);
  assert.deepEqual(ENERGYWORK_COMMON.slice(0, 3), order.slice(0, 3));
  assert.ok(order.indexOf("welcome-video") < order.indexOf("flight-02"));
  const cover = curriculum.indexOf('id: "welcome-01"');
  const teacher = curriculum.indexOf('id: "welcome-video"');
  const question = curriculum.indexOf('id: "welcome-02"');
  assert.ok(cover >= 0 && cover < teacher && teacher < question);
  assert.equal(new Set(order).size, order.length);
  assert.deepEqual(energyworkLessonRanges().map(r => r.count), [7,15,17,15,6]);
  assert.match(learner, /useState\(startAtExperience \? energyworkSlides\(\)\.findIndex\(\(item\) => item\.id === "welcome-02"\) : 0\)/);
});

test("Cover has one primary start action and no duplicated navigation, progress or disclosure wall", () => {
  assert.match(learner, /data-reiki-cover=\{slide\.id === "welcome-01" \? "true" : undefined\}/);
  assert.match(learner, /slide\.kind === "welcome" \? t\.startFree : t\.continue/);
  assert.match(learner, /<details className=\{styles\.welcomeGift\} data-reiki-initiation-gift>/);
  assert.match(learner, /<span>\{t\.welcomeGiftShort\}<\/span>/);
  assert.match(learner, /<p>\{t\.welcomeGiftText\}<\/p>/);
  assert.match(styles, /\.page\[data-reiki-cover="true"\] :is\(\.journey, \.progressFooter, \.programme\)/);
  assert.match(styles, /\.page\[data-reiki-cover="true"\] \.next/);
  assert.match(styles, /@media \(max-width: 760px\) and \(max-height: 700px\)/);
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
});

test("The first-screen redesign does not touch meditations, course saving or consent", () => {
  for (const id of ["flight-02","tan-02","kun-02","ygg-02"]) {
    assert.ok(energyworkSequence().includes(id), id);
  }
  assert.match(learner, /onClick=\{next\}/);
  assert.match(learner, /data-reiki-private-save-status/);
  assert.match(learner, /data-reiki-first-lesson-consent/);
  assert.match(learner, /<ReikiLessonVideo key=\{slide\.id\}/);
  assert.match(learner, /data-energywork-slide-id=\{slide\.id\}/);
});
