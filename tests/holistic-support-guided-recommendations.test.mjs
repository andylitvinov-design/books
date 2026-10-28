import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { getTopicJourney } from "../lib/assessments/topic-journeys.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const client = read("components/holistic-support-mobile.tsx");
const css = read("components/holistic-support-mobile.module.css");

test("one five-step card is visible by default in the existing mobile page", () => {
  assert.match(client, /!goalFilterOpen \? <section className=\{styles\.goalResults\}/);
  assert.match(client, /id="support-goal-results" data-support-goal-results/);
  assert.match(client, /scrollToSupport\("support-goal-results"\)/);
  assert.match(client, /aria-controls="support-goal-results"/);
  assert.equal([...client.matchAll(/data-support-journey-step="([1-5])"/g)].length, 5);
  for (const key of ["question", "tests", "video", "support", "progress"]) {
    assert.match(client, new RegExp('data-support-journey-action="' + key + '"'));
  }
  assert.match(client, /<details className=\{styles\.journeyMore\}/);
  assert.match(client, /data-support-goal-action="initiations"/);
  assert.match(client, /data-support-goal-action="meditation"/);
});

test("each card performs a real, non-mutating action in existing modules", () => {
  assert.match(client, /onClick=\{openGoalFilter\}[\s\S]*data-support-journey-action="question"/);
  assert.match(client, /client\/tests\?journey=" \+ journeyCategory\[focus\]/);
  for (const id of ["energy", "business", "relationships", "effectiveness"]) {
    assert.ok(getTopicJourney(id), id + " exists in public test explorer");
  }
  assert.match(client, /journeyVideo = goalMatch\?\.videos\[0\] \?\? quickRanked\.videos\[0\]/);
  assert.match(client, /encodeURIComponent\(journeyVideo\.id\)/);
  assert.match(client, /setSelectedId\(journeyVideo\?\.id \?\? null\)/);
  assert.match(client, /scrollToSupport\("support-meditation-player"\)/);
  assert.match(client, /data-support-journey-action="support"/);
  assert.match(client, /changeChoice\(selectedChoice\)/);
  assert.match(client, /scrollToSupport\(selectedChoice === "talisman"/);
  assert.match(client, /href="#support-progress" data-support-journey-action="progress"/);
  assert.doesNotMatch(client, /\/api\/create-booking|\/api\/payments\/charge/);
});

test("support offers respect selected formats, and empty selection reopens the filter", () => {
  assert.match(client, /find\(id => activeGoalFormats\.includes\(id\)\)/);
  assert.match(client, /if \(!selectedChoice\) \{ openGoalFilter\(\); return; \}/);
  assert.match(client, /journeyVideoAllowed = !goalSelection \|\| activeGoalFormats\.includes\("meditation"\)/);
  assert.match(client, /if \(!journeyVideoAllowed\) \{ openGoalFilter\(\); return; \}/);
  assert.match(client, /journeySupportFormat === "courses"/);
  assert.match(client, /journeySupportFormat === "initiations"/);
  assert.match(client, /journeySupportFormat === "mandala"/);
});

test("local-only scores remain private and explanations have full EN/RU/ES parity", () => {
  for (const value of [
    "Five clickable steps", "Пять рекомендаций с прямыми переходами", "Cinco recomendaciones",
    "Тесты: энергия и самочувствие", "Pruebas de energía y bienestar", "Energy & wellbeing tests",
    "Мои оценки и открытые видео", "Mis valoraciones y vídeos abiertos",
  ]) assert.ok(client.includes(value), value);
  assert.match(client, /setProfileSector\(goalSelection\?\.sector \?\? \(\{/);
  assert.match(client, /scores\[focus\]\}\/10/);
  assert.doesNotMatch(client, /journeyCategory\[focus\].*scores|journeyCategory\[focus\].*concerns/);
  assert.doesNotMatch(client, /\.setItem\(|sendBeacon\(|fetch\("/);
});

test("five rows fit the existing compact responsive card without a new app shell", () => {
  assert.match(css, /\.journeyRow \{ display: grid;/);
  assert.match(css, /grid-template-columns: minmax\(85px, 31%\) minmax\(0,1fr\)/);
  assert.match(css, /@media \(max-width: 350px\)/);
  assert.match(css, /\.journeyTarget \{ grid-template-columns: 36px minmax\(0,1fr\)/);
  assert.match(css, /\.journeyStart \{ display: inline-flex;/);
  assert.match(css, /\.journeyMore \{/);
  assert.match(client, /data-support-app-header/);
  assert.match(client, /data-support-mobile-bottom-nav/);
});

test("mobile JSX parses without TypeScript syntax diagnostics", () => {
  const result = ts.transpileModule(client, {
    fileName: "holistic-support-mobile.tsx", reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  const errors = (result.diagnostics ?? []).filter(item => item.category === ts.DiagnosticCategory.Error);
  assert.deepEqual(errors.map(item => ts.flattenDiagnosticMessageText(item.messageText, " ")), []);
});
