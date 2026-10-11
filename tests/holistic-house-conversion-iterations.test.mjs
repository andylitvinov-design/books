import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const home = readFileSync(new URL("../components/holistic-house-home.tsx", import.meta.url), "utf8");
const form = readFileSync(new URL("../components/free-situation-review-form.tsx", import.meta.url), "utf8");
const testimonials = readFileSync(new URL("../components/personal-testimonials.tsx", import.meta.url), "utf8");

test("iteration 1: home hero leads directly to a free handwritten drawing assessment", () => {
  assert.match(home, /heroPrimary: "Free drawing assessment + report"/);
  assert.match(home, /heroPrimary: "Бесплатная диагностика по рисунку"/);
  assert.match(home, /href={`\/\$\{locale\}\/services\/free-situation-review`}/);
  assert.match(home, /event="service_request_start"/);
  assert.match(home, /src="\/images\/holistic-house\/andy-about\.png"/);
  assert.ok(home.indexOf("<PersonalWorkJourney locale={locale} variant=\"compact\" />") < home.indexOf('<section className="service-home-start"'));
  assert.doesNotMatch(home, /href="#start-here"/);
});

test("iteration 2: first contact is a real coaching form with a drawing requirement, without server-side storage", () => {
  const intake = readFileSync(new URL("../components/free-drawing-intake.tsx", import.meta.url), "utf8");
  assert.match(form, /<FreeDrawingIntake locale=\{locale\}/);
  assert.match(intake, /useState<Topic>\("personal"\)/);
  assert.match(intake, /<textarea required/);
  assert.match(intake, /navigator\.clipboard\.writeText\(answers\)/);
  assert.match(intake, /not a medical or mental-health diagnosis/i);
  assert.match(intake, /Nothing is sent automatically/);
  assert.match(intake, /handwritten drawing/);
  assert.doesNotMatch(intake, /localStorage|sessionStorage|new FormData|sendBeacon|fetch\(/);
});

test("iteration 3: grounded personal introduction and contextual testimonial CTA", () => {
  assert.match(home, /I have been facilitating personal and group development since 2002/);
  assert.match(home, /Я работаю с индивидуальными и групповыми практиками с 2002 года/);
  assert.match(home, /<p>{text\.aboutIntro}<\/p>/);
  assert.match(testimonials, /href={"\/" \+ locale \+ "\/services\/free-situation-review"}/);
  assert.doesNotMatch(testimonials, /isHome \? "\/" \+ locale \+ "\/services#consultation"/);
});
