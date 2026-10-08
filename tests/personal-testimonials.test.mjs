import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (...segments) => readFileSync(path.join(process.cwd(), ...segments), "utf8");

test("home and services render the same first-party testimonial component", () => {
  const home = read("components", "holistic-house-home.tsx");
  const services = read("app", "[locale]", "services", "page.tsx");
  assert.match(home, /<PersonalTestimonials locale=\{locale\} variant="home"/);
  assert.match(services, /<PersonalTestimonials locale=\{locale as Locale\} variant="services"/);
  assert.ok(home.indexOf("PersonalTestimonials locale") < home.indexOf('className="service-home-about"'));
  assert.ok(services.indexOf("PersonalTestimonials locale") < services.indexOf('<PageVideo slot="consultation"'));
});

test("home shows one approved written story plus six sourced video stories per language", () => {
  const component = read("components", "personal-testimonials.tsx");
  const ru = component.match(/  ru: \[([\s\S]*?)\],\n  en: \[/)?.[1] ?? "";
  const en = component.match(/  en: \[([\s\S]*?)\],\n\} as const;/)?.[1] ?? "";
  const ruIds = [...ru.matchAll(/id: "([\w-]{11})"/g)].map((match) => match[1]);
  const enIds = [...en.matchAll(/id: "([\w-]{11})"/g)].map((match) => match[1]);
  assert.equal(ruIds.length, 6);
  assert.equal(enIds.length, 6);
  assert.equal(new Set(ruIds).size, 6);
  assert.equal(new Set(enIds).size, 6);
  assert.match(component, /isHome \? testimonialVideos\[locale\] : testimonialVideos\[locale\]\.slice\(0, 3\)/);
  assert.match(component, /video=\{\{ youtubeId: item\.id, language: item\.language, title: item\.title \}\}/);
});

test("the personal story is permissioned, anonymized, attributed, and translated transparently", () => {
  const component = read("components", "personal-testimonials.tsx");
  assert.match(component, /shared with permission/);
  assert.match(component, /опубликовано с разрешения автора/);
  assert.match(component, /translated from Russian/);
  assert.match(component, /не гарантируется/);
  assert.match(component, /not typical or guaranteed outcomes/);
  assert.match(component, /В сеансе с тобой вылезла тема/);
  assert.match(component, /Today my husband bought exactly that kind of studio/);
  assert.doesNotMatch(component, /44 кв|паркинг|кирпич|parking|square meters|квадрата/i);
  assert.doesNotMatch(component, /"user_email"|client_id|clientId|auth_token/);
});

test("videos use existing lazy click-to-play player and mobile layout; links are real routes", () => {
  const component = read("components", "personal-testimonials.tsx");
  const css = read("components", "personal-testimonials.module.css");
  assert.match(component, /SiteVideoPlayer/);
  assert.match(component, /\/about#testimonials-title/);
  assert.match(component, /services\\/free-situation-review/);
  assert.match(component, /aria-labelledby=\{titleId\}/);
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /grid-template-columns: 1fr/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /:focus-visible/);
});

test("video browser verification selects the managed intro even when testimonials add other play buttons", () => {
  const verifier = read("scripts", "verify-site-video-browser.mjs");
  assert.match(verifier, /\[data-video-slot="home-intro"\] \.site-video-play/);
  assert.match(verifier, /\[data-video-slot="home-intro"\] \.site-video-player/);
  assert.doesNotMatch(verifier, /page\.locator\('\.site-video-play'\)\.click\(\)/);
});
