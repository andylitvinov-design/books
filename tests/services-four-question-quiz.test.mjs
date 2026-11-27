import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rankAssistProducts } from "../lib/assist/product-recommendations.mjs";
const read = path => readFileSync(new URL("../"+path,import.meta.url),"utf8");
const quiz=read("components/services-assist-quiz.tsx");
const css=read("components/services-assist-quiz.module.css");
test("Support branding and four always visible paths remain on the existing Services route",()=>{
 const page=read("app/[locale]/services/page.tsx"),dock=read("components/unified-mobile-dock.tsx");
 assert.match(page,/<ServicesAssistQuiz locale=/);
 assert.match(page,/query\?\.assist==="chat"\s*\?\s*<ServicesAssistMobile/);
 assert.match(quiz,/S U P P O R T/);
 for(const label of ['services: "Support"','services: "Поддержка"','services: "Apoyo"'])assert.ok(dock.includes(label));
 for(const label of ["Ease stress & restore energy","Grow money & self esteem","Improve relationships","Personal & business growth","Личностный рост и развитие бизнеса","Crecimiento personal y empresarial"])assert.ok(quiz.includes(label));
 const wanted=["stress_energy","money_growth","relationships_esteem","business_support"];
 for(const label of ["С чем вам нужна поддержка?","What do you need help with?","¿En qué necesitas apoyo?"]){
   const start=quiz.indexOf('"title": "'+label+'"');
   const end=quiz.indexOf('"mode": {',start);
   assert.ok(start>=0 && end>start,"Topic block present for "+label);
   const ids=[...quiz.slice(start,end).matchAll(/^\s+"(stress_energy|money_growth|relationships_esteem|business_support)",?\s*$/gm)].map(x=>x[1]);
   assert.deepEqual(ids,wanted,"Two-column row-major order in "+label);
 }
 assert.match(css,/\.choices\[data-question-kind="topic"\] \.choice:nth-child\(2\) \.choiceMedia\{background-position:0 83%\}/);
 assert.match(css,/\.choices\[data-question-kind="topic"\] \.choice:nth-child\(3\) \.choiceMedia\{background-position:100% 17%\}/);
 assert.match(quiz,/const questionKeys = \["topic", "need", "mode", "budget"\]/);
 assert.match(quiz,/data-services-quiz-questions="4"/);
 assert.match(quiz,/data-services-quiz-step=\{step \+ 1\}/);
 assert.match(quiz,/data-services-quiz-question=\{currentKey\}/);
 assert.match(quiz,/data-quiz-dot=\{index \+ 1\}/);
 assert.match(quiz,/disabled=\{!ready\}/);
 assert.match(quiz,/aria-pressed=\{selected\}/);
 assert.doesNotMatch(quiz,/data-services-more-topics|moreTopics/);
});
test("adaptive questions and answers are private, revisitable and reset on topic changes",()=>{
 for(const topic of ["stress_energy","relationships_esteem","money_growth","business_support"]){assert.ok(quiz.includes('"'+topic+'": {'));assert.ok(quiz.includes('"'+topic+'",'));}
 for(const need of ["stress_tension","relationship_couple","growth_income","business_strategy"])assert.ok(quiz.includes('"'+need+'",'));
 assert.match(quiz,/const needFocus:/);
 assert.match(quiz,/t\.needs\[topic\]/);
 assert.match(quiz,/key === "topic" && old\.topic !== value/);
 assert.match(quiz,/data-services-quiz-summary/);
 assert.doesNotMatch(quiz,/localStorage|sessionStorage|fetch\(|sendBeacon/);
});
test("offer ranking cannot confuse personal money requests with business consultations",()=>{
 const rec=read("components/assist-top-recommendations.tsx");
 assert.match(quiz,/id !== "business"/);
 assert.match(quiz,/topic === "business_support"/);
 assert.match(quiz,/allowedIds=\{matchingIds\}/);
 assert.match(rec,/\.filter\(id=>!allowedIds\|\|allowedIds\.includes\(id\)\)/);
 assert.match(rec,/mytube:\{path:"mytube"/);
 assert.ok(rankAssistProducts("work",{mode:"human",channel:"online",budget:"flexible"}).includes("business"));
 for(const focus of ["stress","relationships","growth"])assert.ok(rankAssistProducts(focus,{mode:"video",budget:"free"}).includes("mytube"));
});
test("same-page categories and production browser acceptance remain",()=>{
 assert.match(css,/reiki-approved-sunrise-v3\.webp/);
 assert.match(css,/Owner-approved Support mobile sunrise/);
 assert.match(css,/\.form\{[^\n]*background:none;/);
 assert.match(quiz,/data-services-quiz-goal/);
 assert.match(quiz,/data-services-quiz-next/);
 assert.match(quiz,/data-services-audience/);
 assert.match(quiz,/data-support-luxe-room/);
 assert.match(quiz,/data-support-choice-photo/);
 assert.match(css,/SUPPORT_THERAPY_CABINET_V2_20261121/);
 assert.match(css,/support-therapy-cabinet-hd\.webp/);
 assert.match(css,/OWNER_APPROVED_CABINET_PROPORTIONS_20261121/);
 assert.match(css,/support-personal-choice-photos-hd\.webp/);
 const photo = readFileSync(new URL("../public/images/holistic-house/support-therapy-cabinet.webp",import.meta.url));
 const sprite = readFileSync(new URL("../public/images/holistic-house/support-luxury-choice-photos.webp",import.meta.url));
 assert.ok(photo.length>=12000,"Therapy room should not be the older 200px placeholder");
 assert.ok(sprite.length>=4000,"Four reference card photos must be real first-party artwork");
 const hdPhoto=readFileSync(new URL("../public/images/holistic-house/support-therapy-cabinet-hd.webp",import.meta.url));
 assert.ok(hdPhoto.length>=150000 && hdPhoto.length<=270000,"User-approved 1024px room must remain Retina sharp");
 assert.equal(hdPhoto.toString("ascii",0,4),"RIFF");
 const personalPhotos=readFileSync(new URL("../public/images/holistic-house/support-personal-choice-photos-hd.webp",import.meta.url));
 assert.ok(personalPhotos.length>=120000 && personalPhotos.length<=260000,"The four personal images must be high resolution");
 assert.equal(personalPhotos.toString("ascii",0,4),"RIFF");
 assert.match(quiz,/<svg className=\{styles\.lotusMark\}/);
 assert.match(css,/SUPPORT_MOBILE_FIRST_SCREEN_FIT_20261121/);
 assert.equal(photo.toString("ascii",0,4),"RIFF");
 assert.equal(sprite.toString("ascii",0,4),"RIFF");
 const themedDock=read("app/unified-mobile-dock.css");
 assert.match(themedDock,/SUPPORT_LUXURY_DOCK_20261121/);
 assert.match(themedDock,/main\[data-support-luxe="true"\]/);
 assert.match(quiz,/Coaching, Consulting & Therapy Support/);
 assert.match(quiz,/Choose the right method & master/);
 assert.match(quiz,/Get Free Analyses/);
 assert.match(quiz,/topic:"stress_energy"/);
 assert.doesNotMatch(quiz,/data-services-hero-play/);
 const en=read("app/[locale]/services/page.tsx"),es=read("app/es/services/page.tsx");
 assert.match(en,/data-support-luxe/); assert.match(es,/data-support-luxe/);
 assert.match(css,/\.categoryGrid \{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:350px\)/);
 assert.match(css,/@media\(min-width:761px\)\{\.root\{display:none\}\}/);
 const ownedOrder=["diagnostics","business","homeopathy","coaching","psychotherapy","video"];
 for(const category of ownedOrder) assert.ok(quiz.includes('key: "'+category+'"'),category);
 for(let index=1;index<=6;index++)
   assert.ok(css.includes(".category:nth-child("+index+") .categoryMedia"),"Missing photographic category "+index);
 assert.match(quiz,/serviceGroupAnchor\(servicesCategoryTargets\[key\]\)/);
 const browser=read("scripts/verify-public-services-production.mjs");
 for(const needle of ['data-services-business-menu','data-services-business-category="express"','data-business-offer="strategy-3"','data-business-get-details','data-services-quiz-choice="money_growth"','data-services-quiz-results','assist=chat'])assert.ok(browser.includes(needle),needle);
 assert.doesNotMatch(browser,/data-services-more-topics/);
 assert.match(read("app/es/services/page.tsx"),/<ServicesAssistQuiz locale="es"\s*\/>/);
});

test("ten Support directions are visible and empty quiz results offer useful actions",()=>{
  const c=read("components/services-assist-quiz.tsx");
  const styles=read("components/services-assist-quiz.module.css");
  const recommendations=read("components/assist-top-recommendations.tsx");
  for(const key of ["constellations","practices","courses","tests"]){
    assert.ok(c.includes('key: "'+key+'"'),key+" must have a visible card");
    assert.ok(styles.includes('data-services-quiz-category="'+key+'"'),key+" must use its own photograph");
  }
  assert.match(c,/data-services-extra-categories/);
  assert.match(c,/categoryGridMore/);
  assert.doesNotMatch(c,/<details className=\{styles\.categoryMore\}/);
  assert.match(c,/data-services-quiz-summary/);
  assert.match(c,/onAdjustFilters/);
  assert.match(recommendations,/data-support-empty-result/);
  assert.match(recommendations,/services\/free-situation-review/);
  assert.match(recommendations,/styles\.disclosure/);
});

test("approved cream Support layout keeps the actual quiz and explicit messenger disclosure",()=>{
 assert.match(quiz,/data-support-cream-panel/);
 assert.match(quiz,/className=\{styles\.goalNext\} data-services-quiz-next/);
 assert.ok(quiz.indexOf("data-services-audience")<quiz.indexOf("data-support-luxe-room"));
 assert.ok(quiz.indexOf("data-support-luxe-room")<quiz.indexOf("data-services-quiz-form"));
 assert.ok(quiz.indexOf("data-services-quiz-form")<quiz.indexOf("data-services-goal-entry"));
 assert.match(quiz,/data-support-free-analyses/);
 assert.match(quiz,/aria-expanded=\{reviewOpen\}/);
 assert.match(quiz,/hidden=\{!reviewOpen\}/);
 assert.match(quiz,/<MandatoryMessengerActions locale=\{locale\} whatsappUrl=\{reviewWhatsApp\} label=\{review\.channel\} compact/);
 assert.match(quiz,/whatsappEnquiryUrl\(\{locale,service:review\.service,request:review\.request,pagePath:/);
 assert.match(quiz,/data-support-learn-more href="#support-programs"/);
 assert.match(quiz,/id="support-programs"/);
 assert.match(quiz,/data-support-program-screen/);
 assert.match(quiz,/homeDiscovery=\{true\}/);
 assert.ok(quiz.indexOf("data-services-goal-entry")<quiz.indexOf("data-support-program-screen"));
 const dashboard=read("components/app/profile-space-dashboard.jsx");
 assert.match(dashboard,/homeDiscovery = false/);
 assert.match(dashboard,/clarity: 'Express'/);
 assert.match(dashboard,/!embeddedSection && !homeDiscovery/);
 assert.doesNotMatch(quiz,/data-services-goal-or/);
 assert.match(css,/SUPPORT_CREAM_ARTIFACTS_APPROVED_20261127/);
 assert.match(css,/\.heroActions\{/);
 assert.match(css,/\.paper\{/);
 assert.match(quiz,/if\(key!=="budget"\)/);
 assert.match(quiz,/setStep\(index=>Math\.min\(index\+1,questionKeys\.length-1\)\)/);
 assert.match(quiz,/step===questionKeys\.length-1 && ready && !submitted/);
});
