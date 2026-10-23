import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const feature = read("components/home-featured-workspace.tsx");
const css = read("components/home-featured-workspace.module.css");

test("EN RU ES home keep one consistent place for five complete category screens", () => {
  const enRu = read("components/holistic-house-home.tsx");
  const es = read("app/es/page.tsx");
  for (const home of [enRu, es]) {
    assert.match(home, /<HomeFeaturedWorkspace locale=/);
    assert.match(home, /<HomeMasterPath locale=/);
    const ordered = ["HomeSectionCarousel", "HomeFreeDiagnosisBanner",
      "HomeConversationGuide", "HomePersonalSpaceCard", "HomeFeaturedWorkspace",
      "HomepageTopicJourneys", "HomeMoreDisclosure", "HomeMasterPath"];
    let previous = -1;
    for (const name of ordered) {
      const position = home.indexOf("<" + name);
      assert.ok(position > previous, "Home preserves section order: " + name);
      previous = position;
    }
  }
  assert.match(feature, /type ModuleKey = "tests" \| "courses" \| "services" \| "learning" \| "master"/);
  assert.match(feature, /moduleIds: ModuleKey\[\] = \["tests", "courses", "services", "learning", "master"\]/);
  assert.match(feature, /moduleIds\.map\(\(id, index\) =>/);
  assert.match(feature, /<section className=\{styles\.section\} data-home-module=\{id\}/);
  for (const label of ["Tests", "Courses", "Services", "Learning", "Become a Master",
    "Тесты", "Курсы", "Услуги", "Обучение", "Стать мастером",
    "Pruebas", "Cursos", "Servicios", "Aprender", "Ser profesional"]) {
    assert.ok(feature.includes(label), "Missing localized section: " + label);
  }
});

test("each category has two or three photographed offers, not tiny selector tiles", () => {
  const sections = ["tests", "courses", "services", "learning", "master"];
  for (const locale of ["en", "ru", "es"]) {
    const block = feature.slice(feature.indexOf("  " + locale + ": {"), locale === "es" ? feature.indexOf("} as const;", feature.indexOf("  es: {")) : feature.indexOf("  " + (locale === "en" ? "ru" : "es") + ": {"));
    for (const id of sections) {
      const entry = block.slice(block.indexOf("      " + id + ": {"));
      const end = entry.indexOf("      },");
      const count = (entry.slice(0, end).match(/\{ id: "/g) || []).length;
      assert.ok(count >= 2 && count <= 3, locale + "/" + id + " has " + count + " offers");
    }
  }
  assert.match(feature, /<Image src=\{photos\[offer\.id\]\} alt="" fill unoptimized loading="lazy"/);
  assert.match(feature, /className=\{styles\.photo\}/);
  assert.match(feature, /className=\{styles\.offerBody\}/);
  assert.match(feature, /data-home-module-action=\{offer\.id\}/);
  assert.doesNotMatch(feature, /aria-pressed=|setSelected|data-home-module-grid|data-home-module-detail/);
  assert.doesNotMatch(css, /grid-template-columns: repeat\(5|grid-template-columns: repeat\(2/);
  assert.match(css, /\.section \{/);
  assert.match(css, /100svh/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /max-width: 350px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});

test("all offers use live existing routes, no fake checkout or automatic leads", () => {
  for (const path of [
    "/client/tests?focus=stress", "/client/tests?focus=resources", "/client/tests",
    "/courses/antistress", 'accountRoot + "/business"',
    "/services/free-situation-review", "/services#consultation",
    "/services/systemic-constellations", "/academy/principles-of-energywork/learn",
    "/academy/egyptian-priesthood", "/academy", "/pro",
    "/practice?panel=services", "/practice?panel=materials&materialTab=courses",
  ]) assert.ok(feature.includes(path), "Missing existing route: " + path);
  for (const key of ["review", "consultation", "reiki", "egypt", "pro", "service", "course"]) {
    assert.ok(feature.includes(key + ": \"/images/holistic-house/"));
  }
  for (const path of [...feature.matchAll(/: "(\/images\/holistic-house\/[^"]+)"/g)].map(hit => hit[1])) {
    assert.ok(existsSync(new URL("../public" + path, import.meta.url)), "Missing local photo " + path);
  }
  assert.doesNotMatch(feature, /fetch\(|axios|sendBeacon|autoEnroll|payment_success|localStorage|sessionStorage/);
});

test("private account links still require a signed-in summary, ES public links stay translated", () => {
  assert.match(feature, /const signedIn = space\?\.status === "ready" && Boolean\(space\.summary\)/);
  assert.match(feature, /locale === "es" \? "en" : locale/);
  assert.match(feature, /id === "tests" && signedIn/);
  assert.match(feature, /myCourses: myCoursesHref/);
  assert.match(feature, /offer.id === "myCourses" && !signedIn/);
  assert.match(feature, /\{signedIn && \(/);
  assert.match(feature, /data-home-reports-cta/);
  assert.match(feature, /data-home-development-cta/);
  assert.match(feature, /\/portrait#personal-reports/);
  assert.match(feature, /\/portfolio#hh-development-program/);
  assert.match(feature, /t\.serviceNote/);
  assert.match(feature, /t\.masterNote/);
  assert.doesNotMatch(feature, /score|symptoms|medicalResults|privateAnswers|testAnswers|diagnosis/);
});
