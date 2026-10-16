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

test("Tantra Reiki price and source PDF remain available without a bottom PDF form", () => {
  assert.match(pricing, /tantra: Object\\.freeze\\(\\{ amountEur: 50, durationMinutes: 30 \\}\\)/);
  assert.match(landing, /formatReikiLevelPrice\\("tantra", locale\\)/);
  assert.match(landing, /reiki-guide\\?course=tantra&locale=/);
  assert.doesNotMatch(form, /reiki-guide\\?course=yggdrasil|Download PDF guide|Скачать PDF/);
});

test("bottom lead capture is three direct WhatsApp actions, no web form", () => {
  assert.match(form, /type Intent = "free" \\| "personal" \\| "answers"/);
  assert.match(form, /import \\{ whatsappEnquiryUrl \\} from "@\\/lib\\/whatsapp-enquiry"/);
  assert.match(form, /return whatsappEnquiryUrl\\(\\{/);
  assert.match(form, /request: t\\.requests\\[intent\\]/);
  assert.match(form, /pagePath: "\\/" \\+ locale \\+ "\\/academy\\/reiki\\/tantra-reiki\\/free-initiation"/);
  for (const intent of ["free", "personal", "answers"]) {
    assert.ok(form.includes('id="apply-' + intent + '"'), intent);
    assert.ok(form.includes('href={tantraInitiationWhatsAppUrl(locale, "' + intent + '")}'), intent);
  }
  assert.equal((form.match(/target="_blank"/g) || []).length, 3);
  assert.match(form, /data-tantra-whatsapp-capture/);
  assert.match(form, /Я напишу или вставлю ответы на вопросы 1–7 непосредственно в WhatsApp/);
  assert.match(landing, /href=\\{tantraInitiationWhatsAppUrl\\(locale, "answers"\\)\\}/);
  assert.match(landing, /href=\\{tantraInitiationWhatsAppUrl\\(locale, "personal"\\)\\}/);
  assert.doesNotMatch(form, /<form\\b|<input\\b|<textarea\\b|<select\\b|<button\\b|<label\\b/);
  assert.doesNotMatch(form, /navigator\\.|window\\.|fetch\\(|localStorage|FormData|onSubmit/);
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

test("WhatsApp capture is compact, responsive and requests no name or email", () => {
  assert.match(style, /\\.whatsappActions \\{ display: grid; grid-template-columns: repeat\\(2/);
  assert.match(style, /\\.whatsappCapture \\{/);
  assert.match(style, /\\.hero \\{[\\s\\S]*?min-height: 440px/);
  assert.match(style, /\\.choiceFree, \\.choicePersonal \\{[\\s\\S]*?min-height: 232px/);
  assert.match(style, /\\.howCard \\{[\\s\\S]*?min-height: 159px/);
  assert.match(style, /\\.questionGrid li \\{[\\s\\S]*?min-height: 76px/);
  assert.match(style, /@media \\(max-width: 760px\\)[\\s\\S]*?\\.whatsappActions \\{ grid-template-columns: 1fr/);
  assert.match(form, /Никаких анкет, имени, email или регистрации/);
  assert.doesNotMatch(form, /required|autoComplete|type="email"|type="text"/);
});

