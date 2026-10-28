import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { publicServiceCatalog } from "../lib/commerce/catalog.js";
import { restoreServiceCart } from "../lib/commerce/cart.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const landing = read("app/[locale]/services/free-situation-review/page.tsx");
const entry = read("components/free-entry-landing.tsx");
const express = read("components/personal-express-enquiry.tsx");
const homepage = read("components/holistic-house-home.tsx");
const services = read("components/services-conversion-hero.tsx");

function assertFreeEntry(page, shared, capture) {
  assert.match(page, /<FreeEntryLanding locale=\{locale\} kind="situation" \/>/);
  assert.match(shared, /<PersonalExpressEnquiry locale=\{locale\} intro=/);
  assert.match(shared, /<FreeSituationReviewForm locale=\{locale\} \/>/);
  assert.match(shared, /href="#request-free-review"/);
  assert.match(capture, /id="request-free-review" data-personal-express-enquiry/);
  assert.match(capture, /enableWizard = false/);
  assert.match(capture, /data-express-reveal aria-expanded=\{expanded\} aria-controls="express-request-form"/);
  assert.match(capture, /id="express-request-form"[\s\S]*?hidden=\{!expanded\}/);
  assert.match(capture, /whatsappUrl=\{whatsappUrl\} compactPhone stayAfterSave resetKey=\{focus\}/);
  assert.match(capture, /allowSecureExpressClaim publicServiceTitle=\{t\.service\}/);
  assert.match(capture, /publicTopic=\{"Express review focus: " \+ t\.areas\[focus\]\.tag\}/);
  assert.doesNotMatch(page + shared, /<FreeReviewQuickRequest/);
}

test("free written review uses its authored disclosure and private preparation, not a paid selector", () => {
  assertFreeEntry(landing, entry, express);
  const captureCss = read("components/personal-express-enquiry.module.css");
  const entryCss = read("components/free-entry-landing.module.css");
  assert.match(captureCss, /\.wrapper :is\(input,button,a\):focus-visible/);
  assert.match(captureCss, /\.reveal\{min-height:48px/);
  assert.match(captureCss, /@media\(max-width:720px\)/);
  assert.match(entryCss, /\.page :is\(a,button,summary,input,textarea,select\):focus-visible/);
  assert.match(entryCss, /@media\(max-width:600px\)/);
  assert.match(entryCss + captureCss, /prefers-reduced-motion/);
  for (const [before, after] of [
    ['id="request-free-review"', 'id="missing-review"'],
    ['hidden={!expanded}', 'hidden={false}'],
    ['publicServiceTitle={t.service}', 'publicServiceTitle="Personal session"'],
    ['compactPhone stayAfterSave', 'compactPhone'],
  ]) {
    assert.ok(express.includes(before), before);
    assert.throws(() => assertFreeEntry(landing, entry, express.replace(before, after)), undefined, before);
  }
});

test("three languages retain free written review while paid durations and prices stay explicit in the service catalog", () => {
  for (const phrase of ["personal written review", "письменный", "revisión escrita", "not a medical diagnosis", "не диагностика или лечение", "sin diagnóstico médico"]) {
    assert.ok((landing + entry).includes(phrase), phrase);
  }
  assert.doesNotMatch(landing + express, /€50|€100/, "The free request does not silently become a paid consultation");
  for (const locale of ["en", "ru", "es"]) {
    const catalog = publicServiceCatalog(locale);
    assert.deepEqual(catalog.map(({ id, durationMinutes, amountMinor, currency, kind }) => ({ id, durationMinutes, amountMinor, currency, kind })), [
      { id: "express-consultation-30", durationMinutes: 30, amountMinor: 5000, currency: "EUR", kind: "one_time" },
      { id: "personal-session-60", durationMinutes: 60, amountMinor: 10000, currency: "EUR", kind: "one_time" },
    ]);
    assert.ok(catalog.every(product => product.title && product.description));
  }
});

function assertHomePaths(home, carousel, featured, hero) {
  assert.match(home, /<HomeSectionCarousel locale=\{locale\} \/>/);
  assert.match(home, /<HomeFeaturedWorkspace locale=\{locale\} \/>/);
  assert.ok(carousel.includes('slide.key === "services" ? `/${locale}/services#consultation`'));
  assert.ok(featured.includes('review: "/" + locale + "/services/free-situation-review"'));
  assert.ok(featured.includes('therapist: "/" + locale + "/services#consultation"'));
  assert.match(featured, /<Link href=\{hrefs\[offer\.id\]\}/);
  assert.match(hero, /href="#free-insights" data-service-hero-cta="free"/);
  assert.match(hero, /href="#consultation" data-service-hero-cta="paid"/);
}

test("home and services keep distinct direct free and paid destinations through their current components", () => {
  const carousel = read("components/home-section-carousel.tsx");
  const featured = read("components/home-featured-workspace.tsx");
  assertHomePaths(homepage, carousel, featured, services);
  assert.throws(() => assertHomePaths(homepage, carousel.replace('/services#consultation', '/services#missing'), featured, services));
  assert.throws(() => assertHomePaths(homepage, carousel, featured.replace('/services/free-situation-review', '/services/business-consulting'), services));
  assert.throws(() => assertHomePaths(homepage, carousel, featured, services.replace('href="#free-insights"', 'href="#consultation"')));
});

function assertBookingAnchor(page, cta, cart) {
  const targets = [...page.matchAll(/<PublicConsultationCta\b[^>]*\/>/g)].map(match => match[0]);
  assert.equal(targets.length, 1, "One consultation target per Services page");
  assert.match(targets[0], /id="consultation"/);
  assert.match(targets[0], /\bserviceBooking wiseEnabled=\{wisePaymentsEnabled\(\)\} paypalPersonalEnabled=\{personalPayPalEnabled\(\)\} \/>/);
  assert.match(cta, /if \(serviceBooking\) return <ConsultationCartEntry locale=\{locale\} id=\{id\} \/>/);
  assert.match(cart, /<section id=\{id\}[^>]*data-consultation-capture="service"/);
  assert.match(cart, /aria-pressed=\{added\}/);
  assert.match(cart, /onClick=\{\(\) => toggle\(product\.id\)\}/);
  assert.match(cart, /restoreServiceCart\(JSON\.stringify\(/);
  assert.match(cart, /Adding to cart does not charge or reserve a time/);
  assert.match(cart, /Before paying, confirm the time, total amount/);
  assert.match(cart, /<p className=\{styles\.note\}>\{t\.note\}<\/p>/);
  assert.doesNotMatch(cart, /fetch\(|sendBeacon|XMLHttpRequest|window\.open|paypal\.com|wise\.com/);
}

test("booking anchors resolve to the current SKU-only cart in every Services locale without charging or reserving", () => {
  const cta = read("components/public-consultation-cta.tsx");
  const cart = read("components/commerce/consultation-cart-entry.tsx");
  for (const path of ["app/[locale]/services/page.tsx", "app/es/services/page.tsx"]) {
    const page = read(path);
    assertBookingAnchor(page, cta, cart);
    for (const [before, after] of [
      ['id="consultation"', 'id="missing-consultation"'], [' serviceBooking ', ' '],
      ['wiseEnabled={wisePaymentsEnabled()}', 'wiseEnabled={true}'],
      ['paypalPersonalEnabled={personalPayPalEnabled()}', 'paypalPersonalEnabled={true}'],
    ]) assert.throws(() => assertBookingAnchor(page.replace(before, after), cta, cart));
  }
  const page = read("app/es/services/page.tsx");
  assert.throws(() => assertBookingAnchor(page, cta.replace('id={id} />', 'id="missing" />'), cart));
  assert.throws(() => assertBookingAnchor(page, cta, cart.replace('<section id={id}', '<section')));
  assert.throws(() => assertBookingAnchor(page, cta, cart.replace('{t.note}</p>', '</p>')));
  assert.throws(() => assertBookingAnchor(page, cta, cart + '\nfetch("/api/pay");'));
  const selected = restoreServiceCart(JSON.stringify(['express-consultation-30', 'express-consultation-30', 'synthetic@example.invalid', '+14165550123', 'https://example.invalid/private', 'personal-session-60']));
  assert.deepEqual(selected, ['express-consultation-30', 'personal-session-60']);
  for (const invalid of ['not-json', '{}', 'null', '["private answers"]']) assert.deepEqual(restoreServiceCart(invalid), []);
});

test("existing personal form directs to private saving without a messenger material handoff", () => {
  const intake = read("components/free-drawing-intake.tsx");
  assert.match(intake, /\/coaching\/intake/);
  assert.match(intake, /Keep the photo on your device/);
  assert.match(intake, /Do not send private answers/);
  assert.doesNotMatch(intake, /navigator\.clipboard|ContactChannelChooser|localStorage|sessionStorage|fetch\(|sendBeacon|XMLHttpRequest/);
});
