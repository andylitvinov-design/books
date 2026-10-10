import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("mobile first screen shows Taoist artwork and a concise high-contrast hero", async () => {
  const [page, css] = await Promise.all([read("components/academy-record-page.tsx"), read("app/academy.css")]);
  assert.match(page, /className="tantra-course-hero__tao-seal"/);
  assert.match(page, /<svg viewBox="0 0 100 100"/);
  assert.match(page, /className="tantra-course-hero__visual"/);
  assert.match(css, /\.academy-reading-shell--tantra \.tantra-course-hero/);
  assert.match(css, /linear-gradient\(138deg, #173e36/);
  assert.match(css, /\.academy-reading-shell--tantra \.academy-reading-header \{ display: none; \}/);
  assert.match(css, /\.academy-reading-shell--tantra \.tantra-course-hero__visual \{ position: absolute/);
});

test("real festival photos are restored to levels and visual gallery, not mislabelled as reviews", async () => {
  const [journey, festival, reviews, sourceRaw] = await Promise.all([
    read("components/tantra-reiki-journey.tsx"),
    read("components/tantra-reiki-story.tsx"),
    read("components/tantra-reiki-testimonials.tsx"),
    read("data/academy/tantra-reiki-full.generated.json"),
  ]);
  const images = JSON.parse(sourceRaw).images.ru;
  const stagePart = journey.slice(journey.indexOf("const levelPhotos = ["), journey.indexOf("] as const;", journey.indexOf("const levelPhotos = [")));
  const stageIds = [...stagePart.matchAll(/tantraReikiArchive\.images\.ru\[(\d+)\]/g)].map((x)=>Number(x[1]));
  assert.equal(stageIds.length, 9);
  assert.equal(new Set(stageIds).size, 9);
  assert.deepEqual(stageIds.slice(0, 6), [17,18,19,20,21,22]);
  for (const index of stageIds) assert.doesNotMatch(images[index], /Screenshot_/);
  for (const index of [0,10,11]) assert.match(festival, new RegExp("images\\.ru\\[" + index + "\\]"));
  assert.doesNotMatch(reviews, /reviewImages|tantra-review-archive|tantra-review-gallery/);
  assert.match(festival, /className="tantra-festival-moments__gallery"/);
});

test("only the three secondary level sections collapse, never the original author story", async () => {
  const journey = await read("components/tantra-reiki-journey.tsx");
  const author = journey.indexOf('<div className="tantra-journey__author-text"');
  const expandable = journey.indexOf('<details className="tantra-journey__extras">');
  const actions = journey.indexOf('<div className="tantra-journey__actions">');
  assert.ok(author > 0 && author < expandable && expandable < actions);
  const end = journey.indexOf("</details>", expandable);
  const details = journey.slice(expandable, end);
  assert.match(details, /tantra-journey__application/);
  assert.match(details, /tantra-journey__settings/);
  assert.match(details, /tantra-journey__practice/);
  assert.match(details, /<summary>/);
  assert.doesNotMatch(journey, /<details className="tantra-journey__extras" open/);
});

test("correct Level 1 meditation remains separate and immediately precedes testimonials", async () => {
  const [page, meditations, videos, reviews] = await Promise.all([
    read("components/academy-record-page.tsx"),
    read("components/english-guided-meditations.tsx"),
    read("data/academy/english-guided-meditations.ts"),
    read("components/tantra-reiki-testimonials.tsx"),
  ]);
  assert.match(page, /<EnglishGuidedMeditations focus="tantra-reiki"/);
  assert.match(videos, /youtubeId: "w2BN-HYmHUk"/);
  assert.match(meditations, /isTantraVideo/);
  assert.match(meditations, /Tantra Reiki · Level 1 Guided Meditation/);
  assert.match(meditations, /Follow Andrey’s Level 1 video practice/);
  assert.match(meditations, /!isTantraVideo \? <p>\{item\.description\}<\/p> : null/);
  assert.match(reviews, /englishSource\.blocks\[sourceIndex\]\.text/);
  assert.match(reviews, /qM_nFUkYJ1k/);
  assert.ok(page.indexOf('<EnglishGuidedMeditations focus="tantra-reiki"') < page.indexOf('<TantraReikiTestimonials locale='));
});

test("detailed writings are split into compact modules without discarding original data", async () => {
  const [page, modules, translatedRaw, sourceRaw] = await Promise.all([
    read("components/academy-record-page.tsx"),
    read("components/tantra-reiki-programme-modules.tsx"),
    read("data/academy/tantra-reiki-ru-en.generated.json"),
    read("data/academy/tantra-reiki-full.generated.json"),
  ]);
  assert.match(page, /<TantraReikiProgrammeModules locale=\{locale\} publicBlocks=\{publicBlocks\}/);
  assert.match(modules, /id="tantra-full-source"/);
  assert.doesNotMatch(modules, /Complete archive|Complete Tantra Reiki system text/);
  const blocks = JSON.parse(translatedRaw).blocks;
  const archive = JSON.parse(sourceRaw);
  assert.equal(blocks.length, 190);
  assert.equal(archive.blocks.en.length, 102);
  const fromTo = [[0,11],[11,48],[48,69],[69,98],[98,124],[124,151],[151,178],[178,blocks.length]];
  assert.equal(fromTo.reduce((n,[a,b])=>n+b-a,0), blocks.length);
  assert.match(modules, /blocks\.slice\(from, to\)/);
  assert.match(modules, /originalRussianEnglishTranslation\.blocks\.map/);
  assert.match(modules, /<details className="tantra-reading__module"/);
});

test("approved Andy portrait precedes a compact blue three-choice Reiki capture", async () => {
  const [page, teacher, leads, capture, css] = await Promise.all([
    read("components/academy-record-page.tsx"),
    read("components/tantra-reiki-story.tsx"),
    read("components/tantra-reiki-lead-forms.tsx"),
    read("components/reiki-choice-capture.tsx"),
    read("components/reiki-choice-capture.module.css"),
  ]);
  assert.match(page, /<TantraReikiTeacher locale=\{locale\}/);
  assert.match(page, /<TantraReikiLeadForms locale=\{locale\}/);
  assert.ok(page.indexOf('<TantraReikiTeacher locale=') < page.indexOf('<TantraReikiLeadForms locale='));
  assert.match(teacher, /\/images\/holistic-house\/andy-about\.png/);
  assert.match(leads, /<ReikiChoiceCapture locale=\{locale\} course="tantra"/);
  assert.match(capture, /Book a free express initiation|Free express initiation/);
  assert.match(capture, /Tantra Reiki Master Course/);
  assert.match(capture, /data-reiki-choice-action=\{selected\}/);
  assert.match(capture, /aria-pressed=\{selected === choice\}/);
  assert.match(capture, /wa\.me\/14376066502/);
  assert.doesNotMatch(leads, /<input|<select|<textarea|<form/);
  assert.match(css, /linear-gradient\(125deg, #e9f7fe/);
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});
