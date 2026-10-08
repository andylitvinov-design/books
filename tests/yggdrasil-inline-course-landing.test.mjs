import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Reiki Yggdrasil course landing shows key information without opening step accordions", async () => {
  const component = await readFile("components/yggdrasil-curriculum.tsx", "utf8");
  assert.match(component, /className=\{visualStyles\.stepCard\}/);
  assert.match(component, /className=\{visualStyles\.stepIntroduction\}/);
  assert.match(component, /className=\{visualStyles\.attunementChips\}/);
  assert.match(component, /className=\{visualStyles\.stageNavigation\}/);
  assert.match(component, /What the course includes/);
  assert.match(component, /Что входит в курс/);
  assert.doesNotMatch(component, /<details className="yggdrasil-step">/);
});

test("real source-based step summary and videos stay visible while detailed attunements remain optional", async () => {
  const component = await readFile("components/yggdrasil-curriculum.tsx", "utf8");
  assert.match(component, /<details className="yggdrasil-step-more">/);
  assert.match(component, /Full attunement descriptions/);
  assert.match(component, /Полные описания настроек/);
  assert.match(component, /className="yggdrasil-step-video-library"/);
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
