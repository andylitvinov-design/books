import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const feature = read("components/home-featured-workspace.tsx");
const css = read("components/home-featured-workspace.module.css");

test("EN RU ES start with one seven-stage journey immediately below hero carousel", () => {
  const pages = [read("components/holistic-house-home.tsx"), read("app/es/page.tsx")];
  const steps = ["freeCourses", "personality", "situation", "personal", "alchemy", "energy", "master"];
  assert.match(feature, /type ModuleKey = "freeCourses" \| "personality" \| "situation" \| "personal" \| "alchemy" \| "energy" \| "master"/);
  assert.match(feature, /moduleIds: ModuleKey\[\]/);
  for (const page of pages) {
    const at = name => page.indexOf("<" + name);
    assert.ok(at("HomeSectionCarousel") < at("HomeFeaturedWorkspace"), "Carousel precedes journey");
    assert.ok(at("HomeFeaturedWorkspace") < at("HomeMoreDisclosure"), "Journey is the first full-screen content");
    for (const name of ["HomeCoreMethods", "HomeFreeDiagnosisBanner", "HomeConversationGuide",
      "HomePersonalSpaceCard", "HomepageTopicJourneys", "HomeMasterPath"]) {
      assert.ok(at("HomeMoreDisclosure") < at(name), name + " is now supplementary, not an extra visible funnel");
      assert.ok(at(name) < page.indexOf("</HomeMoreDisclosure>"), name + " stays within expanded details");
    }
    assert.equal((page.match(/<HomeFeaturedWorkspace /g) || []).length, 1);
    assert.equal((page.match(/<HomeMasterPath /g) || []).length, 1);
  }
  for (const locale of ["en", "ru", "es"]) {
    const start = feature.indexOf('  "' + locale + '": {');
    const next = locale === "es" ? feature.indexOf(" as const;", start) : feature.indexOf('  "' + (locale === "en" ? "ru" : "es") + '": {',start + 1);
    const block = feature.slice(start,next);
    let last = -1;
    for (const id of steps) {
      const at = block.indexOf('      "' + id + '": {');
      assert.ok(at > last, locale + " step out of order: " + id);
      last = at;
    }
  }
});

test("seven stages show real photo per offer, one theme per screen and responsive anchors", () => {
  for (const marker of ["home-step-", "data-home-step-navigation", "data-home-module={id}",
    "data-home-module-action={offer.id}", "<Image src={photos[offer.id]} alt=\"\" fill unoptimized loading=\"lazy\""]) {
    assert.ok(feature.includes(marker), marker);
  }
  for (const path of [...feature.matchAll(/: "(\/images\/holistic-house\/[^"]+)"/g)].map(hit=>hit[1])) {
    assert.ok(existsSync(new URL("../public" + path, import.meta.url)), "Missing existing photo " + path);
  }
  assert.match(css,/100svh/);
  assert.match(css,/@media \(max-width: 640px\)/);
  assert.match(css,/max-width: 350px/);
  assert.match(css,/:focus-visible/);
  assert.match(css,/prefers-reduced-motion/);
  assert.match(css,/scroll-snap/);
  assert.doesNotMatch(css,/grid-template-columns: repeat\(5/);
});

test("every owner-requested option routes to an existing live page or protected cabinet", () => {
  for (const route of ["/courses/antistress", "/academy/principles-of-energywork/learn",
    "/client/tests", 'accountRoot + "/portrait"', 'accountRoot + "/portfolio#hh-development-program"',
    "/services/free-situation-review", "/services/business-consulting", "/services/systemic-constellations",
    'accountRoot + "/coaching"', "/services#consultation", "/services/alchemy-of-soul",
    "/services/remote-energy-support", "/academy/principles-of-energywork", "/pro",
    "/practice?panel=services", "/practice?panel=materials&materialTab=courses"]) {
    assert.ok(feature.includes(route), "Missing journey route: " + route);
  }
  for (const name of ["Бесплатные курсы", "Диагностика личности", "Диагностика ситуации и проблемы",
    "Личная коррекция", "Алхимия души", "Энергетическая поддержка", "Стать мастером"]) {
    assert.ok(feature.includes(name), name);
  }
  assert.match(feature,/not a live AI chat or therapy/);
  assert.match(feature,/not a confirmed booking|does not confirm a booking/);
  assert.match(feature,/Public listings require moderation/);
  assert.doesNotMatch(feature,/fetch\(|axios|sendBeacon|autoPublish|payment_success|localStorage|sessionStorage/);
});

test("private profiles and reports remain guarded; Spanish private workspace follows English fallback", () => {
  assert.match(feature,/const signedIn = space\?\.status === "ready" && Boolean\(space\.summary\)/);
  assert.match(feature,/locale === "es" \? "en" : locale/);
  assert.match(feature,/id === "personality" && signedIn/);
  assert.match(feature,/\{signedIn && \(/);
  assert.match(feature,/data-home-reports-cta/);
  assert.match(feature,/data-home-development-cta/);
  assert.match(feature,/Your reports|Personal test results/);
  assert.doesNotMatch(feature,/privateAnswers|testAnswers|medicalResults|diagnosis\(/);
});
