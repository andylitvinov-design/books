import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const page = read("components/yggdrasil-free-initiation.tsx");
const layout = read("components/yggdrasil-free-initiation.module.css");
const routes = read("app/[locale]/academy/[[...slug]]/page.tsx");
const hub = read("components/yggdrasil-program-landing.tsx");
const modulePage = read("components/yggdrasil-module-landing.tsx");
const book = read("components/yggdrasil-basic-course-description.tsx");
const sidebar = read("components/reiki-course-side-nav.tsx");
const capture = read("components/reiki-choice-capture.tsx");
const sourceGuide = read("components/yggdrasil-source-study-guide.tsx");
const audit = read("docs/yggdrasil-superskills-audit-2026-10-09.md");

test("dedicated, indexed Level 1 initiation article supports three real locales and SEO", () => {
  assert.match(routes, /if \(child === "free-initiation"\) return <YggdrasilFreeInitiation locale=\{locale\} \/>/);
  assert.match(routes, /if \(child === "free-initiation"\) return locale === "ru"/);
  assert.match(routes, /: child === "free-initiation"/);
  assert.match(routes, /languages: \{ en:.*ru:.*es:/);
  for (const marker of ["  en: {", "  ru: {", "  es: {"]) assert.ok(page.includes(marker), marker);
  assert.match(page, /const copy: Record<PublicLocale, LocaleStrings>/);
  assert.match(page, /<YggdrasilSideNavigation locale=\{locale\} activeSlug="free-initiation"/);
});

test("all seven original preparation questions are visible, numbered, localized and not hidden behind a form", () => {
  const blocks = [...page.matchAll(/    questions: \[([\s\S]*?)\n    \],\n    statement:/g)];
  assert.equal(blocks.length, 3, "expected EN, RU, ES question lists");
  for (const [index, match] of blocks.entries()) {
    const items = match[1].split("\n").filter((x) => /^\s*"/.test(x));
    assert.equal(items.length, 7, "locale " + index + " needs exactly seven original questions");
  }
  assert.ok(!page.includes('superskills.vip'));
  assert.ok(page.includes('<Link href={url} key={url}>'));
  assert.match(page, /id="learning-faq"/);
  assert.match(page, /<ol className=\{styles\.questions\}>/);
  assert.match(page, /What differences does the author claim/);
  assert.match(page, /Чем автор системы объясняет/);
  assert.match(page, /Qué|Qué fundamenta|¿Cómo explica el autor/);
  assert.match(page, /Пантеон|пантеон|пантеонами/);
  assert.match(page, /Money Stream Activation/);
});

test("entry includes three honest study options, required readings and post-initiation guide", () => {
  const choiceBlocks = [...page.matchAll(/    choices: \[([\s\S]*?)\n    \],\n    stepsTitle:/g)];
  assert.equal(choiceBlocks.length, 3);
  for (const block of choiceBlocks) assert.equal([...block[1].matchAll(/\{ title:/g)].length, 3);
  assert.match(page, /afterTitle:/);
  assert.match(page, /after-first-level/);
  assert.ok(page.includes('root + "/basic-course/description"'));
  assert.ok(page.includes('root + "/basic-course#ry-l01-s01"'));
  assert.ok(page.includes('root + "/basic-course#yggdrasil-basic-course-learning"'));
  assert.ok(page.includes('const learningFaqs: Record<PublicLocale'));
  assert.match(page, /const whatsAppHref =/);
  assert.match(page, /encodeURIComponent\(msg\)/);
  assert.match(page, /https:\/\/t.me\/AndyTherapist/);
  assert.doesNotMatch(page, /<form[\s>]/);
  assert.match(page, /not established medical facts|не доказанными медицинскими фактами/);
  assert.match(page, /availability|доступность|disponibilidad/);
});

test("the new article is discoverable from the programme, basic course, book, source guide, sidebar and lead capture", () => {
  for (const [name, value] of [
    ["overview CTA", hub],
    ["Basic Course breadcrumb", modulePage],
    ["38-page book", book],
    ["sticky sidebar", sidebar],
    ["free capture", capture],
  ]) assert.ok(value.includes("/free-initiation"), name);
  assert.doesNotMatch(hub, /<YggdrasilSourceStudyGuide/);
  assert.match(capture, /selected === "free"/);
  assert.match(capture, /data-reiki-choice-action=\{selected\}/);
  assert.match(sidebar, /key: "free-initiation"/);
  assert.match(layout, /@media\(max-width:720px\)/);
  assert.match(layout, /scroll-margin-top/);
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
