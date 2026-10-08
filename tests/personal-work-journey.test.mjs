import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (...parts) => readFileSync(path.join(root, ...parts), "utf8");

test("home shows a concise personal-work pathway before the introduction video", () => {
  const home = source("components", "holistic-house-home.tsx");
  const journey = home.indexOf('<PersonalWorkJourney locale={locale} variant="compact" />');
  const video = home.indexOf('{introVideo ? (');
  assert.ok(journey > 0 && video > journey, "journey should precede the home introduction video");
});

test("services have a full pathway after the hero and before the method catalogue", () => {
  const services = source("app", "[locale]", "services", "page.tsx");
  const hero = services.indexOf('<section className="services-studio-hero">');
  const journey = services.indexOf('<PersonalWorkJourney locale={locale as Locale} />');
  const catalogue = services.indexOf("<CatalogShowcase");
  assert.ok(hero >= 0 && journey > hero && catalogue > journey);
});

test("pathway contains three stages in both languages with no clinical outcome promises", () => {
  const journey = source("components", "personal-work-journey.tsx");
  for (const text of [
    "Найти опору", "Прояснить желания", "Перейти к действиям",
    "Find your footing", "Clarify what you want", "Move towards action",
    "практику", "medical care", "не гарантируют", "do not predict or guarantee"
  ]) assert.ok(journey.includes(text), "missing expected copy: " + text);
  assert.match(journey, /LOCAL_ACQUISITION\[locale\]\.selfCheck\.href/);
  assert.match(journey, /href="#consultation"/);
  assert.match(journey, /event="self_check_start"/);
  assert.doesNotMatch(journey, /вылечит|исцелит любой|cures?\s+symptoms|guaranteed results/i);
});

test("pathway remains accessible and responsive", () => {
  const journey = source("components", "personal-work-journey.tsx");
  const css = source("components", "personal-work-journey.module.css");
  assert.match(journey, /aria-labelledby=\{titleId\}/);
  assert.match(journey, /<ol className=\{styles\.steps\}>/);
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /min-height:\s*46px/);
  assert.match(css, /:focus-visible/);
});
