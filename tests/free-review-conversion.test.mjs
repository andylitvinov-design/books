import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const landing = read("app/[locale]/services/free-situation-review/page.tsx");
const css = read("app/[locale]/services/free-situation-review/review.module.css");
const form = read("components/free-situation-review-form.tsx");
const intake = read("components/free-drawing-intake.tsx");
const intakeCss = read("components/free-drawing-intake.module.css");

test("EN, RU, ES free offer is a handwritten drawing diagnostic with a written report", () => {
  for (const phrase of ["Бесплатная диагностика ситуации по рисунку", "Free situation & drawing assessment",
    "Evaluación gratuita mediante dibujo", "КОУЧИНГ-ФОРМА", "Coaching questionnaire", "Formulario de coaching",
    "ME, MY GOAL and MY PROBLEM", "Я", "МОЯ ЦЕЛЬ", "МИ ПРОБЛЕМА".replace("МИ", "МОЯ")]) {
    assert.ok(landing.includes(phrase) || intake.includes(phrase), "Missing: " + phrase);
  }
  for (const path of ["/en/services/free-situation-review", "/ru/services/free-situation-review", "/es/services/free-situation-review"]) {
    assert.ok(landing.includes(path), "Locale/canonical missing: " + path);
  }
  assert.ok(landing.includes('Image src="/images/holistic-house/andy-about.png"'));
  assert.ok(landing.includes("<FreeSituationReviewForm locale={locale} />"));
  assert.ok(landing.includes('id="request-free-review"'));
});

test("landing explains precisely three free steps and two optional priced live sessions", () => {
  for (const key of ["scopeTitle", "scopeIntro", "scopeItems", "scopeLimit",
    "t.steps.map", "t.directions.map", "t.faqs.map", "t.paidOptions.map"]) assert.ok(landing.includes(key));
  for (const price of ["€50", "€100"]) assert.ok(landing.includes(price));
  for (const mins of ["30 minutes", "60 minutes", "30 минут", "60 минут"]) assert.ok(landing.includes(mins));
  assert.ok(landing.includes("encodeURIComponent(option.message)"));
  assert.ok(landing.includes('href="#request-free-review"'));
  assert.ok(landing.includes("getHomeopathyLocaleParams"));
  assert.ok(landing.includes("isPublicLocale"));
  assert.ok(landing.includes('className={styles.paid}'));
});

test("coaching form is real, ephemeral, mobile-friendly and does not leak responses in WhatsApp URL", () => {
  assert.match(form, /<FreeDrawingIntake locale=\{locale\}/);
  for (const field of ["problem", "goal", "obstacle", "tried"]) assert.ok(intake.includes("set" + field[0].toUpperCase() + field.slice(1)), field);
  assert.match(intake, /<form onSubmit=/);
  assert.match(intake, /<textarea required/);
  assert.match(intake, /navigator\.clipboard\.writeText\(answers\)/);
  assert.match(intake, /setPrepared\(true\)/);
  assert.match(intake, /"https:\/\/wa\.me\/" \+ phone/);
  assert.match(intake, /encodeURIComponent\(\s*\[t\.whatsappIntro/);
  assert.doesNotMatch(intake, /encodeURIComponent\((?:answers|problem|goal|obstacle|tried)\)/);
  assert.doesNotMatch(intake, /localStorage|sessionStorage|indexedDB|fetch\(|sendBeacon|\/api\/app\/|FileReader/);
  assert.match(intake, /attach a photo of my handwritten drawing/);
  assert.match(intake, /Nothing is sent automatically/);
  assert.match(intakeCss, /@media\(max-width:767px\)/);
  assert.match(intakeCss, /focus-visible/);
});

test("mobile design keeps a clear first-step form and separates paid plans", () => {
  for (const value of [".contentGrid", ".capturePanel", ".steps", ".scope", ".paid", ".directions", ".about", ".faq", ".closing"]) assert.ok(css.includes(value));
  assert.ok(css.includes("@media(max-width:767px)"));
  assert.ok(landing.includes('className={styles.mobileCta}'));
  assert.ok(css.includes(".mobileCta { display:inline-flex"));
  assert.ok(css.includes("grid-template-columns:minmax(0,1fr)"));
  assert.ok(css.includes(":focus-visible"));
  assert.ok(css.includes("prefers-reduced-motion"));
});

test("written situation report is never represented as a healthcare diagnosis or cure", () => {
  for (const phrase of ["not a medical diagnosis", "не медицин", "no un diagnóstico"]) assert.ok(landing.includes(phrase), phrase);
  assert.ok(landing.includes("optional"));
  assert.doesNotMatch(landing, /guaranteed cure|лечим все|100% success|medical diagnosis provided/i);
});
