import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Reiki Yggdrasil course landing shows key information without opening step accordions", async () => {
  const component = await readFile("components/yggdrasil-curriculum.tsx", "utf8");
  assert.match(component, /className="yggdrasil-step-card"/);
  assert.match(component, /className="yggdrasil-step-source-summary"/);
  assert.match(component, /className="yggdrasil-settings-list"/);
  assert.match(component, /className="yggdrasil-setting-row"/);
  assert.match(component, /className="yggdrasil-course-roadmap"/);
  assert.match(component, /What the course includes/);
  assert.match(component, /Что входит в курс/);
  assert.doesNotMatch(component, /<details className="yggdrasil-step">/);
});

test("real source-based step summary, open attunements and English videos stay visible", async () => {
  const component = await readFile("components/yggdrasil-curriculum.tsx", "utf8");
  assert.match(component, /<section className="yggdrasil-settings-section"/);
  assert.match(component, /className="yggdrasil-setting-row__text"/);
  assert.doesNotMatch(component, /<details className="yggdrasil-step-more">/);
  assert.doesNotMatch(component, /className="yggdrasil-attunement-chips"/);
  assert.match(component, /className="yggdrasil-step-video-library"/);
  assert.match(component, /yggdrasilStepSummary\(step\.id, locale\)/);
  assert.doesNotMatch(component, /<h4>\{text\.meaning\}<\/h4>/);
  assert.doesNotMatch(component, /labels\.outcome/);
  assert.doesNotMatch(component, /source\.opens/);
  assert.doesNotMatch(component, /source\.skills/);
});

test("mobile layout keeps the roadmap readable and source summary uncluttered", async () => {
  const css = await readFile("app/academy.css", "utf8");
  assert.match(css, /Reiki Yggdrasil inline course landing redesign/);
  assert.match(css, /\.yggdrasil-course-roadmap \{/);
  assert.match(css, /\.yggdrasil-step-source-summary \{/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /\.yggdrasil-course-roadmap \{[\s\S]*?grid-template-columns: 1fr;/);
  assert.match(css, /\.yggdrasil-step-source-summary \{[\s\S]*?max-width:/);
});

test("attunements have prominent rune-inspired glyphs and readable mobile typography", async () => {
  const [component, css] = await Promise.all([
    readFile("components/yggdrasil-curriculum.tsx", "utf8"),
    readFile("app/academy.css", "utf8"),
  ]);
  assert.match(component, /function attunementGlyph/);
  assert.match(component, /className="yggdrasil-setting-glyph"/);
  assert.match(css, /\.yggdrasil-settings-list \{[\s\S]*?display: block;/);
  assert.match(css, /\.yggdrasil-setting-row__text h5 \{/);
  assert.match(css, /\.yggdrasil-setting-row__text p \{/);
  assert.match(css, /@media \(max-width: 680px\)/);
  assert.match(css, /\.yggdrasil-setting-row__text p \{ font-size: 16px;/);
});
