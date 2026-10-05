import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Holistic House Yggdrasil curriculum mirrors the canonical 7-level / 37-step structure", async () => {
  const curriculum = JSON.parse(await readFile("data/academy/yggdrasil-curriculum.json", "utf8"));

  assert.equal(curriculum.source.repository, "andylitvinov-design/reiki-yggdrasil");
  assert.equal(curriculum.source.branch, "main");
  assert.equal(curriculum.source.commit, "3fd7960aa77862c38f8a5754b64c3a79f5e0c96a");
  assert.equal(curriculum.source.file, "src/data/reikiKnowledgeBase.js");
  assert.equal(curriculum.source.totalLevels, 7);
  assert.equal(curriculum.source.totalSteps, 37);
  assert.equal(curriculum.levels.length, 7);
  assert.equal(curriculum.levels.reduce((sum, level) => sum + level.steps.length, 0), 37);

  assert.deepEqual(
    curriculum.levels.map((level) => level.steps.length),
    [5, 6, 5, 5, 5, 5, 6]
  );

  assert.equal(curriculum.levels[0].title.ru, "Базовая программа Рейки Иггдрасиль");
  assert.equal(curriculum.levels[1].title.ru, "Инструкторский курс");
  assert.equal(curriculum.levels[2].title.ru, "Храмовая магия");
  assert.equal(curriculum.levels[3].title.ru, "Восточная магия");
  assert.equal(curriculum.levels[4].title.ru, "Западноевропейская магия. Каббала и Таро");
  assert.equal(curriculum.levels[5].title.ru, "Продвинутая магия рун");
  assert.equal(curriculum.levels[6].title.ru, "Высшая магия");

  assert.equal(curriculum.levels[0].steps[4].title.ru, "Уровень мастера");
  assert.equal(curriculum.levels[6].steps[5].title.ru, "Цивилизации");
});

test("Yggdrasil Academy page uses the canonical curriculum instead of rendering the legacy 10-module body", async () => {
  const [recordPage, component, css] = await Promise.all([
    readFile("components/academy-record-page.tsx", "utf8"),
    readFile("components/yggdrasil-curriculum.tsx", "utf8"),
    readFile("app/academy.css", "utf8"),
  ]);

  assert.match(recordPage, /record\.routeKey === "reiki\/yggdrasil"/);
  assert.match(recordPage, /<YggdrasilCurriculum locale=\{locale\} \/>/);
  assert.match(recordPage, /isCanonicalYggdrasil \? \[\] : academyPublicBlocks\(record\)/);
  assert.match(component, /7 levels · 37 steps/);
  assert.match(component, /7 уровней · 37 ступеней/);
  assert.match(component, /older 10-module PsiTrends outline/);
  assert.match(css, /\.yggdrasil-levels/);
  assert.match(css, /\.yggdrasil-step-list/);
});
