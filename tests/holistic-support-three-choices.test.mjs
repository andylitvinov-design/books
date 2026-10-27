import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const page = read("app/[locale]/holistic-support/page.tsx");
const chooser = read("components/holistic-support-choices.tsx");
const engine = read("components/ideas-discovery.tsx");
const css = read("app/[locale]/holistic-support/holistic-support.module.css");

test("Holistic Support opens on three photo-backed choices rather than the Dao question", () => {
  assert.match(page, /<HolisticSupportChoices locale=\{locale\}/);
  assert.doesNotMatch(page, /<IdeasDiscovery locale=\{locale\} variant="holistic"/);
  assert.match(chooser, /data-holistic-first-screen data-holistic-three-choices/);
  for (const key of ["meditations", "energy", "dao"]) {
    assert.match(chooser, new RegExp('data-holistic-choose="' + key + '"'));
  }
  for (const text of [
    "Медитации", "Энергетическая поддержка", "Даосские подсказки",
    "Meditations", "Energy support", "Taoist insights",
    "Meditaciones", "Apoyo energético", "Consejos taoístas",
  ]) assert.ok(chooser.includes(text), "Missing locale choice: " + text);
  assert.match(chooser, /<Image src="\/images\/holistic-house\/hero-olive-incense\.webp"/);
});

test("Dao selection reveals the existing private browser-based I Ching question flow", () => {
  assert.match(chooser, /aria-controls="dao-guidance"/);
  assert.match(chooser, /aria-expanded=\{daoOpen\}/);
  assert.match(chooser, /setDaoOpen\(open => !open\)/);
  assert.match(chooser, /daoOpen \? \(/);
  assert.match(chooser, /variant="holistic-dao"/);
  assert.match(engine, /variant\?: "ideas" \| "temple" \| "holistic" \| "holistic-dao"/);
  assert.match(engine, /const daoFocused = variant === "holistic-dao"/);
  assert.match(engine, /id="ideas-question"/);
  assert.match(engine, /onSubmit=\{submitQuestion\}/);
  assert.match(engine, /drawRandomHexagram\(\)/);
  assert.match(engine, /data-ideas-result/);
  assert.match(engine, /exampleHexagram && !daoFocused/);
  assert.match(engine, /result\.mode === "dao" && hexagram && !daoFocused/);
  assert.match(engine, /data-ideas-free-diagnostic/);
  assert.match(engine, /\/services\/free-consultation#free-diagnosis-options/);
  assert.match(engine, /Получить бесплатную диагностику от мастера/);
});

test("Meditations and energy support use working existing destinations; mobile widths are covered", () => {
  assert.match(chooser, /href="#meditation-practices"/);
  assert.match(chooser, /\/services\/remote-energy-support/);
  assert.match(page, /id="meditation-practices"/);
  assert.match(page, /data-holistic-audio-player/);
  assert.match(page, /<HolisticMeditationGallery locale=\{locale\}/);
  assert.match(read("components/holistic-meditation-gallery.tsx"), /data-holistic-meditation-gallery/);
  assert.match(css, /\.journeyHero\{/);
  assert.match(css, /\.journeyChoices\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /@media\(max-width:350px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
