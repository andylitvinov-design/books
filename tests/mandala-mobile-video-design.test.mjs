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
  assert.match(ui,/\.heroTabs\{display:grid/);
  // The extra filter row is folded into the Theme tab, as in the base
  // Support mock. The default gold poster is artwork only until preview.
  assert.match(studio,/data-video-theme-toggle/);
  assert.match(studio,/hidden=\{!themeMenuOpen\}/);
  assert.match(studio,/data-hero-promo=/);
  assert.match(studio,/support-reference-avatar\.webp/);
  assert.match(ui,/\.heroThemes\[hidden\]\{display:none!important\}/);
  assert.match(ui,/\.heroPromo\{position:absolute/);
  assert.match(ui,/money-films-v1\/golden-rain\.jpg/);
  assert.match(ui,/mandala-gold-reference\.webp/);
  assert.match(ui,/\.toolCompact\{display:none\}/);
  assert.match(ui,/\.referencePortrait\{display:block!important/);
  assert.match(ui,/@media\(max-width:430px\)/);
  assert.match(ui,/\.heroThemes\{display:flex/);
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
  assert.match(studio,/href="#video-settings"/);
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
  assert.match(studio,/backgroundOnly \|\| photoConsent/);
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


test("mobile theme is a compact accessible menu, and hero returns to live selected video on preview", () => {
  const studio=read("components/mandala-free-video-studio.tsx");
  const css=read("components/mandala-video-mobile.module.css");
  const browser=read("scripts/verify-holistic-mandala-browser.mjs");
  assert.match(studio,/setThemeMenuOpen\(open=>!open\)/);
  assert.match(studio,/setThemeMenuOpen\(false\)/);
  assert.match(studio,/aria-expanded=\{themeMenuOpen\}/);
  assert.match(studio,/aria-controls="video-hero-themes"/);
  assert.match(studio,/data-hero-promo=\{!photoUrl&&!previewPlaying&&!recording/);
  assert.match(css,/\.hero\[data-hero-promo="true"\] \.heroCanvas\{opacity:0\}/);
  assert.match(css,/\.heroPromo::after/);
  assert.match(browser,/data-video-theme-toggle/);
  assert.match(browser,/data-hero-promo/);
  assert.doesNotMatch(studio,/\bfetch\s*\(|XMLHttpRequest|FormData|sendBeacon/i);
});


// Render the actual TSX with inert JSX records: no browser, React effects or I/O.
async function renderMandalaDock(source, locale) {
  const ts = await import("typescript");
  const input = source.replace(/^import .*;\n/gm, "");
  const { outputText, diagnostics = [] } = ts.transpileModule(input, {
    fileName: "holistic-support-mandala-dock.tsx", reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React, jsxFactory: "h", jsxFragmentFactory: "Fragment" },
  });
  assert.equal(diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  const h = (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity) });
  const exports = {};
  const styles = new Proxy({}, { get: (_, key) => key });
  new Function("exports", "h", "Fragment", "useState", "Link", "styles",
    "ArrowLeft", "BarChart3", "Compass", "Home", "MessageCircle", "Settings2", outputText)(
    exports, h, "fragment", () => [false, () => {}], "a", styles,
    "icon", "icon", "icon", "icon", "icon", "icon");
  return exports.HolisticSupportMandalaDock({ locale });
}

function assertMandalaHeaderName(tree, expected) {
  const header = tree.children.find(node => node?.type === "header");
  assert.ok(header, "actual header exists");
  const button = header.children.find(node => node?.type === "button");
  assert.ok(button, "actual header settings control exists");
  assert.equal(button.props["aria-label"], expected, "header settings has localized accessible name");
  assert.equal(button.props["aria-controls"], "mandala-support-settings");
  assert.equal(button.props["aria-expanded"], false);
  const nav = tree.children.find(node => node?.type === "nav");
  assert.equal(nav.children.length, 5, "current five-item dock preserved");
}

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

test("owner-requested compact photo choice and deeper options keep one functional editor",()=>{
  const studio=read("components/mandala-free-video-studio.tsx");
  const css=read("components/mandala-video-mobile.module.css");
  const browser=read("scripts/verify-holistic-mandala-browser.mjs");
  const photo=studio.indexOf("data-video-photo-include");
  const header=studio.indexOf("className={videoStyles.catalogHeading}");
  const categories=studio.indexOf("data-video-category-rail");
  const hero=studio.indexOf("data-video-mandala-hero");
  const gallery=studio.indexOf('id="video-templates"');
  const filters=studio.indexOf("data-video-catalog-filters");
  assert.ok(header>0 && header<photo && photo<categories && categories<hero && hero<gallery && gallery<filters,
    "photo checkbox → topics → video → scenes → optional filters");
  assert.match(studio,/checked=\{!backgroundOnly\}/);
  assert.match(studio,/\(backgroundOnly \|\| Boolean\(photoUrl\)\)/,
    "checked photo mode must not enable a video without photo");
  assert.match(studio,/onChange=\{event=>setBackgroundOnly\(!event\.currentTarget\.checked\)\}/);
  assert.match(studio,/data-video-photo-link[\s\S]*?onClick=\{onPickPhoto\}/);
  assert.match(studio,/useEffect\(\(\) => \{ setBackgroundOnly\(!photoUrl\); \}, \[photoUrl\]\)/);
  assert.match(studio,/const \[backgroundOnly,setBackgroundOnly\]=useState\(true\)/);
  assert.doesNotMatch(studio,/className=\{videoStyles\.backgroundChoices\}/);
  assert.match(studio,/data-video-advanced-filters/);
  assert.match(css,/\.photoQuickRow\{/);
  assert.match(css,/\.photoInclude\{[^}]*min-height:44px/);
  assert.match(css,/\.photoQuickLink\{[^}]*min-height:44px/);
  assert.match(css,/\.advancedQuickFilters summary\{[^}]*min-height:44px/);
  assert.match(css,/\.advancedQuickFilters\{/);
  for(const phrase of ["Добавить фото себя или цели","Add photo of me or my goal","Añadir foto mía o de mi objetivo"]) {
    assert.ok(studio.includes(phrase),phrase);
  }
  assert.match(browser,/photoOrder\.photo\.bottom<=photoOrder\.topics\.top/);
  assert.match(browser,/photoChoice\.uncheck\(\)/);
});
