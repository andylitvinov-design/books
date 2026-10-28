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
  assert.match(editor, /data-support-goal-save/);
  assert.match(editor, /data-support-goal-next/);
  assert.match(editor, /data-goal-accepted=\{id\}/);
  assert.match(editor, /saveCurrent\(\)/);
  assert.match(editor, /nextSector\(\)/);
  assert.match(editor, /savedSectors: all/);
  assert.match(client, /goalSavedSectors/);
  assert.match(client, /onSave=\{saveGoalSector\}/);
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
  assert.doesNotMatch(editor, /values\.length < 3|Select up to 3|до 3 пунктов|hasta 3/);
  assert.match(editor, /\[\.\.\.values, id\]/);
  assert.match(editor, /type="range" min="1" max="10" step="1"/);
  assert.match(editor, /aria-valuetext=\{getRating\(item\.id, index\)\[field\]/);
  assert.match(css, /grid-template-columns: minmax\(155px,\.35fr\)/);
  assert.match(css, /\.axis \{ display: grid;/);
  assert.match(css, /\.metricsGroup \{/);
  assert.match(css, /\.metricsGroup \{ min-width: 0; margin-top:/);
  assert.match(css, /\.categoryActions \{ display: grid; grid-template-columns: repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.panel \.save,.panel \.next/);
  assert.match(css, /\.panel \.accepted/);
  assert.match(css, /@media \(max-width: 360px\)/);
  assert.match(css, /\.actions \{ position: static;/);
  assert.doesNotMatch(css, /\.actions \{ position: sticky|\.actions \{ bottom: calc/);
  assert.match(css, /\.panel \.apply \{/);
  assert.match(css, /\.panel \.reset \{/);
  assert.match(css, /\.panel \.sector \{/);
  assert.match(mainCss, /\.page:has\(\[data-support-goal-filter\]\) \.experience/);
  assert.match(editor, /data-support-goal-actions/);
  assert.match(css, /prefers-reduced-motion/);
  for (const sector of ["energy","money","love","goals","meaning"]) {
    const section = editor.split("  " + sector + ": {")[1]?.split("  },")[0];
    assert.equal((section?.match(/\baxis\("/g) || []).length,3,sector+" has three tailored measures");
  }
  for (const name of ["vitality","sleepQuality","calm",
    "monthlyIncome","incomeStability","reserveMonths",
    "connection","trust","communication",
    "goalClarity","actions","progress",
    "meaningAxis","selfContact","inspirationAxis"]) {
    assert.ok(editor.includes('axis("'+name+'"'), name);
  }
  assert.match(editor, /data-goal-metric=\{item\.id\}/);
  assert.match(editor, /data-goal-currency/);
  assert.match(editor, /value=\{amounts\[item\.id\]\?\.\[field\] \?\? ""\}/);
  assert.match(editor, /updateAmount\(item\.id, field/);
  assert.match(editor, /initial\?\.currency \?\? "CAD"/);
  assert.match(editor, /monthlyIncome: \{ current: null, desired: null \}/);
  assert.match(editor, /"Сохранить"/);
  assert.match(editor, /"Следующая категория"/);
  assert.match(editor, /"Принято"/);
  assert.match(editor, /setDrafts\(previous/);
  assert.match(editor, /setAccepted\(previous/);
  assert.match(editor, /onSave\(sector, snapshot\)/);
  assert.match(editor, /setDirty\(previous/);
  assert.match(editor, /setDrafts\(\{\}\); setAccepted\(\{\}\); setDirty\(\{\}\)/);
  assert.match(editor, /currency,? \}\s*:\s*\{\}/);
});
test("recommendations lead to existing resources without pretending a booking or an exact match", () => {
  for (const kind of ["meditation","tests","courses","talismans","masters"]) {
    assert.match(client, new RegExp('data-support-goal-action="' + kind + '"'));
  }
  assert.match(client, /\/tests"/);
  assert.match(client, /\/explore\/business"/);
  assert.match(client, /changeChoice\("talisman"\)/);
  assert.match(client, /changeChoice\("masters"\)/);
  assert.match(client, /money: "incomeStability"/);
  for (const text of ["Show recommendations", "Показать рекомендации", "Mostrar recomendaciones"]) {
    assert.ok(editor.includes(text), text);
  }
  assert.doesNotMatch(client, /92% match|Найдено 32|Found 32/);
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
