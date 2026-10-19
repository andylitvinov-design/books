import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const learner = read("components/energywork-ai-learner.tsx");
const styles = read("components/energywork-ai-learner.module.css");
const curriculum = read("data/academy/energywork-ai-curriculum.ts");

test("Journey hint uses a brief bilingual explanation", () => {
  assert.ok(learner.includes('program: "Discover your Reiki journey"'));
  assert.ok(learner.includes('program: "Откройте свой путь в Рейки"'));
  assert.ok(learner.includes('programmeIntro: "Five short lessons:'));
  assert.ok(learner.includes('programmeIntro: "Пять коротких уроков:'));
  assert.ok(!learner.includes("programmeTeaser"));
});

test("The hint renders only one summary line and a short paragraph", () => {
  const start = learner.indexOf('<details className={styles.programme}>');
  const end = learner.indexOf('<footer className={styles.footer}>', start);
  assert.ok(start > 0 && end > start);
  const hint = learner.slice(start, end);
  assert.ok(hint.includes('<strong>{t.program}</strong>'));
  assert.ok(hint.includes('<p className={styles.programmeIntro}>{t.programmeIntro}</p>'));
  for (const forbidden of ["<ol", "<li", "programmeList", "programmeCard", "programmeJump", "programmeLink", "saveDetails", "<aside", "energyworkLessons.map"]) {
    assert.ok(!hint.includes(forbidden), "The hint should not render " + forbidden);
  }
});

test("Course navigation and private saving stay accessible outside the hint", () => {
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

test("One-line hint does not push lesson and navigation off the mobile screen", () => {
  assert.ok(styles.includes("REIKI JOURNEY HINT"));
  assert.ok(styles.includes("height: 36px"));
  assert.ok(styles.includes("white-space: nowrap"));
  assert.ok(styles.includes(".programme[open]"));
  assert.ok(styles.includes(".programme .programmeBody {\n  position: absolute"));
  assert.ok(styles.includes(".saveManager > .preview {\n  position: absolute"));
  assert.ok(styles.includes("max-height: min(65dvh, 540px)"));
  assert.ok(styles.includes("prefers-reduced-motion: reduce"));
});
