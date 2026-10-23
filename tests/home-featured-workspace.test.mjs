import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const feature = read("components/home-featured-workspace.tsx");
const css = read("components/home-featured-workspace.module.css");

test("all home locales keep the approved hero and show five distinct compact choices", () => {
  const enRu = read("components/holistic-house-home.tsx");
  const es = read("app/es/page.tsx");
  for (const home of [enRu, es]) {
    assert.match(home, /<HomeMasterPath locale=/);
    assert.match(home, /<HomeFeaturedWorkspace locale=/);
    const ordered = ["HomeSectionCarousel", "HomeMasterPath", "HomeFreeDiagnosisBanner",
      "HomeConversationGuide", "HomePersonalSpaceCard", "HomeFeaturedWorkspace",
      "HomepageTopicJourneys", "HomeMoreDisclosure"];
    let previous = -1;
    for (const name of ordered) {
      const position = home.indexOf("<" + name);
      assert.ok(position > previous, "Home preserves section order: " + name);
      previous = position;
    }
  }
  assert.match(feature, /type ModuleKey = "tests" \| "courses" \| "services" \| "learning" \| "master"/);
  assert.match(feature, /moduleIds: ModuleKey\[\] = \["tests", "courses", "services", "learning", "master"\]/);
  for (const id of ["tests", "courses", "services", "learning", "master"]) {
    assert.ok(feature.includes('data-home-module={id}'), "One shared dynamic module control");
    assert.ok(feature.includes('data-home-module-detail={selected}'));
    assert.ok(feature.includes(id + ": { title:"), "Module has localized copy: " + id);
  }
  for (const label of ["Tests", "Courses", "Services", "Learning", "Become a Master",
    "Тесты", "Курсы", "Услуги", "Обучение", "Стать мастером",
    "Pruebas", "Cursos", "Servicios", "Aprender", "Ser profesional"]) {
    assert.ok(feature.includes(label), "Missing localized module: " + label);
  }
  assert.doesNotMatch(feature, /Discover\. Learn\. Grow\.|Turn ideas into daily practice/);
});

test("each module selects its OWN two or three real existing routes without creating data", () => {
  for (const value of [
    'selected === "tests"', 'selected === "courses"', 'selected === "services"',
    'selected === "learning"', 'data-home-module="master"',
    '/client/tests?focus=stress', '/client/tests?focus=resources',
    '/courses/antistress', 'accountRoot + "/business"',
    '/services/free-situation-review', '/services#consultation',
    '/academy/principles-of-energywork/learn', '"/" + locale + "/academy"',
    '/practice?panel=services', '/practice?panel=materials&materialTab=courses',
  ]) assert.ok(feature.includes(value), "Missing module route or selection: " + value);
  const academy = read("app/[locale]/academy/[[...slug]]/page.tsx");
  const routes = read("app/[locale]/app/[[...path]]/page.jsx");
  assert.match(academy, /EnergyworkAiLearner/);
  assert.match(routes, /business/);
  assert.match(read("app/[locale]/courses/antistress/page.tsx"), /PublicAntistressLanding/);
  assert.match(read("app/[locale]/client/tests/page.tsx"), /PublicTestExplorer/);
  assert.doesNotMatch(feature, /fetch\(|axios|localStorage|sessionStorage|sendBeacon|autoEnroll/);
});

test("module selection is accessible on touch and keyboard, details are one shared small panel", () => {
  assert.match(feature, /useState<ModuleKey>\("tests"\)/);
  assert.match(feature, /onClick=\{\(\) => setSelected\(id\)\}/);
  assert.match(feature, /aria-pressed=\{selected === id\}/);
  assert.match(feature, /aria-controls="hh-home-module-detail"/);
  assert.match(feature, /role="group"/);
  assert.match(feature, /aria-live="polite"/);
  assert.match(feature, /aria-label=\{t.modules\[selected\]\.panel\}/);
  assert.match(feature, /data-home-module-action=\{action.id\}/);
  assert.match(css, /\.grid \{ display: grid; grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0,1fr\)\)/);
  assert.match(css, /grid-column: 1 \/ -1/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(css, /min-height: 245px|grid-template-columns: clamp\(142px/);
});

test("no giant photographs, only tiny existing local thumbnails; private account routes stay gated", () => {
  for (const photo of [
    "report-lighthouse-coast.webp", "course-focus-mountain-boy.webp",
    "andy-about.png", "reiki-approved-sunrise-v3.webp",
    "portrait-static/andy-828-3dcbabded1e9.webp",
  ]) assert.ok(existsSync(new URL("../public/images/holistic-house/" + photo, import.meta.url)), photo);
  assert.match(feature, /sizes="\(max-width: 640px\) 48px, 56px"/);
  assert.match(feature, /fill unoptimized loading="lazy"/);
  assert.match(feature, /const signedIn = space\?\.status === "ready"/);
  assert.match(feature, /\.\.\.\(signedIn \?/);
  assert.match(feature, /data-home-reports-cta/);
  assert.match(feature, /data-home-development-cta/);
  assert.match(feature, /\/portrait#personal-reports/);
  assert.match(feature, /\/portfolio#hh-development-program/);
  assert.match(feature, /locale === "es" \? "en" : locale/);
  assert.doesNotMatch(feature, /score|symptoms|medicalResults|privateAnswers|testAnswers|diagnosis/);
});
