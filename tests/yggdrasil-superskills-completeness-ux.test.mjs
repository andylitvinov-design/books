import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const landing = read("components/yggdrasil-program-landing.tsx");
const modules = read("components/yggdrasil-module-landing.tsx");
const curriculum = read("components/yggdrasil-curriculum.tsx");
const guide = read("components/yggdrasil-source-study-guide.tsx");
const oldLibrary = read("components/yggdrasil-superskills-sources-page.tsx");
const nav = read("components/reiki-course-side-nav.tsx");
const free = read("components/yggdrasil-free-initiation.tsx");
const reviews = read("components/yggdrasil-testimonials.tsx");
const styles = read("components/yggdrasil-curriculum-visual.module.css");

test("one first-party seven-module curriculum replaces the separate source library", () => {
  assert.match(landing, /yggdrasilModuleLandings\.map/);
  assert.match(landing, /basicSteps\.map/);
  assert.doesNotMatch(landing, /<YggdrasilSourceStudyGuide/);
  assert.doesNotMatch(landing, /yggdrasil-source-footer-panel/);
  assert.doesNotMatch(modules, /<YggdrasilSourceStudyGuide/);
  assert.doesNotMatch(modules, /<Link href=\{\`\/\$\{locale\}\/academy\/reiki\/yggdrasil\/archive/);
  assert.doesNotMatch(nav, /#source-study-guide|key: "superskills-sources"/);
  assert.match(oldLibrary, /redirect\("\/" \+ locale \+ "\/academy\/reiki\/yggdrasil#system-modules"\)/);
});

test("all five actual Basic Course steps carry unique exercises in collapsed learning kits", () => {
  assert.match(guide, /export const yggdrasilBasicLearning = levels/);
  assert.match(curriculum, /yggdrasilBasicLearning\[step\.number - 1\]/);
  assert.match(curriculum, /basicLearning\.exercises\[locale\]\.map/);
  assert.match(curriculum, /suggestedPracticeLevel: Record<number, number> = \{ 1: 0, 4: 1, 5: 2 \}/);
  assert.match(curriculum, /step\.number === 5 \? <small>\{kit\.reflection\}/);
  assert.match(curriculum, /<details className=\{visualStyles\.studyKit\}>/);
  assert.doesNotMatch(curriculum, /exercises\.map\(\(exercise\) => <article/);
  const sourceLevels = guide.split("const levels: Array")[1].split("const instructorTracks:")[0];
  assert.equal((sourceLevels.match(/title: \{ en:/g) ?? []).length, 5);
  assert.equal((sourceLevels.match(/exercises: \{/g) ?? []).length, 5);
});

test("Instructor course has 23 audited settings but only one six-step learner syllabus", () => {
  const sourceInstructor = guide.split("const instructorTracks:")[1].split("const resources:")[0];
  const settings = [...sourceInstructor.matchAll(/themes: \{ en: \[([^\]]+)\], ru: \[([^\]]+)\], es: \[([^\]]+)\] \}/g)];
  assert.equal(settings.length, 6);
  assert.deepEqual(settings.map((row) => row[1].split(", ").length), [4, 3, 4, 4, 3, 5]);
  assert.equal(settings.reduce((n, row) => n + row[1].split(", ").length, 0), 23);
  assert.match(curriculum, /yggdrasilInstructorLearning\[step\.number === 5 \? 5 : step\.number === 6 \? 4 : step\.number - 1\]/);
  assert.match(curriculum, /instructorExercises\[locale\]\[step\.number - 1\]/);
  assert.doesNotMatch(modules, /mode="instructor"/);
  assert.doesNotMatch(modules, /mode="basic"/);
});

test("nineteen original source URLs stay documented, not promoted as separate learner links", () => {
  const resourceBlock = guide.split("const resources:")[1].split("const resourceCategories:")[0];
  assert.equal((resourceBlock.match(/^  \{ url:/gm) ?? []).length, 14);
  assert.match(resourceBlock, /\.\.\.levelSources\.map/);
  assert.match(guide, /reiki-yggdrasil-levels-description\.html/);
  assert.match(guide, /testimonials-1\.html/);
  assert.doesNotMatch(landing, /superskills\.vip|psitrends\.com\/ru\/cat-train/);
  assert.doesNotMatch(free, /href=\{(?:readingSource|freeInitiationSource|exerciseSource)\}/);
  assert.doesNotMatch(reviews, /href=\{item\.sourceUrl\}/);
  assert.doesNotMatch(reviews, /historical-links/);
});

test("free Level 1 is first-party and keeps seven questions, video and teacher contact", () => {
  const blocks = [...free.matchAll(/    questions: \[([\s\S]*?)\n    \],\n    statement:/g)];
  assert.equal(blocks.length, 3);
  for (const [i, block] of blocks.entries()) {
    assert.equal(block[1].split("\n").filter((line) => /^\s*"/.test(line)).length, 7, "locale " + i);
  }
  assert.match(free, /AcademyVideoPlayer youtubeId="DYo-fG-SyKw"/);
  assert.match(free, /id="learning-faq"/);
  assert.match(free, /root \+ "\/basic-course\/description"/);
  assert.match(free, /encodeURIComponent\(msg\)/);
  assert.match(free, /https:\/\/t\.me\/AndyTherapist/);
});

test("responsive, accessible lesson disclosure has safe outcomes and concise mobile spacing", () => {
  assert.match(styles, /\.studyKit > summary:focus-visible/);
  assert.match(styles, /@media \(max-width: 700px\)/);
  assert.match(styles, /\.studyKitLinks a/);
  assert.match(curriculum, /teacher-led|teacher-guided|diagnos|consent|согласи|consentimiento/i);
  assert.match(free, /not established medical facts|не доказанными медицинскими фактами/);
});
