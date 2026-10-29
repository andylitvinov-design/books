import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../"+path, import.meta.url),"utf8");

// Exercise the real JSX settings button with React server rendering, so
// removing aria-label makes the oracle fail in all three language variants.
// Next Link / lucide / CSS are visual-only stubs; the component and hook are real.
async function renderMandalaDock(source, locale) {
  const ts=await import("typescript");
  const React=await import("react");
  const { renderToStaticMarkup }=await import("react-dom/server");
  const { runInNewContext }=await import("node:vm");
  const jsx=await import("react/jsx-runtime");
  const compiled=ts.transpileModule(source,{fileName:"holistic-support-mandala-dock.tsx",
    compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,
      target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={};
  const LinkStub=({children,href,prefetch,...props})=>React.createElement("a",{href,...props},children);
  const IconStub=({size,...props})=>React.createElement("svg",{"aria-hidden":props["aria-hidden"],width:size,height:size});
  const icons=new Proxy({},{get:()=>IconStub});
  const requireStub=id=>{
    if(id==="react")return React;
    if(id==="react/jsx-runtime")return jsx;
    if(id==="next/link")return {__esModule:true,default:LinkStub};
    if(id==="lucide-react")return icons;
    if(id.endsWith(".module.css"))return {__esModule:true,default:{}};
    throw new Error("Unexpected dependency in dock: "+id);
  };
  runInNewContext(compiled,{exports,require:requireStub},{timeout:2000});
  assert.equal(typeof exports.HolisticSupportMandalaDock,"function");
  return renderToStaticMarkup(React.createElement(exports.HolisticSupportMandalaDock,{locale}));
}
function assertMandalaHeaderName(html,expected) {
  const header=html.match(/<header\b[^>]*>[\s\S]*?<\/header>/)?.[0];
  assert.ok(header,"real mandala header must be rendered");
  const button=header.match(/<button\b[^>]*\baria-label="([^"]+)"/);
  assert.equal(button?.[1],expected,"localized accessible name");
}

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
  assert.match(ui,/\.previewChoices\{/);
  assert.doesNotMatch(studio,/data-video-mode-switch/);
  assert.match(studio,/data-video-therapy-toggle/);
  assert.match(studio,/aria-pressed=\{studioMode==="therapy"\}/);
  assert.match(studio,/data-video-photo-enabled/);
  assert.match(studio,/data-video-advanced-aspect/);
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
  assert.match(ui,/\.supportTools>\.videoMandalaChoice\{/);
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
  // Selection now uses the filtered catalog's stable track IDs, not the
  // removed fixed five-preset `choice` loop. Preserve export contract below.
  assert.match(studio,/visibleAudio\.map\(\(track,index\)=>/);
  assert.match(studio,/data-video-music=\{track\.id\}/);
  assert.match(studio,/chooseMusic\(track\.id as AmbientMusic\)/);
  assert.match(studio,/recommendMandalaAudio\(\{/);
  assert.match(studio,/data-video-music="none"/);
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
  assert.match(studio,/backgroundOnly \|\| \(Boolean\(photoUrl\) && photoConsent\)/);
  assert.match(studio,/if\(photoUrl&&!backgroundOnly&&!photoConsent\)/);
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
  assert.match(studio,/data-video-therapy-toggle/);
  assert.match(studio,/data-video-photo-enabled/);
  assert.match(studio,/setBackgroundOnly\(!enabled\)/);
  assert.match(studio,/data-video-preview-choices/);
   assert.match(studio,/data-video-affirmations-feature/);
   assert.match(studio,/data-video-therapy-start/);
   assert.match(studio,/data-video-hero-actions/);
   assert.doesNotMatch(studio,/data-video-hero-filters/);
  assert.match(studio,/data-video-advanced-aspect/);
  assert.match(studio,/data-video-audio-section/);
  assert.match(studio,/data-video-hypnosis-section/);
  assert.match(studio,/studioMode==="therapy"/);
  // A selected four-shot cinematic timeline must display its actual first frame,
  // never the single-shot promotional poster above the shared preview.
  assert.match(studio,/data-hero-promo=\{!cinematicPlan&&!photoUrl&&!previewPlaying&&!recording/);
  assert.match(studio,/const activeFilm = cinematicPlan \? null : activeMoneyFilm \|\| activeThemedFilm/);
  assert.match(css,/\.hero\[data-hero-promo="true"\] \.heroCanvas\{opacity:0\}/);
  assert.match(css,/\.heroPromo::after/);
  assert.match(browser,/data-video-therapy-toggle/);
  assert.match(browser,/data-hero-promo/);
  assert.doesNotMatch(studio,/data-video-theme-toggle|videoStyles\.backgroundChoices/);
});

test("all three video editor deep links cancel native hash navigation before expanding details", () => {
  const studio=read("components/mandala-free-video-studio.tsx");
  for(const [tab,target] of [["design","video-templates"],["audio","video-audio"],["affirmations","video-hypnosis"]]){
    assert.ok(studio.includes(
      '<a href="#'+target+'" data-video-editor-tab="'+tab+'"\n'+
      '          onClick={event=>{event.preventDefault();openQuickDetailed("'+target+'");}}>'
    ),"native hash navigation must not race React disclosure: "+tab);
  }
  // A router or WebKit layout transition may reset a fragment after the
  // first click, so the controlled panel repairs the hash on the next frame.
  assert.match(studio,/window\.history\.pushState\(window\.history\.state,"",path\+desired\)/);
  assert.match(studio,/window\.history\.replaceState\(window\.history\.state,"",path\+desired\)/);
  assert.match(studio,/token!==quickNavTokenRef\.current/);
  assert.match(studio,/setQuickDetailedOpen\(true\)/);
  assert.match(studio,/requestAnimationFrame\(\(\)=>window\.requestAnimationFrame\(jump\)\)/);
  assert.match(studio,/data-video-current-tab=\{quickNavTarget\}/);
  assert.match(studio,/behavior:"instant" as ScrollBehavior/);
  assert.doesNotMatch(studio,/window\.setTimeout\(jump,/);
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


test("one contextual therapy action keeps the single secure renderer and a visible three-column Support header", () => {
  const studio=read("components/mandala-free-video-studio.tsx");
  const css=read("components/mandala-video-mobile.module.css");
  const locations=[
    "data-video-daily-picks","data-video-support-layout","data-video-therapy-toggle",
    "data-video-category-rail","data-video-preview-choices",
    'id="video-hero"','id="guided-video-series"',"data-video-editor-nav",
    'id="video-templates"',"data-video-audio-section","data-video-hypnosis-section",
  ].map(marker=>studio.indexOf(marker));
  assert.ok(locations.every(pos=>pos>0),"every video landmark must exist");
  for(let i=1;i<locations.length;i++)assert.ok(locations[i]>locations[i-1],"out of order: "+i);
  for(const title of ["Видео-терапия","Своё фото / цель",
    "Гипноаффирмации","Video therapy","Videoterapia","Picks of the Day"]){
    assert.ok(studio.includes(title),title);
  }
  assert.match(studio,/const \[backgroundOnly,setBackgroundOnly\]=useState\(true\)/);
  assert.doesNotMatch(studio,/className=\{videoStyles\.backgroundChoices\}/);
  assert.match(studio,/data-video-therapy-preview/);
  assert.match(css,/@media\(max-width:355px\)/);
  assert.match(css,/\.previewChoiceLabel input\{/);
});

test("affirmation preview CTA starts the existing hero and local jump links reach design, audio, affirmations", () => {
  const studio=read("components/mandala-free-video-studio.tsx");
  const css=read("components/mandala-video-mobile.module.css");
  const browser=read("scripts/verify-holistic-mandala-browser.mjs");
  assert.match(studio,/data-video-editor-nav aria-label=\{layout\.editorNavLabel\}/);
  for(const [tab,id] of [["design","video-templates"],["audio","video-audio"],["affirmations","video-hypnosis"]]){
    assert.ok(studio.includes('href="#'+id+'" data-video-editor-tab="'+tab+'"'),tab+" must be a real same-page link");
    assert.ok(studio.includes('id="'+id+'"'),id+" must exist");
  }
  const compact=read("components/mandala-hypno-compact.tsx");
  assert.match(compact,/data-video-affirmation-preview disabled=\{disabled\}/);
  assert.match(studio,/onPreview=\{openAffirmationPreview\}/);
  const previewHandler=studio.slice(studio.indexOf("const openAffirmationPreview ="),studio.indexOf("return (\n    <section className={videoStyles.studio}",studio.indexOf("const openAffirmationPreview =")));
  assert.match(previewHandler,/setPreviewPlaying\(true\)/);
  assert.match(previewHandler,/document\.getElementById\("video-hero"\)\?\.scrollIntoView/);
  assert.doesNotMatch(previewHandler,/createVideo\(|setResult\(|navigator\.share/);
  for(const value of ["Просмотреть видео","Preview video","Ver vídeo","Дизайн","Afirmaciones","Гипноаффирмации"])
    assert.ok(studio.includes(value),value);
  assert.match(css,/\.editorJumpNav\{display:grid/);
  assert.match(css,/\.affirmationPreviewAction\{display:flex/);
  assert.match(css,/\.audioSection,\.hypnosisSection\{scroll-margin-top:84px\}/);
  assert.match(browser,/data-video-affirmation-preview/);
  assert.match(browser,/data-video-editor-tab/);
});

test("clean smaller video player binds two independent opt-ins and opens the existing eight-session planner",()=>{
  const studio=read("components/mandala-free-video-studio.tsx");
  const css=read("components/mandala-video-mobile.module.css");
  const switches=studio.slice(studio.indexOf('data-video-preview-choices'),studio.indexOf('id="video-hero"'));
  const hero=studio.slice(studio.indexOf('id="video-hero"'),studio.indexOf('data-video-editor-nav'));
  assert.match(switches,/data-video-photo-enabled/);
  assert.match(switches,/data-video-affirmations-feature/);
  assert.match(switches,/checked=\{affirmations\.enabled\}/);
  assert.match(switches,/setAffirmations\(previous=>/);
  assert.doesNotMatch(hero,/<select|<p[ >]/,"film is visual-only with no selectors or copy");
  assert.match(hero,/data-mandala-cinematic-canvas/);
  assert.match(hero,/data-video-preview-toggle/);
  assert.match(hero,/className=\{videoStyles\.heroPlay\}/);
  assert.match(studio,/useState<CaptionMode>\("none"\)/,"no default text burnt into the film");
  assert.match(studio,/data-video-advanced-aspect/);
  assert.match(studio,/data-video-therapy-banner/);
  assert.match(studio,/setStudioMode\("therapy"\);setTherapyJumpRequested\(true\)/);
  for(const phrase of ["Своё фото / цель","Аффирмации","Создать персональную программу видеотерапии",
    "My photo / goal","Affirmations","Mi foto / objetivo","Afirmaciones"])assert.ok(studio.includes(phrase),phrase);
  assert.match(css,/\.catalogShell \.heroPlay\{/);
  assert.match(css,/\.previewChoices\{display:grid/);
  assert.match(css,/\.therapyBanner\{display:flex/);
});

test("compact opt-ins and the contextual therapy action have real 44px iPhone targets", () => {
  const studio=read("components/mandala-free-video-studio.tsx");
  const css=read("components/mandala-video-mobile.module.css");
  const browser=read("scripts/verify-holistic-mandala-browser.mjs");
  for(const marker of ["data-video-photo-enabled","data-video-photo-picker",
      "data-video-affirmations-feature","data-video-preview-choices",
      "data-video-advanced-filters","data-video-therapy-toggle"]) {
    assert.ok(studio.includes(marker),marker+" must remain in the canonical editor");
  }
  assert.match(css,/\.previewChoiceLabel\{[^}]*min-height:44px/);
  assert.match(css,/\.previewChoiceLink\{[^}]*min-height:44px/);
  assert.match(css,/@media\(max-width:430px\)\{[\s\S]*?\.previewChoiceLabel\{[^}]*min-height:44px/);
  assert.match(browser,/previewTouchTargets\.every\(rect=>rect\.height>=44&&rect\.width>=44\)/);
  assert.ok(studio.indexOf("data-video-category-rail") < studio.indexOf("data-video-preview-choices"));
  assert.ok(studio.indexOf("data-video-preview-choices") < studio.indexOf("data-video-mandala-hero"));
  assert.ok(studio.indexOf('id="video-templates"') < studio.indexOf("data-video-advanced-filters"));
});


test("LIVE regression: canonical video editor has one Support dock, not duplicate bottom menus", () => {
  const route=read("app/[locale]/holistic-support/mandala/page.tsx");
  const studio=read("components/mandala-free-video-studio.tsx");
  const dock=read("components/holistic-support-mandala-dock.tsx");
  const browser=read("scripts/verify-holistic-mandala-browser.mjs");
  assert.match(route, /<HolisticSupportMandalaDock locale=\{locale\} \/>/);
  assert.match(route, /<MandalaMeditationClient locale=\{locale\}/);
  assert.match(studio, /data-video-mandala-hero/);
  assert.match(studio, /data-video-support-layout/);
  assert.match(studio, /id="personal-video-result"/);
  assert.match(studio, /data-mandala-video-download/);
  assert.match(studio, /data-video-photo-consent/);
  assert.match(dock, /data-mandala-support-bottom-nav/);
  assert.doesNotMatch(studio, /<nav className=\{videoStyles\.bottomNav\}/);
  assert.match(browser, /exactly one Support dock/);
});

test("iPhone release layout has slim diagnostic bar, Picks, visible Support header and active-only green therapy", () => {
  const route=read("app/[locale]/holistic-support/mandala/page.tsx");
  const studio=read("components/mandala-free-video-studio.tsx");
  const css=read("components/mandala-video-mobile.module.css");
  const pageCss=read("components/mandala-meditation.module.css");
  const browser=read("scripts/verify-holistic-mandala-browser.mjs");
  assert.match(route,/data-video-diagnostic-banner/);
  assert.match(pageCss,/\.slimDiagnostic\{[^}]*min-height:48px/);
  assert.match(studio,/data-video-daily-picks/);
  for (const destination of ["/client/tests?focus=","/holistic-support/mobile?view=meditation",
    "/services/free-situation-review","/courses"]) assert.ok(studio.includes(destination),destination);
  assert.ok(studio.indexOf("data-video-daily-picks") < studio.indexOf("data-video-support-layout"));
  assert.ok(studio.indexOf("data-video-support-layout") < studio.indexOf("data-video-category-rail"));
  assert.ok(studio.indexOf("data-video-category-rail") < studio.indexOf("data-video-preview-choices"));
  assert.ok(studio.indexOf("data-video-preview-choices") < studio.indexOf("data-video-mandala-hero"));
  assert.equal((studio.match(/data-video-support-layout/g)||[]).length,1);
  assert.equal((studio.match(/data-video-therapy-toggle/g)||[]).length,1);
  assert.doesNotMatch(studio,/data-video-mode-switch|data-video-support-more/);
  assert.match(css,/\.supportTools>\.videoMandalaChoice\[aria-pressed="true"\]\{background:linear-gradient/);
  assert.match(browser,/inactiveTherapyBackground/);
  assert.match(browser,/activeTherapyBackground/);
});

