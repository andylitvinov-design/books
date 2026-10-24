import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const feature = read("components/home-featured-workspace.tsx");
const css = read("components/home-featured-workspace.module.css");
const ids = JSON.parse(feature.match(/const moduleIds: ModuleKey\[\] = (\[[^;]+\]);/)[1]);
const parseLiteral = name => {
  const start = feature.indexOf("const " + name + " = ") + ("const " + name + " = ").length;
  const end = feature.indexOf(" as const;", start);
  assert.ok(start > 0 && end > start, name + " catalog is present");
  return JSON.parse(feature.slice(start, end));
};
const copy = parseLiteral("copy");
const photos = parseLiteral("photos");
const expected = ["courses", "personality", "situation", "coaching", "alchemy", "energy", "master"];

test("the home has seven ordered, translated steps with no repeated Master or method section", () => {
  assert.deepEqual(ids, expected);
  assert.match(feature, /data-home-journey-count=\{moduleIds\.length\}/);
  assert.match(feature, /moduleIds\.map\(\(id, index\) =>/);
  assert.match(feature, /data-home-module=\{id\}/);
  assert.match(feature, /href=\{"#home-immersion-" \+ id\}/);
  for (const page of ["components/holistic-house-home.tsx", "app/es/page.tsx"]) {
    const home = read(page);
    assert.equal((home.match(/<HomeFeaturedWorkspace\b/g) || []).length, 1, page);
    assert.doesNotMatch(home, /<HomeCoreMethods\b|<HomeMasterPath\b/, "no duplicate method/master funnels");
    const order = ["HomeSectionCarousel", "HomeFeaturedWorkspace",
      "HomeFreeDiagnosisBanner", "HomeConversationGuide", "HomePersonalSpaceCard",
      "HomepageTopicJourneys", "HomeMoreDisclosure"];
    let previous = -1;
    for (const tag of order) {
      const offset = home.indexOf("<" + tag);
      assert.ok(offset > previous, page + " order: " + tag);
      previous = offset;
    }
  }
  for (const locale of ["en", "ru", "es"]) {
    assert.deepEqual(Object.keys(copy[locale].modules), expected, locale + " order");
    assert.ok(copy[locale].heading && copy[locale].summary && copy[locale].journeyLabel);
  }
});

test("all seven stages have honest photographed offers with actionable labels", () => {
  const sizes = [3, 3, 3, 2, 1, 1, 3];
  for (const locale of ["en", "ru", "es"]) {
    expected.forEach((step, index) => {
      const module = copy[locale].modules[step];
      assert.equal(module.offers.length, sizes[index], locale + "/" + step);
      assert.ok(module.title && module.lead, locale + "/" + step + " has a heading");
      for (const offer of module.offers) {
        assert.ok(offer.title && offer.body && offer.cta, locale + "/" + step + " has complete copy");
        assert.ok(photos[offer.id], "missing image for " + offer.id);
      }
    });
  }
  for (const path of Object.values(photos)) {
    assert.ok(existsSync(new URL("../public" + path, import.meta.url)), "Missing first-party image " + path);
  }
  assert.match(feature, /<Image src=\{photos\[offer\.id\]\} alt="" fill unoptimized loading="lazy"/);
  assert.match(feature, /data-home-module-action=\{offer\.id\}/);
  assert.doesNotMatch(feature, /fetch\(|sendBeacon|autoEnroll|payment_success|localStorage|sessionStorage/);
});

test("each requested action uses an actual route, never an implied booking or publication", () => {
  for (const path of [
    "/academy/principles-of-energywork/learn", "/courses/antistress",
    "/academy", "/client/tests", "/portrait", "/portfolio#hh-development-program",
    "/services/free-situation-review", "/services/business-consulting",
    "/services/systemic-constellations", "/coaching", "/services#consultation",
    "/services/alchemy-of-soul", "/services/remote-energy-support",
    "/pro", "/practice?panel=services", "/practice?panel=materials&materialTab=courses",
  ]) assert.ok(feature.includes(path), "Missing destination " + path);
  assert.match(feature, /locale === "es" \? "en" : locale/);
  for (const locale of ["en", "ru", "es"]) {
    assert.match(copy[locale].coachingNote, /(?:not live AI therapy|не живой ИИ-терапевт|no es terapia)/);
    assert.ok(copy[locale].alchemyNote.length > 70, "No misleading homeopathy claim");
    assert.ok(copy[locale].situationNote.length > 65, "Written review is distinguished from booking");
    assert.ok(copy[locale].energyNote && copy[locale].masterNote);
  }
});

test("personal reports and development stay behind the existing account boundary", () => {
  assert.match(feature, /const signedIn = space\?\.status === "ready" && Boolean\(space\.summary\)/);
  assert.match(feature, /id === "courses" && signedIn/);
  assert.match(feature, /id === "personality" && signedIn/);
  assert.match(feature, /offer\.id === "profile" && !signedIn/);
  assert.match(feature, /offer\.id === "growth" && !signedIn/);
  assert.match(feature, /\{signedIn && \(/);
  assert.match(feature, /data-home-reports-cta/);
  assert.match(feature, /data-home-development-cta/);
  assert.match(feature, /\/portrait#personal-reports/);
  assert.doesNotMatch(feature, /medicalResults|privateAnswers|testAnswers|symptomScores/);
});

test("seven-step jump links and cards fit 320–430px without tall empty phone screens", () => {
  assert.match(css, /\.steps \{/);
  assert.match(css, /overflow-x: auto/);
  assert.match(css, /scroll-snap-type: x proximity/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /\.section \{\s*min-height: 0;/);
  assert.match(css, /max-height: none/);
  assert.match(css, /@media \(max-width: 350px\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  for (const step of expected) assert.ok(css.includes('data-home-module="' + step + '"') || step === "courses");
});
