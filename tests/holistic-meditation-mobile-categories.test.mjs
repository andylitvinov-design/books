import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const mobile = read("components/holistic-support-mobile.tsx");
const css = read("components/holistic-support-mobile.module.css");
const source = read("data/academy/holistic-support-meditations.ts");

test("Meditation has Talisman-style categories immediately above the same original player", () => {
  const category = mobile.indexOf("data-support-meditation-category-switcher");
  const hero = mobile.indexOf('id="support-meditation-player" data-support-player');
  const gallery = mobile.indexOf('id="support-meditation-gallery"');
  assert.ok(category > 0 && hero > category && gallery > hero, "categories -> hero -> original four recordings");
  assert.match(mobile, /data-support-meditation-categories-next onClick=\{scrollMeditationCategories\}/);
  assert.match(mobile, /aria-expanded=\{allMeditationCategoriesOpen\}/);
  assert.match(mobile, /aria-pressed=\{meditationCategory === id\}/);
  assert.match(mobile, /onClick=\{\(\) => chooseMeditationCategory\(id\)\}/);
  assert.match(mobile, /role="group" aria-label=\{t\.meditationCategoriesTitle\}/);
  assert.match(mobile, /aria-controls="meditation-category-options"/);
  for (const id of ["energy", "money", "relationships", "meaning", "health", "all"]) {
    assert.match(mobile, new RegExp('id: "' + id + '"'), "has category " + id);
    assert.match(css, new RegExp('meditationCategoryCard\\[data-category="' + id + '"\\]'));
  }
});

test("Categories are localized and meaningful; Meaning never pretends there is a dedicated video", () => {
  for (const label of [
    "Медитации", "Выбери направление", "Все категории", "Энергия", "Деньги",
    "Любовь", "Смыслы", "Здоровье", "Meditations", "Meaning", "Meditaciones", "Sentido",
  ]) assert.ok(mobile.includes(label), label);
  assert.match(mobile, /meditationCategory === "meaning" \? filtered\.filter\(video => video\.program === "sun"\)/);
  assert.match(mobile, /meditationCategoryTopics\[meditationCategory\]/);
  assert.match(mobile, /meditationCategoryRelated: "Близкие оригинальные практики Солнца/);
  assert.match(mobile, /data-support-meditation-category-related role="status"/);
  assert.match(mobile, /setTheme\("all"\); setGoalSelection\(null\); setSelectedId\(null\); setPlaying\(false\)/);
  assert.match(source, /verified_legacy_public_embed/);
  assert.doesNotMatch(mobile, /hardcodedYoutubeId|fakePlaylist|new Date\(\)\.toISOString\(\)/);
});

test("Compact 320–430px cards stay readable while retaining original playback, 4 posters and privacy", () => {
  assert.match(css, /\.meditationCategoryRail \{[^}]*overflow-x: auto/);
  assert.match(css, /scroll-snap-type: x mandatory/);
  assert.match(css, /\.meditationCategoryFrame\[data-expanded="true"\] \.meditationCategoryRail/);
  assert.match(css, /\.meditationCategoryCard > span \{[^}]*white-space: nowrap/);
  assert.match(css, /\.meditationCategorySection \.meditationCategoryCard \{ flex-basis: calc\(\(100% - 18px\) \/ 4\)/);
  assert.match(css, /height: 76px; min-height: 0; max-height: 76px/);
  assert.match(css, /@media\(max-width:350px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(mobile, /youtube-nocookie\.com\/embed/);
  assert.match(mobile, /onClick=\{startVideo\}/);
  assert.match(mobile, /return eligible\.slice\(0, 4\)/);
  assert.doesNotMatch(mobile, /<audio|autoplay=\{true\}|localStorage|navigator\.sendBeacon|fetch\(/);
  const parsed = ts.transpileModule(mobile, {
    fileName: "holistic-support-mobile.tsx", reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  assert.deepEqual((parsed.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error)
    .map(d => ts.flattenDiagnosticMessageText(d.messageText, " ")), []);
});
