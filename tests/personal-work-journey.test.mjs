import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (...parts) => readFileSync(path.join(root, ...parts), "utf8");

test("home displays direct three-service choices before the introductory video", () => {
  const home = source("components", "holistic-house-home.tsx");
  const cards = home.indexOf('<PersonalWorkJourney locale={locale} variant="compact" />');
  const video = home.indexOf('{introVideo ? (');
  assert.ok(cards > 0 && video > cards);
});

test("services prioritizes concrete client solutions and a free conversation over method catalogues", () => {
  const s = source("app", "[locale]", "services", "page.tsx");
  const solutions = source("components", "services-solutions.tsx");
  const hero = s.indexOf("<ServicesConversionHero");
  const choices = s.indexOf("<ServicesSolutions");
  const marketplace = s.indexOf('<details className={solutionStyles.extra} id="available-services">');
  assert.ok(hero >= 0 && choices > hero && marketplace > choices);
  assert.doesNotMatch(s, /<CatalogShowcase|<PersonalWorkJourney locale/);
  assert.match(s, /services-marketplace/);
  assert.match(s, /free-wu-xing-diagnostic/);
  assert.match(s, /<PersonalTestimonials/);
  assert.match(solutions, /What would you like to change/);
  assert.match(solutions, /Что вы хотели бы изменить/);
  for (const topic of ["wellbeing", "personal", "goal", "business"]) {
    assert.match(solutions, new RegExp('topic: "' + topic + '"'));
  }
  assert.match(solutions, /free-situation-review\?topic=/);
});

test("three services are choices with direct real service links, not implied treatment stages", () => {
  const component = source("components", "personal-work-journey.tsx");
  for (const phrase of [
    "Гомеопатия", "Образная терапия", "Расстановки и архетипическая работа",
    "Homeopathy", "Guided imagery therapy", "Systemic & archetypal constellations",
    "psychohomeopathy",
    "imagery-therapy",
    "systemic-constellations",
    "free-situation-review",
    "Три типа моих услуг",
    "three different services",
  ]) assert.ok(component.includes(phrase), "missing text: " + phrase);
  assert.match(component, /text\.services\.map/);
  assert.match(component, /<article className=\{styles\.service\}/);
  assert.match(component, /<Link className=\{styles\.serviceLink\}/);
  assert.doesNotMatch(component, /<ol\b/);
  assert.doesNotMatch(component, /LOCAL_ACQUISITION|selfCheck|self_check_start/);
  assert.doesNotMatch(component, /вылечит|снимает симптомы|cures|guarantees faster|guaranteed results/i);
});

test("free situation review and imagery therapy have real bilingual pages and actionable forms", () => {
  const free = source("app", "[locale]", "services", "free-situation-review", "page.tsx");
  const imagery = source("app", "[locale]", "services", "imagery-therapy", "page.tsx");
  const form = source("components", "free-situation-review-form.tsx");
  const consultation = source("components", "personal-consultation-form.tsx");
  for (const phrase of ["Бесплатная диагностика ситуации", "Free situation & goal assessment", "FreeSituationReviewForm", "getHomeopathyLocaleParams", "generateMetadata"]) assert.ok(free.includes(phrase), phrase);
  for (const phrase of ["PersonalServiceLanding", "imagery-therapy", "service={service}"]) assert.ok(imagery.includes(phrase), phrase);
  const chooser = source("components", "consultation-choice-capture.tsx");
  assert.match(consultation, /service\?: string/);
  assert.match(consultation, /service \? "service" : "personal"/);
  assert.match(form, /variant="free"/);
  assert.ok(chooser.includes('t.serviceField + ": " + (service'));
  assert.ok(chooser.includes('t.topicOptions[topic]'));
  assert.ok(chooser.includes('wa.me/14376066502'));
  assert.ok(chooser.includes('Nothing is sent until you press Send'));
  assert.doesNotMatch(form + chooser, /localStorage|sessionStorage|sendBeacon|<textarea|<form/);
});

test("service links retain mobile tap targets, no horizontal layout overflow from grid", () => {
  const css = source("components", "personal-work-journey.module.css");
  const detailCss = source("app", "[locale]", "services", "offerings.module.css");
  assert.match(css, /min-height:44px/);
  assert.match(css, /min-height:48px/);
  assert.match(css, /@media\(max-width:767px\)/);
  assert.match(css, /:focus-visible/);
  assert.match(detailCss, /@media\(max-width:800px\)/);
  assert.match(detailCss, /grid-template-columns:1fr/);
});

test("services hero makes the free consultation the first and only primary offer", () => {
  const hero = source("components", "services-conversion-hero.tsx");
  const css = source("components", "services-conversion-hero.module.css");
  for (const phrase of ["Feeling stuck?", "Не знаете, как двигаться дальше?", "free-situation-review", "Request my free situation review", "Записаться на бесплатную диагностику"]) {
    assert.ok(hero.includes(phrase), phrase);
  }
  assert.doesNotMatch(hero, /selfCheck|self_check_start|#available-services/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /min-height:60px/);
});

test("approach one preselects an actual free psychohomeopathy-focused intake; no false instant booking", () => {
  const journey = source("components", "personal-work-journey.tsx");
  const intake = source("components", "free-situation-review-form.tsx");
  const freePage = source("app", "[locale]", "services", "free-situation-review", "page.tsx");
  assert.match(journey, /free-situation-review\?topic=wellbeing/);
  assert.match(journey, /Грусть, одиночество/);
  assert.match(journey, /You have a goal but cannot see/);
  const chooser = source("components", "consultation-choice-capture.tsx");
  assert.match(intake, /variant="free"/);
  assert.ok(chooser.includes('new URLSearchParams(window.location.search).get("topic")'));
  assert.ok(chooser.includes('if (isTopic(requestedTopic)) setTopic(requestedTopic)'));
  assert.ok(chooser.includes('"wellbeing"'));
  assert.ok(freePage.indexOf('className={styles.contentGrid}') < freePage.indexOf('className={styles.details}'));
  assert.ok(chooser.includes('encodeURIComponent(message)'));
});
