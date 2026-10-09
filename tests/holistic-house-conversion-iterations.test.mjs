import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const home = readFileSync(new URL("../components/holistic-house-home.tsx", import.meta.url), "utf8");
const form = readFileSync(new URL("../components/free-situation-review-form.tsx", import.meta.url), "utf8");
const testimonials = readFileSync(new URL("../components/personal-testimonials.tsx", import.meta.url), "utf8");

test("iteration 1: home hero leads directly to a free situation review", () => {
  assert.match(home, /heroPrimary: "Request a free situation review"/);
  assert.match(home, /heroPrimary: "Записаться на бесплатный разбор"/);
  assert.match(home, /href={`\/\$\{locale\}\/services\/free-situation-review`}/);
  assert.match(home, /event="service_request_start"/);
  assert.match(home, /src="\/images\/holistic-house\/andy-about\.png"/);
  assert.ok(home.indexOf("<PersonalWorkJourney locale={locale} variant=\"compact\" />") < home.indexOf('<section className="service-home-start"'));
  assert.doesNotMatch(home, /href="#start-here"/);
});

test("iteration 2: first contact is a single-click preselected topic, with no private form fields", () => {
  const capture = readFileSync(new URL("../components/consultation-choice-capture.tsx", import.meta.url), "utf8");
  assert.match(form, /<ConsultationChoiceCapture locale=\{locale\} variant="free"/);
  assert.match(capture, /useState<Topic>\("personal"\)/);
  assert.match(capture, /https:\/\/wa\.me\/14376066502/);
  assert.match(capture, /not a medical diagnosis/i);
  assert.match(capture, /Оно отправится только после вашего подтверждения/);
  assert.doesNotMatch(capture, /<input|<textarea|<form|new FormData|localStorage|sessionStorage/);
});

test("iteration 3: grounded personal introduction and contextual testimonial CTA", () => {
  assert.match(home, /I have been facilitating personal and group development since 2002/);
  assert.match(home, /Я работаю с индивидуальными и групповыми практиками с 2002 года/);
  assert.match(home, /<p>{text\.aboutIntro}<\/p>/);
  assert.match(testimonials, /href={"\/" \+ locale \+ "\/services\/free-situation-review"}/);
  assert.doesNotMatch(testimonials, /isHome \? "\/" \+ locale \+ "\/services#consultation"/);
});
