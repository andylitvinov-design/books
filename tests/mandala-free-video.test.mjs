import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("free video lives inside original mandala editor and reuses its private local PNG", () => {
  const parent = read("components/mandala-meditation-client.tsx");
  const video = read("components/mandala-free-video-studio.tsx");
  const png = read("lib/mandala/export-png.ts");
  assert.match(parent, /<MandalaFreeVideoStudio locale=\{locale\} frameUrl=\{pngHref\}/);
  assert.match(parent, /renderMandalaPng/);
  assert.match(png, /options\.photoUrl \? await decode\(options\.photoUrl\)/);
  assert.match(video, /data-mandala-free-video/);
  assert.match(video, /canvas\.captureStream\(15\)/);
  assert.match(video, /new MediaRecorder\(stream/);
  assert.match(video, /recorder\.start\(500\)/);
  assert.match(video, /URL\.createObjectURL\(blob\)/);
  assert.match(video, /URL\.revokeObjectURL\(result\.url\)/);
  assert.match(video, /loadLocalImage\(snapshot\)/);
  assert.match(video, /sourceRef\.current !== snapshot/);
  assert.doesNotMatch(video, /\bfetch\s*\(|XMLHttpRequest|FormData|localStorage|sessionStorage|sendBeacon|supabase|kling|higgsfield|heygen/i);
});

test("video recorder has 10/20/30 seconds, 1:1/9:16 and four local effects mirrored across EN/RU/ES", () => {
  const source = read("components/mandala-free-video-studio.tsx");
  assert.match(source, /const durations = \[10, 20, 30\] as const/);
  assert.match(source, /type Aspect = "square" \| "portrait"/);
  for (const key of ['"glow"', '"energy"', '"prosperity"', '"temple"']) assert.ok(source.includes(key));
  for (const language of ["en:", "ru:", "es:"]) assert.ok(source.includes(language));
  assert.match(source, /onClick=\{createVideo\}/);
  assert.match(source, /data-mandala-video-download/);
  assert.match(source, /playsInline/);
  assert.match(source, /recorder\.ondataavailable/);
  assert.match(source, /job\.stream\.getTracks\(\)\.forEach\(track => track\.stop\(\)\)/);
  assert.match(source, /extension: type\.includes\("mp4"\) \? "mp4" : "webm"/);
});

test("Mandala video preview has path-scoped blob media CSP and iPhone-safe compact controls", () => {
  const middleware = read("middleware.ts");
  const css = read("components/mandala-meditation.module.css");
  assert.match(middleware, /const publicMandalaLocalImages = \/\^\\\/\(en\|ru\|es\)\\\/holistic-support\\\/mandala/);
  assert.match(middleware, /practitionerCourseEditor\|\|publicMandalaLocalImages\) \? ' blob:'/);
  assert.match(css, /\.focus \.freeVideoPanel\{display:none\}/);
  assert.match(css, /@media\(max-width:350px\)\{\.freeVideoSettings\{grid-template-columns:1fr\}/);
  assert.match(css, /\.freeVideoDownload/);
});


test("client money-flow studio offers exactly 12 symbolic looks and starts with four favourites", async () => {
  const ts = await import("typescript");
  const studio = read("components/mandala-free-video-studio.tsx");
  const effects = read("lib/mandala/money-flow-effects.ts");
  const css = read("components/mandala-meditation.module.css");
  const browser = read("scripts/verify-holistic-mandala-browser.mjs");

  const ids = [
    "golden-rain", "abundance-tree", "money-magnet", "infinite-flow",
    "cosmic-flow", "opportunity-falls", "path-to-goals", "partners",
    "golden-shield", "abundance-circle", "life-gifts", "dreams",
  ];
  for (const id of ids) assert.match(effects, new RegExp('id: "' + id + '"'));
  assert.equal((effects.match(/ id: "/g) || []).length, 12, "exactly twelve client-safe concepts");
  for (const locale of ["en", "ru", "es"]) assert.match(effects, new RegExp(locale + ': "'));
  assert.match(studio, /moneyScenes\.slice\(0, showAllMoney \? moneyScenes\.length : 4\)/);
  assert.match(studio, /data-mandala-money-option/);
  assert.match(studio, /data-mandala-money-preview/);
  assert.match(studio, /setMoneyScene\(null\)/);
  assert.match(studio, /if \(moneyScene\) paintMoneyScene\(ctx, moneyScene, time\)/);
  assert.match(studio, /window\.requestAnimationFrame\(draw\)/);
  assert.match(studio, /!document\.hidden/);
  assert.match(effects, /ctx\.clip\("evenodd"\)/);
  assert.match(css, /@media\(max-width:350px\)\{\.moneyFlowSection/);
  assert.match(browser, /data-mandala-money-option/);
  assert.doesNotMatch(studio + effects, /\bfetch\s*\(|XMLHttpRequest|FormData|localStorage|sessionStorage|sendBeacon|supabase|kling\.ai|higgsfield|heygen|publish/i);

  const diagnostic = ts.transpileModule(effects, {
    fileName: "lib/mandala/money-flow-effects.ts",
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).diagnostics || [];
  assert.equal(diagnostic.filter(error => error.category === ts.DiagnosticCategory.Error).length, 0);
});
