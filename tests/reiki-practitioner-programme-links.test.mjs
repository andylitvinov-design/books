import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const learner = read("components/energywork-ai-learner.tsx");
const styles = read("components/energywork-ai-learner.module.css");
const curriculum = read("data/academy/energywork-ai-curriculum.ts");

test("Expanded Reiki programme invites participation warmly in English and Russian", () => {
  assert.match(learner, /programmeIntro: "Your five-step journey is just beginning/);
  assert.match(learner, /programmeIntro: "Ваш путь из пяти шагов только начинается/);
  assert.match(learner, /welcomeTeacher: "Want to go further\?/);
  assert.match(learner, /welcomeTeacher: "Захочется пойти дальше\?/);
  assert.match(learner, /stop: "Enjoy learning at your own pace/);
  assert.match(learner, /stop: "Учитесь в своём ритме/);
  assert.doesNotMatch(learner, /Course completion alone does not grant any initiation/);
  assert.doesNotMatch(learner, /No medical advice or certification is provided here/);
  assert.match(learner, /<p className=\{styles\.programmeIntro\}>\{t\.programmeIntro\}<\/p>/);
});

test("Programme links lead to the three existing Reiki landing pages without losing the lesson list", () => {
  const paths = ["reiki/tantra-reiki", "reiki/kundalini-reiki", "reiki/yggdrasil"];
  for (const path of paths) assert.ok(curriculum.includes('studyPath: "' + path + '"'), path);
  assert.ok(learner.includes("const system = energyworkPathChoices.find((choice) => choice.id === lesson.phase)"));
  assert.ok(learner.includes('href={"/" + locale + "/academy/" + system.studyPath}'));
  assert.ok(learner.includes('target="_blank" rel="noopener noreferrer"'));
  assert.ok(learner.includes('aria-label={lesson.title[locale] + " — " + t.systemDetails}'));
  assert.match(learner, /systemDetails: "Learn more"/);
  assert.match(learner, /systemDetails: "Подробнее"/);
  assert.ok(learner.includes('<span className={styles.programmeLesson}>{lesson.title[locale]}</span>'));
  assert.match(learner, /<aside className=\{styles\.preview\} aria-live="polite">/);
});

test("Links are compact, focus-visible, and remain usable on small mobile screens", () => {
  assert.ok(styles.includes("/* Reiki programme invitation and system landing links */"));
  for (const rule of [".programmeIntro", ".programmeRow", ".programmeLesson", ".programmeLink", ".programmeLink:focus-visible"]) {
    assert.ok(styles.includes(rule), rule);
  }
  assert.match(styles, /\.programmeLink\s*\{[\s\S]*?min-height: 36px/);
  assert.match(styles, /@media \(max-width: 760px\)/);
  assert.match(styles, /\.programme\[open\][\s\S]*?overflow-y:auto/);
});
