import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const offer = read("components/free-insights-paths.tsx");
const css = read("components/free-insights-paths.module.css");

test("three free paths use real, existing local service and test routes", () => {
  for (const id of ["stress", "situation", "wu"]) assert.match(offer, new RegExp('id: "' + id + '"'));
  for (const path of ["client", "free-situation-review", "dao-health-profile"]) assert.ok(offer.includes(path));
  for (const path of ["app/[locale]/client/page.tsx", "app/[locale]/services/free-situation-review/page.tsx", "app/[locale]/services/dao-health-profile/page.tsx"]) {
    assert.ok(read(path).length > 100, path);
  }
  assert.match(offer, /data-free-insights-offer=\{path.id\}/);
  assert.match(offer, /event=\{path.id === "stress" \? "self_check_start" : "service_request_start"\}/);
  assert.match(offer, /inCabinet \? \(/);
  assert.match(offer, /prefetch=\{false\}/);
});

test("Services uses compact free-test entry plus all five photo offers; Home keeps its bottom capture", () => {
  const home = read("components/holistic-house-home.tsx");
  const services = read("app/[locale]/services/page.tsx");
  const solutions = read("components/services-solutions.tsx");
  const hero = read("components/services-conversion-hero.tsx");
  assert.doesNotMatch(home, /<FreeInsightsPaths/);
  assert.match(read("components/homepage-contact-cta.tsx"), /<HomepageFreeCapture locale=\{locale\} \/>/);
  assert.match(home, /<ServicesSolutions locale=\{locale\} variant="home" \/>/);
  assert.match(services, /<ServicesStudioOffers locale=\{locale as Locale\} \/>/);
  assert.match(read("components/services-studio-offers.tsx"), /data-services-studio-free/);
  assert.doesNotMatch(services, /<FreeInsightsPaths locale=\{locale as Locale\} \/>/);
  assert.match(solutions, /data-core-service-id=\{offer.id\}/);
  assert.ok(solutions.includes('const visibleOffers = isHome ? allOffers.filter((offer) => offer.id !== "business") : allOffers;'));
  assert.match(solutions, /offer.id === "business"/);
  assert.match(solutions, /visibleOffers.map/);
  assert.match(solutions, /homeTitle: "How I can help"/);
  assert.match(read("components/services-tests-intro.tsx"), /href="#solutions"/);
  assert.match(home, /heroSecondary: "Take free self-checks"/);
  assert.match(home, /heroSecondary: "Пройти бесплатные тесты"/);
  assert.match(home, /className="service-home-selfcheck-link"\s*href=\{\x60\/\$\{locale\}\/client\/tests\x60\}/);
  assert.doesNotMatch(hero, /two free assessments/i);
});

test("integrated private Profile links to Services without cloning public free offers or leaking private state", () => {
  const profile = read("components/app/profile-domains.jsx");
  assert.doesNotMatch(profile, /<FreeInsightsPaths/);
  assert.match(profile, /className="hh-domain-services-link"/);
  assert.match(profile, /href=\{'\/' \+ locale \+ '\/services'\}/);
  assert.match(offer, /<Link className=\{styles.action\} href=\{href\} prefetch=\{false\}/);
  assert.doesNotMatch(offer, /selector|clientId|reportId|testResult|\?score=/);
  assert.match(offer, /not free live calls/);
});

test("the homepage test link has a real target before a visitor starts any questionnaire", () => {
  const landing = read("components/app/cabinet-landing.jsx");
  assert.match(landing, /phase === 'catalog' && <div id="cabinet-tests"><PublicTestExplorer locale=\{locale\} embedded onGuestStart=\{beginGuestBattery\} \/><\/div>/);
  assert.match(landing, /phase !== 'catalog' && <section[^>]+id="cabinet-tests"/);
});

test("the public and cabinet offers describe free wellbeing and resources monitoring, not a diagnosis", () => {
  for (const label of ["Free situation analysis", "Free Wu Xing resources & wellbeing profile", "Stress assessment & personality portrait", "Бесплатный анализ ситуации", "Бесплатный анализ ресурсов и самочувствия по У-Син", "Анализ стресса и психологический портрет"]) {
    assert.ok(offer.includes(label), label);
  }
  assert.match(offer, /not medical diagnoses/);
  assert.match(offer, /not a health diagnosis/);
  assert.deepEqual([...offer.matchAll(/id: "(situation|wu|stress)"/g)].map(match => match[1]), ["situation", "wu", "stress", "situation", "wu", "stress"]);
});

test("Services active light-blue entry provides free self-checks in both languages", () => {
  const banner = read("components/services-tests-intro.tsx");
  assert.match(banner, /FREE TESTS/);
  assert.match(banner, /БЕСПЛАТНЫЕ ТЕСТЫ/);
  assert.match(banner, /href: "\/en\/client\/tests"/);
  assert.match(banner, /href: "\/ru\/client\/tests"/);
  assert.match(read("components/services-tests-intro.module.css"), /#e7f3fb/);
});

test("the design stays compact, accessible and mobile-first in the existing warm palette", () => {
  assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /grid-template-columns:1fr/);
  assert.match(css, /:focus-visible/);
  assert.match(offer, /aria-labelledby=\{headingId\}/);
  assert.match(css, /min-height:46px/);
  assert.match(css, /font-size:15px/);
});
