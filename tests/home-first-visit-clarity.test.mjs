import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("all homepage locales preserve personal-session priority and distinct free choices", () => {
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
  assert.match(enRu, /Stuck in relationships, work or an important decision\?/);
  assert.match(enRu, /Сложности в отношениях, работе или важном решении\?/);
  assert.match(es, /¿Dudas en tus relaciones, tu trabajo o una decisión importante\?/);
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
  const serviceCardsAt = home.indexOf('<ServicesSolutions locale={locale} variant="home" />');
  const topicCardsAt = home.indexOf('<HomepageTopicJourneys locale={locale} />');
  assert.ok(serviceCardsAt >= 0 && topicCardsAt > serviceCardsAt, "Photo service cards must precede topic journeys");
  assert.doesNotMatch(home, /HomeFreeTestsBanner/);
  assert.match(es, /className="service-home-actions" id="free-start"/);
  assert.ok(es.indexOf('className="service-home-services"') < es.indexOf('className="service-home-start"'));
  assert.match(navigation, /#free-start/);
  assert.match(home, /not a live call/);
  assert.match(es, /no una llamada/);
});

test("menu keeps the original full catalog but prioritizes free entry, services, About and Library", () => {
  const nav = read("components/site-navigation.tsx");
  assert.match(nav, /site-nav-free-entry/);
  assert.match(nav, /item\.id === 'services'/);
  assert.match(nav, /site-nav-about-entry/);
  assert.match(nav, /site-library-entry/);
  assert.match(nav, /site-main-menu-trigger__label/);
  assert.match(nav, /getCompactNavigation\(activeLocale\)/);
  assert.match(nav, /menuItems\.map/);
});

test("primary home CTA has stronger contrast and mobile introduction stays readable", () => {
  const css = read("app/holistic-house-home.css");
  assert.match(css, /\.service-home-button--primary \{ background: #742c42/);
  assert.match(css, /\.service-home-intro \{ max-width: 76%; font-size: 16px/);
});
