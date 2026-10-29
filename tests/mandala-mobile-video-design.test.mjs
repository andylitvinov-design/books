import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../"+path, import.meta.url),"utf8");

test("approved mobile video design is the one canonical Mandala editor with six real-footage themes", () => {
  const studio=read("components/mandala-free-video-studio.tsx");
  const parent=read("components/mandala-meditation-client.tsx");
  const ui=read("components/mandala-video-mobile.module.css");
  for(const theme of ["money","relationships","energy","life","health","goals"]){
    assert.match(studio,new RegExp('"'+theme+'"'));
  }
  assert.match(studio,/const themeChoices: VideoTheme\[\]/);
  assert.match(studio,/data-video-theme=\{item\}/);
  // Preserve features concurrently added to production.
  assert.match(studio,/data-video-wish/);
  assert.match(studio,/data-video-music-preview/);
  assert.match(studio,/data-video-music-volume/);
  assert.match(studio,/data-mandala-master-mp4/);
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
  assert.match(ui,/\.heroQuickFilters\{/);
  assert.match(studio,/data-video-mode-switch/);
  assert.match(studio,/data-video-mode=\{mode\}/);
  assert.match(studio,/data-video-photo-enabled/);
  assert.match(studio,/data-video-hero-aspect/);
  assert.match(studio,/data-video-advanced-filters/);
  assert.match(studio,/data-hero-promo=/);
  assert.match(studio,/support-reference-avatar\.webp/);
  assert.match(ui,/\.quickStart \.categoryRail\{display:grid/);
  assert.match(ui,/\.heroPromo\{position:absolute/);
  assert.match(ui,/money-films-v1\/golden-rain\.jpg/);
  assert.match(ui,/mandala-gold-reference\.webp/);
  assert.match(ui,/\.toolCompact\{display:none\}/);
  assert.match(ui,/\.referencePortrait\{display:block!important/);
  assert.match(ui,/@media\(max-width:430px\)/);
  assert.match(ui,/\.modePicker\{display:grid/);
  assert.match(ui,/@media\(max-width:380px\)/);
});

test("talisman-style video catalog changes real theme, scene, motion and duration state in all locales", () => {
  const studio=read("components/mandala-free-video-studio.tsx");
  const css=read("components/mandala-video-mobile.module.css");
  assert.match(studio,/data-video-catalog/);
  assert.match(studio,/data-video-category-rail/);
  assert.match(studio,/data-video-category=\{item\}/);
  assert.match(studio,/const videoCategories = \["energy","money","relationships","goals","life","health"\]/);
  assert.match(studio,/setTheme\(next\)/);
  assert.match(studio,/getThemedRealFilm\(theme,other\.id\)/);
  assert.match(studio,/data-video-health-disclaimer/);
  assert.match(studio,/data-video-catalog-filters/);
  assert.match(studio,/data-video-style/);
  const styleStart=studio.indexOf("<select data-video-style");
  const styleEnd=studio.indexOf("</select>",styleStart);
  assert.ok(styleStart>=0 && styleEnd>styleStart,"the existing visual style selector must be present");
  assert.match(studio.slice(styleStart,styleEnd),/setShowAllMoney\(true\)/,
    "choosing a hidden fifth-or-later MP4 or legacy preset reveals its selected thumbnail");
  assert.match(studio,/data-video-motion/);
  assert.match(studio,/data-video-length/);
  assert.match(studio,/setSpeed\(event.currentTarget.value as Speed\)/);
  assert.match(studio,/setDuration\(Number\(event.currentTarget.value\)/);
  assert.match(studio,/data-video-theme-active=\{videoCategory\}/);
  assert.match(studio,/data-preview-playing=\{previewPlaying/);
  assert.match(studio,/data-video-hero-create/);
  assert.match(studio,/href="#video-templates"/);
  for(const value of ["Video mandala","Vídeo mandala","Видео-мандала","Wellbeing","Bienestar","Здоровье"])
    assert.ok(studio.includes(value),value);
  assert.match(css,/\.catalogShell\{/);
  assert.match(css,/\.categoryRail\{/);
  assert.match(css,/\.catalogFilters\{/);
  assert.match(css,/\.catalogShell \.heroMain\{/);
  assert.match(css,/@media\(max-width:390px\)/);
  assert.doesNotMatch(studio,/\bfetch\s*\(|FormData|localStorage|sessionStorage/i);
});

test("money, energy, relationships and goals have real local frame engines, not fake poster links", async () => {
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
  assert.equal((scenes.match(/ id: "/g)||[]).length,16,"12 original + 4 new licensed money scenes");
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
  assert.match(studio,/const source = backgroundOnly \? BACKGROUND_CLIP : photoUrl \|\| frameUrl \|\| BACKGROUND_CLIP/);
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
  // The current slider validates the number once before React state updaters.
  // Keep that value in both the visual check-in and separately touched inputs;
  // do not read event.currentTarget asynchronously inside a state updater.
  assert.ok(studio.includes("const value=Number(event.currentTarget.value)"));
  assert.ok(studio.includes("setTouchedScores(prev=>({...prev,[key]:value}))"));
  assert.ok(studio.includes("setScores(prev=>({...prev,[key]:value}))"));
  assert.match(studio,/selectCategory\(lowestTheme\)/);
  for(const view of ["tests","meditation","consultation","talisman","healing","pump","masters"]) {
    assert.ok(studio.includes("/holistic-support/mobile?view="+view), "new design category: "+view);
  }
  assert.doesNotMatch(studio,/href=\{"\/"\+locale\+"\/(?:tests|talismans|masters|academy)"\}/);
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


test("preview-first mobile flow preserves local rendering and the user's photo preference", () => {
  const studio=read("components/mandala-free-video-studio.tsx");
  const css=read("components/mandala-video-mobile.module.css");
  const browser=read("scripts/verify-holistic-mandala-browser.mjs");
  assert.match(studio,/data-video-quick-start/);
  assert.match(studio,/data-video-mode-switch/);
  assert.match(studio,/data-video-photo-enabled/);
  assert.match(studio,/setBackgroundOnly\(!enabled\)/);
  assert.match(studio,/data-video-hero-filters/);
  assert.match(studio,/data-video-hero-aspect/);
  assert.match(studio,/data-video-audio-section/);
  assert.match(studio,/data-video-hypnosis-section/);
  assert.match(studio,/studioMode==="therapy"/);
  assert.match(studio,/data-hero-promo=\{!photoUrl&&!previewPlaying&&!recording/);
  assert.match(css,/\.hero\[data-hero-promo="true"\] \.heroCanvas\{opacity:0\}/);
  assert.match(css,/\.heroPromo::after/);
  assert.match(browser,/data-video-mode-switch/);
  assert.match(browser,/data-hero-promo/);
  assert.doesNotMatch(studio,/data-video-theme-toggle|videoStyles\.backgroundChoices/);
});

test("mandala header settings actual JSX has an accessible name in all three locales", async () => {
  const source = read("components/holistic-support-mandala-dock.tsx");
  for (const [locale, expected] of [["en", "Settings"], ["ru", "Настройки"], ["es", "Ajustes"]]) {
    assertMandalaHeaderName(await renderMandalaDock(source, locale), expected);
  }
});

test("mandala header settings oracle rejects missing-label regression", async () => {
  const source = read("components/holistic-support-mandala-dock.tsx");
  assert.equal((source.slice(source.indexOf("<header"), source.indexOf("</header>")).match(/aria-label=\{t.settings\}/g) || []).length, 1);
  const mutant = source.replace(' aria-label={t.settings}', '');
  for (const [locale, expected] of [["en", "Settings"], ["ru", "Настройки"], ["es", "Ajustes"]]) {
    const tree = await renderMandalaDock(mutant, locale);
    assert.throws(() => assertMandalaHeaderName(tree, expected), /localized accessible name/);
  }
});


test("mobile composer uses the approved mode → themes → optional photo → preview → templates → audio → affirmations hierarchy", () => {
  const studio=read("components/mandala-free-video-studio.tsx");
  const css=read("components/mandala-video-mobile.module.css");
  const locations=[
    "data-video-mode-switch","data-video-category-rail","data-video-photo-enabled",
    "data-video-hero-filters","id=\"video-templates\"","data-video-audio-section",
    "data-video-hypnosis-section","data-video-extra-settings",
  ].map(marker=>studio.indexOf(marker));
  assert.ok(locations.every(pos=>pos>0));
  for(let i=1;i<locations.length;i++)assert.ok(locations[i]>locations[i-1],"out of order: "+i);
  for(const title of ["Видео-подкачка","Видео-терапия","Добавить фото себя / цели",
    "Гипноз и аффирмации","Video boost","Video therapy","Videoterapia"]){
    assert.ok(studio.includes(title),title);
  }
  assert.match(studio,/const \[backgroundOnly,setBackgroundOnly\]=useState\(true\)/);
  assert.doesNotMatch(studio,/className=\{videoStyles\.backgroundChoices\}/);
  assert.match(css,/@media\(max-width:355px\)/);
  assert.match(css,/\.photoToggle input\{/);
});
