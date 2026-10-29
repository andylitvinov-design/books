import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const mobile = read("components/holistic-support-mobile.tsx");
const css = read("components/holistic-support-mobile.module.css");
const source = read("data/academy/holistic-support-meditations.ts");

test("Meditation has Talisman-style categories immediately above the same original player", () => {
  const category = mobile.indexOf("data-support-meditation-category-switcher");
  const hero = mobile.indexOf('id="support-meditation-player" data-support-player');
  const gallery = mobile.indexOf('id="support-meditation-gallery"');
  assert.ok(category > 0 && hero > category && gallery > hero, "categories -> hero -> original four recordings");
  assert.match(mobile, /data-support-meditation-categories-next onClick=\{scrollMeditationCategories\}/);
  assert.match(mobile, /aria-expanded=\{allMeditationCategoriesOpen\}/);
  assert.match(mobile, /aria-pressed=\{meditationCategory === id\}/);
  assert.match(mobile, /onClick=\{\(\) => chooseMeditationCategory\(id\)\}/);
  assert.match(mobile, /role="group" aria-label=\{t\.meditationCategoriesTitle\}/);
  assert.match(mobile, /aria-controls="meditation-category-options"/);
  for (const id of ["energy", "money", "relationships", "meaning", "health", "all"]) {
    assert.match(mobile, new RegExp('id: "' + id + '"'), "has category " + id);
    assert.match(css, new RegExp('meditationCategoryCard\\[data-category="' + id + '"\\]'));
  }
});

test("Categories are localized and meaningful; Meaning never pretends there is a dedicated video", () => {
  for (const label of [
    "Медитации", "Выбери направление", "Все категории", "Энергия", "Деньги",
    "Любовь", "Смыслы", "Здоровье", "Meditations", "Meaning", "Meditaciones", "Sentido",
  ]) assert.ok(mobile.includes(label), label);
  assert.match(mobile, /meditationCategory === "meaning" \? filtered\.filter\(video => video\.program === "sun"\)/);
  assert.match(mobile, /meditationCategoryTopics\[meditationCategory\]/);
  assert.match(mobile, /meditationCategoryOverride \?\? \(/);
  assert.match(mobile, /focus === "money" \? "money"/);
  assert.match(mobile, /setMeditationCategoryOverride\("all"\)/);
  assert.match(mobile, /meditationCategoryRelated: "Близкие оригинальные практики Солнца/);
  assert.match(mobile, /data-support-meditation-category-related role="status"/);
  assert.match(mobile, /setTheme\("all"\); setProgram\("all"\); setMaster\("all"\); setGoalSelection\(null\); setSelectedId\(null\); setPlaying\(false\)/);
  assert.match(source, /verified_legacy_public_embed/);
  assert.doesNotMatch(mobile, /hardcodedYoutubeId|fakePlaylist|new Date\(\)\.toISOString\(\)/);
});

test("Compact 320–430px cards stay readable while retaining original playback, 4 posters and privacy", () => {
  assert.match(css, /\.meditationCategoryRail \{[^}]*overflow-x: auto/);
  assert.match(css, /scroll-snap-type: x mandatory/);
  assert.match(css, /\.meditationCategoryFrame\[data-expanded="true"\] \.meditationCategoryRail/);
  assert.match(css, /\.meditationCategoryCard > span \{[^}]*white-space: nowrap/);
  assert.match(css, /\.meditationCategorySection \.meditationCategoryCard \{ flex-basis: calc\(\(100% - 18px\) \/ 4\)/);
  assert.match(css, /height: 76px; min-height: 0; max-height: 76px/);
  assert.match(css, /@media\(max-width:350px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(mobile, /youtube-nocookie\.com\/embed/);
  assert.match(mobile, /onClick=\{startVideo\}/);
  assert.match(mobile, /const relevantVideos = choice === "pump" && program !== "all" \? catalogVideos : catalogVideos\.slice\(0, 4\)/);
  assert.doesNotMatch(mobile, /<audio|autoplay=\{true\}|localStorage|navigator\.sendBeacon|fetch\(/);
  const parsed = ts.transpileModule(mobile, {
    fileName: "holistic-support-mobile.tsx", reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  assert.deepEqual((parsed.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error)
    .map(d => ts.flattenDiagnosticMessageText(d.messageText, " ")), []);
});

test("Full feed follows the four featured cards, uses one filtered catalogue and never auto-plays", () => {
  for (const label of ["Популярные медитации", "Popular meditations", "Meditaciones populares"]) {
    assert.ok(mobile.includes(label), "featured shelf label: " + label);
  }
  const gallery = mobile.indexOf('id="support-meditation-gallery"');
  const featured = mobile.indexOf('data-support-video={video.id}', gallery);
  const feed = mobile.indexOf('data-support-meditation-feed aria-labelledby=', featured);
  const rows = mobile.indexOf('data-support-meditation-feed-item={video.id}', feed);
  const sourceLink = mobile.indexOf('data-support-video-source', feed);
  assert.ok(gallery > 0 && featured > gallery && feed > featured && rows > feed && sourceLink > rows,
    "featured four -> full vertical catalogue -> original YouTube source link");
  assert.match(mobile, /const catalogVideos = useMemo\(\(\) => \{/);
  assert.match(mobile, /const relevantVideos = choice === "pump" && program !== "all" \? catalogVideos : catalogVideos\.slice\(0, 4\)/);
  assert.match(mobile, /const selected = catalogVideos\.find\(video => video\.id === selectedId\)/);
  assert.match(mobile, /catalogVideos\.map\(video => <li key=\{video\.id\}>/);
  assert.match(mobile, /aria-pressed=\{selected\?\.id === video\.id\}/);
  assert.match(mobile, /pickVideo\(video\.id\); scrollToSupport\("support-meditation-player"\)/);
  assert.match(mobile, /data-selected-video=\{selected\?\.id \?\? ""\}/);
  assert.match(mobile, /video\.description \|\| t\.feedFallback/);
  assert.match(mobile, /unoptimized loading="lazy"/);
  assert.match(css, /\.videoFeedItem \{[^}]*grid-template-columns:/);
  assert.match(css, /\.videoFeedList \{[^}]*display: grid/);
  assert.match(css, /\.videoFeedItem\[aria-pressed="true"\]/);
  assert.match(css, /\.videoFeedDescription \{[^}]*-webkit-line-clamp: 3/);
  for (const label of ["Все подходящие медитации", "Выбрать", "All matching meditations",
    "Select", "Todas las meditaciones relacionadas", "Elegir"]) assert.ok(mobile.includes(label), label);
});

test("Feed summaries come from existing source titles, with Spanish copy and original language noted", () => {
  const route = read("app/[locale]/holistic-support/mobile/page.tsx");
  assert.match(source, /const originalRuDescriptions = \[/);
  assert.match(source, /description: originalRuDescriptions\[index\]/);
  assert.match(source, /description: englishSun\.description/);
  assert.match(route, /const russianMeditationDescriptions: Record<string, string>/);
  assert.match(route, /description: locale === "ru" \? russianMeditationDescriptions\[video\.key\]/);
  assert.match(route, /locale === "es" \? spanishMeditationDescriptions\[video\.key\] : video\.description/);
  assert.match(mobile, /video\.sourceLanguage === "ru" \? t\.feedAudioRu : t\.feedAudioEn/);
  assert.doesNotMatch(mobile, /localStorage|sessionStorage|navigator\.sendBeacon|autoplay=\{true\}/);
});

test("category labels retain visible text in the accessible name in EN/RU/ES", () => {
  assert.match(mobile, /aria-label=\{t\.meditationCategoryShortNames\[id\] === t\.meditationCategoryNames\[id\]/);
  assert.match(mobile, /t\.meditationCategoryShortNames\[id\] \+ " — " \+ t\.meditationCategoryNames\[id\]/);
  // Some full descriptions intentionally differ from visible labels:
  // in Russian Здоровье is displayed while the expanded category is Самочувствие.
  for (const label of ["Love", "Relationships & love", "Здоровье", "Самочувствие",
    "Amor", "Amor y relaciones"]) assert.ok(mobile.includes(label), label);
});
