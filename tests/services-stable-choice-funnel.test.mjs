import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizePublicServiceEnquiry } from "../lib/practitioners/public-service-enquiry-input.mjs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const hero = read("components/services-conversion-hero.tsx");
const heroCss = read("components/services-conversion-hero.module.css");
const capture = read("components/services-hero-quick-request.tsx");
const api = read("app/api/service-enquiries/route.js");
const repository = read("lib/practitioners/public-service-enquiry.js");
const analytics = read("lib/public-analytics.ts");

test("free written review, 30-minute and 60-minute choices stay outside rotating slides for EN/RU/ES", () => {
  const stable = hero.indexOf('data-services-stable-offers');
  const carousel = hero.indexOf('className={styles.slider}');
  const finder = hero.indexOf('className={styles.finder}');
  assert.ok(stable > 0 && stable < carousel && carousel < finder);
  for (const choice of ["free", "30", "60"]) {
    assert.match(hero, new RegExp('data-services-stable-offer="' + choice + '"'));
  }
  for (const phrase of ["Free written review", "Бесплатный письменный разбор", "Revisión escrita gratuita",
    "30 min · €50", "30 мин · €50", "60 min · €100", "60 мин · €100"]) {
    assert.ok(hero.includes(phrase), phrase);
  }
  assert.match(hero, /requestOpen && \(slide.kind !== "free" \|\| requestSku\)/);
  assert.match(hero, /href=\{`\/\$\{locale\}\/services\/free-situation-review`\}/);
  assert.match(hero, /prefers-reduced-motion: reduce/);
});

test("two paid choices use existing server-confirmed CRM intake, never a messenger click as a lead", () => {
  assert.match(hero, /setRequestSku\("express-consultation-30"\)/);
  assert.match(hero, /setRequestSku\("personal-session-60"\)/);
  assert.match(hero, /bookingSku=\{requestSku \?\? undefined\}/);
  assert.match(capture, /fetch\("\/api\/service-enquiries"/);
  assert.match(capture, /\.\.\.\(bookingSku \? \{ bookingSku \} : \{\}\)/);
  assert.match(capture, /contactConsent: true/);
  assert.match(capture, /result\?\.saved !== true/);
  assert.match(capture, /setReference\(result.referenceCode\)/);
  assert.match(capture, /data-services-request-form/);
  assert.match(api, /createPublicServiceEnquiry/);
  assert.match(repository, /insert into app.public_service_enquiries/);
  assert.match(repository, /insert into app.crm_contacts/);
  assert.match(repository, /if \(input.action === 'confirm_booking'\)/);
  assert.match(repository, /SLOT_UNAVAILABLE/);
  assert.match(analytics, /PUBLIC_ANALYTICS_AVAILABLE = false/);
  assert.doesNotMatch(capture, /sendBeacon|gtag\(|payment_captured|booking_confirmed/);
});

test("the receipt displays three honest steps, not confirmation or payment", () => {
  for (const part of ["stepRequest", "stepReply", "stepTime", "requestSteps", "aria-label={t.success}"]) {
    assert.ok(capture.includes(part), part);
  }
  for (const line of ["Enquiry saved", "Заявка сохранена", "Solicitud guardada",
    "Personal reply pending", "Ожидается личный ответ", "Respuesta personal pendiente"]) {
    assert.ok(capture.includes(line), line);
  }
  assert.match(heroCss, /\.requestSteps/);
  assert.match(heroCss, /\.quickBookingActions :is\(a,button\)/);
  assert.match(heroCss, /min-height:44px/);
  assert.match(heroCss, /data-services-stable-offer="free"/);
});

test("strict fixed-SKU intake allows only consented known services and rejects forged booking and pricing", () => {
  const base = {
    operationId: "13b822f6-8d70-4f63-b9b8-efdeadbeef01",
    serviceTitle: "Personal session", locale: "en", sourcePath: "/en/services",
    contactConsent: true, contact: { displayName: "Test Visitor", email: "visitor@example.test" },
    bookingSku: "personal-session-60",
  };
  assert.equal(normalizePublicServiceEnquiry(base).bookingSku, base.bookingSku);
  for (const candidate of [
    {sourcePath:"/en/services/personal-support"}, {sourcePath:"/en/services?utm_source=example"},
    {bookingSku:"wrong-30"}, {bookingSku:"personal-session-60?price=1"},
    {contactConsent:false}, {contact:undefined}, {amountMinor:1}, {paid:true},
  ]) assert.throws(() => normalizePublicServiceEnquiry({...base,...candidate}));
});
