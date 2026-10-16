import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const landing = read("components/tantra-free-initiation.tsx");
const style = read("components/tantra-free-initiation.module.css");
const form = read("components/tantra-initiation-form.tsx");
const routes = read("app/[locale]/academy/[[...slug]]/page.tsx");
const course = read("components/academy-record-page.tsx");
const media = read("data/academy/english-guided-meditations.ts");
const sitemap = read("app/sitemap.ts");
const pricing = read("lib/academy/reiki-level-pricing.js");

test("new localized Tantra Reiki Level 1 landing is routed, linked and indexed", () => {
  assert.match(routes, /if \(key === "reiki\/tantra-reiki\/free-initiation"\) return <TantraFreeInitiation locale=\{locale\} \/>/);
  assert.match(routes, /"Tantra Reiki — Free Level 1 Initiation"/);
  assert.match(routes, /"Тантра Рейки — бесплатная инициация 1-й ступени"/);
  assert.match(routes, /"Tantra Reiki — iniciación gratuita de Nivel 1"/);
  assert.match(routes, /"reiki\/tantra-reiki\/free-initiation"[\s\S]*?locale === "ru"/);
  assert.match(sitemap, /\/reiki\/tantra-reiki\/free-initiation/);
  assert.ok(course.includes('<Link className="tantra-course-hero__cta" href={"/" + locale + "/academy/reiki/tantra-reiki/free-initiation"}'));
});

test("exactly the seven owner-approved Russian questions are visible in natural order", () => {
  const expected = [
    "Кто является создателем системы Тантра Рейки и каков источник её энергии?",
    "Какова главная цель потока Тантра Рейки? Для чего он нужен и что даёт человеку?",
    "Для каких целей можно использовать систему Тантра Рейки?",
    "Какая культура и традиция лежат в основе системы Тантра Рейки?",
    "Как связаны между собой ступени 1–3, 4–6 и 7–9?",
    "На каких ступенях Тантра Рейки мы учимся создавать мандалы и работать с артефактами?",
    "После какой ступени человек становится Мастером Тантра Рейки и получает право обучать и инициировать других?",
  ];
  for (const question of expected) assert.equal(landing.split(question).length - 1, 1, question);
  const groups = [...landing.matchAll(/    questions: \[([\s\S]*?)\n    \],/g)];
  assert.equal(groups.length, 3, "English, Russian, Spanish translation groups");
  for (const group of groups) assert.equal((group[1].match(/^\s*"/gm) || []).length, 7);
  assert.match(landing, /<ol className=\{styles\.questionGrid\}>/);
  assert.match(landing, /t\.questions\.map/);
});

test("seven-section learning path uses owner video before original questions, without autoplay", () => {
  for (const id of ["intro", "initiation-choices", "how-to", "tantra-practice-video", "course-materials", "study-questions", "tantra-apply"]) {
    assert.ok(landing.includes('id="' + id + '"'), "missing section " + id);
  }
  assert.match(media, /key: "tantra-reiki"[\s\S]+?youtubeId: "w2BN-HYmHUk"/);
  assert.match(landing, /englishGuidedMeditations\.find\(\(item\) => item\.key === "tantra-reiki"\)/);
  assert.match(landing, /<AcademyVideoPlayer youtubeId=\{video\.youtubeId\} title=\{video\.title\} \/>/);
  assert.doesNotMatch(landing, /autoplay|heygen\.com\/embed|<video/);
});

test("Tantra Reiki pricing and PDF link are distinct from Reiki Yggdrasil", () => {
  assert.match(pricing, /tantra: Object\.freeze\(\{ amountEur: 50, durationMinutes: 30 \}\)/);
  assert.match(landing, /formatReikiLevelPrice\("tantra", locale\)/);
  assert.match(landing, /reiki-guide\?course=tantra&locale=/);
  assert.match(form, /reiki-guide\?course=tantra&locale=/);
  assert.doesNotMatch(form, /course=yggdrasil|senderFree: "Free introductory Reiki Yggdrasil/);
});

test("multi-intent form shares answers safely without uploading a document to the website", () => {
  assert.match(form, /type Intent = "free" \| "personal" \| "pdf" \| "answers"/);
  for (const intent of ["free", "personal", "pdf", "answers"]) {
    assert.ok(form.includes('id="apply-' + intent + '"'));
  }
  assert.match(form, /navigator\.canShare\(\{ files: \[file\] \}\)/);
  assert.match(form, /navigator\.share\(\{ title: "Tantra Reiki", text: message, files: \[file\] \}\)/);
  assert.match(form, /WHATSAPP_NUMBER/);
  assert.match(form, /https:\/\/t\.me\/AndyTherapist/);
  assert.match(form, /fileLimit = 8 \* 1024 \* 1024/);
  assert.doesNotMatch(form, /localStorage|fetch\(|FormData|\.post\(/);
});

test("new visual system stays isolated to its page and works on mobile", () => {
  assert.match(landing, /className=\{"academy-reading-shell academy-reading-shell--wide " \+ styles\.shell\}/);
  assert.match(style, /--tn-navy: #243a54/);
  assert.match(style, /--tn-wine: #80334f/);
  assert.match(style, /\.questionGrid li:last-child/);
  assert.match(style, /@media \(max-width: 760px\)/);
  assert.match(style, /@media \(max-width: 450px\)/);
  assert.match(style, /prefers-reduced-motion: reduce/);
});

test("learn first: simple three steps precede video, study materials and the questions", () => {
  const markers = ['id="how-to"', 'id="tantra-practice-video"', 'id="course-materials"', 'id="study-questions"', 'id="tantra-apply"'];
  const positions = markers.map(marker => landing.indexOf(marker));
  assert.ok(positions.every((position, index) => position >= 0 && (index === 0 || position > positions[index - 1])), "learning flow must be sequential");
  assert.match(landing, /guideTitle: "Как получить Тантра Рейки бесплатно"/);
  assert.equal((landing.match(/    guideSteps: \[/g)||[]).length,3);
  assert.match(landing, /t\.guideSteps\.map/);
  assert.match(style, /\.howGrid\s*\{/);
});

test("free initiation and answer sharing do not require email, name or account creation", () => {
  assert.doesNotMatch(form, /input required|autoComplete="email"|setEmail|localStorage|fetch\(/);
  assert.match(form, /name: "Ваше имя \(необязательно\)"/);
  assert.match(form, /contact: "Контакт для ответа \(необязательно\)"/);
});
