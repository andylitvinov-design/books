import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Reiki Yggdrasil course landing shows key information without opening step accordions", async () => {
  const component = await readFile("components/yggdrasil-curriculum.tsx", "utf8");
  assert.match(component, /className=\{visualStyles\.stepCard\}/);
  assert.match(component, /className=\{visualStyles\.stepIntroduction\}/);
  assert.match(component, /className="yggdrasil-settings-list"/);
  assert.match(component, /className=\{visualStyles\.stageNavigation\}/);
  assert.match(component, /What the course includes/);
  assert.match(component, /Что входит в курс/);
  assert.doesNotMatch(component, /<details className="yggdrasil-step">/);
});

test("source-backed short introduction, attunements and videos remain visible", async () => {
  const component = await readFile("components/yggdrasil-curriculum.tsx", "utf8");
  assert.match(component, /className="yggdrasil-setting-row"/);
  assert.match(component, /className="yggdrasil-setting-glyph"/);
  assert.doesNotMatch(component, /<details className="yggdrasil-step-more">/);
  assert.match(component, /className="yggdrasil-step-video-library"/);
  assert.match(component, /<details className="yggdrasil-russian-archive">/);
  assert.match(component, /yggdrasilStepSummary\(step\.id, locale\)/);
  assert.doesNotMatch(component, /<h4>\{text\.meaning\}<\/h4>/);
  assert.doesNotMatch(component, /labels\.outcome/);
  assert.doesNotMatch(component, /source\.opens/);
  assert.doesNotMatch(component, /source\.skills/);
});

test("mobile layout keeps visual chapters readable and images above their descriptions", async () => {
  const css = await readFile("components/yggdrasil-curriculum-visual.module.css", "utf8");
  assert.match(css, /\.stepCard \{/);
  assert.match(css, /\.stepPhoto \{/);
  assert.match(css, /\.stageNavigation \{/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /\.stepCard \{ grid-template-columns: minmax\(0,1fr\);/);
  assert.match(css, /\.stepPhoto \{ height: 230px; min-height: 230px;/);
});

test("attunements use a single open vertical design with mobile readability", async () => {
  const [component, css] = await Promise.all([readFile("components/yggdrasil-curriculum.tsx", "utf8"), readFile("app/academy.css", "utf8")]);
  assert.match(component, /className="yggdrasil-settings-list"/);
  assert.match(component, /function attunementGlyph/);
  assert.match(css, /\.yggdrasil-settings-list \{[\s\S]*?display: block;/);
  assert.match(css, /@media \(max-width: 680px\)/);
  assert.match(css, /\.yggdrasil-setting-row__text p \{ font-size: 16px;/);
});
