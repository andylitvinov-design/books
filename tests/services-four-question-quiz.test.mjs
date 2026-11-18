import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rankAssistProducts } from "../lib/assist/product-recommendations.mjs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const page = read("app/[locale]/services/page.tsx");
const quiz = read("components/services-assist-quiz.tsx");
const css = read("components/services-assist-quiz.module.css");
const dock = read("lib/unified-mobile-dock.mjs");
const ihelp = read("components/sitewide-ihelp.tsx");

test("approved Services design presents one real quiz question at a time", () => {
  assert.match(page, /<ServicesAssistQuiz locale=/);
  assert.match(page, /query\?\.assist==="chat"\s*\?\s*<ServicesAssistMobile/);
  assert.match(quiz, /data-services-quiz-questions="4"/);
  assert.match(quiz, /data-services-quiz-step=\{step \+ 1\}/);
  assert.match(quiz, /data-services-quiz-question=\{currentKey\}/);
  assert.match(quiz, /const currentKey = questionKeys\[step\]/);
  assert.match(quiz, /setStep\(index => Math\.min\(index \+ 1/);
  assert.match(quiz, /data-quiz-dot=\{index \+ 1\}/);
  assert.match(quiz, /disabled=\{!ready\}/);
  assert.match(quiz, /setSubmitted\(true\)/);
  assert.match(quiz, /aria-pressed=\{selected\}/);
  for (const key of ["topic", "mode", "channel", "budget"])
    assert.match(quiz, new RegExp(key + ": \\{ title:"));
  assert.doesNotMatch(quiz, /localStorage|sessionStorage|fetch\(|sendBeacon/);
});

test("reference hero, emerald quiz and six image-led cards are real and responsive", () => {
  assert.match(quiz, /className=\{styles\.brandBar\}/);
  assert.match(quiz, /className=\{styles\.hero\}/);
  assert.match(quiz, /className=\{styles\.progressSteps\}/);
  assert.match(quiz, /className=\{styles\.categoryMedia\}/);
  assert.match(quiz, /<Image src=\{image\} alt="" fill/);
  assert.match(css, /reiki-approved-sunrise-v3\.webp/);
  assert.match(css, /\.form \{[^}]*linear-gradient\(/);
  assert.match(css, /\.categoryGrid \{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:350px\)/);
  assert.match(css, /@media\(min-width:761px\)\{\.root\{display:none\}\}/);
  assert.match(quiz, /data-services-quiz-category=\{key\}/);
  const cardCount = (quiz.match(/key: "(therapy|homeopathy|constellations|practice|study|videos)", path:/g) || []).length;
  assert.equal(cardCount, 6);
});

test("RU/EN/ES retain explicit money-business option, business route and budget matching", () => {
  for (const s of ["Деньги и бизнес", "Money & business", "Dinero y negocios"])
    assert.ok(quiz.includes(s), s);
  assert.match(quiz, /data-services-more-topics/);
  assert.match(quiz, /\["work", "Деньги и бизнес"\]/);
  assert.match(quiz, /data-services-business-link/);
  assert.match(quiz, /services\/business-consulting/);
  assert.ok(rankAssistProducts("work", { mode:"human", channel:"online", budget:"flexible" }).includes("business"));
  assert.ok(quiz.includes('["free", "Бесплатно"]'));
});

test("seven-item bottom dock and legacy Ali chat remain shared, not duplicated", () => {
  for (const id of ["mytube", "video", "coach", "ai", "services", "practice", "profile"])
    assert.ok(dock.includes('"' + id + '"'), id);
  assert.match(page, /<PublicSiteHeader locale=/);
  assert.ok(ihelp.includes("services\\/?$"), "the sitewide iHelp floating button is suppressed only on Services landing");
  assert.doesNotMatch(quiz, /UnifiedMobileDock|MobileBottomNavigation/);
  assert.match(quiz, /"\/services\?assist=chat"/);
});

test("both dynamic and dedicated Spanish routes render the one-step quiz", () => {
  const spanishPage = read("app/es/services/page.tsx");
  assert.match(spanishPage, /<ServicesAssistQuiz locale="es"\s*\/>/);
  assert.match(spanishPage, /query\?\.assist==="chat"\s*\?\s*<ServicesAssistMobile locale="es"/);
  assert.match(page, /function isPublicServiceLocale\(value: string\)/);
  assert.match(page, /publicLocales\.map\(locale => \(\{ locale \}\)\)/);
  assert.match(spanishPage, /spanishMetadata/);
  assert.match(quiz, /Encontremos tu apoyo/);
});

test("existing browser acceptance advances all four steps, checks money and return-to-Ali", () => {
  const acceptance = read("scripts/verify-public-services-production.mjs");
  assert.match(acceptance, /data-services-quiz-step/);
  assert.match(acceptance, /data-services-more-topics/);
  assert.match(acceptance, /data-services-business-link/);
  assert.match(acceptance, /data-services-quiz-results/);
  assert.match(acceptance, /assist=chat/);
  assert.match(acceptance, /data-services-quiz-category="videos"/);
});
