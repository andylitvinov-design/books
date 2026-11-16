import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("approved Home opens one dialogue instead of seven synchronous catalogues",()=>{
 const home=read("components/holistic-house-home.tsx");
 const es=read("app/es/page.tsx");
 const first=read("components/home-dialog-first.tsx");
 assert.match(home,/<HomeDialogFirst locale=\{locale\}\/>/);
 assert.match(es,/<HomeDialogFirst locale="es"\/>/);
 for(const source of [home,es])assert.doesNotMatch(source,/HomeSectionCarousel|HomeFeaturedWorkspace|HomeMoreDisclosure|ProfileHubTabs|PersonalTestimonials/);
 assert.match(first,/data-home-purpose-switch/);
 assert.match(first,/data-home-quick-intents/);
 assert.match(first,/data-home-intent-input/);
 assert.match(first,/priority unoptimized/);
});

test("homeopathy card has a complete local illustration instead of the observed broken image", () => {
  const journey = read("components/personal-work-journey.tsx");
  const svg = read("public/images/holistic-house/homeopathy-still-life.svg");
  assert.match(journey, /homeopathy-still-life\.svg/);
  assert.doesNotMatch(journey, /distance-homeopathy\.webp/);
  assert.match(svg, /<svg /);
  assert.match(svg, /<rect width="960" height="600"/);
  assert.match(svg, /<linearGradient id="amber"/);
  assert.ok(svg.length > 2000);
  assert.match(journey, /hypnotherapy-en-v1\.webp/);
  assert.match(journey, /constellations-en-v1\.webp/);
});

test("approved first paint uses a lightweight owned scenic image, not an invented presenter",()=>{
 const first=read("components/home-dialog-first.tsx");
 const home=read("components/holistic-house-home.tsx");
 assert.ok(existsSync(new URL("../public/images/holistic-house/reiki-approved-sunrise-v3.webp", import.meta.url)));
 assert.match(first,/reiki-approved-sunrise-v3\.webp/);
 assert.match(first,/priority unoptimized/);
 assert.doesNotMatch(home,/generated-avatar|mockup-person|<StaticPortrait/);
 assert.ok(existsSync(new URL("../public/images/holistic-house/andy-about.png", import.meta.url)));
});

test("premium botanical cards are responsive, keyboard-accessible and do not alter full Services", () => {
  const style = read("components/personal-work-journey.module.css");
  const homeStyle = read("app/holistic-house-home.css");
  const leaf = read("public/images/holistic-house/homepage-botanical.svg");
  assert.match(leaf, /<svg /);
  assert.match(style, /\.compact \.intro::after/);
  assert.match(style, /\.compact \.service/);
  assert.match(style, /@media\(max-width:767px\)/);
  assert.match(style, /grid-template-columns:clamp\(106px,29vw,146px\) minmax\(0,1fr\)/);
  assert.match(style, /\.full \.serviceLink/);
  assert.match(style, /:focus-visible/);
  assert.match(homeStyle, /\.house-home--services \.service-home-start__grid/);
  assert.match(homeStyle, /\.house-home--services \.service-home-start-card--learning/);
  assert.match(homeStyle, /\.house-home--services \.home-contact-capture/);
  assert.match(homeStyle, /prefers-reduced-motion:reduce/);
});

test("contact and prices remain available on their dedicated consented service journeys",()=>{
 const home=read("components/holistic-house-home.tsx");
 const first=read("components/home-dialog-first.tsx");
 const cta=read("components/homepage-contact-cta.tsx");
 const capture=read("components/consultation-choice-capture.tsx");
 assert.doesNotMatch(home,/HomepageContactCta|PublicConsultationCta/);
 assert.match(first,/\/services/);
 assert.match(cta,/data-home-contact-capture/);
 assert.match(capture,/serviceChoices: ServiceChoice\[\] = \["session", "questions", "free"\]/);
 assert.match(capture,/whatsappEnquiryUrl/);
 assert.match(capture,/services\/free-situation-review/);
});

test("Home provides a single chat-first action and no duplicate conversion form",()=>{
 const home=read("components/holistic-house-home.tsx");
 const first=read("components/home-dialog-first.tsx");
 assert.match(home,/<HomeDialogFirst locale=\{locale\}\/>/);
 assert.doesNotMatch(home,/HomeMoreDisclosure|HomepageContactCta|data-home-extra-paths|HomeFeaturedWorkspace/);
 assert.match(first,/data-home-intent-submit/);
 assert.match(first,/data-home-continue/);
 assert.match(first,/data-home-menu/);
 assert.match(read("components/home-more-disclosure.tsx"),/data-home-topic-filter="energy"/);
});

