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

test("services display choices and a separately listed free diagnostic offering", () => {
  const s = source("app", "[locale]", "services", "page.tsx");
  const hero = s.indexOf('<ServicesConversionHero locale={locale as Locale} />');
  const journey = s.indexOf('<PersonalWorkJourney locale={locale as Locale} />');
  const catalogue = s.indexOf("<CatalogShowcase");
  assert.ok(hero >= 0 && journey > hero && catalogue > journey);
  assert.doesNotMatch(s, /<section className="services-studio-hero">/);
  assert.match(s, /ServicesConversionHero/);
  assert.match(s, /id="free-situation-review-offer"/);
  assert.match(s, /href=\{".*?" \+ locale \+ "\/services\/free-situation-review"\}/);
  assert.match(s, /Бесплатная диагностика ситуации/);
  assert.match(s, /Free situation & goal assessment/);
  assert.match(s, /free-wu-xing-diagnostic/);
});

test("three services are choices with direct real service links, not implied treatment stages", () => {
  const component = source("components", "personal-work-journey.tsx");
  for (const phrase of [
    "Гомеопатия", "Образная терапия", "Расстановки и архетипическая работа",
    "Homeopathy", "Guided imagery therapy", "Systemic & archetypal constellations",
    "andy-litvinov/homeopathy-consultation",
    "imagery-therapy",
    "andy-litvinov/personal-constellation-session",
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
  for (const phrase of ["Образная терапия", "Guided imagery therapy", "PersonalConsultationForm", "service={t.title}"]) assert.ok(imagery.includes(phrase), phrase);
  assert.match(consultation, /service\?: string/);
  assert.match(consultation, /Service: \$\{service\}/);
  assert.match(form, /"goal"/);
  assert.match(form, /"business"/);
  assert.match(form, /"personal"/);
  assert.match(form, /form\.get\("situation"\)/);
  assert.match(form, /wa\.me\/14376066502/);
  assert.match(form, /window\.open/);
  assert.match(form, /nothing is sent before you confirm/);
  assert.doesNotMatch(form, /localStorage|sessionStorage|fetch\(|sendBeacon/);
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
  for (const phrase of ["Feeling stuck?", "Чувствуете, что застряли?", "free-situation-review", "Request my free consultation", "Запросить бесплатную консультацию"]) {
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
  assert.match(intake, /requestedTopic === "wellbeing"/);
  assert.match(intake, /value: "wellbeing"/);
  assert.ok(freePage.indexOf('className={styles.contentGrid}') < freePage.indexOf('className={styles.details}'));
  assert.match(intake, /window\.open/);
});
