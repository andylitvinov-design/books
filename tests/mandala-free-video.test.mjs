import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("free video lives inside original mandala editor and reuses its private local PNG", () => {
  const parent = read("components/mandala-meditation-client.tsx");
  const video = read("components/mandala-free-video-studio.tsx");
  const png = read("lib/mandala/export-png.ts");
  assert.match(parent, /<MandalaFreeVideoStudio locale=\{locale\} frameUrl=\{pngHref\} photoUrl=\{imageUrl\}/);
  assert.match(parent, /renderMandalaPng/);
  assert.match(png, /options\.photoUrl \? await decode\(options\.photoUrl\)/);
  assert.match(video, /data-mandala-free-video/);
  assert.match(video, /canvas\.captureStream\(framesPerSecond\)/);
  assert.match(video, /new MediaRecorder\(stream/);
  assert.match(video, /recorder\.start\(500\)/);
  assert.match(video, /URL\.createObjectURL\(blob\)/);
  assert.match(video, /URL\.revokeObjectURL\(result\.url\)/);
  assert.match(video, /loadSceneImage\(snapshot\)/);
  assert.match(video, /sourceRef\.current !== snapshot/);
  assert.doesNotMatch(video, /\bfetch\s*\(|XMLHttpRequest|FormData|localStorage|sessionStorage|sendBeacon|supabase|kling|higgsfield|heygen/i);
});

test("video recorder has 10/20/30 seconds, 1:1/9:16 and four local effects mirrored across EN/RU/ES", () => {
  const source = read("components/mandala-free-video-studio.tsx");
  assert.match(source, /const durations = \[10, 20, 30, 60\] as const/);
  assert.match(source, /type Aspect = "square" \| "portrait" \| "landscape"/);
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
  assert.match(middleware, /publicMandalaLocalImages\|\|ownerMessengerImages\|\|liveAudioPage\) \? ' blob:'/);
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
  assert.match(studio, /moneyTemplates/);
  assert.match(studio, /data-mandala-money-option/);
  assert.match(studio, /data-mandala-money-preview/);
  assert.match(studio, /setMoneyScene\(null\)/);
  assert.match(studio, /paintCinematicMoneyFrame\(ctx, art, moneyScene, adjustedTime, aspect, title\)/);
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


test("cinematic customer video renders real layered motion, portrait and 720/1080 plus 16:9", async () => {
  const ts = await import("typescript");
  const studio=read("components/mandala-free-video-studio.tsx");
  const renderer=read("lib/mandala/cinematic-money-video.ts");
  const parent=read("components/mandala-meditation-client.tsx");
  const css=read("components/mandala-meditation.module.css");
  const browser=read("scripts/verify-holistic-mandala-browser.mjs");
  assert.match(studio, /data-mandala-cinematic-canvas/);
  assert.match(studio, /paintCinematicMoneyFrame\(ctx, art, moneyScene, adjustedTime, aspect, title\)/);
  assert.match(studio, /const \[outputWidth, outputHeight\] = formatDimensions\(aspect, quality\)/);
  assert.match(studio, /quality === "fullhd" \? 1080 : 720/);
  assert.match(studio, /type Aspect = "square" \| "portrait" \| "landscape"/);
  assert.match(studio, /source = theme==="money" && backgroundOnly \? BACKGROUND_CLIP : photoUrl \|\| frameUrl \|\| BACKGROUND_CLIP/);
  assert.match(studio, /CinematicSceneThumbnail/);
  assert.match(studio, /const \[moneyScene, setMoneyScene\] = useState<MoneySceneId \| null>\("golden-rain"\)/);
  assert.match(studio, /videoBitsPerSecond:quality==="fullhd"\?5_000_000:3_000_000/);
  assert.match(parent, /photoUrl=\{imageUrl\}/);
  assert.match(renderer, /movingCoins\(ctx,scene,t,w,h,false\)/);
  assert.match(renderer, /movingCoins\(ctx,scene,t,w,h,true\)/);
  assert.match(renderer, /getPortraitLayer\(image\)/);
  assert.match(renderer, /coinTexture\(\)/);
  // The renderer now preserves decoded portrait aspect ratio instead of
  // forcing fixed width/height offsets; keep the actual image-layer contract.
  assert.ok(renderer.includes("ctx.drawImage(src,-src.width*scale/2,-src.height*scale/2,src.width*scale,src.height*scale);"));
  assert.match(renderer, /c\.fillText\("\$", 70\.5, 72\)/);
  assert.match(renderer, /if\(front&&Math\.abs\(x-w\*\.5\)<w\*\.24/);
  assert.match(css, /\.moneyFlowThumb/);
  assert.match(css, /\.freeVideoPreview\{max-height:500px/);
  assert.match(browser, /data-mandala-cinematic-canvas/);
  assert.match(browser, /money-frame-motion/);
  for (const file of ["components/mandala-free-video-studio.tsx","lib/mandala/cinematic-money-video.ts"]) {
    const diagnostics=ts.transpileModule(read(file),{
      fileName:file,reportDiagnostics:true,
      compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX},
    }).diagnostics||[];
    assert.equal(diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,file);
  }
  assert.doesNotMatch(studio+renderer, /\bfetch\s*\(|XMLHttpRequest|FormData|localStorage|sessionStorage|sendBeacon|supabase|kling\.ai|higgsfield|heygen/i);
});


test("existing 12 money scenes retain tap-triggered animated thumbnails", () => {
  const studio=read("components/mandala-free-video-studio.tsx");
  const browser=read("scripts/verify-holistic-mandala-browser.mjs");
  assert.match(studio,/data-mandala-scene-preview=\{scene\}/);
  assert.match(studio,/data-scene-playing=\{playing&&visible\?"true":"false"\}/);
  assert.match(studio,/IntersectionObserver/);
  assert.match(studio,/window\.requestAnimationFrame\(draw\)/);
  assert.match(studio,/playing=\{moneyScene===money\.id&&previewPlaying&&!recording\}/);
  assert.match(studio,/setPreviewPlaying\(true\)/);
  assert.match(studio,/CinematicSceneThumbnail scene=\{money\.id\}/);
  assert.match(studio,/data-real-mp4=\{film\.src\}/);
  assert.match(browser,/actual H\.264 video must advance in time/);
  assert.match(browser,/actual H\.264 video must advance in time/);
});

test("background-only reusable clip preserved from live without photo or payment", () => {
  const studio=read("components/mandala-free-video-studio.tsx");
  const browser=read("scripts/verify-holistic-mandala-browser.mjs");
  assert.match(studio,/const BACKGROUND_CLIP="local-money-background-only"/);
  assert.match(studio,/url===BACKGROUND_CLIP\?Promise\.resolve\(null\):loadLocalImage\(url\)/);
  assert.match(studio,/const \[backgroundOnly,setBackgroundOnly\]=useState\(false\)/);
  assert.match(studio,/theme==="money" && backgroundOnly \? BACKGROUND_CLIP/);
  assert.match(studio,/data-mandala-output-mode/);
  assert.match(studio,/setBackgroundOnly\(true\)/);
  assert.match(studio,/backgroundOnly\?"money-background":"personal-mandala"/);
  assert.match(studio,/paintCinematicMoneyFrame\(ctx, art, moneyScene, adjustedTime, aspect, title\)/);
  assert.match(studio,/if \(!art\) return/);
  assert.match(browser,/holistic-house-money-background/);
  for(const label of ['"Animated background only"','"Только видеофон"','"Solo fondo animado"'])
    assert.ok(studio.includes(label),label);
});
