import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getCompactNavigation, getSiteNavigation, activeCompactNavigationId } from "../lib/site-navigation-model.js";
import { hasSpanishCounterpart, publicCounterpart } from "../lib/public-locales.ts";

const read = file => readFileSync(new URL("../" + file, import.meta.url), "utf8");
const page = read("app/[locale]/pro/page.tsx");
const hub = read("components/profi-hub.tsx");
const css = read("components/profi-hub.module.css");
const bottom = read("components/mobile-bottom-navigation.tsx");
const icons = read("components/compact-navigation-icons.ts");
const publicLocales = read("lib/public-locales.ts");

test("Pro is a real localized public route with alternate metadata", () => {
  assert.match(page, /<ProfiHub locale=\{locale\}/);
  for (const locale of ["en", "ru", "es"]) assert.match(page, new RegExp(locale + ': \\{ title:'));
  assert.match(page, /"x-default": "\/en\/pro"/);
  assert.match(publicLocales, /\/pro/);
  assert.match(publicLocales, /publicCounterpart/);
});

test("bottom navigation and hamburger share Pro and active route, without losing existing destinations", () => {
  const expected = ["home", "energy", "love", "business", "tests", "books", "pro"];
  for (const locale of ["en", "ru", "es"]) {
    const nav = getCompactNavigation(locale);
    assert.deepEqual(nav.map(item => item.id), expected);
    assert.equal(nav.at(-1).href, "/" + locale + "/pro");
    assert.equal(getSiteNavigation(locale).find(item => item.id === "pro")?.href, "/" + locale + "/pro");
    assert.equal(activeCompactNavigationId("/" + locale + "/pro"), "pro");
  }
  assert.match(bottom, /getCompactNavigation\(locale\)/);
  assert.match(icons, /pro: GraduationCap/);
  assert.match(read("app/holistic-house-home.css"), /grid-template-columns:repeat\(7/);
});

test("learning and practitioner branches use existing real workflows and transparent promises", () => {
  for (const phrase of ["Хочу стать профи", "Я уже профи", "I want to learn Reiki", "I'm already a pro", "Ya soy profesional"]) assert.ok(hub.includes(phrase), phrase);
  for (const entry of [
    "academy/principles-of-energywork/learn",
    "/academy/reiki",
    "/app/practice?panel=services",
    "/app/practice?panel=materials&materialTab=courses",
    "data-profi-path=\"learn\"",
    "data-profi-path=\"share\"",
    "data-profi-action=\"start-course\"",
    "data-profi-action=\"create-service\"",
    "data-profi-action=\"create-course\"",
  ]) assert.ok(hub.includes(entry), entry);
  assert.match(hub, /does not grant a professional credential/);
  assert.match(hub, /Публикация проходит проверку/);
  assert.match(hub, /Inicia|iniciación requiere confirmación personal/);
  assert.match(hub, /locale === "es" \? "en" : locale/);
});

test("320px touch layout and accessible, reduced motion routing are explicit", () => {
  assert.match(css, /@media\(max-width:374px\)/);
  assert.match(css, /@media\(max-width:720px\)/);
  assert.match(css, /min-height:48px/);
  assert.match(css, /focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(hub, /aria-labelledby="profi-learning-title"/);
  assert.match(hub, /aria-labelledby="profi-share-title"/);
});
