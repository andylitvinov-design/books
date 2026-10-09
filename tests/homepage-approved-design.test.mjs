import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("approved 2026-10-09 home design keeps all three service directions and original routes", () => {
  const home = read("components/holistic-house-home.tsx");
  const journey = read("components/personal-work-journey.tsx");
  assert.match(home, /<PersonalWorkJourney locale=\{locale\} variant="compact" \/>/);
  assert.match(journey, /text\.services\.map/);
  for (const slug of ["psychohomeopathy", "imagery-therapy", "systemic-constellations"]) {
    assert.ok(journey.includes(slug), "Lost service route: " + slug);
  }
  assert.match(journey, /<article className=\{styles\.service\} key=\{service\.slug\}>/);
  assert.match(journey, /"\/" \+ locale \+ "\/services\/" \+ \(!compact && service\.freeSlug \? service\.freeSlug : service\.slug\)/);
  assert.match(home, /<PersonalTestimonials locale=\{locale\} variant="home"/);
  assert.match(home, /<SiteVideoPlayer key=\{locale\} video=\{introVideo\}/);
  assert.match(home, /className="service-home-hero"/);
  assert.match(home, /event="self_check_start"/);
  assert.match(home, /event="service_view"/);
  assert.match(home, /\{text\.academyAction\}/);
  assert.match(home, /\{text\.libraryAction\}/);
  assert.match(home, /\{text\.cabinetAction\}/);
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

test("approved design uses actual teacher portrait, not the synthetic mockup person", () => {
  const home = read("components/holistic-house-home.tsx");
  assert.ok(existsSync(new URL("../public/images/holistic-house/andy-about.png", import.meta.url)));
  assert.match(home, /className="service-home-about__portrait"/);
  assert.match(home, /src="\/images\/holistic-house\/andy-about\.png"/);
  assert.match(home, /alt=\{locale === "ru" \? "Андрей Литвинов" : "Andrey Litvinov"\}/);
  assert.match(home, /<p>\{text\.aboutIntro\}<\/p>/);
  assert.match(home, /event="practitioner_view"/);
  assert.doesNotMatch(home, /generated-avatar|synthetic-portrait|mockup-person/);
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

test("homepage contact remains consent-gated WhatsApp, Telegram and free-review path", () => {
  const home = read("components/holistic-house-home.tsx");
  const cta = read("components/public-consultation-cta.tsx");
  assert.match(home, /<PublicConsultationCta locale=\{locale\} \/>/);
  assert.match(home, /className="home-contact-capture"/);
  assert.match(cta, /wa\.me\/14376066502\?text=/);
  assert.match(cta, /t\.me\/AndyTherapist/);
  assert.match(cta, /AcquisitionEventLink/);
  assert.match(cta, /services\/free-situation-review/);
  assert.doesNotMatch(home, /fake-testimonial|stock-avatar/);
});
