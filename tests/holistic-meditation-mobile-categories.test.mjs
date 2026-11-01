import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const ui = read("components/holistic-support-mobile.tsx");
const css = read("components/holistic-support-mobile.module.css");
const manifest = read("data/academy/holistic-support-meditations.ts");
const mobilePage = read("app/[locale]/holistic-support/mobile/page.tsx");

test("six original meditation directions share one mobile player across EN/RU/ES", () => {
  const chooser = ui.indexOf("data-support-meditation-category-switcher");
  const player = ui.indexOf('id="support-meditation-player"');
  const thumbnails = ui.indexOf('id="support-meditation-gallery"');
  assert.ok(chooser > 0 && player > chooser && thumbnails > player);
  assert.match(ui,/meditationCategoryOptions\.map/);
  assert.match(ui,/meditationCategory === id/);
  assert.match(ui,/aria-controls="meditation-category-options"/);
  assert.match(ui,/data-support-meditation-categories-next/);
  for (const id of ["energy","money","relationships","meaning","health","all"]) {
    assert.match(ui,new RegExp('id: "'+id+'"'),id+" category");
    assert.ok(css.includes('.meditationCategoryCard[data-category="'+id+'"]'));
  }
  for (const label of ["Энергия","Деньги","Любовь","Смыслы","Здоровье","Все",
    "Energy","Money","Love","Meaning","Wellbeing","All",
    "Energía","Dinero","Amor","Sentido","Bienestar","Todas"]) {
    assert.ok(ui.includes(label),"missing label "+label);
  }
  assert.match(ui,/meditationCategory === "meaning" \? filtered\.filter\(video => video\.program === "sun"\)/);
  assert.match(ui,/meditationCategoryRelated: "Близкие оригинальные практики Солнца/);
  assert.match(ui,/data-support-meditation-category-related role="status"/);
  const start = ui.indexOf("const chooseMeditationCategory = (value: MeditationCategory) => {");
  const end = ui.indexOf("const scrollMeditationCategories = ", start);
  assert.ok(start > 0 && end > start, "real meditation-category handler is present");
  const handler = ui.slice(start,end);
  assert.match(handler,/setTheme\("all"\); setProgram\("all"\); setMaster\("all"\); setSelectedId\(null\); setPlaying\(false\)/,
    "category switch resets playback and source filters");
  assert.doesNotMatch(handler,/setGoalSelection\(null\)/,
    "switching original videos must retain the accepted goal, currency, amounts and format choices");
  assert.equal((ui.match(/<iframe\b/g)||[]).length,1,"only the canonical video player");
  assert.match(ui,/youtube-nocookie\.com\/embed/);
});
test("full source-backed catalogue follows four featured posters without a second player", () => {
  const featured = ui.indexOf("data-support-video={video.id}");
  const feed = ui.indexOf("data-support-meditation-feed aria-labelledby=",featured);
  const original = ui.indexOf("data-support-video-source",feed);
  assert.ok(featured > 0 && feed > featured && original > feed);
  assert.match(ui,/const catalogVideos = useMemo/);
  assert.match(ui,/const relevantVideos = choice === "pump" && program !== "all" \? catalogVideos : catalogVideos\.slice\(0, 4\)/);
  assert.match(ui,/const selected = catalogVideos\.find\(video => video\.id === selectedId\) \?\? catalogVideos\[0\]/);
  assert.match(ui,/catalogVideos\.map\(video => <li key=\{video\.id\}>/);
  assert.match(ui,/data-support-meditation-feed-item=\{video\.id\}/);
  assert.match(ui,/video\.sourceLanguage === "ru" \? t\.feedAudioRu : t\.feedAudioEn/);
  assert.match(ui,/video\.description \|\| t\.feedFallback/);
  assert.match(ui,/pickVideo\(video\.id\); scrollToSupport\("support-meditation-player"\)/);
  assert.match(ui,/data-selected-video=\{selected\?\.id \?\? ""\}/);
  assert.match(ui,/data-support-fullscreen-selected/);
  assert.match(ui,/encodeURIComponent\(selected\.id\)/);
  assert.match(ui,/meditations\?video=/);
  assert.match(css,/\.meditationCategoryRail \{[^}]*overflow-x: auto/);
  assert.match(css,/scroll-snap-type: x mandatory/);
  assert.match(css,/\.videoFeedItem \{[^}]*grid-template-columns:/);
  assert.match(css,/\.videoFeedList \{[^}]*display: grid/);
  assert.match(css,/-webkit-line-clamp: 3/);
  assert.match(ui,/data-support-mystery-courses/);
  assert.match(ui,/TaoistTalismanCatalog/);
  assert.match(ui,/HolisticSupportInlineGuide/);
});
test("all descriptions and source IDs remain editorial/verified; no fabricated clips", () => {
  assert.match(manifest,/const originalRuDescriptions = \[/);
  assert.match(manifest,/description: originalRuDescriptions\[index\]/);
  assert.match(manifest,/description: englishSun\.description/);
  assert.match(mobilePage,/const russianMeditationDescriptions: Record<string, string>/);
  assert.match(mobilePage,/const spanishMeditationDescriptions: Record<string, string>/);
  assert.match(mobilePage,/description: locale === "ru" \? russianMeditationDescriptions\[video\.key\]/);
  assert.match(mobilePage,/locale === "es" \? spanishMeditationDescriptions\[video\.key\] : video\.description/);
  assert.doesNotMatch(ui,/hardcodedYoutubeId|fakePlaylist|navigator\.sendBeacon/);
  const parsed=ts.transpileModule(ui,{fileName:"holistic-support-mobile.tsx",reportDiagnostics:true,
    compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
  assert.deepEqual((parsed.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error)
    .map(x=>ts.flattenDiagnosticMessageText(x.messageText," ")),[]);
});
