import test from "node:test";
import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {rankAssistProducts} from "../lib/assist/product-recommendations.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const page=read("app/[locale]/services/page.tsx");
const quiz=read("components/services-assist-quiz.tsx");
const css=read("components/services-assist-quiz.module.css");
const dock=read("lib/unified-mobile-dock.mjs");

test("Services guest opens the approved four-step image-led quiz; original Ali stays available",()=>{
  assert.match(page,/<ServicesAssistQuiz locale=/);
  assert.match(page,/query\?\.assist==="chat"\s*\?\s*<ServicesAssistMobile/);
  assert.match(quiz,/data-services-quiz-questions="4"/);
  assert.match(quiz,/data-services-quiz-step=\{currentStep \+ 1\}/);
  assert.match(quiz,/const \[currentStep, setCurrentStep\] = useState\(0\)/);
  assert.match(quiz,/data-services-quiz-question=\{key\}/);
  assert.match(quiz,/setCurrentStep\(currentStep \+ 1\)/);
  assert.match(quiz,/ready && currentStep === questionKeys\.length - 1/);
  assert.match(quiz,/setSubmitted\(true\)/);
  assert.match(quiz,/aria-pressed=\{selected\}/);
  assert.doesNotMatch(quiz,/questionKeys\.map\(\(key, index\) => \{/);
  assert.doesNotMatch(quiz,/localStorage|sessionStorage|fetch\(|sendBeacon/);
});

test("The first question contains four illustrated primary options and two visible additional topics",()=>{
  assert.match(quiz,/const primaryOptions = key === "topic"/);
  assert.match(quiz,/value !== "work" && value !== "health"/);
  assert.match(quiz,/const additionalOptions = key === "topic"/);
  assert.match(quiz,/value === "work" \|\| value === "health"/);
  assert.match(quiz,/className=\{styles\.otherTopics\}/);
  assert.match(quiz,/const choiceIcons: Record<QuestionKey, Record<string, LucideIcon>>/);
});

test("RU/EN/ES money and business remains selectable and linked to real services",()=>{
  for(const text of ["Деньги и бизнес","Money & business","Dinero y negocios"])
    assert.ok(quiz.includes(text),text);
  assert.match(quiz,/\["work", "Деньги и бизнес"\]/);
  assert.match(quiz,/data-services-quiz-category=\{category\}/);
  assert.match(quiz,/path: "services\/business-consulting"/);
  assert.ok(rankAssistProducts("work",{mode:"human",channel:"online",budget:"flexible"}).includes("business"));
});

test("Mobile chrome and photo tiles match the owner's visual hierarchy without a new bottom dock",()=>{
  assert.match(quiz,/className=\{styles\.masthead\}/);
  assert.match(quiz,/className=\{styles\.languageMenu\}/);
  assert.match(quiz,/className=\{styles\.hero\}/);
  assert.match(quiz,/data-services-quiz-progress="4"/);
  assert.match(quiz,/className=\{styles\.categoryPhoto\}/);
  assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(min-width:761px\)\{\.root\{display:none\}\}/);
  const images=[
    "messenger-zen-stones.svg","distance-homeopathy.webp","homepage-constellations.svg",
    "tao-fu-prosperity.webp","books-library.webp","reiki-approved-sunrise-v3.webp"
  ];
  for (const name of images) {
    assert.ok(quiz.includes(name),name);
    assert.ok(existsSync(new URL("../public/images/holistic-house/"+name,import.meta.url)),name+" must exist");
  }
  for(const id of ["mytube","video","coach","ai","services","practice","profile"])
    assert.ok(dock.includes('"'+id+'"'),id);
  assert.match(page,/<PublicSiteHeader locale=/);
  assert.doesNotMatch(quiz,/UnifiedMobileDock|MobileBottomNavigation/);
  assert.match(quiz,/href=\{"\/" \+ locale \+ "\/services\?assist=chat"\}/);
});

test("Services browser acceptance checks step progression, category imagery and unfettered dock",()=>{
  const acceptance=read("scripts/verify-public-services-production.mjs");
  assert.match(acceptance,/data-services-quiz-step/);
  assert.match(acceptance,/data-services-quiz-category="videos"/);
  assert.match(acceptance,/firstScreen\.quizBottom<=firstScreen\.dockTop\+1/);
  assert.match(acceptance,/data-services-quiz-submit/);
});

test("Spanish Services uses the public three-language route and not the homeopathy locale gate",()=>{
  const spanishPage=read("app/es/services/page.tsx");
  assert.match(spanishPage,/<ServicesAssistQuiz locale="es"\s*\/>/);
  assert.match(spanishPage,/query\?\.assist==="chat"\s*\?\s*<ServicesAssistMobile locale="es"/);
  assert.match(spanishPage,/spanishMetadata/);
  assert.match(spanishPage,/ServicesCompactCatalog locale="es"/);
  assert.match(page,/function isPublicServiceLocale\(value: string\)/);
  assert.match(page,/publicLocales\.map\(locale => \(\{ locale \}\)\)/);
  assert.match(quiz,/Encuentra tu apoyo/);
});
