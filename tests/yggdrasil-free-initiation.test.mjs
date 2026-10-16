import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const page = read("components/yggdrasil-free-initiation.tsx");
const layout = read("components/yggdrasil-free-initiation.module.css");
const form = read("components/yggdrasil-initiation-form.tsx");
const routes = read("app/[locale]/academy/[[...slug]]/page.tsx");
const hub = read("components/yggdrasil-program-landing.tsx");
const modulePage = read("components/yggdrasil-module-landing.tsx");
const book = read("components/yggdrasil-basic-course-description.tsx");
const sidebar = read("components/reiki-course-side-nav.tsx");
const capture = read("components/reiki-choice-capture.tsx");
const sourceGuide = read("components/yggdrasil-source-study-guide.tsx");
const audit = read("docs/yggdrasil-superskills-audit-2026-10-09.md");

test("free initiation is a single localized six-screen landing in requested order", () => {
  assert.match(routes, /if \(child === "free-initiation"\) return <YggdrasilFreeInitiation locale=\{locale\} \/>/);
  assert.match(routes, /languages: \{ en:.*ru:.*es:/);
  for (const marker of ["  en: {", "  ru: {", "  es: {"]) {
    assert.ok(page.includes(marker), marker);
    assert.ok(form.includes(marker), "Form translation " + marker);
  }
  const orderedSections = [
    'id="why-yggdrasil"',
    'id="choose-initiation"',
    'id="checklist"',
    'id="intro-video"',
    'id="preparation-readings"',
    'id="request-free-initiation"',
  ];
  const positions = orderedSections.map((section) => page.lastIndexOf(section));
  assert.ok(positions.every(x => x >= 0), "all six sections");
  assert.ok(positions.every((position,i) => i === 0 || position > positions[i-1]), "correct six-screen order");
  assert.match(page, /<YggdrasilInitiationForm locale=\{locale\} \/>/);
  assert.match(page, /className=\{styles\.heroVisual\}/);
  assert.doesNotMatch(page, /<YggdrasilSideNavigation|<PublicConsultationCta/);
});

test("all seven source preparation questions are visible, numbered, translated and explicitly educational", () => {
  const blocks = [...page.matchAll(/    questions: \[([\s\S]*?)\n    \],\n    statement:/g)];
  assert.equal(blocks.length, 3, "EN RU ES question lists");
  for (const [index, match] of blocks.entries()) {
    assert.equal(match[1].split("\n").filter((line) => /^\s*"/.test(line)).length, 7, "locale " + index);
  }
  assert.match(page, /<ol className=\{styles\.questions\}>/);
  assert.match(page, /What differences does the author claim/);
  assert.match(page, /Чем автор системы объясняет/);
  assert.match(page, /¿Cómo explica el autor/);
  assert.match(page, /Money Stream Activation/);
  assert.match(page, /not established medical facts|не доказанными медицинскими фактами/);
  assert.doesNotMatch(page, /superskills\.vip/);
});

test("page reuses Andy's verified existing Reiki Yggdrasil landing video, course levels and book", () => {
  const registry = read("data/academy/english-guided-meditations.ts");
  assert.match(registry, /key: "reiki-yggdrasil"[\s\S]+?youtubeId: "80xZ7jN6o2Y"/);
  assert.match(page, /englishGuidedMeditations\.find\(\(item\) => item\.key === "reiki-yggdrasil"\)/);
  assert.match(page, /<AcademyVideoPlayer youtubeId=\{recording\.youtubeId\}/);
  assert.doesNotMatch(page, /DYo-fG-SyKw/);
  for(const excerpt of [
    'root + "/basic-course/description"',
    'root + "/basic-course#ry-l01-s01"',
    'root + "/basic-course#yggdrasil-basic-course-learning"',
    'root + "#system-modules"',
    'id="learning-faq"',
  ]) assert.ok(page.includes(excerpt), excerpt);
  assert.match(page, /formatReikiLevelPrice\("yggdrasil", locale\)/);
  assert.match(page, /<Link href=\{href\} key=\{href\}/);
});

test("one final registration form offers free, personal, PDF and answer-sharing modes", () => {
  assert.match(form, /type Intent = "free" \| "personal" \| "pdf" \| "answers"/);
  assert.match(form, /const intents: Intent\[\] = \["free", "personal", "pdf", "answers"\]/);
  assert.match(form, /data-yggdrasil-form/);
  for (const intent of ["free","personal","pdf","answers"]) {
    assert.ok(form.includes('id="apply-' + intent + '"'));
    assert.match(form, new RegExp('data-intent=\\{intent\\}'));
  }
  assert.match(form, /reiki-guide\?course=yggdrasil/);
  assert.match(form, /onSubmit=\{submit\}/);
  assert.match(form, /name="name"/);
  assert.match(form, /name="contact"/);
  assert.match(form, /accept="\.pdf,\.doc,\.docx,\.txt,\.rtf,\.jpg,\.jpeg,\.png"/);
  assert.match(form, /navigator\.canShare\(\{ files: \[attachment\] \}\)/);
  assert.match(form, /navigator\.share\(\{ title: "Reiki Yggdrasil", text: message, files: \[attachment\] \}\)/);
  assert.match(form, /WHATSAPP_NUMBER/);
  assert.match(form, /https:\/\/t\.me\/AndyTherapist/);
  assert.match(form, /No public upload endpoint exists/);
  assert.doesNotMatch(form, /localStorage|fetch\("/);
});

test("landing is responsive, and no duplicate sitewide promotional capture appears", () => {
  const lead = read("lib/public-lead-capture.js");
  const ribbon = read("components/sitewide-antistress-banner.tsx");
  assert.match(lead, /free-initiation/);
  assert.match(ribbon, /free-initiation/);
  assert.match(layout, /\.hero\s*\{/);
  assert.match(layout, /\.formOptions\s*\{/);
  assert.match(layout, /@media \(max-width: 720px\)/);
  assert.match(layout, /\.questions li:nth-child\(7\)/);
  assert.match(layout, /\.formFields\s*\{/);
});

test("the entry stays discoverable from the main programme, book, course and navigation", () => {
  for (const [name,value] of [
    ["Programme",hub],["Basic course",modulePage],["Book",book],["Sidebar",sidebar],["Course capture",capture],
  ]) assert.ok(value.includes("/free-initiation"), name);
  assert.match(capture, /selected === "express"/);
});

test("source audit covers all 17 distinct verified Reiki articles and the historical $0 product listing", () => {
  for (let n = 1; n <= 17; n++) assert.match(audit, new RegExp("^\\| " + n + " \\|", "m"));
  const paths = [
    "runic-reiki-yggdrasil-brief-description.html",
    "gift-runic-reiki-level-1-free-initiation.html",
    "what-is-runic-reiki-detailed-overview.html",
    "retreat-1-details-basic-5-levels-of-initiation-into-runic-reiki.html",
    "runic-reiki-yggdrasil-level-2.html",
    "runic-reiki-yggdrasil-level-3.html",
    "runic-reiki-yggdrasil-level-4.html",
    "runic-reiki-yggdrasil-level-5.html",
    "runic-reiki-practice.html",
    "questions-to-get-the-free-class-of-runic-reiki.html",
    "free-trial-runic-reiki-energy-healing-class.html",
    "free-trial-runic-reiki-initiation-level-1.html",
    "faq-how-to-study-runic-reiki-yggdrasil.html",
    "step-0-how-to-get-runic-reiki-initiation-free.html",
    "reiki-yggdrasil-levels-description.html",
    "testimonials-1.html",
    "testimonials-2.html",
  ];
  const allContent = audit + sourceGuide;
  for (const path of paths) assert.ok(allContent.includes(path), "source missing: " + path);
  assert.match(sourceGuide, /Supplementary reflection exercises \(not from the source\)/);
  assert.match(audit, /seven.*questions/i);
  assert.match(audit, /seven modules, 37 steps, 177 attunements/);
});
