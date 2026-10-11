import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("public Home keeps its three independent services, tested journeys and recordings", () => {
  const home = read("components/holistic-house-home.tsx");
  const journey = read("components/personal-work-journey.tsx");
  assert.match(home, /data-home-design="approved-v2"/);
  assert.match(home, /<PersonalWorkJourney locale=\{locale\} variant="compact"/);
  assert.match(journey, /text\.services\.map/);
  assert.match(journey, /data-service-slug=\{service.slug\}/);
  for (const slug of ["psychohomeopathy", "imagery-therapy", "systemic-constellations"]) {
    assert.ok(journey.includes(slug), "Missing independent service: " + slug);
  }
  assert.match(journey, /<Link className=\{styles\.serviceLink\}/);
  assert.match(home, /<PersonalTestimonials locale=\{locale\} variant="home"/);
  assert.match(home, /<SiteVideoPlayer key=\{locale\} video=\{introVideo\}/);
  assert.match(home, /className="service-home-hero"/);
  for (const name of ['event="self_check_start"', 'event="service_view"', '{text.academyAction}', '{text.libraryAction}', '{text.cabinetAction}']) {
    assert.ok(home.includes(name), "Missing original conversion destination: " + name);
  }
});

test("three local illustrations have distinct sources, and the homeopathy still life is not the broken photo", () => {
  const journey = read("components/personal-work-journey.tsx");
  for (const name of ["homeopathy-still-life.svg", "homepage-guided-imagery.svg", "homepage-constellations.svg"]) {
    assert.ok(journey.includes(name), "Missing brand illustration: " + name);
    const asset = read("public/images/holistic-house/" + name);
    assert.match(asset, /<svg /);
    assert.ok(asset.length > 950, "Illustration is incomplete: " + name);
  }
  assert.doesNotMatch(journey, /distance-homeopathy\.webp|hypnotherapy-en-v1\.webp|constellations-en-v1\.webp/);
});

test("practitioner uses the real existing portrait with intrinsic dimensions on small screens", () => {
  const home = read("components/holistic-house-home.tsx");
  assert.ok(existsSync(new URL("../public/images/holistic-house/andy-about.png", import.meta.url)));
  assert.match(home, /className="service-home-about__portrait"/);
  assert.match(home, /className="service-home-about__image"/);
  assert.match(home, /width=\{900\}/);
  assert.match(home, /height=\{720\}/);
  assert.match(home, /alt=\{locale === "ru" \? "Андрей Литвинов" : "Andrey Litvinov"\}/);
  assert.match(home, /<p>\{text\.aboutIntro\}<\/p>/);
  assert.match(home, /event="practitioner_view"/);
  assert.doesNotMatch(home, /generated-avatar|synthetic-portrait|mockup-person/);
});

test("mobile home styles are authoritative, compact, legible and not overwritten by old 94px thumbnail rules", () => {
  const journey = read("components/personal-work-journey.module.css");
  const home = read("app/holistic-house-home.css");
  const leaf = read("public/images/holistic-house/homepage-botanical.svg");
  assert.match(leaf, /<svg /);
  assert.match(journey, /\.compact \.services/);
  assert.match(journey, /\.compact \.service:first-child/);
  assert.match(journey, /\.compact \.servicePhoto/);
  assert.match(journey, /\.compact \.free/);
  assert.match(journey, /@media\(max-width:767px\)/);
  assert.doesNotMatch(journey, /grid-template-columns:94px minmax\(0,1fr\)/);
  assert.match(journey, /\.full \.serviceLink/);
  assert.match(home, /\.house-home--services \.service-home-start__grid/);
  assert.match(home, /\.house-home--services \.service-home-start-card--learning/);
  assert.match(home, /\.house-home--services \.home-contact-capture__primary/);
  assert.match(home, /@media\(max-width:767px\)/);
  assert.doesNotMatch(home, /Unified compact offer cards on the public homepage/);
  assert.match(home, /prefers-reduced-motion:reduce/);
  assert.match(home, /:focus-visible/);
});

test("homepage ends with its own two direct contact buttons, not a generic long blue form", () => {
  const home = read("components/holistic-house-home.tsx");
  const contact = read("components/homepage-contact-cta.tsx");
  assert.match(home, /<HomepageContactCta locale=\{locale\} \/>/);
  assert.doesNotMatch(home, /<PublicConsultationCta/);
  assert.match(contact, /data-home-contact-capture/);
  assert.match(contact, /wa\.me\/14376066502\?text=/);
  assert.match(contact, /t\.me\/AndyTherapist/);
  assert.match(contact, /event="service_request_start"/);
  assert.match(contact, /event="contact_click"/);
  assert.match(contact, /services\/free-situation-review/);
  assert.match(contact, /hand-drawn sketch/);
  assert.match(contact, /рисунку от руки/);
  assert.doesNotMatch(contact, /<form|<input|<textarea|stock-avatar/);
});
