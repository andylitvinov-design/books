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

test("free initiation is the single EN/RU/ES six-stage landing in the revised order", () => {
  assert.match(routes, /if \(child === "free-initiation"\) return <YggdrasilFreeInitiation locale=\{locale\} \/>/);
  assert.match(routes, /languages: \{ en:.*ru:.*es:/);
  for (const marker of ["  en: {", "  ru: {", "  es: {"]) {
    assert.ok(page.includes(marker), marker);
    assert.ok(form.includes(marker), "Form locale " + marker);
  }
  const ordered = ["why-yggdrasil", "choose-initiation", "how-to-free", "intro-video", "preparation-readings", "checklist", "request-free-initiation"];
  const positions = ordered.map(id => page.lastIndexOf('id="' + id + '"'));
  assert.ok(positions.every((n,i) => n >= 0 && (i === 0 || n > positions[i-1])), "ordered six sections and nested book links");
  assert.match(page, /<YggdrasilInitiationForm locale=\{locale\} \/>/);
  assert.doesNotMatch(page, /<YggdrasilSideNavigation|<PublicConsultationCta/);
});

test("both owner's existing recordings appear in one compact video-and-books screen", () => {
  const registry = read("data/academy/english-guided-meditations.ts");
  assert.match(registry, /key: "reiki-yggdrasil"[\s\S]+?youtubeId: "80xZ7jN6o2Y"/);
  assert.match(page, /originalLevelOneVideoId = "DYo-fG-SyKw"/);
  assert.match(page, /<AcademyVideoPlayer youtubeId=\{originalLevelOneVideoId\} title=\{c\.videoTitle\}/);
  assert.match(page, /<AcademyVideoPlayer youtubeId=\{recording\.youtubeId\} title=\{recording\.title\}/);
  assert.equal((page.match(/<AcademyVideoPlayer /g)||[]).length,2);
  assert.match(page, /href=\{root \+ "\/basic-course"\}/);
  assert.match(page, /href=\{root \+ "\/basic-course\/description"\}/);
  assert.match(layout, /\.videoGrid\s*\{/);
  assert.match(layout, /\.quickLinks\s*\{/);
  assert.match(layout, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(layout, /\.videoTile \.videoFrame :global\(\.academy-video-frame\)/);
});

test("three visible preparation steps lead to the videos, two study links and seven questions", () => {
  assert.equal((page.match(/howSteps: \[/g)||[]).length,3);
  assert.match(page, /howTitle: "How to receive Level 1 for free"/);
  assert.match(page, /howTitle: "Как получить Рейки Иггдрасиль бесплатно"/);
  assert.match(page, /howTitle: "Cómo recibir Reiki Yggdrasil gratis"/);
  assert.match(page, /t\.howSteps\.map\(\(step, index\)/);
  assert.match(page, /href=\{\["#intro-video", "#preparation-readings", "#checklist"\]\[index\]\}/);
  assert.match(page, /href="#how-to-free"/);
});

test("seven original questions remain large, high-contrast, localized and not hidden", () => {
  const blocks = [...page.matchAll(/    questions: \[([\s\S]*?)\n    \],\n    statement:/g)];
  assert.equal(blocks.length,3);
  for (const [i, m] of blocks.entries()) {
    assert.equal(m[1].split("\n").filter(l => /^\s*"/.test(l)).length,7,"seven for locale " + i);
  }
  assert.match(page, /<ol className=\{styles\.questions\}>/);
  assert.match(page, /What differences does the author claim/);
  assert.match(page, /Чем автор системы объясняет/);
  assert.match(page, /¿Cómo explica el autor/);
  assert.match(page, /Money Stream Activation/);
  assert.match(page, /not established medical facts|не доказанными медицинскими фактами/);
  assert.match(layout, /\.questionsSlide\s*\{[\s\S]*?background: linear-gradient\(147deg,#153c55/);
  assert.match(layout, /\.questionsSlide \.questions li\s*\{[\s\S]*?font: 650 17px/);
  assert.match(layout, /\.questionsSlide \.questions li::before/);
});

test("mobile two-column compact initiation offers fit together, and capture matches site colors", () => {
  assert.match(page, /className=\{styles\.offerGrid\}/);
  assert.match(page, /offerDescriptionSmall/);
  assert.match(page, /freeActionMobile/);
  assert.match(page, /personalActionMobile/);
  assert.match(layout, /@media \(max-width: 720px\)[\s\S]*?\.choiceSlide \.offerGrid \{ grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(layout, /\.choiceSlide \.freeOffer,\.choiceSlide \.personalOffer \{[\s\S]*?min-height: 237px/);
  assert.match(layout, /\.formSlide \.formOption\[data-selected="true"\][\s\S]*?background: #1a4b66/);
  assert.match(layout, /\.formSlide \.formSubmit \{ background:#8c3f51/);
});

test("the final form requires no email or account but retains the four routes and answer sharing", () => {
  assert.match(form, /type Intent = "free" \| "personal" \| "pdf" \| "answers"/);
  assert.match(form, /const intents: Intent\[\] = \["free", "personal", "pdf", "answers"\]/);
  assert.match(form, /data-yggdrasil-form/);
  for(const intent of ["free","personal","pdf","answers"]) assert.ok(form.includes('id="apply-' + intent + '"'));
  assert.match(form, /Ваше имя \(необязательно\)/);
  assert.doesNotMatch(form, /autoComplete="email"|name="contact"|setContact|placeholder=\{t\.namePlaceholder\} required/);
  assert.match(form, /reiki-guide\?course=yggdrasil/);
  assert.match(form, /navigator\.canShare\(\{ files: \[attachment\] \}\)/);
  assert.match(form, /navigator\.share\(\{ title: "Reiki Yggdrasil", text: message, files: \[attachment\] \}\)/);
  assert.match(form, /WHATSAPP_NUMBER/);
  assert.match(form, /https:\/\/t\.me\/AndyTherapist/);
  assert.doesNotMatch(form, /localStorage|fetch\("/);
});

test("the single landing is not interrupted by unrelated sitewide promotions", () => {
  assert.match(read("lib/public-lead-capture.js"), /free-initiation/);
  assert.match(read("components/sitewide-antistress-banner.tsx"), /free-initiation/);
  assert.doesNotMatch(page, /<PublicConsultationCta/);
});

test("entry stays discoverable from programme, book, course, sidebar and capture", () => {
  for (const [name,value] of [
    ["Programme",hub],["Basic course",modulePage],["Book",book],["Sidebar",sidebar],["Course capture",capture],
  ]) assert.ok(value.includes("/free-initiation"), name);
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
