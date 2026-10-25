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
const chooser = source("components/contact-channel-chooser.tsx");

test("free review uses compact offers, consultation hub preserves full-screen offers", () => {
  assert.match(landing, /<FreeDiagnosisOffers locale=\{locale\} compact intro=\{/);
  assert.match(hub, /<FreeDiagnosisOffers locale=\{lang\} \/>/);
  assert.match(landing, /<PersonalTestimonials locale=\{locale\} variant="all" \/>/);
  assert.match(hub, /<PersonalTestimonials locale=\{lang\} variant="all" \/>/);
  assert.match(landing, /data-featured-constellations-video/);
  assert.match(offers, /\{intro\}/);
  assert.match(offers, /data-free-diagnosis-layout=\{compact \? "compact" : "full"\}/);
  assert.match(css, /\.wrap\[data-diagnosis-layout="compact"\] \.scenes/);
  assert.match(css, /\.wrap\[data-diagnosis-layout="compact"\] \.scene\{display:grid/);
  assert.match(css, /\.expandedInfo/);
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

test("Request opens one localized phone and messenger sheet; no legacy step-one form is shown", () => {
  assert.match(offers, /onClick=\{\(\) => requestOffer\(offer\.id\)\}/);
  assert.match(offers, /setSelected\(id\)/);
  assert.match(offers, /setRequestOpen\(true\)/);
  assert.match(offers, /data-diagnosis-order-form/);
  assert.match(offers, /id="request-free-review" data-diagnosis-placement="top"/);
  assert.match(offers, /id="free-diagnosis-request-dialog"/);
  assert.match(offers, /data-diagnosis-placement="top"/);
  assert.match(offers, /data-diagnosis-placement="bottom"/);
  assert.match(offers, /id="free-diagnosis-top"/);
  assert.match(offers, /id="free-diagnosis-bottom"/);
  assert.match(offers, /onClick=\{\(\) => requestOffer\("situation-written-free"\)\}/);
  assert.match(offers, /\{children\}/);
  assert.match(css, /\.formWrap\[data-open="false"\]\{display:none\}/);
  assert.match(offers, /data-open=\{requestOpen \? "true" : "false"\}/);
  assert.match(offers, /role=\{requestOpen \? "dialog" : undefined\}/);
  assert.match(offers, /aria-modal=\{requestOpen \|\| undefined\}/);
  assert.match(offers, /aria-haspopup="dialog"/);
  assert.match(offers, /<ContactChannelChooser key=\{selected\} locale=\{locale\}/);
  assert.match(offers, /compactPhone stayAfterSave resetKey=\{selected\}/);
  assert.match(offers, /whatsappUrl=\{whatsappEnquiryUrl\(\{/);
  assert.match(offers, /service: activeOffer\.title, request: t\.messengerRequest/);
  assert.match(offers, /option: activeOffer\.price, pagePath: pathname/);
  assert.match(offers, /publicTopic=\{activeOffer\.label \+ " · " \+ activeOffer\.price\}/);
  assert.match(offers, /closeButtonRef\.current\?\.focus\(\)/);
  assert.match(offers, /previousFocus\?\.focus\(\)/);
  assert.match(css, /position:fixed;z-index:111;bottom:0/);
  assert.match(css, /@media\(max-width:350px\)/);
  assert.doesNotMatch(offers, /<FreeDiagnosticStart|<CompactLeadCapture/);
  assert.doesNotMatch(offers, /fetch\(|gtag\(|dataLayer|autoplay|payment_received|payment_captured/);
  for (const localized of [
    "Request free diagnosis", "Заказать бесплатную диагностику", "Solicitar diagnóstico gratuito",
    "WhatsApp or Telegram", "WhatsApp или Telegram", "WhatsApp o Telegram",
  ]) assert.ok(offers.includes(localized), localized);
  assert.match(offers, /not a medical diagnosis or treatment/);
  assert.match(offers, /символическая модель/);
});

test("Messenger buttons commit a consented lead to CRM before direct WhatsApp or Telegram handoff", () => {
  assert.match(chooser, /<PhoneCountryInput/);
  assert.match(chooser, /contactConsent: consent/);
  assert.match(chooser, /fetch\("\/api\/service-enquiries"/);
  assert.match(chooser, /data\.saved !== true/);
  assert.match(chooser, /window\.open\("about:blank", "_blank"\)/);
  assert.match(chooser, /telegramEnquiryUrlFromWhatsApp/);
  assert.match(chooser, /handoffWindow\.location\.replace\(destination\)/);
  assert.match(chooser, /saveEnquiry\("whatsapp"\)/);
  assert.match(chooser, /saveEnquiry\("telegram"\)/);
  assert.match(offers, /No appointment or payment is confirmed/);
  assert.doesNotMatch(offers, /contact: \{.*health|sessionStorage\.setItem|booking_confirmed/);
});

test("legacy coaching questionnaire remains reachable separately without intercepting Request", () => {
  assert.match(landing, /<Link href=\{"\/" \+ locale \+ "\/coaching\/intake"\}/);
  assert.match(diagnostic, /compact = false/);
  assert.match(diagnostic, /data-free-diagnostic-phone-only/);
  assert.match(diagnostic, /type="tel" inputMode="tel" autoComplete="tel"/);
  assert.match(diagnostic, /compact && !phone/);
  assert.match(diagnostic, /sessionStorage\.setItem\(DIAGNOSTIC_START_KEY/);
  assert.match(diagnostic, /window\.location\.assign\("\/" \+ locale \+ "\/coaching\/intake"\)/);
  assert.match(diagnostic, /until you explicitly send your completed questionnaire/);
  assert.match(phoneCss, /\.compactForm/);
  assert.match(phoneCss, /@media\(max-width:610px\)/);
});
