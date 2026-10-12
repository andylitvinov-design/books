import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (...parts) => readFileSync(path.join(root, ...parts), "utf8");

test("home presents four photo-left offer cards before videos", () => {
  const home = source("components", "holistic-house-home.tsx");
  const cards = home.indexOf('<ServicesSolutions locale={locale} variant="home" />');
  const video = home.indexOf("{introVideo ? (");
  assert.ok(cards > 0 && video > cards);
  assert.doesNotMatch(home, /<PersonalWorkJourney locale=/);
  assert.doesNotMatch(home, /<FreeInsightsPaths locale=\{locale\} \/>/);
  assert.match(source("components", "services-solutions.tsx"), /isHome \? allOffers : personalOffers/);
});

test("Services leads with three free entrances plus two personal services, without prices in the overview", () => {
  const page = source("app", "[locale]", "services", "page.tsx");
  const offers = source("data", "core-service-offers.ts");
  const ui = source("components", "services-solutions.tsx");
  const hero = source("components", "services-conversion-hero.tsx");
  const choiceIndex = page.indexOf("<ServicesSolutions");
  const testimonials = page.indexOf("<PersonalTestimonials");
  const extra = page.indexOf('id="available-services"');
  assert.ok(choiceIndex > 0 && testimonials > choiceIndex && extra > testimonials);
  assert.match(ui, /allOffers\.filter/);
  assert.match(page, /<FreeInsightsPaths locale=\{locale as Locale\} \/>/);
  for(const id of ["situation","dao","alchemy","hypnotherapy"])
    assert.ok(offers.includes('id: "' + id + '"'), id);
  for(const route of ["free-situation-review","dao-health-profile","alchemy-of-soul","hypnotherapy-course"])
    assert.ok(offers.includes('route: "' + route + '"'), route);
  assert.match(hero, /Get a free situation review/);
  assert.doesNotMatch(hero, /Draw by hand on paper|€50|€100/);
  assert.doesNotMatch(page, /€50|€100/);
});

test("three service directions link to real pages, not implied stages", () => {
  const component = source("components", "personal-work-journey.tsx");
  for (const phrase of [
    "Гомеопатия", "Образная терапия", "Расстановки",
    "Homeopathy", "Guided imagery therapy", "Constellations",
    "psychohomeopathy", "imagery-therapy", "systemic-constellations",
    "free-situation-review", "Три направления работы", "three different services",
  ]) assert.ok(component.includes(phrase), "missing text: " + phrase);
  assert.match(component, /text\.services\.map/);
  assert.match(component, /<article className=\{styles\.service\}/);
  assert.match(component, /<Link className=\{styles\.serviceLink\}/);
  assert.doesNotMatch(component, /<ol\b/);
  assert.doesNotMatch(component, /LOCAL_ACQUISITION|selfCheck|self_check_start/);
  assert.doesNotMatch(component, /вылечит|снимает симптомы|cures|guarantees faster|guaranteed results/i);
});

test("free review and imagery therapy have real EN/RU/ES pages and honest contact journeys", () => {
  const free = source("app", "[locale]", "services", "free-situation-review", "page.tsx");
  const imagery = source("app", "[locale]", "services", "imagery-therapy", "page.tsx");
  const form = source("components", "free-situation-review-form.tsx");
  const intake = source("components", "free-drawing-intake.tsx");
  const consultation = source("components", "personal-consultation-form.tsx");
  for (const phrase of ["Бесплатная диагностика ситуации", "Free situation & drawing assessment",
    "FreeSituationReviewForm", "getHomeopathyLocaleParams", "generateMetadata", "paidOptions"]) {
    assert.ok(free.includes(phrase), phrase);
  }
  for (const phrase of ["PersonalServiceLanding", "imagery-therapy", "service={service}"]) assert.ok(imagery.includes(phrase), phrase);
  assert.match(consultation, /service\?: string/);
  assert.match(consultation, /service \? "service" : "personal"/);
  assert.match(form, /<FreeDrawingIntake locale=\{locale\}/);
  assert.match(intake, /new URLSearchParams\(window\.location\.search\)\.get\("topic"\)/);
  assert.match(intake, /setTopic\(requested as Topic\)/);
  assert.match(intake, /navigator\.clipboard\.writeText\(answers\)/);
  assert.match(intake, /wa\.me/);
  assert.match(intake, /Nothing is sent automatically/);
  assert.doesNotMatch(form + intake, /localStorage|sessionStorage|sendBeacon/);
  assert.match(intake, /fetch\("\/api\/public-leads"/);
  assert.match(intake, /JSON\.stringify\(\{[\s\S]*email,[\s\S]*preferredContact,[\s\S]*topic,[\s\S]*locale,[\s\S]*consentToContact/);
  assert.match(intake, /body: JSON\.stringify\(\{ email, preferredContact, topic, locale, consentToContact \}\)/);
});

test("service links remain tappable, mobile-safe and keyboard accessible", () => {
  const css = source("components", "personal-work-journey.module.css");
  const detailCss = source("app", "[locale]", "services", "offerings.module.css");
  assert.match(css, /min-height:44px/);
  assert.match(css, /min-height:48px/);
  assert.match(css, /@media\(max-width:767px\)/);
  assert.match(css, /:focus-visible/);
  assert.match(detailCss, /@media\(max-width:800px\)/);
  assert.match(detailCss, /grid-template-columns:1fr/);
});

test("Services hero sells the options and points to free review without diagnostic steps", () => {
  const hero = source("components", "services-conversion-hero.tsx");
  const css = source("components", "services-conversion-hero.module.css");
  assert.match(hero, /Three free ways to begin/);
  assert.match(hero, /Больше ясности, опоры и вариантов движения/);
  assert.match(hero, /free-situation-review/);
  assert.match(hero, /See all three free options/);
  assert.match(hero, /href="#free-insights"/);
  assert.doesNotMatch(hero, /coaching form|ME, GOAL|Draw by hand on paper|€50/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /min-height:60px/);
});

test("wellbeing preselection enters an actual free drawing intake, never a phantom live session", () => {
  const journey = source("components", "personal-work-journey.tsx");
  const intake = source("components", "free-drawing-intake.tsx");
  const freePage = source("app", "[locale]", "services", "free-situation-review", "page.tsx");
  assert.match(journey, /free-situation-review\?topic=wellbeing/);
  assert.ok(intake.includes('new URLSearchParams(window.location.search).get("topic")'));
  assert.ok(intake.includes('setTopic(requested as Topic)'));
  assert.ok(intake.includes('"wellbeing"'));
  assert.ok(freePage.indexOf("className={styles.contentGrid}") < freePage.indexOf("className={styles.details}"));
});
