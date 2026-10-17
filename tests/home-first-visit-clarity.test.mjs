import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("all homepage locales show a free written review and a distinct free-test CTA first", () => {
  const enRu = read("components/holistic-house-home.tsx");
  const es = read("app/es/page.tsx");
  for (const source of [enRu, es]) {
    assert.match(source, /service-home-button--primary/);
    assert.match(source, /service-home-button--secondary/);
    assert.match(source, /free-written-review/);
    assert.match(source, /free-tests/);
    assert.match(source, /paid-sessions/);
    assert.ok(source.indexOf("service-home-button--primary") < source.indexOf("service-home-button--secondary"));
    assert.doesNotMatch(source, /HomeFreePaths/);
  }
  assert.match(enRu, /Understand your situation\. Find your next step/);
  assert.match(enRu, /Разберитесь в ситуации/);
  assert.match(es, /Comprende tu situación/);
});

test("photo-led service cards replace the duplicated free text cards on all homepage locales", () => {
  const home = read("components/holistic-house-home.tsx");
  const es = read("app/es/page.tsx");
  const cards = read("components/services-solutions.tsx");
  const offers = read("data/core-service-offers.ts");
  const navigation = read("components/site-navigation.tsx");
  for (const source of [home, es]) {
    assert.doesNotMatch(source, /HomeFreePaths|FreeInsightsPaths/);
    assert.match(source, /service-home-hero/);
  }
  assert.match(home, /<ServicesSolutions locale=\{locale\} variant="home" \/>/);
  assert.match(cards, /id=\{isHome \? "free-start" : undefined\}/);
  assert.match(cards, /homepageMedia\[offer\.id\]/);
  assert.match(cards, /data-core-service-id=\{offer\.id\}/);
  for (const slug of ["free-situation-review", "dao-health-profile", "alchemy-of-soul", "hypnotherapy-course"]) {
    assert.ok(offers.includes(slug), slug);
  }
  assert.ok(home.indexOf('<ServicesSolutions locale={locale} variant="home" />') < home.indexOf('<HomeFreeTestsBanner locale={locale} />'));
  assert.match(es, /className="service-home-actions" id="free-start"/);
  assert.ok(es.indexOf('className="service-home-services"') < es.indexOf('className="service-home-start"'));
  assert.match(navigation, /#free-start/);
  assert.match(home, /not a live call/);
  assert.match(es, /no una llamada/);
});

test("menu keeps the original full catalog but prioritizes free entry, services, About and Cabinet", () => {
  const nav = read("components/site-navigation.tsx");
  assert.match(nav, /site-nav-free-entry/);
  assert.match(nav, /item\.id === 'services'/);
  assert.match(nav, /site-nav-about-entry/);
  assert.match(nav, /site-cabinet-entry/);
  assert.match(nav, /site-main-menu-trigger__label/);
  assert.match(nav, /getSiteNavigation\(activeLocale\)\.map/);
});

test("primary home CTA has stronger contrast and mobile introduction stays readable", () => {
  const css = read("app/holistic-house-home.css");
  assert.match(css, /\.service-home-button--primary \{ background: #742c42/);
  assert.match(css, /\.service-home-intro \{ max-width: 76%; font-size: 16px/);
});
