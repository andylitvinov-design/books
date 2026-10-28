import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { supportTestFocus, supportTestHref } from "../lib/holistic-support/today-pick.mjs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Only accepted answers or moved sliders produce ranked editorial Test Explorer facets", () => {
  assert.deepEqual(supportTestFocus({ scores: { energy: 5, money: 5 } }), []);
  assert.equal(supportTestHref("ru", { scores: { energy: 5 } }), "/ru/client/tests");
  assert.deepEqual(supportTestFocus({
    scores: { energy: 7, money: 2, relationships: 8, meaning: 4 },
    editedCheckins: ["energy", "money", "relationships", "meaning"],
  }), ["clarity", "function", "meaning"]);
  assert.deepEqual(supportTestFocus({
    goalSector: "love", goalConcerns: ["boundaries", "distance", "unrecognizedSensitiveAnswer"],
  }), ["resources", "relationships", "intimacy"]);
  assert.deepEqual(supportTestFocus({
    scores: { energy: 2 }, editedCheckins: ["energy"], category: "money",
  }), ["body", "resources"], "slider takes priority over a visual category");
  assert.deepEqual(supportTestFocus({ category: "health" }), ["health", "body"]);
  const url = supportTestHref("es", {
    scores: { money: 1 }, editedCheckins: ["money"], goalSector: "money",
    goalConcerns: ["moneyStress"], sensitiveAnswer: "secret-note",
  });
  assert.equal(url, "/es/client/tests?focus=stress,clarity,function");
  assert.doesNotMatch(url, /secret|moneyStress|\b1\b|note|score|answer/i);
});

test("Today's pick is an actual top ribbon, not a replacement for the old 7-step card", () => {
  const page = read("components/holistic-support-mobile.tsx");
  const ribbon = read("components/holistic-support-today-pick.tsx");
  const styles = read("components/holistic-support-today-pick.module.css");
  const marker = page.indexOf("<HolisticSupportTodayPick");
  assert.ok(marker > page.indexOf("data-support-app-header"));
  assert.ok(marker < page.indexOf('className={styles.topGrid}'));
  assert.match(page, /<SupportGuestQuestPanel/);
  assert.match(page, /supportTestHref\(locale/);
  for (const id of ["test", "ideas", "video", "course"]) {
    assert.match(ribbon, new RegExp('data-support-pick=' + (id === "test" ? '"test"' : '\\{id\\}')));
  }
  for (const label of [
    "Today’s pick:", "My Test", "Get Ideas", "Motivation Video", "Study Program",
    "Сегодня попробуй:", "Мой тест", "Рекомендации", "Видео для мотивации",
    "Para hoy:", "Mi test", "Ideas",
  ]) assert.ok(ribbon.includes(label), label);
  assert.match(styles, /scroll-snap-type: x proximity/);
  assert.match(styles, /@media \(max-width: 350px\)/);
  assert.match(styles, /min-height: 42px/);
  assert.match(styles, /data-done="true"/);
});

test("Test explorer ranks by canonical topic filters and offers optional server-authenticated Google sign-in", () => {
  const page = read("app/[locale]/client/tests/page.tsx");
  const banner = read("components/app/test-explorer-google-banner.tsx");
  const route = read("app/api/app/[...path]/route.js");
  assert.match(page, /normalizeJourneyFocus/);
  assert.match(page, /initialPreferences=\{initialPreferences\}/);
  assert.ok(page.indexOf("<TestExplorerGoogleBanner") < page.indexOf("<PublicTestExplorer"));
  assert.match(banner, /data-test-explorer-google-signin/);
  assert.match(banner, /appFetch\("auth\/start", \{ locale: cabinetLocale, continueTo: "my-tests" \}/);
  assert.match(banner, /appFetch\("auth\/status"/);
  assert.match(banner, /app\/tests/);
  assert.match(route, /support-journey\/test-status/);
  assert.match(route, /select exists\(select 1 from app\.assessment_runs/);
  assert.match(route, /createGuestRepository\(config\)\.bootstrap\(credential\)/);
  assert.match(route, /return json\(\{ completed \}\)/);
  assert.doesNotMatch(banner, /localStorage|sessionStorage|stripe|trackEvent/);
});

test("Video checkmark needs a voluntary question response after a real player start", () => {
  const page = read("components/holistic-support-mobile.tsx");
  const quest = read("components/holistic-support-guest-quest.tsx");
  assert.match(page, /if \(!selected \|\| !quest\.launch\(\)\) return/);
  assert.match(page, /playing && selected \? \(/);
  assert.match(page, /data-support-video-question-answer/);
  assert.match(page, /onClick=\{quest\.answerVideoQuestion\}/);
  assert.match(page, /videoDone=\{quest\.record\.videoQuestionAnswered\}/);
  assert.match(quest, /typeof verifiedCompletion === "boolean"/);
  assert.match(quest, /test: verifiedCompletion/);
  assert.match(quest, /completed: \{ \.\.\.next\.completed, test: false \}/);
  assert.doesNotMatch(page, /localStorage|sessionStorage|navigator\.sendBeacon|fetch\(/);
});

test("Every new TSX module parses without TypeScript errors", () => {
  for (const path of [
    "components/holistic-support-mobile.tsx",
    "components/holistic-support-guest-quest.tsx",
    "components/holistic-support-today-pick.tsx",
    "components/app/test-explorer-google-banner.tsx",
    "app/[locale]/client/tests/page.tsx",
  ]) {
    const output = ts.transpileModule(read(path), {
      fileName: path, reportDiagnostics: true,
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    });
    assert.deepEqual((output.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error)
      .map(d => ts.flattenDiagnosticMessageText(d.messageText, " ")), [], path);
  }
});
