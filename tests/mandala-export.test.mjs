import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const read = file => readFileSync(new URL("../" + file, import.meta.url), "utf8");

test("mandala export preserves local-only image and no external upload", () => {
  const client = read("components/mandala-meditation-client.tsx");
  const exporter = read("lib/mandala/export-png.ts");
  const css = read("components/mandala-meditation.module.css");
  assert.match(client, /renderMandalaPng/);
  assert.match(client, /download="holistic-house-mandala\.png"/);
  assert.match(client, /const pngHref = preparedPng\?\.signature === pngSignature/);
  assert.match(client, /setPreparedPng\(\{ signature: pngSignature, url: URL\.createObjectURL\(blob\) \}\)/);
  assert.match(client, /URL\.revokeObjectURL\(preparedPng\.url\)/);
  assert.match(exporter, /new XMLSerializer\(\)/);
  assert.match(exporter, /canvas\.toBlob\(/);
  assert.match(exporter, /type: "image\/svg\+xml;charset=utf-8"/);
  assert.match(exporter, /decode\("\/mandalas\/legacy-stone-mosaic\.svg"\)/);
  assert.match(exporter, /ctx\.clip\(\)/);
  assert.match(css, /\.focus \.exportButton\{display:none\}/);
  assert.doesNotMatch(exporter + client, /fetch\(|XMLHttpRequest|navigator\.sendBeacon|FormData|localStorage|sessionStorage/);
});

test("export labels are complete in EN/RU/ES and have a visible iPhone control", () => {
  const client = read("components/mandala-meditation-client.tsx");
  const css = read("components/mandala-meditation.module.css");
  for (const str of [
    'png: "Save my mandala · PNG"',
    'png: "Сохранить мандалу · PNG"',
    'png: "Guardar mandala · PNG"',
  ]) assert.ok(client.includes(str), "Missing language: " + str);
  assert.match(css, /\.exportButton/);
  assert.match(css, /@media\(max-width:430px\)\{\.exportButton/);
  assert.match(client, /setPngError\(t\.pngError\)/);
});

test("actual PNG renderer TypeScript parses; browser runner covers WebKit and download", () => {
  const exporter = read("lib/mandala/export-png.ts");
  const browser = read("scripts/verify-holistic-mandala-browser.mjs");
  const diagnostics = ts.transpileModule(exporter, {
    fileName: "lib/mandala/export-png.ts",
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    reportDiagnostics: true,
  }).diagnostics || [];
  assert.equal(diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  assert.match(browser, /chromium.*webkit/);
  assert.match(browser, /setInputFiles/);
  assert.match(browser, /png\.subarray\(0, 8\)/);
  assert.match(browser, /youtube-nocookie\.com\/embed/);
  assert.match(browser, /await page\.keyboard\.press\("Escape"\)/);
  assert.match(browser, /width: 320/);
  assert.match(browser, /width: 430/);
});
