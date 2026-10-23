import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const learner = read("components/energywork-ai-learner.tsx");
const css = read("components/energywork-ai-learner.module.css");
const curriculum = read("data/academy/energywork-ai-curriculum.ts");

test("Reiki welcome uses concise EN/RU course invitation without modifying lessons", () => {
  assert.match(learner, /data-reiki-welcome=\{slide\.kind === "welcome" \? "conversion-v2" : undefined\}/);
  for (const copy of [
    "FREE · FIVE-DAY REIKI COURSE", "БЕСПЛАТНЫЙ КУРС · 5 ДНЕЙ",
    "Your Reiki journey starts here", "Ваш путь в Рейки начинается здесь",
    "5 lessons", "5 уроков", "4 meditations", "4 медитации",
    "3 Reiki traditions", "3 системы Рейки",
  ]) assert.ok(learner.includes(copy), "Missing intro translation: " + copy);
  assert.match(learner, /slide\.kind === "welcome" \? t\.welcomeHeadline : slide\.title\[locale\]/);
  assert.match(learner, /slide\.kind === "welcome" \? t\.welcomeIntro : slide\.body\[locale\]/);
  assert.match(curriculum, /id: "welcome-video"/);
  assert.match(curriculum, /id: "welcome-01"/);
  assert.match(curriculum, /id: "flight-02"/);
  assert.match(curriculum, /videoKey: "flight-to-sun"/);
});

test("Initiation terms are present but hidden behind an explicit disclosure", () => {
  const begin = learner.indexOf('<div className={styles.welcomeReward}');
  const end = learner.indexOf('{slide.kind === "milestone" ? (', begin);
  assert.ok(begin > 0 && end > begin, "welcome reward remains rendered");
  const reward = learner.slice(begin, end);
  assert.match(reward, /data-reiki-initiation-gift/);
  assert.match(reward, /<strong>\{t\.welcomeGiftTitle\}<\/strong>/);
  assert.match(reward, /<p>\{t\.welcomeGiftPreview\}<\/p>/);
  assert.match(reward, /<details className=\{styles\.welcomeGiftDetails\}>/);
  assert.match(reward, /<p>\{t\.welcomeGiftText\}<\/p>/);
  assert.match(learner, /The course itself does not confer initiation/);
  assert.match(learner, /не является инициацией/);
});

test("One prominent start action with working previous step and private-save flow", () => {
  assert.match(learner, /data-energywork-next/);
  assert.match(learner, /slide\.kind === "welcome" \? t\.startFree : t\.continue/);
  assert.match(learner, /onClick=\{previous\}/);
  assert.match(learner, /onClick=\{next\}/);
  assert.match(learner, /data-reiki-private-save-status/);
  assert.match(learner, /sync === "guest" && slide\.kind !== "welcome"/);
  assert.match(learner, /<nav className=\{styles\.journey\} aria-label=\{t\.fiveLessons\}>/);
  assert.match(css, /\.page\[data-reiki-welcome="conversion-v2"\] \.journey \{ display: none; \}/);
  assert.match(css, /\.page\[data-reiki-welcome="conversion-v2"\] \.progressHeader,/);
});

test("Welcome reuses the owned portrait and fits short iPhones with scroll safety", () => {
  assert.match(learner, /reiki-approved-sunrise-v3\.webp/);
  assert.match(css, /REIKI WELCOME CONVERSION V2/);
  assert.match(css, /object-position: 67% 18%/);
  assert.match(css, /linear-gradient\(180deg, rgba\(247,252,248,\.04\)/);
  assert.match(css, /@media \(max-width: 760px\) and \(max-height: 700px\)/);
  assert.match(css, /justify-content: safe flex-end/);
  assert.match(css, /overflow-y: auto/);
  assert.match(css, /\.page\[data-reiki-welcome="conversion-v2"\] \.next/);
  assert.doesNotMatch(learner, /autoPlay|autoplay/);
});
