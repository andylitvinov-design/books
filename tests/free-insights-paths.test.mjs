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

test("Services shows the free trio while Home retains four photo-left cards", () => {
  const home = read("components/holistic-house-home.tsx");
  const services = read("app/[locale]/services/page.tsx");
  const solutions = read("components/services-solutions.tsx");
  const hero = read("components/services-conversion-hero.tsx");
  assert.doesNotMatch(home, /<FreeInsightsPaths locale=\{locale\} \/>/);
  assert.match(home, /<ServicesSolutions locale=\{locale\} variant="home" \/>/);
  assert.match(services, /<FreeInsightsPaths locale=\{locale as Locale\} \/>/);
  assert.match(solutions, /offer.id === "alchemy" \|\| offer.id === "hypnotherapy"/);
  assert.match(solutions, /const visibleOffers = isHome \? allOffers : personalOffers/);
  assert.match(solutions, /visibleOffers.map/);
  assert.match(solutions, /homeTitle: "How I can help"/);
  assert.match(hero, /href="#free-insights"/);
  assert.match(home, /heroSecondary: "Explore four services"/);
  assert.doesNotMatch(hero, /two free assessments/i);
});

test("private profile keeps the three free paths opt-in without private data in links or analytics", () => {
  const profile = read("components/app/profile-domains.jsx");
  assert.match(profile, /<FreeInsightsPaths locale=\{locale\} variant="cabinet"/);
  assert.match(profile, /testHref=\{external \?/);
  assert.match(offer, /<Link className=\{styles.action\} href=\{href\} prefetch=\{false\}/);
  assert.doesNotMatch(offer, /selector|clientId|reportId|testResult|\?score=/);
  assert.match(offer, /not free live calls/);
});

test("the design stays compact, accessible and mobile-first in the existing warm palette", () => {
  assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /grid-template-columns:1fr/);
  assert.match(css, /:focus-visible/);
  assert.match(offer, /aria-labelledby=\{headingId\}/);
});
