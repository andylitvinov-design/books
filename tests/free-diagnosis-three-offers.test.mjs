import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";

const source = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const offers = source("components/free-diagnosis-offers.tsx");
const css = source("components/free-diagnosis-offers.module.css");
const landing = source("components/free-entry-landing.tsx");
const hub = source("app/[locale]/services/free-consultation/page.tsx");
const capture = source("components/compact-lead-capture.tsx");
const diagnostic = source("components/free-diagnostic-start.tsx");
const phoneCss = source("components/free-diagnostic-start.module.css");

test("both free diagnosis routes reuse the same three localized full-screen offers", () => {
  assert.match(landing, /<FreeDiagnosisOffers locale=\{locale\}>/);
  assert.match(hub, /<FreeDiagnosisOffers locale=\{lang\} \/>/);
  assert.match(landing, /<PersonalTestimonials locale=\{locale\} variant="all" \/>/);
  assert.match(hub, /<PersonalTestimonials locale=\{lang\} variant="all" \/>/);
  assert.match(landing, /data-featured-constellations-video/);
});

test("each of the three options is a full-screen photo scene with the explanation already visible", () => {
  for (const id of ["situation-written-free", "wu-xing-free", "personal-session-30-eur50"]) {
    assert.equal((offers.match(new RegExp('id: "' + id + '"', "g")) || []).length, 3, id + " in all locales");
  }
  for (const text of [
    "Free situation diagnosis", "Бесплатная диагностика ситуации", "Diagnóstico gratuito de tu situación",
    "Wu Xing (Five Elements)", "У-Син (Пять стихий)", "Wu Xing (Cinco Elementos)",
    "Personal consultation", "Личная консультация", "Consulta personal",
    "30 MIN · €50", "30 МИН · €50", "БЕСПЛАТНО", "GRATIS",
    "ME — GOAL — PROBLEM", "Я — ЦЕЛЬ — ПРОБЛЕМА", "YO — META — PROBLEMA",
  ]) assert.ok(offers.includes(text), "Missing offer copy: " + text);
  for (const path of [
    "public/images/holistic-house/hero-olive-incense.webp",
    "public/academy/reiki-yggdrasil/source/eastern-tradition.png",
    "public/images/holistic-house/andy-about.png",
  ]) assert.ok(existsSync(new URL("../" + path, import.meta.url)), "Missing authentic image: " + path);

  assert.match(offers, /<article className=\{styles\.scene\}\s/);
  assert.match(offers, /<Image src=\{photos\[offer\.id\]\} alt=\{offer\.imageAlt\} fill loading="lazy"/);
  assert.match(offers, /<p className=\{styles\.summary\}>\{offer\.summary\}<\/p>/);
  assert.match(offers, /<p className=\{styles\.detail\}>\{offer\.detail\}<\/p>/);
  assert.match(offers, /<ol>\{offer\.steps\.map/);
  assert.doesNotMatch(offers, /<details className=\{styles\.details\}>|<summary>\{t\.details\}|moreHref/);
  assert.match(css, /grid-template-columns:minmax\(0,46%\) minmax\(0,54%\)/);
  assert.match(css, /min-height:calc\(100svh - 80px/);
  assert.match(css, /object-fit:cover/);
  assert.match(css, /@media\(max-width:390px\)/);
  assert.match(css, /@media\(max-width:720px\) and \(max-height:720px\)/);
  assert.match(css, /:focus-visible/);
});

test("Request opens a bottom sheet, while two compact inline phone forms remain on the page", () => {
  assert.match(offers, /onClick=\{\(\) => requestOffer\(offer\.id\)\}/);
  assert.match(offers, /setSelected\(id\)/);
  assert.match(offers, /setRequestOpen\(true\)/);
  assert.match(offers, /data-diagnosis-order-form/);
  assert.match(offers, /data-diagnosis-placement="top"/);
  assert.match(offers, /data-diagnosis-placement="bottom"/);
  assert.match(offers, /id="free-diagnosis-top"/);
  assert.match(offers, /id="free-diagnosis-bottom"/);
  assert.match(offers, /const \[phone, setPhone\] = useState\(""\)/);
  assert.match(offers, /contactValue=\{phone\} onContactChange=\{setPhone\}/);
  assert.match(offers, /\{children\}/);
  assert.match(css, /\.formWrap\[data-open="false"\]\{display:none\}/);
  assert.match(offers, /data-open=\{requestOpen \? "true" : "false"\}/);
  assert.match(offers, /role=\{requestOpen \? "dialog" : undefined\}/);
  assert.match(offers, /aria-modal=\{requestOpen \|\| undefined\}/);
  assert.match(offers, /<FreeDiagnosticStart locale=\{locale\} compact \/>/);
  assert.match(offers, /<CompactLeadCapture key=\{selected\} locale=\{locale\}/);
  assert.match(offers, /phoneOnly variant="diagnosis"/);
  assert.match(offers, /serviceTitle=\{activeOffer\.title\}/);
  assert.match(css, /position:fixed;z-index:111;bottom:0/);
  assert.match(capture, /fetch\("\/api\/service-enquiries"/);
  assert.match(capture, /contactConsent: true/);
  assert.match(capture, /setReference\(committedReference\)/);
  assert.doesNotMatch(offers, /fetch\(|gtag\(|dataLayer|autoplay|payment_received|payment_captured/);
  assert.match(offers, /not a confirmed appointment or payment/);
  assert.match(offers, /символическая модель/);
});

test("free request is phone-only before the existing step-by-step coaching questionnaire", () => {
  assert.match(diagnostic, /compact = false/);
  assert.match(diagnostic, /data-free-diagnostic-phone-only/);
  assert.match(diagnostic, /type="tel" inputMode="tel" autoComplete="tel"/);
  assert.match(diagnostic, /const e164 = value\.replace/);
  assert.match(diagnostic, /sessionStorage\.setItem\(DIAGNOSTIC_START_KEY/);
  assert.match(diagnostic, /window\.location\.assign\("\/" \+ locale \+ "\/coaching\/intake" \+ \(compact \? "\?guided=1" : ""\)\)/);
  assert.match(diagnostic, /until you explicitly send your completed questionnaire/);
  assert.match(phoneCss, /\.compactForm/);
  assert.match(phoneCss, /@media\(max-width:610px\)/);
});
