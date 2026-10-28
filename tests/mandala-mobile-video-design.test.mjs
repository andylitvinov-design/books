import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../"+path, import.meta.url),"utf8");

test("approved mobile video design is the one canonical Mandala editor with six theme choices", () => {
  const studio=read("components/mandala-free-video-studio.tsx");
  const parent=read("components/mandala-meditation-client.tsx");
  const ui=read("components/mandala-video-mobile.module.css");
  for(const theme of ["money","energy","life","health","relationships","goals"]){
    assert.match(studio,new RegExp('"'+theme+'"'));
  }
  assert.match(studio,/const themeChoices: VideoTheme\[\]/);
  assert.match(studio,/data-video-theme=\{item\}/);
  // Preserve features concurrently added to production.
  assert.match(studio,/data-video-wish/);
  assert.match(studio,/data-video-music-preview/);
  assert.match(studio,/data-video-music-volume/);
  assert.match(studio,/data-mandala-master-mp4/);
  assert.match(studio,/getThemedRealFilm\(theme, otherScene\)/);
  assert.match(studio,/paintRealThemedVideoFrame/);
  assert.match(studio,/data-video-health-disclaimer/);
  assert.match(studio,/data-video-template=/);
  assert.match(studio,/data-video-photo-picker/);
  assert.match(studio,/onPickPhoto/);
  assert.match(parent,/data-mandala-advanced/);
  assert.match(parent,/<MandalaFreeVideoStudio locale=\{locale\}/);
  assert.equal((parent.match(/<MandalaFreeVideoStudio /g)||[]).length,1,"one studio, not a duplicate editor");
  assert.match(parent,/id="mandala-photo"/);
  assert.match(studio,/data-video-support-layout/);
  assert.match(studio,/data-video-mandala-hero/);
  assert.match(studio,/data-video-recommend-focus/);
  assert.match(studio,/data-video-hero-create/);
  assert.match(studio,/data-video-reset-settings/);
  assert.match(studio,/const lowestTheme=checkOrder\.reduce/);
  assert.doesNotMatch(studio,/<nav className=\{videoStyles\.bottomNav\}/);
  assert.match(ui,/\.supportTop\{display:grid/);
  assert.match(ui,/\.hero\{position:relative/);
  assert.match(ui,/\.templateRail\{display:grid/);
  assert.match(ui,/\.templateArt\{/);
  assert.match(ui,/\.download\{/);
  assert.match(ui,/\.heroTabs\{display:grid/);
  assert.match(ui,/\.heroThemes\{display:flex/);
  assert.match(ui,/@media\(max-width:380px\)/);
});

test("money, energy, life, health, relationships and goals have native MP4 and original fallback frames", async () => {
  const ts=await import("typescript");
  const client=read("components/mandala-free-video-studio.tsx");
  const local=read("lib/mandala/holistic-video-themes.ts");
  const cinematic=read("lib/mandala/cinematic-money-video.ts");
  const scenes=read("lib/mandala/money-flow-effects.ts");
  assert.match(client,/paintCinematicMoneyFrame\(ctx, art, moneyScene, adjustedTime, aspect, title\)/);
  assert.match(client,/paintThemedVideoFrame\(ctx, art, theme, otherScene, adjustedTime, title\)/);
  assert.match(client,/CinematicSceneThumbnail/);
  assert.match(client,/ThemedSceneThumbnail/);
  assert.match(client,/data-video-template/);
  assert.match(client,/moneyTemplates/);
  assert.match(local,/export const otherVideoScenes/);
  for(const id of ["sun-flight","green-vortex","light-waterfall","gentle-shield",
    "heart-light","warm-connection","blossom-garden","two-circles",
    "light-path","open-door","guiding-stars","meaning-tree"]) assert.ok(local.includes('"'+id+'"'),id);
  for(const language of ["en","ru","es"]) assert.ok(client.includes(language+': {'));
  assert.match(cinematic,/movingCoins\(ctx,scene,t,w,h,true\)/);
  assert.equal((scenes.match(/ id: "/g)||[]).length,16);
  for(const path of ["components/mandala-free-video-studio.tsx",
    "lib/mandala/holistic-video-themes.ts","lib/mandala/local-video-music.ts"]){
    const diagnostics=ts.transpileModule(read(path),{fileName:path,reportDiagnostics:true,
      compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).diagnostics||[];
    assert.equal(diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,path);
  }
  assert.doesNotMatch(client+local,/\bfetch\s*\(|XMLHttpRequest|FormData|localStorage|sessionStorage|sendBeacon|higgsfield|heygen/i);
});

test("video UI choices affect the actual free MP4/WebM recording and the user sees download/share", () => {
  const studio=read("components/mandala-free-video-studio.tsx");
  const audio=read("lib/mandala/local-video-music.ts");
  assert.match(studio,/const durations = \[10, 20, 30, 60\] as const/);
  assert.match(studio,/formatDimensions\(aspect, quality\)/);
  assert.match(studio,/data-video-aspect=\{format\}/);
  assert.match(studio,/setSpeed\("dynamic"\)/);
  assert.match(studio,/setBrightness\("bright"\)/);
  assert.match(studio,/captionMode==="custom"/);
  assert.match(studio,/data-video-music=\{choice\}/);
  assert.match(audio,/context\.createMediaStreamDestination\(\)/);
  assert.match(studio,/stream\.addTrack\(musicSession\.track\)/);
  assert.match(studio,/new MediaRecorder\(stream,recorderOptions\)/);
  assert.match(studio,/canvas\.captureStream\(framesPerSecond\)/);
  assert.match(studio,/data-mandala-video-download/);
  assert.match(studio,/navigator\.share\(\{files:\[file\]/);
  assert.match(studio,/data-mandala-video-preview/);
  assert.match(studio,/stopJob\(job,true\)/);
  assert.match(studio,/role="status"/);
});

test("client photo consent and privacy are enforced without payment or server photo upload", () => {
  const studio=read("components/mandala-free-video-studio.tsx");
  const audio=read("lib/mandala/local-video-music.ts");
  assert.match(studio,/!photoUrl \|\| photoConsent/);
  assert.match(studio,/setPhotoConsent\(false\)/);
  assert.match(studio,/data-video-photo-consent/);
  assert.match(studio,/disabled=\{!canGenerate\}/);
  assert.match(studio,/const source = activeFilm && backgroundOnly \? BACKGROUND_CLIP : photoUrl \|\| frameUrl/);
  assert.match(studio,/URL\.revokeObjectURL\(result\.url\)/);
  assert.doesNotMatch(studio+audio,/\bfetch\s*\(|XMLHttpRequest|FormData|localStorage|sessionStorage|navigator\.sendBeacon|higgsfield|kling\.ai|heygen|supabase/i);
  assert.match(audio,/Royalty-free ambient sound generated locally/);
});

test("the video mandala hero mirrors Support's 3-part entry, with functional routes and no-upload video", () => {
  const studio=read("components/mandala-free-video-studio.tsx");
  const css=read("components/mandala-video-mobile.module.css");
  const browser=read("scripts/verify-holistic-mandala-browser.mjs");
  for(const lang of ['check:"1. Check in with yourself"','check:"1. Оцени себя сейчас"','check:"1. Evalúa cómo estás"'])
    assert.ok(studio.includes(lang));
  for(const key of ['"energy"','"money"','"relationships"','"goals"'])
    assert.ok(studio.includes(key));
  assert.match(studio,/setScores\(prev=>\(\{\.\.\.prev,\[key\]:Number/);
  assert.match(studio,/selectCategory\(lowestTheme\)/);
  assert.match(studio,/href=\{"\/"\+locale\+"\/talismans"\}/);
  assert.match(studio,/href=\{"\/"\+locale\+"\/masters"\}/);
  assert.match(studio,/href="#video-templates"/);
  assert.match(studio,/data-mandala-money-preview/);
  assert.match(studio,/data-mandala-cinematic-canvas/);
  assert.match(studio,/startFromHero/);
  assert.match(studio,/document\.querySelector\("\[data-video-photo-consent\]"\)\?\.scrollIntoView/);
  assert.match(studio,/onClick=\{createVideo\}/);
  assert.match(studio,/data-mandala-video-download/);
  assert.match(studio,/data-video-theme=\{item\}/);
  assert.match(css,/\.heroCanvas canvas\{display:block/);
  assert.match(css,/\.supportTop\{display:grid/);
  assert.match(css,/@media\(max-width:390px\)/);
  assert.match(browser,/data-video-hero-create/);
});
