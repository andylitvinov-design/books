import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const learner = read("components/energywork-ai-learner.tsx");
const styles = read("components/energywork-ai-learner.module.css");
const curriculum = read("data/academy/energywork-ai-curriculum.ts");

test("Reiki programme discovery uses warm, concise bilingual copy", () => {
  assert.match(learner, /program: "Discover your Reiki journey"/);
  assert.match(learner, /program: "Откройте свой путь в Рейки"/);
  assert.match(learner, /programmeTeaser: "5 lessons · 3 Reiki traditions · guided practices"/);
  assert.match(learner, /programmeTeaser: "5 уроков · 3 системы Рейки · медитации"/);
  assert.match(learner, /programmeIntro: "Start with a guided meditation/);
  assert.match(learner, /programmeIntro: "Начните с медитации/);
  assert.match(learner, /stopSaved: "Your progress is saved in My Courses/);
  assert.match(learner, /stopSaved: "Ваш прогресс сохранён в разделе/);
  assert.doesNotMatch(learner, /Your five-step journey is just beginning/);
  assert.doesNotMatch(learner, /Course completion alone does not grant any initiation/);
});

test("All five lessons have readable benefit cards and keep reached-step navigation", () => {
  for (const phase of ["flight", "tantra", "kundalini", "yggdrasil", "initiation"]) {
    assert.match(learner, new RegExp('    ' + phase + ': "'));
  }
  assert.match(learner, /energyworkLessons\.map\(\(lesson, number\) =>/);
  assert.match(learner, /programmeBenefits\[locale\]\[lesson\.phase\]/);
  assert.match(learner, /const unlocked = range\.start <= reachedIndex/);
  assert.match(learner, /disabled=\{busy \|\| sync === "checking" \|\| !unlocked\}/);
  assert.match(learner, /jumpToSlide\(lesson\.firstSlideId\)/);
  assert.match(learner, /aria-current=\{currentLessonRange\?\.lesson === number \+ 1/);
  assert.match(learner, /<summary className=\{styles\.programmeSummary\}>/);
  assert.match(learner, /<ol className=\{styles\.programmeList\}>/);
  assert.match(learner, /<aside className=\{styles\.preview\} aria-live="polite">/);
});

test("Three Reiki traditions retain their own description links inside the cards", () => {
  for (const path of ["reiki/tantra-reiki", "reiki/kundalini-reiki", "reiki/yggdrasil"]) {
    assert.ok(curriculum.includes('studyPath: "' + path + '"'), path);
  }
  assert.match(learner, /const system = energyworkPathChoices\.find\(\(choice\) => choice\.id === lesson\.phase\)/);
  assert.ok(learner.includes('href={"/" + locale + "/academy/" + system.studyPath}'));
  assert.ok(learner.includes('target="_blank" rel="noopener noreferrer"'));
  assert.ok(learner.includes('aria-label={lesson.title[locale] + " — " + t.systemDetails}'));
  assert.match(learner, /systemDetails: "About this practice"/);
  assert.match(learner, /systemDetails: "Об этой практике"/);
  assert.match(learner, /<span className=\{styles\.programmeLesson\}>\{lesson\.title\[locale\]\}<\/span>/);
});

test("Cards are high-contrast, accessible and independently scrollable on phones", () => {
  assert.match(styles, /REIKI PROGRAMME DISCOVERY/);
  for (const selector of [".programmeSummary", ".programmeCard", ".programmeLesson", ".programmeBenefit", ".programmeNumber", ".programmeLink:focus-visible", ".programmeJump:focus-visible"]) {
    assert.ok(styles.includes(selector), selector);
  }
  assert.match(styles, /\.programme\[open\]\s*\{[\s\S]*?overflow-y: auto/);
  assert.match(styles, /\.programme \.programmeLesson\s*\{[\s\S]*?color: #123f51/);
  assert.match(styles, /\.programme \.programmeJump:disabled\s*\{[\s\S]*?opacity: 1/);
  assert.match(styles, /@media \(max-width: 760px\)/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});
