import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";

const source = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const offers = source("components/free-diagnosis-offers.tsx");
const css = source("components/free-diagnosis-offers.module.css");
const landing = source("components/free-entry-landing.tsx");
const hub = source("app/[locale]/services/free-consultation/page.tsx");
const capture = source("components/compact-lead-capture.tsx");

test("both free-diagnosis entry routes reuse one localized three-offer selector, not separate incompatible carts", () => {
  assert.match(landing, /<FreeDiagnosisOffers locale=\{locale\} \/>/);
  assert.match(hub, /<FreeDiagnosisOffers locale=\{lang\} \/>/);
  assert.match(landing, /kind !== "situation" \? <CompactLeadCapture/);
  assert.match(landing, /<PersonalTestimonials locale=\{locale\} variant="all" \/>/);
  assert.match(hub, /<PersonalTestimonials locale=\{lang\} variant="all" \/>/);
  assert.match(hub, /data-free-consultation-hub/);
  assert.match(landing, /data-featured-constellations-video/);
});

test("three photo-backed horizontal cards expose the correct free and €50 offerings in EN/RU/ES", () => {
  for (const id of ["situation-written-free", "wu-xing-free", "personal-session-30-eur50"]) {
    assert.equal((offers.match(new RegExp('id: "' + id + '"', "g")) || []).length, 3, id + " across locales");
  }
  for (const phrase of [
    "Free situation diagnosis", "Бесплатная диагностика ситуации", "Diagnóstico gratuito de tu situación",
    "Wu Xing (Five Elements)", "У-Син (Пять стихий)", "Wu Xing (Cinco Elementos)",
    "Personal consultation", "Личная консультация", "Consulta personal",
    "30 MIN · €50", "30 МИН · €50", "БЕСПЛАТНО", "GRATIS",
  ]) assert.ok(offers.includes(phrase), "Missing localized offer: " + phrase);
  const paths = [
    "public/images/holistic-house/hero-olive-incense.webp",
    "public/academy/reiki-yggdrasil/source/eastern-tradition.png",
    "public/images/holistic-house/andy-about.png",
  ];
  for (const p of paths) assert.ok(existsSync(new URL("../" + p, import.meta.url)), "Missing authentic site image: " + p);
  assert.match(offers, /<Image src=\{photos\[offer\.id\]\} alt=\{offer\.imageAlt\} fill loading="lazy"/);
  assert.match(offers, /<details className=\{styles\.details\}>/);
  assert.match(offers, /<summary>\{t\.details\}/);
  assert.match(offers, /onClick=\{\(\) => setSelected\(offer\.id\)\}/);
  assert.match(offers, /href="#request-free-review"/);
  assert.match(css, /grid-template-columns:clamp\(150px,18vw,213px\) minmax\(0,1fr\)/);
  assert.match(css, /@media\(max-width:390px\)/);
  assert.match(css, /:focus-visible/);
});

test("all three offer CTAs select a controlled option in the one consented CRM enquiry form", () => {
  assert.equal((offers.match(/<CompactLeadCapture/g) || []).length, 1);
  assert.match(offers, /selectedFormatValue=\{selected\}/);
  assert.match(offers, /serviceTitle=\{t\.offers\.find\(offer => offer\.id === selected\)\?\.title/);
  assert.match(offers, /onFormatChange=\{\(value\) => setSelected\(value as OfferId\)\}/);
  assert.match(offers, /formatOptions=\{t\.offers\.map\(offer => \(\{ value: offer\.id, label:/);
  assert.match(capture, /const selectedFormat = selectedFormatValue \?\? internalFormat/);
  assert.match(capture, /const receiptServiceTitle = submittedServiceTitle \?\? serviceTitle/);
  assert.match(capture, /onFormatChange\?\.\(event\.target\.value\)/);
  assert.match(capture, /fetch\("\/api\/service-enquiries"/);
  assert.match(capture, /contactConsent: true/);
  assert.match(capture, /setReference\(committedReference\)/);
  assert.match(capture, /"; Preferred session format: " \+ selectedFormat/);
  assert.doesNotMatch(offers, /fetch\(|gtag\(|dataLayer|autoplay|payment_received|payment_captured/);
  assert.match(offers, /not a confirmed appointment or payment/);
  assert.match(offers, /символическая модель/);
});
