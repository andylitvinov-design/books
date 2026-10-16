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
    assert.match(source, /HomeFreePaths/);
  }
  assert.match(enRu, /Understand your situation\. Find your next step/);
  assert.match(enRu, /Разберитесь в ситуации/);
  assert.match(es, /Comprende tu situación/);
});

test("three multilingual first-visit paths target real public experiences without claiming a free call", () => {
  const cards = read("components/home-free-paths.tsx");
  assert.match(cards, /id="free-start"/);
  for (const slug of ["services/free-situation-review", "wu-xing", "client/tests"]) {
    assert.ok(cards.includes(slug), slug);
  }
  for (const locale of ["en", "ru", "es"]) assert.match(cards, new RegExp("^\\s{2}" + locale + ": \\{", "m"));
  assert.match(cards, /not a video call/);
  assert.match(cards, /no ofrecen diagnósticos médicos/);
  assert.match(cards, /письменный ответ/);
  const styles = read("components/home-free-paths.module.css");
  assert.match(styles, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(styles, /@media\(max-width:680px\)/);
  assert.match(styles, /:focus-visible/);
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
