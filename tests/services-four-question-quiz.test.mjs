import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {rankAssistProducts} from "../lib/assist/product-recommendations.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const page=read("app/[locale]/services/page.tsx");
const quiz=read("components/services-assist-quiz.tsx");
const css=read("components/services-assist-quiz.module.css");
const dock=read("lib/unified-mobile-dock.mjs");

test("Services guest opens a real four-question quiz and retains the original Ali dialogue",()=>{
  assert.match(page,/<ServicesAssistQuiz locale=/);
  assert.match(page,/query\?\.assist==="chat"\s*\?\s*<ServicesAssistMobile/);
  assert.match(quiz,/data-services-quiz-questions="4"/);
  assert.match(quiz,/questionKeys\.map\(/);
  for(const key of ["topic","mode","channel","budget"])
    assert.match(quiz,new RegExp(key+": \\{ title:"));
  assert.match(quiz,/disabled=\{!ready\}/);
  assert.match(quiz,/setSubmitted\(true\)/);
  assert.match(quiz,/aria-pressed=\{selected\}/);
  assert.doesNotMatch(quiz,/localStorage|sessionStorage|fetch\(|sendBeacon/);
});
test("RU/EN/ES money and business is a selectable focus and a linked category",()=>{
  for(const text of ["Деньги и бизнес","Money & business","Dinero y negocios"])
    assert.ok(quiz.includes(text),text);
  assert.match(quiz,/\["work", "Деньги и бизнес"\]/);
  assert.match(quiz,/data-services-quiz-category=\{key\}/);
  assert.match(quiz,/path: "services\/business-consulting"/);
  assert.ok(rankAssistProducts("work",{mode:"human",channel:"online",budget:"flexible"}).includes("business"));
});
test("The actual shared seven-item site dock stays single, no second dock is created",()=>{
  for(const id of ["mytube","video","coach","ai","services","practice","profile"])
    assert.ok(dock.includes('"'+id+'"'),id);
  assert.match(page,/<PublicSiteHeader locale=/);
  assert.doesNotMatch(quiz,/UnifiedMobileDock|MobileBottomNavigation/);
  assert.match(css,/@media\(min-width:761px\)\{\.root\{display:none\}\}/);
  assert.match(css, /\.categoryGrid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(quiz,/href=\{"\/" \+ locale \+ "\/services\?assist=chat"\}/);
});

test("Spanish Services uses the PUBLIC three-language route rather than homeopathy's RU/EN gate",()=>{
  assert.match(page,/function isPublicServiceLocale\(value: string\)/);
  assert.match(page,/publicLocales\.map\(locale => \(\{ locale \}\)\)/);
  assert.doesNotMatch(page,/isSupportedLocale|locale as Locale|getHomeopathyLocaleParams/);
  assert.match(page,/es: \{/);
  assert.match(page,/es_ES/);
  assert.match(quiz,/Encuentra tu apoyo/);
});
test("initial Services composition keeps all categories visible, with one compact mode answer row",()=>{
  const acceptance=read("scripts/verify-public-services-production.mjs");
  assert.match(css,/\.choices\[data-question-kind="mode"\]\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)\}/);
  assert.match(acceptance,/firstScreen\.lastBottom<=firstScreen\.dockTop\+1/);
  assert.match(acceptance,/\[data-services-quiz-category="videos"\]/);
});

test("The dedicated Spanish Services page is not shadowed by the RU/EN dynamic route",()=>{
  const spanishPage=read("app/es/services/page.tsx");
  assert.match(spanishPage,/<ServicesAssistQuiz locale="es"\s*\/>/);
  assert.match(spanishPage,/query\?\.assist==="chat"\s*\?\s*<ServicesAssistMobile locale="es"/);
  assert.match(spanishPage,/spanishMetadata/);
  assert.match(spanishPage,/ServicesCompactCatalog locale="es"/);
});
