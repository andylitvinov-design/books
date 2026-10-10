import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const program = read("components/yggdrasil-program-landing.tsx");
const modules = read("components/yggdrasil-module-landing.tsx");
const curriculum = read("components/yggdrasil-curriculum.tsx");
const guide = read("components/yggdrasil-source-study-guide.tsx");
const book = read("components/yggdrasil-basic-course-description.tsx");
const nav = read("components/reiki-course-side-nav.tsx");
const free = read("components/yggdrasil-free-initiation.tsx");

test("the public reading path is one course map followed by actual lesson pages", () => {
  assert.match(program, /id="system-modules"/);
  assert.match(program, /7 Reiki Yggdrasil modules/);
  assert.match(program, /7 модулей Рейки Иггдрасиль/);
  assert.match(program, /\/basic-course#\$\{step\.id\.toLowerCase\(\)\}/);
  assert.match(modules, /<YggdrasilCurriculum locale=\{locale\}/);
  assert.match(curriculum, /<details className=\{visualStyles\.studyKit\}>/);
  assert.match(book, /basic-course#yggdrasil-basic-course-learning/);
  assert.doesNotMatch(book, /basic-course#historical-study-materials/);
  assert.doesNotMatch(program, /YggdrasilSourceStudyGuide/);
  assert.doesNotMatch(nav, /#source-study-guide/);
});

test("integrated lessons preserve the audited basic curriculum and video content", () => {
  assert.match(guide, /const levels: Array/);
  assert.match(guide, /export const yggdrasilBasicLearning = levels/);
  assert.match(guide, /export const yggdrasilInstructorLearning = instructorTracks/);
  assert.match(guide, /runic-reiki-practice\.html/);
  assert.match(curriculum, /basicLearning\.description\[locale\]/);
  assert.match(curriculum, /basicLearning\.exercises\[locale\]\.map/);
  assert.match(curriculum, /instructorLearning\.description\[locale\]/);
  assert.match(curriculum, /yggdrasil-step-video-library/);
  assert.match(curriculum, /englishVideos\.map/);
  assert.match(curriculum, /russianVideos\.map/);
});

test("free initiation and FAQ link only into the canonical public learning pages", () => {
  assert.match(program, /\/free-initiation/);
  assert.match(modules, /\/free-initiation/);
  assert.match(book, /\/free-initiation/);
  assert.match(free, /id="learning-faq"/);
  assert.match(free, /reading\.map/);
  assert.match(free, /<Link href=\{url\} key=\{url\}>/);
  assert.match(free, /root \+ "\/basic-course\/description"/);
  assert.match(free, /root \+ "\/basic-course#ry-l01-s01"/);
  assert.doesNotMatch(free, /superskills\.vip/);
  assert.match(free, /AcademyVideoPlayer youtubeId="DYo-fG-SyKw"/);
});

test("source records remain for provenance without duplicate five or six level lists in the customer journey", () => {
  assert.match(guide, /const instructorTracks: Array/);
  assert.match(guide, /const levelSources = \[/);
  assert.match(guide, /const resources: Array/);
  assert.doesNotMatch(modules, /<YggdrasilSourceStudyGuide/);
  assert.doesNotMatch(program, /<YggdrasilSourceStudyGuide/);
  assert.doesNotMatch(program, /yggdrasil-source-footer-panel/);
});
