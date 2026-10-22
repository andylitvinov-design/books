import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const situationPage = read("app/[locale]/services/free-situation-review/page.tsx");
const daoPage = read("app/[locale]/services/dao-health-profile/page.tsx");
const testsPage = read("app/[locale]/tests/page.tsx");
const landing = read("components/free-entry-landing.tsx");
const css = read("components/free-entry-landing.module.css");
const capture = read("components/compact-lead-capture.tsx");
const captureCss = read("components/compact-lead-capture.module.css");
const form = read("components/free-situation-review-form.tsx");
const intake = read("components/free-drawing-intake.tsx");
const intakeCss = read("components/free-drawing-intake.module.css");
const offers = read("components/services-studio-offers.tsx");
const serviceData = read("data/core-service-offers.ts");

test("all three Services free cards open their own benefit-first, photo-led landing before entering an actual flow", () => {
  assert.match(offers, /href: "\/" \+ locale \+ "\/tests"/);
  assert.match(offers, /href: situation\.href/);
  assert.match(offers, /href: dao\.href/);
  assert.match(serviceData, /route: "free-situation-review"/);
  assert.match(serviceData, /route: "dao-health-profile"/);
  assert.match(testsPage, /kind="tests"/);
  assert.match(situationPage, /kind="situation"/);
  assert.match(daoPage, /kind="dao"/);
  assert.match(landing, /data-free-entry-landing=\{kind\}/);
  assert.match(landing, /<PublicSiteHeader locale=\{locale\} showAssessmentStrip=\{false\}/);
  for (const path of ["app/[locale]/tests/page.tsx", "app/[locale]/services/free-situation-review/page.tsx",
    "app/[locale]/services/dao-health-profile/page.tsx"]) {
    const source = read(path);
    for (const locale of ["en", "ru", "es"]) assert.ok(source.includes("/" + locale + "/"), "Missing locale " + locale + " at " + path);
  }
});

test("free landings explain benefits before closing with one short capture", () => {
  // Layout now uses conditional class names; check visible section order via stable anchors.
  const hero = landing.indexOf('aria-labelledby="free-entry-title"');
  const outcome = landing.indexOf('id="what-you-get"');
  const process = landing.indexOf('id="how-it-works"');
  const video = landing.indexOf('<ServiceVideoShowcase');
  const final = landing.lastIndexOf("<CompactLeadCapture");
  assert.ok(hero > 0 && hero < outcome && outcome < process && process < video && video < final);
  assert.match(landing, /kind !== "dao" \? <section className=\{\[styles\.scene, styles\.processScene\]/,
    "Only Wu Xing hides the redundant process section");
  assert.match(landing, /kind === "situation" \? <div className=\{styles\.videoWrap\}/,
    "Generic overview video is retained for the written-review service");
  assert.match(landing, /t\.bullets\.map/);
  assert.match(landing, /t\.outcomes\.map/);
  assert.match(landing, /t\.steps\.map/);
  assert.match(landing, /<h1 id="free-entry-title">\{t\.title\}<\/h1>/);
  assert.match(landing, /<p className=\{styles\.promise\}>\{t\.value\}<\/p>/);
  assert.match(landing, /src=\{images\.hero\} alt=\{t\.photoAlt\} fill priority/);
  assert.match(landing, /id=\{captureId\}/);
  assert.match(landing, /id="what-you-get"/);
  assert.match(landing, /id="how-it-works"/);
  assert.match(landing, /serviceTitle=\{serviceTitles\[kind\]\}/);
  assert.doesNotMatch(landing, /<FreeResourceEnquiry/);
  assert.doesNotMatch(landing, /className=\{styles\.end\}/);
  assert.match(landing, /<Link className=\{styles\.primary\} href=\{testsHref\}/);
});

test("all three locales explain real service advantages without health claims or invented diagnoses", () => {
  for (const phrase of [
    "Understand your starting point", "Лучше поймите себя", "Conoce mejor tu punto de partida",
    "See your situation from a fresh perspective", "Взгляните на свою ситуацию", "Mira tu situación",
    "Discover what gives you strength.", "Узнайте, что даёт вам внутреннюю опору.",
    "Descubre qué te da fuerza.", "A symbolic guide for reflection — not a medical test.",
    "Символическая модель для самоисследования, а не медицинский тест.",
    "Un modelo simbólico de reflexión, no una prueba médica.",
    "Illustrative example — not your personal result.",
    "Условный пример — не ваш персональный профиль.",
    "diagnose or treat health conditions", "не диагностируют и не лечат заболевания",
  ]) assert.ok(landing.includes(phrase), "Missing benefit/safety: " + phrase);
  for (const phrase of ["Free Situation Review", "Бесплатный письменный разбор",
    "Revisión escrita gratuita", "Five Elements", "Пять элементов", "Cinco Elementos"]) {
    assert.ok(landing.includes(phrase) || situationPage.includes(phrase) || daoPage.includes(phrase), phrase);
  }
  assert.doesNotMatch(landing + capture, /guaranteed cure|лечим все|100% success|medical diagnosis provided/i);
  assert.doesNotMatch(landing + capture, /€50|€100/, "The free offering must not be upsold before being explained");
});

test("the real free drawing questionnaire remains reachable and keeps answers local until deliberate copy", () => {
  assert.match(landing, /<FreeSituationReviewForm locale=\{locale\} \/>/);
  assert.match(landing, /<details className=\{styles\.fullQuestionnaire\} data-optional-written-review>/);
  assert.match(form, /<FreeDrawingIntake locale=\{locale\}/);
  for (const field of ["problem", "goal", "obstacle", "tried"]) assert.ok(intake.includes("set" + field[0].toUpperCase() + field.slice(1)), field);
  assert.match(intake, /<form onSubmit=/);
  assert.match(intake, /<textarea required/);
  assert.match(intake, /navigator\.clipboard\.writeText\(answers\)/);
  assert.match(intake, /setPrepared\(true\)/);
  assert.match(intake, /Nothing has been sent/);
  assert.match(intake, /aria-live="polite"/);
  assert.match(intake, /<ContactChannelChooser/);
  assert.doesNotMatch(intake, /encodeURIComponent\((?:answers|problem|goal|obstacle|tried)\)/);
  assert.doesNotMatch(intake, /localStorage|sessionStorage|indexedDB|fetch\(|sendBeacon|\/api\/app\/|FileReader/);
  assert.match(intakeCss, /@media\(max-width:767px\)/);
});

test("new DAO and situation footer submits a consented contact to the existing private CRM API", () => {
  for (const locale of ["en:", "ru:", "es:"]) assert.ok(capture.includes(locale));
  assert.match(landing, /const serviceTitles = \{/);
  assert.match(capture, /<form className=\{styles\.form\}/);
  assert.match(capture, /<input type="text" name="contact"/);
  assert.match(capture, /<input type="checkbox" required checked=\{consent\}/);
  assert.match(capture, /fetch\("\/api\/service-enquiries"/);
  assert.match(capture, /contactConsent: true/);
  assert.match(capture, /result\?\.saved !== true/);
  assert.match(capture, /setReference\(result.referenceCode\)/);
  assert.match(capture, /Please do not enter health details/);
  assert.doesNotMatch(capture, /whatsappEnquiryUrl|encodeURIComponent\(address\)|localStorage|sendBeacon|gtag\(/);
  assert.match(captureCss, /:focus-visible/);
  assert.match(captureCss, /@media\(max-width:600px\)/);
});

test("mobile layout offers one meaning per screen, authentic images, and accessible forms", () => {
  for (const key of [".hero", ".heroVisual", ".scene", ".outcomeScene", ".processScene", ".capture", ".captureForm", ".faq"]) {
    assert.ok(css.includes(key), "Missing " + key);
  }
  assert.match(css, /min-height:calc\(100svh - 150px\)/);
  assert.match(css, /@media\(max-width:600px\)/);
  assert.match(css, /@media\(max-width:360px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /:focus-visible/);
  assert.match(landing, /"\/images\/holistic-house\/andy-about\.png"/);
  assert.match(landing, /"\/images\/holistic-house\/course-start-heron\.webp"/);
  assert.match(landing, /"\/academy\/reiki-yggdrasil\/source\/eastern-tradition\.png"/);
  assert.match(landing, /<PersonalTestimonials locale=\{locale === "es" \? "en" : locale\} variant="all" \/>/);
});
