import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { goalTopicForSelection, rankSupportGoalVideos } from "../lib/holistic-support/goal-filter.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const editor = read("components/holistic-support-goal-filter.tsx");
const client = read("components/holistic-support-mobile.tsx");
const css = read("components/holistic-support-goal-filter.module.css");
const mainCss = read("components/holistic-support-mobile.module.css");
const sample = [
  { id: "aaaaaaaaaaa", title: "Energy", topics: ["energy"], sourceLanguage: "ru" },
  { id: "bbbbbbbbbbb", title: "Work", topics: ["business"], sourceLanguage: "ru" },
  { id: "ccccccccccc", title: "Love", topics: ["love"], sourceLanguage: "ru" },
  { id: "ddddddddddd", title: "Rest", topics: ["health"], sourceLanguage: "ru" },
];

test("left CTA expands the existing player, keeps portrait quick match, and has reset/close", () => {
  assert.match(client, /data-support-goal-filter-trigger/);
  assert.match(client, /aria-expanded=\{goalFilterOpen\}/);
  assert.match(client, /onClick=\{openGoalFilter\}/);
  assert.match(client, /goalFilterOpen \? <HolisticSupportGoalFilter/);
  assert.match(client, /initial=\{goalSelection\} onApply=\{applyGoalFilter\} onReset=\{resetGoalFilter\}/);
  assert.match(client, /data-support-active-focus/);
  assert.match(client, /data-support-recommendations/);
  assert.match(client, /data-support-applied-goal/);
  assert.match(editor, /data-support-goal-reset/);
  assert.match(editor, /data-support-goal-apply/);
  assert.match(mainCss, /\.page \.assessment > \.goalFilterTrigger/);
  assert.match(mainCss, /\.page \.profile > \.recommendButton/);
});
test("five goal sectors with problem, task and now/want controls, in EN/RU/ES", () => {
  for (const sector of ["energy", "money", "love", "goals", "meaning"]) {
    assert.match(editor, new RegExp('id: "' + sector + '"'));
    assert.match(editor, new RegExp('' + sector + ': \{'));
  }
  for (const label of ["Фильтр целей и задач", "Сейчас", "Хочу", "Смыслы", "Love & connection", "Sentido y valores"]) {
    assert.ok(editor.includes(label), label);
  }
  assert.match(editor, /data-goal-concern=\{option\.id\}/);
  assert.match(editor, /data-goal-task=\{option\.id\}/);
  assert.match(editor, /values\.length < 3/);
  assert.match(editor, /type="range" min="1" max="10" step="1"/);
  assert.match(editor, /aria-valuetext=\{value\[field\]/);
  assert.match(css, /grid-template-columns: minmax\(160px,\.37fr\)/);
  assert.match(css, /@media \(max-width: 360px\)/);
  assert.match(css, /position: sticky/);
  assert.match(css, /prefers-reduced-motion/);
});
test("specific concerns/intentions change matching topic and only sort verified sources", () => {
  assert.equal(goalTopicForSelection({ sector: "energy", concerns: ["fatigue"] }), "energy");
  assert.equal(goalTopicForSelection({ sector: "energy", concerns: ["symptoms"] }), "health");
  assert.equal(goalTopicForSelection({ sector: "energy", tasks: ["sleepWell"] }), "health");
  assert.equal(goalTopicForSelection({ sector: "money" }), "business");
  assert.equal(goalTopicForSelection({ sector: "love" }), "love");
  assert.equal(goalTopicForSelection({ sector: "goals" }), "business");
  const money = rankSupportGoalVideos({ selection: { sector: "money" }, videos: sample, locale: "ru" });
  assert.equal(money.videos[0].id, "bbbbbbbbbbb");
  assert.equal(money.matchedVideo, true);
  const sleep = rankSupportGoalVideos({ selection: { sector: "energy", tasks: ["sleepWell"] }, videos: sample, locale: "ru" });
  assert.equal(sleep.videos[0].id, "ddddddddddd");
  const love = rankSupportGoalVideos({ selection: { sector: "love" }, videos: sample, locale: "ru" });
  assert.equal(love.videos[0].id, "ccccccccccc");
  const meaning = rankSupportGoalVideos({ selection: { sector: "meaning" }, videos: sample, locale: "ru" });
  assert.equal(meaning.matchedVideo, false, "never claim exact meaning source");
  assert.equal(meaning.videos.length,4);
  const invalid = rankSupportGoalVideos({ selection: { sector: "money" },
    videos: [...sample, { id: "not-an-id", title: "Fake", topics: ["business"] }, sample[1]] });
  assert.equal(invalid.videos.length,4,"dedupe and reject fake IDs");
});
test("no medical inference, URL health params, storage, hidden CRM send or fabricated count", () => {
  for (const source of [editor, read("lib/holistic-support/goal-filter.js")]) {
    assert.doesNotMatch(source, /fetch\(|localStorage|sessionStorage|sendBeacon|URLSearchParams|\/api\/|diagnos\w*\(|Found 24|Найдено 24/);
  }
  assert.match(client, /value\.sector !== "meaning"/);
  assert.match(client, /rankSupportGoalVideos/);
});
test("new TSX parses with no diagnostics", () => {
  const result = ts.transpileModule(editor, {
    fileName: "holistic-support-goal-filter.tsx", reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  const errors = (result.diagnostics ?? []).filter(item => item.category === ts.DiagnosticCategory.Error);
  assert.deepEqual(errors.map(item => ts.flattenDiagnosticMessageText(item.messageText, " ")),[]);
});
