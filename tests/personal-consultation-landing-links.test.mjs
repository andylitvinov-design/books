import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const landing = read("app/[locale]/services/free-situation-review/page.tsx");
const styles = read("app/[locale]/services/free-situation-review/review.module.css");
const homepage = read("components/holistic-house-home.tsx");
const services = read("components/services-conversion-hero.tsx");

test("free written review and optional paid consultation are distinct choices on one landing", () => {
  assert.match(landing, /id="request-free-review"/);
  assert.match(landing, /id="personal-consultation"/);
  assert.match(landing, /<FreeSituationReviewForm locale=\{locale\} \/>/);
  assert.match(landing, /<FreeReviewQuickRequest locale=\{locale\} \/>/);
  assert.match(landing, /variant="all"/);
  assert.match(landing, /href="#request-free-review"/);
  assert.match(landing, /href="#situations"/);
  assert.match(landing, /<ServiceVideoShowcase topic="overview"/);
  assert.ok(landing.indexOf('id="personal-consultation"') > landing.indexOf('<ServiceVideoShowcase'), "consultation format selection belongs after the value explanation and video");
  assert.match(landing, /<details className=\{styles\.directions\}>/);
  assert.match(landing, /className=\{styles\.finalRequest\} id="request-free-review"/);
  assert.ok(landing.includes('href={"/" + locale + "/services/alchemy-of-soul"}'));
});

test("three languages preserve a genuinely free written report and transparent live consultation prices", () => {
  for (const phrase of [
    "Начать бесплатный разбор",
    "Get my free written review",
    "Recibir revisión escrita gratuita",
    "written", "письмен", "escrito",
  ]) assert.ok(landing.includes(phrase), "missing localised consultation detail: " + phrase);
  assert.doesNotMatch(landing, /€50|€100/, "Monetary amounts appear only in the final request component");
  const selector = read("components/free-review-quick-request.tsx");
  for (const phrase of ["€50", "€100", "Free", "Бесплатно", "Gratis"]) assert.ok(selector.includes(phrase), phrase);
  assert.match(landing, /медицинским диагнозом/i);
  assert.match(landing, /medical diagnosis/i);
});

test("home and services offer direct and clear free and paid landing actions", () => {
  assert.match(homepage, /services\/free-situation-review/);
  assert.match(read("data/core-service-offers.ts"), /free-situation-review/);
  assert.match(read("components/services-studio-offers.tsx"), /situation.href/);
  assert.match(homepage, /className="service-home-button service-home-button--primary"\s*href=\{`\/\$\{locale\}\/services#consultation`\}/);
  assert.match(homepage, /\{text\.heroBook\}/);
  assert.match(services, /className=\{styles\.paidLink\} href="#consultation" data-service-hero-cta="paid"/);
  assert.match(homepage, /service-home-button--primary/);
  assert.match(services, /paidCta:/);
  assert.match(styles, /\.heroActions\{/);
  assert.match(styles, /\.finalRequest\{/);
  assert.match(styles, /@media\(max-width:767px\)/);
});

function assertBookingAnchor(page, cta, capture) {
  const targets = [...page.matchAll(/<PublicConsultationCta\b[^>]*\/>/g)].map(match => match[0]);
  assert.equal(targets.length, 1, "One consultation target per Services page");
  assert.match(targets[0], /id="consultation"/);
  assert.match(targets[0], /\bserviceBooking wiseEnabled=\{wisePaymentsEnabled\(\)\} paypalPersonalEnabled=\{personalPayPalEnabled\(\)\} \/>/);
  assert.match(cta, /if \(serviceBooking\) return <ConsultationChoiceCapture locale=\{locale\} variant="service" id=\{id\} wiseEnabled=\{wiseEnabled\} paypalPersonalEnabled=\{paypalPersonalEnabled\} \/>/);
  assert.match(capture, /<section\s+id=\{id\}/);
}

test("booking links resolve to the service selector anchor in every Services locale", () => {
  const cta = read("components/public-consultation-cta.tsx");
  const capture = read("components/consultation-choice-capture.tsx");
  for (const path of ["app/[locale]/services/page.tsx", "app/es/services/page.tsx"]) {
    const page = read(path);
    assertBookingAnchor(page, cta, capture);
    assert.throws(() => assertBookingAnchor(page.replace('id="consultation"', 'id="missing-consultation"'), cta, capture));
    assert.throws(() => assertBookingAnchor(page.replace(' serviceBooking ', ' '), cta, capture));
    assert.throws(() => assertBookingAnchor(page.replace('wiseEnabled={wisePaymentsEnabled()}', 'wiseEnabled={true}'), cta, capture));
    assert.throws(() => assertBookingAnchor(page.replace('paypalPersonalEnabled={personalPayPalEnabled()}', 'paypalPersonalEnabled={true}'), cta, capture));
    assert.throws(() => assertBookingAnchor(page.replace(' paypalPersonalEnabled={personalPayPalEnabled()}', ''), cta, capture));
  }
  assert.throws(() => assertBookingAnchor(read("app/es/services/page.tsx"), cta.replace('variant="service" id={id}', 'variant="personal" id={id}'), capture));
  assert.throws(() => assertBookingAnchor(read("app/es/services/page.tsx"), cta.replace('wiseEnabled={wiseEnabled}', 'wiseEnabled={true}'), capture));
  assert.throws(() => assertBookingAnchor(read("app/es/services/page.tsx"), cta.replace('paypalPersonalEnabled={paypalPersonalEnabled}', 'paypalPersonalEnabled={true}'), capture));
});

test("existing personal form remains a browser-local questionnaire with an explicit WhatsApp handoff", () => {
  const intake = read("components/free-drawing-intake.tsx");
  assert.match(intake, /navigator\.clipboard\.writeText/);
  assert.match(intake, /event\.preventDefault\(\)/);
  assert.match(intake, /t\.drawingText/);
  assert.doesNotMatch(intake, /localStorage|sessionStorage|fetch\(|sendBeacon|XMLHttpRequest/);
});
