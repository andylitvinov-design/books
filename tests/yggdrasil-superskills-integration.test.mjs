import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const guide = read("components/yggdrasil-source-study-guide.tsx");
const css = read("components/yggdrasil-source-study-guide.module.css");
const program = read("components/yggdrasil-program-landing.tsx");
const modules = read("components/yggdrasil-module-landing.tsx");
const book = read("components/yggdrasil-basic-course-description.tsx");

test("SuperSkills guide is integrated into all relevant public Reiki Yggdrasil routes", () => {
  assert.match(program, /<YggdrasilSourceStudyGuide locale=\{locale\} mode="overview"/);
  assert.match(modules, /module\.levelId === 1 \? <YggdrasilSourceStudyGuide locale=\{locale\} mode="basic"/);
  assert.match(modules, /module\.levelId === 2 \? <YggdrasilSourceStudyGuide locale=\{locale\} mode="instructor"/);
  assert.match(book, /basic-course#historical-study-materials/);
  assert.match(modules, /<YggdrasilCurriculum locale=\{locale\}/);
  assert.match(book, /<section className="yggdrasil-full-book"/);
});

test("source guide adds five expandable historical levels and exercises without overwriting canonical attunements", () => {
  assert.match(guide, /const levels: Array/);
  assert.match(guide, /\{levels\.map\(\(level, index\)/);
  assert.match(guide, /level\.exercises\[locale\]\.map/);
  assert.match(guide, /level\.topics\[locale\]\.map/);
  assert.match(guide, /const levelSources = \[/);
  assert.match(guide, /runic-reiki-yggdrasil-level-2\.html/);
  assert.match(guide, /runic-reiki-yggdrasil-level-3\.html/);
  assert.match(guide, /runic-reiki-yggdrasil-level-4\.html/);
  assert.match(guide, /runic-reiki-yggdrasil-level-5\.html/);
  assert.match(guide, /runic-reiki-practice\.html/);
  assert.match(guide, /current course remains the authority for the exact attunement list/);
});

test("instructor library, free initiation and FAQ are provenance-linked in three languages", () => {
  assert.match(guide, /const instructorTracks: Array/);
  assert.match(guide, /\{instructorTracks\.map\(\(track, index\)/);
  assert.match(guide, /reiki-yggdrasil-levels-description\.html/);
  assert.match(guide, /faq-how-to-study-runic-reiki-yggdrasil\.html/);
  assert.match(guide, /step-0-how-to-get-runic-reiki-initiation-free\.html/);
  assert.match(guide, /testimonials-1\.html/);
  assert.match(guide, /testimonials-2\.html/);
  assert.match(guide, /const copy: Record<PublicLocale/);
  for (const locale of ["en", "ru", "es"]) assert.match(guide, new RegExp("^  " + locale + ": \\{", "m"));
});

test("course content is medical-safe, clearly labelled historical and mobile-readable", () => {
  assert.match(guide, /Historical themes/);
  assert.match(guide, /not clinical diagnoses|not clinical diagnosis|not clinical diagnoses,|not clinical|not as medical advice/);
  assert.match(guide, /not reliable diagnoses|not guaranteed outcomes|not evidence of guaranteed results/);
  assert.match(guide, /not medical treatment|not advice|not clinical diagnoses, medical treatment/);
  assert.match(guide, /<details className=\{styles\.level\}/);
  assert.match(guide, /target="_blank" rel="noopener noreferrer"/);
  assert.match(css, /@media \(max-width: 650px\)/);
  assert.match(css, /\.questions/);
});
