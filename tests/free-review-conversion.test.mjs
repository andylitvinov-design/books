import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const situationPage = read("app/[locale]/services/free-situation-review/page.tsx");
const daoPage = read("app/[locale]/services/dao-health-profile/page.tsx");
const testsPage = read("app/[locale]/tests/page.tsx");
const landing = read("components/free-entry-landing.tsx");
const css = read("components/free-entry-landing.module.css");
const enquiry = read("components/free-resource-enquiry.tsx");
const enquiryCss = read("components/free-resource-enquiry.module.css");
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

test("each landing begins with the explicit personal benefit, then separate outcomes, steps and capture", () => {
  const hero = landing.indexOf('className={styles.hero}');
  const outcome = landing.indexOf('className={[styles.scene, styles.outcomeScene]');
  const process = landing.indexOf('className={[styles.scene, styles.processScene]');
  const capture = landing.indexOf('className={styles.capture}');
  const video = landing.indexOf('<ServiceVideoShowcase');
  assert.ok(hero > 0 && hero < outcome && outcome < process && process < capture && capture < video);
  assert.match(landing, /t\.bullets\.map/);
  assert.match(landing, /t\.outcomes\.map/);
  assert.match(landing, /t\.steps\.map/);
  assert.match(landing, /<h1 id="free-entry-title">\{t\.title\}<\/h1>/);
  assert.match(landing, /<p className=\{styles\.promise\}>\{t\.value\}<\/p>/);
  assert.match(landing, /src=\{images\.hero\} alt=\{t\.photoAlt\} fill priority/);
  assert.match(landing, /id=\{captureId\}/);
  assert.match(landing, /id="what-you-get"/);
  assert.match(landing, /id="how-it-works"/);
  assert.match(landing, /<FreeResourceEnquiry locale=\{locale\} kind=\{kind\}/);
  assert.match(landing, /<Link className=\{styles\.primary\} href=\{testsHref\}/);
});

test("all three locales explain real service advantages without health claims or invented diagnoses", () => {
  for (const phrase of [
    "Understand your starting point", "Лучше поймите себя", "Conoce mejor tu punto de partida",
    "See your situation from a fresh perspective", "Взгляните на свою ситуацию", "Mira tu situación",
    "Explore your inner resources through Wu Xing", "Исследуйте свои внутренние ресурсы",
    "Explora tus recursos interiores", "not a medical assessment", "не медицинское заключение",
    "diagnose or treat health conditions", "не диагностируют и не лечат заболевания",
  ]) assert.ok(landing.includes(phrase), "Missing benefit/safety: " + phrase);
  for (const phrase of ["Free Situation Review", "Бесплатный письменный разбор",
    "Revisión escrita gratuita", "Five Elements", "Пять элементов", "Cinco Elementos"]) {
    assert.ok(landing.includes(phrase) || situationPage.includes(phrase) || daoPage.includes(phrase), phrase);
  }
  assert.doesNotMatch(landing + enquiry, /guaranteed cure|лечим все|100% success|medical diagnosis provided/i);
  assert.doesNotMatch(landing + enquiry, /€50|€100/, "The free offering must not be upsold before being explained");
});

test("the real free drawing questionnaire remains reachable and keeps answers local until deliberate copy", () => {
  assert.match(landing, /<FreeSituationReviewForm locale=\{locale\} \/>/);
  assert.match(landing, /<details className=\{styles\.fullQuestionnaire\}>/);
  assert.match(form, /<FreeDrawingIntake locale=\{locale\}/);
  for (const field of ["problem", "goal", "obstacle", "tried"]) assert.ok(intake.includes("set" + field[0].toUpperCase() + field.slice(1)), field);
  assert.match(intake, /<form onSubmit=/);
  assert.match(intake, /<textarea required/);
  assert.match(intake, /navigator\.clipboard\.writeText\(answers\)/);
  assert.match(intake, /setPrepared\(true\)/);
  assert.match(intake, /Your questionnaire answers are ready to copy/);
  assert.match(intake, /Submitting the separate request form sends/);
  assert.match(intake, /CRM registration/);
  assert.match(intake, /aria-live="polite"/);
  assert.match(intake, /<ContactChannelChooser/);
  assert.doesNotMatch(intake, /encodeURIComponent\((?:answers|problem|goal|obstacle|tried)\)/);
  assert.doesNotMatch(intake, /localStorage|sessionStorage|indexedDB|fetch\(|sendBeacon|\/api\/app\/|FileReader/);
  assert.match(intakeCss, /@media\(max-width:767px\)/);
});

test("new DAO and free situation lead capture prepares real WhatsApp/Telegram drafts, with no URL leak of personal notes", () => {
  for (const label of ["Relationships & family", "Отношения и семья", "Relaciones y familia",
    "Balance & everyday energy", "Баланс и энергия", "Equilibrio y energía diaria"]) assert.ok(enquiry.includes(label), label);
  assert.match(enquiry, /<select value=\{topic\}/);
  assert.match(enquiry, /<input value=\{name\}/);
  assert.match(enquiry, /<textarea rows=\{3\} maxLength=\{350\}/);
  assert.match(enquiry, /whatsappEnquiryUrl\(\{/);
  assert.match(enquiry, /topic: offer\.topics\[topic\]/);
  assert.match(enquiry, /<ContactChannelChooser locale=\{locale\} whatsappUrl=\{whatsappUrl\}/);
  assert.match(enquiry, /navigator\.clipboard\.writeText\(privateContext\)/);
  assert.match(enquiry, /copyStatus === "error"/);
  assert.doesNotMatch(enquiry, /\n\s+context,\n/, "Personal free-form notes must never enter messenger query URL");
  assert.doesNotMatch(enquiry, /localStorage|sessionStorage|fetch\(|sendBeacon|<\/form>/);
  assert.match(enquiryCss, /focus-visible/);
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
