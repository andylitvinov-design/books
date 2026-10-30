import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../components/holistic-support-onboarding.tsx", import.meta.url), "utf8");
const parent = readFileSync(new URL("../components/holistic-support-mobile.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../components/holistic-support-onboarding.module.css", import.meta.url), "utf8");
const shell = readFileSync(new URL("../components/holistic-support-mobile.module.css", import.meta.url), "utf8");
const builder = readFileSync(new URL("../components/personality-profiles-builder.tsx", import.meta.url), "utf8");
const profileRoute = readFileSync(new URL("../app/[locale]/personality-profiles/page.tsx", import.meta.url), "utf8");
const testRoute = readFileSync(new URL("../app/[locale]/client/tests/page.tsx", import.meta.url), "utf8");

test("approved mobile hero mounts once before all original interactive Support tools", () => {
  assert.match(parent, /<HolisticSupportOnboarding locale=\{locale\} \/>/);
  assert.ok(parent.indexOf("<HolisticSupportOnboarding") < parent.indexOf("className={styles.topGrid}"));
  assert.match(parent, /<h2 id="mobile-assessment-title"/);
  assert.ok(!parent.includes("<h1 id=\"mobile-assessment-title\""));
  for(const name of ["data-support-onboarding-hero","data-support-start-profile","data-support-start-tests",
    "data-support-popular-directions","data-support-tests-teaser"]) assert.ok(source.includes(name),name);
  assert.match(source, /<h1 id="support-onboarding-title">/);
  assert.match(source, /support-mock-hero\.webp/);
  assert.ok(parent.includes("data-support-mobile-bottom-nav"));
  assert.ok(parent.includes("data-support-scale"));
  assert.ok(parent.includes("data-support-video"));
});

test("three steps are visible immediately; privacy and no diagnostic promises", () => {
  assert.match(source, /data-support-how-it-works/);
  assert.match(source, /data-support-how-step/);
  assert.ok(!source.includes("<details"));
  for(const phrase of ["Выберите направление","Пройдите бесплатные тесты",
    "Получите результаты и рекомендации","сохранения результатов понадобится вход"]) {
    assert.ok(source.includes(phrase),phrase);
  }
  assert.ok(!source.includes("appFetch")&&!source.includes("supabase")&&!source.includes("navigator.sendBeacon"));
});

test("four selected directions reuse the existing guest profile wizard, no duplicated test storage", () => {
  for(const focus of ["wellbeing","work","relationships","identity"]) {
    assert.ok(source.includes('id: "'+focus+'"'),focus);
  }
  assert.match(source, /builder \+ "&focus=" \+ id/);
  assert.match(source, /data-support-popular-profile=\{id\}/);
  assert.match(builder, /query\.get\("start"\) !== "1"/);
  assert.match(builder, /query\.get\("focus"\)/);
  assert.match(builder, /options\.includes\(focus as Focus\)/);
  assert.match(builder, /setStarted\(true\)/);
  assert.match(profileRoute, /PersonalityProfilesBuilder locale=\{locale\}/);
  assert.match(testRoute, /PublicTestExplorer locale=\{locale\}/);
  assert.ok(source.includes('const tests = `/${locale}/client/tests`'));
});

test("EN/RU/ES, photographic hero, 4 topics and compact touch targets keep parity", () => {
  for(const l of ["en","ru","es"]) assert.ok(source.includes("  "+l+": {"),l);
  for(const name of ["Как это работает","How it works","Cómo funciona",
    "Профиль здоровья","Health profile","Perfil de salud",
    "Популярные направления","Popular directions","Áreas populares"]) assert.ok(source.includes(name),name);
  assert.match(css, /\.tiles \{ display: grid; grid-template-columns: repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /@media \(max-width: 350px\)/);
  assert.ok(css.includes("min-height: 44px"));
  assert.ok(shell.includes(".headerActions")&&shell.includes(".brandLeaf"));
  assert.ok(shell.includes(".compactAppHeader { display: flex; }"));
});
