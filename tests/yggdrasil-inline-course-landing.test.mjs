import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Reiki Yggdrasil course landing shows key information without opening step accordions", async () => {
  const component = await readFile("components/yggdrasil-curriculum.tsx", "utf8");
  assert.match(component, /className="yggdrasil-step-card"/);
  assert.match(component, /className="yggdrasil-step-key-grid"/);
  assert.match(component, /className="yggdrasil-attunement-chips"/);
  assert.match(component, /className="yggdrasil-course-roadmap"/);
  assert.match(component, /What the course includes/);
  assert.match(component, /Что входит в курс/);
  assert.doesNotMatch(component, /<details className="yggdrasil-step">/);
});

test("only detailed attunement descriptions and videos remain optional", async () => {
  const component = await readFile("components/yggdrasil-curriculum.tsx", "utf8");
  assert.match(component, /<details className="yggdrasil-step-more">/);
  assert.match(component, /Full attunement descriptions & video lectures/);
  assert.match(component, /Полные описания настроек и видеолекции/);
  assert.match(component, /source\.meaning/);
  assert.match(component, /source\.result/);
  assert.match(component, /source\.opens/);
  assert.match(component, /source\.skills/);
});

test("mobile layout makes the course roadmap and key information single-column", async () => {
  const css = await readFile("app/academy.css", "utf8");
  assert.match(css, /Reiki Yggdrasil inline course landing redesign/);
  assert.match(css, /\.yggdrasil-course-roadmap \{/);
  assert.match(css, /\.yggdrasil-step-key-grid \{/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /\.yggdrasil-course-roadmap \{[\s\S]*?grid-template-columns: 1fr;/);
  assert.match(css, /\.yggdrasil-step-key-grid \{[\s\S]*?grid-template-columns: 1fr;/);
});
