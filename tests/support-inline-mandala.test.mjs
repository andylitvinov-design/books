import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const host = read("components/holistic-support-mobile.tsx");
const client = read("components/support-mandala-comparison.tsx");
const css = read("components/support-mandala-comparison.module.css");
const hostCss = read("components/holistic-support-mobile.module.css");
const logic = read("lib/holistic-support/mandala-progress.js");

test("new personal mandala unfolds below existing video in the SAME Support mobile flow", () => {
  assert.match(host, /data-support-player data-playing=/);
  const videoEnd = host.indexOf('<div className={styles.mandalaEntry}>');
  const gallery = host.indexOf('<div className={styles.videoSection}>', videoEnd);
  assert.ok(videoEnd >= 0 && gallery > videoEnd, "mandala sits between video hero and the recording gallery");
  assert.match(host, /data-support-generate-mandala/);
  assert.match(host, /aria-expanded=\{mandalaExpanded\}/);
  assert.match(host, /aria-controls="support-inline-mandala"/);
  assert.match(host, /id="support-inline-mandala"/);
  assert.match(host, /hidden=\{!mandalaExpanded\}/);
  assert.match(host, /<SupportMandalaComparison locale=\{locale\}/);
  assert.match(host, /mandalaCta: "Сгенерировать личную мандалу"/);
  assert.match(host, /mandalaCta: "Generate my personal mandala"/);
  assert.match(host, /mandalaCta: "Generar mi mandala personal"/);
  assert.match(hostCss, /\.mandalaReveal\[hidden\] \{ display: none; \}/);
});

test("left initial ratings and right repeated ratings have four independent inputs", () => {
  assert.match(client, /const areas = \["energy", "money", "relationships", "goals"\] as const/);
  assert.match(client, /data-mandala-baseline/);
  assert.match(client, /data-mandala-retest/);
  assert.match(client, /data-mandala-before=\{area\}/);
  assert.match(client, /data-mandala-after=\{area\}/);
  assert.match(client, /data-mandala-confirm-baseline/);
  assert.match(client, /data-mandala-edit-baseline/);
  assert.match(client, /disabled=\{confirmed\}/);
  assert.match(client, /disabled=\{!confirmed\}/);
  assert.match(client, /data-mandala-compare/);
  assert.match(client, /data-mandala-comparison/);
  assert.match(client, /compareMandalaRatings\(baseline, after\)/);
  assert.match(logic, /delta: end\[key\] - start\[key\]/);
  assert.doesNotMatch(client, /diagnosis|diagnose\(|medical treatment guaranteed/);
});

test("existing mandala artwork, locally held user photo and effects never send sensitive inputs", () => {
  assert.match(client, /\/mandalas\/legacy-stone-mosaic\.svg/);
  assert.match(client, /photoUrl \?/);
  assert.match(client, /data-mandala-local-photo/);
  assert.match(client, /data-mandala-photo-action/);
  assert.match(host, /ref=\{photoInputRef\}/);
  assert.match(host, /photoUrl=\{photoUrl\} onRequestPhoto=\{\(\) => photoInputRef\.current\?\.click\(\)\}/);
  assert.match(client, /data-mandala-effect-choice="fire"/);
  assert.match(client, /data-mandala-effect-choice="money"/);
  assert.match(client, /data-mandala-effect-toggle/);
  assert.match(client, /effectPlaying && !reducedMotion/);
  assert.match(css, /@keyframes mandalaFlame/);
  assert.match(css, /@keyframes mandalaMoney/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /@media\(max-width:375px\)/);
  assert.doesNotMatch(client, /fetch\(|XMLHttpRequest|WebSocket|FormData|localStorage|sessionStorage|navigator\.sendBeacon|AudioContext/);
  assert.doesNotMatch(host, /navigator\.sendBeacon|localStorage|sessionStorage/);
});

test("new TSX parser accepts the embedded module without JSX syntax errors", () => {
  const result = ts.transpileModule(client, {
    fileName: "support-mandala-comparison.tsx",
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    reportDiagnostics: true,
  });
  assert.deepEqual((result.diagnostics || [])
    .filter(d => d.category === ts.DiagnosticCategory.Error)
    .map(d => ts.flattenDiagnosticMessageText(d.messageText, " ")), []);
});
