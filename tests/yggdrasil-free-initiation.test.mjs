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

// Owner PR1272 preserves the public EN/RU/ES questions exactly, in this order.
const approvedPreparationQuestions = {
  "en": [
    "Which is more fundamental to the Runic Reiki system: Reiki, runes, or their combination?",
    "What differences does the author claim between Runic Reiki and classical Usui Reiki, and how are these claims explained within the tradition?",
    "What does Yggdrasil, the World Tree, represent in Scandinavian tradition and in the course?",
    "What is the Healing stream or attunement in Runic Reiki, and how is it traditionally described as being used?",
    "How is the Protection stream described, and in what situations do students practise it?",
    "What is the Money Stream Activation attunement, and what symbolic or practical purposes does the course associate with it?",
    "Which pantheons and deities does the course introduce for study at Level 5?"
  ],
  "ru": [
    "Что лежит в основе системы Рейки Иггдрасиль — Рейки, руны или их сочетание?",
    "Чем автор системы объясняет заявленные отличия Рейки Иггдрасиль от классического Усуи Рейки?",
    "Что такое Иггдрасиль — Мировое Древо — в скандинавской традиции и в системе обучения?",
    "Что означает поток или настройка «Целительство» и как его традиционно описывают?",
    "Как описывается работа потока «Защита» и в каких ситуациях его практикуют?",
    "В чём идея настройки «Активация денежного потока» и какие символические задачи с ней связывают?",
    "С какими пантеонами и богами предполагается знакомство на пятой ступени Рейки Иггдрасиль?"
  ],
  "es": [
    "¿Reiki, runas o su combinación: qué fundamenta Reiki Yggdrasil?",
    "¿Cómo explica el autor las diferencias que afirma entre Reiki Yggdrasil y Usui Reiki?",
    "¿Qué es Yggdrasil, el Árbol del Mundo?",
    "¿Qué representa la corriente de Sanación y cómo se describe su práctica?",
    "¿Cómo se describe la corriente de Protección?",
    "¿En qué consiste la llamada Activación del flujo de dinero?",
    "¿Qué panteones y deidades se estudian en el quinto nivel?"
  ]
};

function sharedPreparationQuestions(landingSource) {
  const source = read("data/academy/yggdrasil-preparation-questions.ts");
  const object = /^export const yggdrasilPreparationQuestions = \{\n([\s\S]*?)^\} as const;$/m.exec(source);
  assert.ok(object, "Shared preparation-question export is missing");
  const localeArrays = /^  ([a-z]{2}): \[\n([\s\S]*?)^  \],$/gm;
  const lists = [...object[1].matchAll(localeArrays)];
  assert.deepEqual(lists.map((match) => match[1]), ["en", "ru", "es"], "Exact question locales and order");
  assert.equal(object[1].replace(localeArrays, "").trim(), "", "Only literal locale arrays belong to the question source");
  const questions = Object.fromEntries(lists.map((match) => [
    match[1], JSON.parse("[" + match[2].trim().replace(/,$/, "") + "]"),
  ]));
  assert.deepEqual(questions, approvedPreparationQuestions, "All 21 approved questions retain their exact text and order");

  assert.match(landingSource, /^import \{ yggdrasilPreparationQuestions \} from "@\/data\/academy\/yggdrasil-preparation-questions";$/m);
  const copyObject = /^const copy: Record<PublicLocale, LocaleStrings> = \{\n([\s\S]*?)^\};$/m.exec(landingSource);
  assert.ok(copyObject, "Public locale copy is missing");
  const localeObjects = /^  ([a-z]{2}): \{\n([\s\S]*?)^  \},?$/gm;
  const copies = [...copyObject[1].matchAll(localeObjects)];
  assert.deepEqual(copies.map((match) => match[1]), ["en", "ru", "es"], "Exact public-copy locale objects");
  assert.equal(copyObject[1].replace(localeObjects, "").trim(), "", "Question bindings must belong to these locale objects");
  for (const [ , locale, body ] of copies) {
    assert.equal((body.match(/^    questions:/gm) ?? []).length, 1, "One questions binding for " + locale);
    assert.match(body, new RegExp("^    questions: \\[\\.\\.\\.yggdrasilPreparationQuestions\\." + locale + "\\],$", "m"),
      "The " + locale + " copy must use its own shared questions");
  }

  const component = /^export function YggdrasilFreeInitiation\(\{ locale \}: \{ locale: PublicLocale \}\) \{([\s\S]*?)^\}/m.exec(landingSource);
  assert.ok(component, "Public initiation component is missing");
  assert.match(component[1], /^  const c = copy\[locale\];$/m, "The displayed copy must follow the selected locale");
  const returnStart = component[1].indexOf("  return (");
  assert.ok(returnStart >= 0, "Public initiation render is missing");
  assert.match(component[1].slice(returnStart),
    /<ol className=\{styles\.questions\}>\{c\.questions\.map\(\(question\) => <li key=\{question\}>\{question\}<\/li>\)\}<\/ol>/,
    "The actual question list must render the selected locale's questions");
  return questions;
}

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

test("seven original questions remain high-contrast and available in an initially closed disclosure", () => {
  const questions = sharedPreparationQuestions(page);
  for (const [locale, items] of Object.entries(questions)) {
    assert.equal(items.length, 7, "seven for locale " + locale);
  }
  assert.match(page, /<details className=\{styles\.questionsDisclosure\}>/);
  assert.match(page, /<summary className=\{styles\.questionsSummary\}>/);
  assert.doesNotMatch(page, /<details className=\{styles\.questionsDisclosure\}\s+open(?:\s|>)/);
  assert.match(page, /<span className=\{styles\.questionsSummaryHeading\} role="heading" aria-level=\{2\}/);
  for (const label of ["Show 7 questions", "Показать 7 вопросов", "Ver las 7 preguntas"]) assert.ok(page.includes(label), label);
  assert.match(page, /<ol className=\{styles\.questions\}>/);
  assert.match(questions.en.join("\n"), /What differences does the author claim/);
  assert.match(questions.ru.join("\n"), /Чем автор системы объясняет/);
  assert.match(questions.es.join("\n"), /¿Cómo explica el autor/);
  assert.match(questions.en.join("\n"), /Money Stream Activation/);
  assert.match(page, /not established medical facts|не доказанными медицинскими фактами/);
  assert.match(layout, /\.questionsSlide\s*\{[\s\S]*?background: linear-gradient\(147deg,#153c55/);
  assert.match(layout, /\.questionsSlide \.questions li\s*\{[\s\S]*?font: 650 17px/);
  assert.match(layout, /\.questionsSlide \.questions li::before/);
  assert.match(layout, /\.questionsDisclosure\[open\] \.questionsHideLabel/);
  assert.match(layout, /\.questionsSummary:focus-visible/);
  assert.match(layout, /@media \(max-width: 470px\)/);
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

test("the final form offers three compact choices without name, email or answer uploads", () => {
  assert.match(form, /type Intent = "free" \| "personal" \| "pdf"/);
  assert.match(form, /const intents: readonly Intent\[\] = \["free", "personal", "pdf"\]/);
  assert.match(form, /data-yggdrasil-form/);
  for (const intent of ["free", "personal", "pdf"]) assert.ok(form.includes('id="apply-' + intent + '"'));
  // A hidden legacy anchor still redirects older links to the free-request choice.
  assert.match(form, /id="apply-answers"/);
  assert.match(form, /hash === "#apply-answers"[\s\S]*?switchMode\("free"\)/);
  assert.match(form, /reiki-guide\?course=yggdrasil/);
  assert.match(form, /whatsappEnquiryUrl\(\{/);
  assert.match(form, /"data-reiki-initiation-handoff": mode/);
  assert.match(form, /aria-pressed=\{mode === intent\}/);
  assert.match(form, /https:\/\/t\.me\/AndyTherapist/);
  assert.doesNotMatch(form, /<input|<textarea|type="file"|navigator\.canShare|navigator\.share|FormData|localStorage|fetch\("/);
  assert.doesNotMatch(form, /setName|setAttachment|setAnswers/);
  assert.match(page, /href="#apply-free">\{t\.answersAction\}/);
  assert.match(page, /No name, email or uploaded answers are required/);
  assert.match(layout, /\.formSlide \.formOptions \{ grid-template-columns: repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(layout, /\.formSlide \.formSubmit \{[\s\S]*?background: #8c3f51/);
});


test("the single landing is not interrupted by unrelated sitewide promotions", () => {
  assert.match(read("lib/public-lead-capture.js"), /free-initiation/);
  assert.match(read("app/layout.tsx"), /SitewideAntistressBanner/);
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
