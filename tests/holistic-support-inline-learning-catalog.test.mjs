import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const catalog = read("components/holistic-support-learning-catalog.tsx");
const css = read("components/holistic-support-learning-catalog.module.css");
const model = read("lib/holistic-support/learning-catalog.ts");
const page = read("app/[locale]/holistic-support/mobile/page.tsx");
const shell = read("components/holistic-support-mobile.tsx");
const profiles = read("components/holistic-support-course-profiles.tsx");

test("one same-page catalog shows three directions and their conditional topics in EN, RU and ES", () => {
  assert.match(catalog, /directionOrder: LearningDirection\[\] = \["reiki", "temple", "magic"\]/);
  assert.match(catalog, /reiki: \["all", "usui", "tantra", "kundalini", "yggdrasil", "other"\]/);
  assert.match(catalog, /temple: \["all", "egypt", "greece", "maya", "other"\]/);
  assert.match(catalog, /magic: \["all", "runes", "tarot", "rituals", "other"\]/);
  for (const language of ["en", "ru", "es"]) assert.match(catalog, new RegExp("^  " + language + ": \\{", "m"));
  for (const marker of ["data-learning-direction", "data-learning-topic", "data-learning-cost",
    "data-learning-master", "data-learning-count", "data-learning-item", "data-learning-filters-toggle"]) assert.ok(catalog.includes(marker), marker);
  assert.match(catalog, /setDirection\(next\); reset\(\);/);
  assert.match(catalog, /setTopic\(id\); setLimit\(8\)/);
  assert.match(catalog, /<select/);
  assert.doesNotMatch(catalog, /router\.push|window\.location|fetch\(/);
});

test("filter controls preserve free, confirmed paid, price not listed and archive as distinct data", () => {
  assert.match(catalog, /item\.cost === "priced"/);
  assert.match(catalog, /item\.cost === "free"/);
  assert.match(catalog, /item\.cost === "archive"/);
  assert.match(catalog, /item\.cost === "ask"/);
  assert.match(catalog, /value === "paid" \? item\.cost === "priced"/);
  assert.match(catalog, /new Intl\.NumberFormat\(locale/);
  assert.match(catalog, /onClick=\{\(\) => toggleExpanded\(item\.id\)\}/);
  assert.match(catalog, /href=\{item\.href\}/);
  assert.match(catalog, /\{filtered\.slice\(0, limit\)\.map/);
  assert.doesNotMatch(model, /price:\s*\{\s*amount:\s*\d/);
  assert.doesNotMatch(model, /cost:\s*"priced"/);
  assert.match(model, /status === "needs_review"/);
  assert.match(model, /const seen = new Set<string>\(\)/);
});

test("courses reuse source-backed Academy and published-only approved practitioners", () => {
  assert.match(model, /REIKI_FREE_COURSE_PATH/);
  assert.match(model, /findAcademyRecord\(entry\.logicalId, "ru"\)/);
  assert.match(model, /academyDisplayTitle\(record, locale\)/);
  assert.match(model, /entry\.course\.locale/);
  assert.match(model, /"\/courses\/masters\/" \+ entry\.slug/);
  assert.match(page, /createPractitionerCourseRepository\(getAppConfig\(\)\)\.catalog\(\)/);
  assert.match(page, /catch \{\s*publishedCourses = \[\];/);
  assert.match(page, /buildSupportLearningCatalog\(locale, originalMysteryCourses, publishedCourses\)/);
  assert.match(shell, /learningItems=\{learningItems\}/);
  assert.match(profiles, /<HolisticSupportLearningCatalog locale=\{locale\} items=\{learningItems\}/);
  assert.match(profiles, /data-learning-goal-picker/);
  assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:350px\)/);
});

test("new TSX and view model parse without syntax errors", () => {
  for (const [name, source] of [["catalog", catalog], ["model", model], ["profiles", profiles], ["shell", shell], ["page", page]]) {
    const tree = ts.createSourceFile(name + ".tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    assert.deepEqual(tree.parseDiagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, "\n")), [], name);
  }
});
