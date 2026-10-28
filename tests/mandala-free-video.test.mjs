import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("one existing mandala editor supplies the image and private photo consent to the free video maker", () => {
  const parent = read("components/mandala-meditation-client.tsx");
  const video = read("components/mandala-free-video-studio.tsx");
  const png = read("lib/mandala/export-png.ts");
  assert.match(parent, /<MandalaFreeVideoStudio locale=\{locale\} frameUrl=\{pngHref\} photoIdentity=\{imageUrl\}/);
  assert.match(parent, /renderMandalaPng/);
  assert.match(png, /options\.photoUrl \? await decode\(options\.photoUrl\)/);
  assert.match(video, /data-mandala-free-video/);
  assert.match(video, /photoIdentity \? \(/);
  assert.match(video, /data-mandala-video-consent checked=\{photoConsent\}/);
  assert.match(video, /!photoIdentity \|\| photoConsent/);
  assert.match(video, /setPhotoConsent\(false\)/);
  assert.match(video, /sourceRef\.current !== snapshot \|\| signatureRef\.current !== configSnapshot/);
  assert.doesNotMatch(video, /\bfetch\s*\(|XMLHttpRequest|FormData|localStorage|sessionStorage|sendBeacon|supabase|kling|higgsfield|heygen/i);
});

test("client chooses goal, 8 animated scenes, speed, brightness, caption, format, and duration", () => {
  const video = read("components/mandala-free-video-studio.tsx");
  assert.match(video, /const purposes: Purpose\[\] = \["calm", "energy", "confidence", "relationships", "prosperity", "goals"\]/);
  assert.match(video, /const effects: Effect\[\] = \["glow", "energy", "prosperity", "temple", "tree", "magnet", "infinity", "path"\]/);
  assert.match(video, /const purposeScenes: Record<Purpose, Effect>/);
  assert.match(video, /const durations = \[10, 20, 30, 60\] as const/);
  assert.match(video, /type Aspect = "square" \| "portrait" \| "landscape"/);
  assert.match(video, /width: 960, height: 540/);
  assert.match(video, /type Pace = "slow" \| "normal"/);
  assert.match(video, /type Strength = "soft" \| "bright"/);
  assert.match(video, /type CaptionMode = "none" \| "purpose" \| "custom"/);
  assert.match(video, /maxLength=\{72\}/);
  for (const language of ["en:", "ru:", "es:"]) assert.ok(video.includes(language));
  for (const id of ["purpose", "effect", "pace", "strength", "caption-mode", "aspect", "duration"]) {
    assert.ok(video.includes("data-mandala-video-" + id), id);
  }
  assert.match(video, /data-mandala-video-motion-preview/);
  assert.match(video, /aria-pressed=\{previewing\}/);
  assert.match(video, /onClick=\{createVideo\}/);
});

test("real MP4/WebM recording is browser-local, cancellable, shareable and cleans up", () => {
  const source = read("components/mandala-free-video-studio.tsx");
  assert.match(source, /canvas\.captureStream\(15\)/);
  assert.match(source, /new MediaRecorder\(stream/);
  assert.match(source, /recorder\.start\(500\)/);
  assert.match(source, /recorder\.ondataavailable/);
  assert.match(source, /recorder\.onstop/);
  assert.match(source, /extension: type\.includes\("mp4"\) \? "mp4" : "webm"/);
  assert.match(source, /URL\.createObjectURL\(blob\)/);
  assert.match(source, /URL\.revokeObjectURL\(result\.url\)/);
  assert.match(source, /job\.stream\.getTracks\(\)\.forEach\(track => track\.stop\(\)\)/);
  assert.match(source, /document\.addEventListener\("visibilitychange", onHidden\)/);
  assert.match(source, /navigator\.share\(\{ files: \[file\]/);
  assert.match(source, /data-mandala-video-preview/);
  assert.match(source, /data-mandala-video-download/);
  assert.match(source, /data-mandala-video-generate/);
  assert.match(source, /playsInline/);
  assert.match(source, /videoBitsPerSecond: 1_400_000/);
});

test("free client video is linked from both support experiences; CSP remains path-scoped", () => {
  const middleware = read("middleware.ts");
  const css = read("components/mandala-meditation.module.css");
  const mobile = read("components/holistic-support-mobile.tsx");
  const support = read("app/[locale]/holistic-support/page.tsx");
  assert.match(middleware, /const publicMandalaLocalImages = \/\^\\\/\(en\|ru\|es\)\\\/holistic-support\\\/mandala/);
  assert.match(middleware, /practitionerCourseEditor\|\|publicMandalaLocalImages\) \? ' blob:'/);
  assert.match(css, /\.focus \.freeVideoPanel\{display:none\}/);
  assert.match(css, /\.freeVideoPurposeGrid/);
  assert.match(css, /@media\(max-width:350px\)/);
  assert.match(mobile, /data-support-free-personal-video/);
  assert.match(mobile, /holistic-support\/mandala/);
  assert.match(support, /meditationMandalaAction/);
  assert.match(support, /FREE video|БЕСПЛАТНОЕ видео|GRATIS/);
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
  assert.match(studio, /if \(moneyScene\) paintMoneyScene\(ctx, moneyScene, motionTime\)/);
  assert.match(studio, /requestAnimationFrame\(draw\)/);
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
