import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const strip = source("components/public-pathway-strip.tsx");
const css = source("components/public-pathway-strip.module.css");
const about = source("app/[locale]/about/page.tsx");
const aboutEs = source("app/es/about/page.tsx");
const contact = source("app/[locale]/contact/page.tsx");
const contactCss = source("app/[locale]/contact/page.module.css");

test("one canonical four-sphere public nav, source-backed and locale-preserving", () => {
  for (const id of ["business", "relationships", "energy_health", "personal_growth"]) {
    assert.match(strip, new RegExp('id: "' + id + '"'));
  }
  for (const route of ["explore/business", "explore/love", "explore/energy", "personality-profiles"]) {
    assert.ok(strip.includes('href: "' + route + '"'), route);
  }
  assert.equal((strip.match(/ id: "/g) || []).length, 4);
  for (const locale of ["en", "ru", "es"]) assert.match(strip, new RegExp("  " + locale + ": "));
  assert.match(strip, /href=\{"\/" \+ locale \+ "\/" \+ href\}/);
  assert.doesNotMatch(strip, /fetch\(|useEffect|localStorage|test[_-]?score|client[_-]?profile/i);
});

test("public entry routes preserve their existing content, providers and accessibility", () => {
  for (const page of [about, aboutEs, contact]) {
    assert.match(page, /data-public-design-migration="wave1"/);
    assert.equal((page.match(/<PublicPathwayStrip/g) || []).length, 1);
    assert.match(page, /<PublicSiteHeader/);
  }
  assert.match(about, /aboutBiography/);
  assert.match(about, /<PersonalConsultationForm/);
  assert.match(about, /getPublishedSiteVideo/);
  assert.match(aboutEs, /aboutEs\.sections/);
  assert.match(aboutEs, /<PersonalConsultationForm/);
  assert.match(aboutEs, /data-video-locale="es"/);
  assert.match(contact, /whatsappEnquiryUrl/);
  assert.match(contact, /telegramEnquiryUrlFromWhatsApp/);
  assert.match(contact, /href=\{'\/'\+locale\+'\/app\/settings#hh-client-contact-phone'\}/);
  assert.match(contact, /t\.privacy/);
});

test("About root contains offscreen testimonial cards without disabling gallery scrolling", () => {
  const pageCss = source("components/public-journey-refresh.module.css");
  const testimonialCss = source("components/personal-testimonials.module.css");
  const browserGate = source("scripts/verify-public-pathway-mobile.mjs");
  assert.match(pageCss,/overflow-x: hidden/);
  assert.match(testimonialCss,/\.section:is\(\[data-personal-testimonials="all"\], \[data-personal-testimonials="about"\]\) \.videoGrid\{[\s\S]*?overflow-x:auto/);
  assert.match(browserGate,/state\.content > state\.client && state\.overflowX === "auto" && state\.rootOverflowX === "hidden"/);
});

test("responsive tiles, minimum touch sizes and visible keyboard focus", () => {
  assert.match(css, /grid-template-columns: repeat\(4/);
  assert.match(css, /overflow-x: auto/);
  assert.match(css, /scroll-snap-type: x proximity/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /min-height: 73px/);
  assert.match(contactCss, /min-height: 44px/);
  assert.match(contactCss, /@media \(max-width: 530px\)/);
});
