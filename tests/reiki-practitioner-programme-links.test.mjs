import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const learner = read("components/energywork-ai-learner.tsx");
const styles = read("components/energywork-ai-learner.module.css");
const curriculum = read("data/academy/energywork-ai-curriculum.ts");

test("Journey hint uses concise, accurate bilingual summaries", () => {
  assert.ok(learner.includes('program: "Discover your Reiki journey"'));
  assert.ok(learner.includes('program: "Откройте свой путь в Рейки"'));
  assert.ok(learner.includes('programmeIntro: "Three Reiki traditions'));
  assert.ok(learner.includes('programmeIntro: "Три системы Рейки'));
  for (const system of ["tantra", "kundalini", "yggdrasil"]) {
    assert.ok(learner.includes(system + ': "'), system);
  }
});

test("Clicking the bottom hint pushes the slide up and presents each system link", () => {
  const start = learner.indexOf('<section className={styles.programme} data-expanded=');
  const end = learner.indexOf('<footer className={styles.footer}>', start);
  assert.ok(start > 0 && end > start);
  const hint = learner.slice(start, end);
  assert.ok(hint.includes('hidden={!programmeOpen}'));
  assert.ok(hint.includes('aria-expanded={programmeOpen}'));
  assert.ok(hint.includes('aria-controls="reiki-journey-help"'));
  assert.ok(hint.includes('onClick={() => setProgrammeOpen((open) => !open)}'));
  assert.ok(hint.indexOf("programmeBody") < hint.indexOf("programmeSummary"));
  assert.ok(hint.includes("energyworkPathChoices.map((choice) => ("));
  assert.ok(hint.includes("programmeSystemDescriptions[locale][choice.id]"));
  assert.ok(hint.includes('href={"/" + locale + "/academy/" + choice.studyPath}'));
  assert.ok(hint.includes('target="_blank" rel="noopener noreferrer"'));
  assert.ok(hint.includes('aria-label={choice.title[locale] + " — " + t.systemDetails}'));
  for (const forbidden of ["programmeList", "programmeCard", "programmeJump", "saveDetails", "<aside", "energyworkLessons.map"]) {
    assert.ok(!hint.includes(forbidden), "Only concise system summaries should appear: " + forbidden);
  }
});

test("Course rail and account saving are unchanged and separate from journey hint", () => {
  assert.ok(learner.includes('<nav className={styles.journey} aria-label={t.fiveLessons}>'));
  assert.ok(learner.includes('energyworkLessons.map((lesson, number) => ('));
  assert.ok(learner.includes('<span className={styles.journeyLabel}>{lesson.title[locale]}</span>'));
  assert.ok(learner.includes('<details className={styles.saveManager}>'));
  assert.ok(learner.includes('aria-label={t.consentTitle}'));
  for (const fn of ["signIn", "startSaving", "shareWithTeacher", "reloadProgress"]) {
    assert.ok(learner.includes("onClick={" + fn + "}"), "Saving control missing: " + fn);
  }
  assert.ok(learner.includes('href={"/" + locale + "/app/course?view=courses"}'));
  for (const path of ["reiki/tantra-reiki", "reiki/kundalini-reiki", "reiki/yggdrasil"]) {
    assert.ok(curriculum.includes('studyPath: "' + path + '"'), path);
  }
});

test("Closed bar stays one row; expanded guidance participates in vertical layout", () => {
  assert.ok(styles.includes("REIKI JOURNEY HINT"));
  assert.ok(styles.includes("height: 36px"));
  assert.ok(styles.includes("white-space: nowrap"));
  assert.ok(styles.includes('.programme[data-expanded="true"]'));
  assert.ok(styles.includes(".programme .programmeBody {\n  position: static"));
  assert.ok(styles.includes(".programme .programmeBody[hidden] { display: none; }"));
  assert.ok(styles.includes("max-height: min(34dvh, 172px)"));
  assert.ok(styles.includes(".programme .programmeSystemLink {"));
  assert.ok(!styles.includes("bottom: calc(100% + 7px)"));
  assert.ok(styles.includes(".saveManager > .preview {\n  position: absolute"));
  assert.ok(styles.includes("prefers-reduced-motion: reduce"));
});
