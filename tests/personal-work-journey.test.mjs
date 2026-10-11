import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (...parts) => readFileSync(path.join(root, ...parts), "utf8");

test("home keeps direct three-service choices ahead of introductory video", () => {
  const home = source("components", "holistic-house-home.tsx");
  const cards = home.indexOf('<PersonalWorkJourney locale={locale} variant="compact" />');
  const video = home.indexOf("{introVideo ? (");
  assert.ok(cards > 0 && video > cards);
});

test("Services prioritizes concrete client problems and a free drawing report, not a free call", () => {
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
  assert.match(solutions, /Free drawing assessment \+ written report/);
  assert.match(solutions, /Бесплатная диагностика рисунка \+ отчёт/);
  for (const topic of ["wellbeing", "personal", "goal", "business"]) {
    assert.match(solutions, new RegExp('topic: "' + topic + '"'));
  }
  assert.match(solutions, /free-situation-review\?topic=/);
  assert.doesNotMatch(solutions, /Start with a free conversation|Первый разговор — бесплатно/);
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
  assert.doesNotMatch(form + intake, /localStorage|sessionStorage|sendBeacon|fetch\(/);
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

test("Services hero emphasizes the free questionnaire and written report instead of a free call", () => {
  const hero = source("components", "services-conversion-hero.tsx");
  const css = source("components", "services-conversion-hero.module.css");
  for (const phrase of [
    "Your free situation assessment starts with a drawing",
    "Бесплатная диагностика ситуации по вашему рисунку",
    "free-situation-review", "Start my free drawing assessment", "Начать бесплатную диагностику",
  ]) assert.ok(hero.includes(phrase), phrase);
  assert.doesNotMatch(hero, /selfCheck|self_check_start|#available-services|free personal conversation/i);
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
