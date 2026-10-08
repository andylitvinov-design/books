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
  const hero = s.indexOf('className={styles.hero}');
  const directions = s.indexOf('id="available-services"');
  const free = s.indexOf('id="free-situation-review-offer"');
  assert.ok(hero >= 0 && directions > hero && free > directions);
  assert.match(s, /href=\{`\/\$\{locale\}\/services\/free-situation-review`\}/);
  assert.match(s, /Бесплатная диагностика ситуации/);
  assert.match(s, /free situation & goal assessment/i);
  assert.match(s, /free-wu-xing-diagnostic/);
  assert.doesNotMatch(s, /<CatalogShowcase/);
});

test("three services are choices with direct real service links, not implied treatment stages", () => {
  const component = source("components", "personal-work-journey.tsx");
  for (const phrase of [
    "Психогомеопатия", "Образная психотерапия", "Расстановки и архетипическая поддержка",
    "Psychohomeopathy", "Guided imagery psychotherapy", "Constellations & archetypal support",
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
  assert.match(form, /does NOT automatically submit a request/);
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
