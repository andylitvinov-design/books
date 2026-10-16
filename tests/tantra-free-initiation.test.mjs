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

test("all seven owner-approved questions remain inside an initially closed, accessible disclosure", () => {
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
  assert.match(landing, /<details className=\{styles\.questionsDisclosure\}>/);
  assert.match(landing, /<summary className=\{styles\.questionsSummary\}>/);
  for (const title of [
    '7 questions to get your free initiation',
    '7 вопросов для бесплатной инициации',
    '7 preguntas para recibir tu iniciación gratuita',
  ]) assert.ok(landing.includes('questionsTitle: "' + title + '"'), title);
  assert.match(style, /\.questionsSummary \{[\s\S]*?min-height: 84px/);
  assert.match(style, /@media \(max-width: 470px\)[\s\S]*?flex-direction: row/);
  assert.doesNotMatch(landing, /<details className=\{styles\.questionsDisclosure\}\s+open(?:\s|>)/);
  assert.match(landing, /<span className=\{styles\.questionsSummaryTitle\} role="heading" aria-level=\{2\}/);
  for (const label of ["Show 7 questions", "Показать 7 вопросов", "Ver las 7 preguntas"]) assert.ok(landing.includes(label), label);
  assert.match(style, /\.questionsDisclosure\[open\] \.questionsHideLabel/);
  assert.match(style, /\.questionsSummary:focus-visible/);
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
  assert.match(pricing, /tantra: Object\.freeze\(\{ amountEur: 50, durationMinutes: 30 \}\)/);
  assert.match(landing, /formatReikiLevelPrice\("tantra", locale\)/);
  assert.match(landing, /reiki-guide\?course=tantra&locale=/);
  assert.doesNotMatch(form, /reiki-guide\?course=yggdrasil|Download PDF guide|Скачать PDF/);
});

test("bottom lead capture offers the same intents with an explicit messenger selection", () => {
  assert.match(form, /type Intent = "free" \| "personal" \| "session" \| "answers" \| "feedback"/);
  assert.match(form, /import \{ whatsappEnquiryUrl \} from "@\/lib\/whatsapp-enquiry"/);
  assert.match(form, /return whatsappEnquiryUrl\(\{/);
  assert.match(form, /request: t\.requests\[intent\]/);
  assert.match(form, /pagePath: "\/" \+ locale \+ "\/academy\/reiki\/tantra-reiki\/free-initiation"/);
  for (const intent of ["free", "personal", "session", "answers"]) {
    assert.ok(form.includes('id="apply-' + intent + '"'), intent);
    assert.ok(form.includes('whatsappUrl={tantraInitiationWhatsAppUrl(locale, "' + intent + '")}'), intent);
  }
  assert.equal((form.match(/<ContactChannelChooser /g) || []).length, 5);
  assert.match(form, /data-tantra-whatsapp-capture/);
  assert.match(form, /Я напишу или вставлю ответы на вопросы 1–7 в выбранном мессенджере/);
  assert.match(landing, /whatsappUrl=\{tantraInitiationWhatsAppUrl\(locale, "answers"\)\}/);
  assert.match(landing, /whatsappUrl=\{tantraInitiationWhatsAppUrl\(locale, "personal"\)\}/);
  assert.doesNotMatch(form, /<form\b|<input\b|<textarea\b|<select\b|<button\b|<label\b/);
  assert.doesNotMatch(form, /navigator\.|window\.|fetch\(|localStorage|FormData|onSubmit/);
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

test("five steps put the flow review after video and optional distance initiation fifth", () => {
  const markers = ['id="how-to"', 'id="tantra-practice-video"', 'id="course-materials"', 'id="study-questions"', 'id="tantra-apply"'];
  const positions = markers.map(marker => landing.indexOf(marker));
  assert.ok(positions.every((position, index) => position >= 0 && (index === 0 || position > positions[index - 1])), "learning flow must be sequential");
  assert.match(landing, /guideTitle: "Как получить Тантра Рейки бесплатно"/);
  const groups = [...landing.matchAll(/    guideSteps: \[([\s\S]*?)\n    \],/g)];
  assert.equal(groups.length, 3, "five translated steps in EN/RU/ES");
  for (const group of groups) assert.equal((group[1].match(/title: "/g) || []).length, 5);
  assert.match(landing, /title: "Напишите отзыв"/);
  assert.match(landing, /title: "Запишитесь на личную дистанционную инициацию"/);
  assert.match(landing, /дистанционная инициация — по желанию/);
  assert.match(landing, /#apply-feedback/);
  assert.match(landing, /guideLinks\[index\]/);
  assert.match(landing, /data-personal=\{index === 4\}/);
  assert.match(landing, /href=\{guideLinks\[index\]\}/);
  assert.match(landing, /#apply-personal/);
  assert.match(landing, /t\.guideSteps\.map/);
  assert.match(style, /\.howGrid\s*\{ display: grid; grid-template-columns: repeat\(2,/);
  assert.match(style, /\.howCard\[data-personal="true"\]\s*\{/);
});

test("WhatsApp capture is compact, responsive and requests no name or email", () => {
  assert.match(style, /\.whatsappActions \{ display: grid; grid-template-columns: repeat\(2/);
  assert.match(style, /\.whatsappCapture \{/);
  assert.match(style, /\.hero \{[\s\S]*?min-height: 440px/);
  assert.match(style, /\.choiceFree, \.choicePersonal, \.choiceCombined \{[\s\S]*?min-height: 252px/);
  assert.match(style, /\.howCard \{[\s\S]*?min-height: 138px/);
  assert.match(style, /\.questionGrid li \{[\s\S]*?min-height: 76px/);
  assert.match(style, /@media \(max-width: 760px\)[\s\S]*?\.whatsappActions \{ grid-template-columns: 1fr/);
  assert.match(form, /Никаких анкет, имени, email или регистрации/);
  assert.doesNotMatch(form, /<input[^>]*required|autoComplete=|type="email"|type="text"/);
});


test("approved three-choice Tantra design includes a genuine €100 personal session in EN/RU/ES", () => {
  assert.match(landing, /choiceTitle: "Choose your Level 1 path"/);
  assert.match(landing, /choiceTitle: "Три пути к первой ступени"/);
  assert.match(landing, /choiceTitle: "Tres caminos al nivel 1"/);
  assert.match(landing, /data-tantra-three-offers/);
  for (const offer of ["free", "personal", "session"]) {
    assert.ok(landing.includes('data-tantra-offer="' + offer + '"'), offer);
  }
  assert.equal((landing.match(/combinedPrice:/g) || []).length, 3);
  assert.equal((landing.match(/combinedDuration:/g) || []).length, 3);
  assert.match(landing, /combinedPrice: "€100", combinedDuration: "60 MIN"/);
  assert.match(landing, /combinedPrice: "100 €", combinedDuration: "60 МИН"/);
  assert.match(landing, /combinedPrice: "100 €", combinedDuration: "60 MIN"/);
  assert.match(landing, /We explore your situation and check for solutions/);
  assert.match(landing, /formatReikiLevelPrice\("tantra", locale\)/);
  assert.match(landing, /tantraInitiationWhatsAppUrl\(locale, "session"\)/);
  assert.match(form, /€100 \/ 60 minutes/);
  assert.match(form, /100 € \/ 60 минут/);
  assert.match(form, /100 € \/ 60 minutos/);
  assert.match(style, /\.choiceGrid \{ display: grid; grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(style, /\.choiceCombined \{/);
  assert.match(style, /\.buttonCopper \{/);
  assert.match(style, /\.pricePill \{/);
  assert.match(style, /@media \(max-width: 760px\)[\s\S]*?\.offerButton \{/);
});
