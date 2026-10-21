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
  const questions = sharedPreparationQuestions(free);
  for (const [locale, items] of Object.entries(questions)) {
    assert.equal(items.length, 7, "locale " + locale);
  }
  assert.match(free, /const originalLevelOneVideoId = "DYo-fG-SyKw"/);
  assert.match(free, /AcademyVideoPlayer youtubeId=\{originalLevelOneVideoId\}/);
  assert.match(free, /id="learning-faq"/);
  assert.match(free, /root \+ "\/basic-course\/description"/);
  assert.match(free, /<YggdrasilInitiationForm locale=\{locale\} \/>/);
  const form = read("components/yggdrasil-initiation-form.tsx");
  assert.match(form, /whatsappEnquiryUrl\(\{/);
  assert.match(form, /"data-reiki-initiation-handoff": mode/);
  assert.doesNotMatch(form, /type="file"|<input|setAttachment/);
  assert.match(form, /https:\/\/t\.me\/AndyTherapist/);
});

test("responsive, accessible lesson disclosure has safe outcomes and concise mobile spacing", () => {
  assert.match(styles, /\.studyKit > summary:focus-visible/);
  assert.match(styles, /@media \(max-width: 700px\)/);
  assert.match(styles, /\.studyKitLinks a/);
  assert.match(curriculum, /teacher-led|teacher-guided|diagnos|consent|согласи|consentimiento/i);
  assert.match(free, /not established medical facts|не доказанными медицинскими фактами/);
});
