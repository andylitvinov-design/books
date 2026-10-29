import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const read = name => readFileSync(new URL("../" + name, import.meta.url), "utf8");
const manifest = JSON.parse(read("data/academy/psimaster-media.generated.json"));
const pointer = read("data/academy/greek-video-series.ts");
const sourceRecords = JSON.parse(read("data/academy/sources.generated.json"));
const supportPage = read("app/[locale]/holistic-support/mobile/page.tsx");
const support = read("components/holistic-support-mobile.tsx");
const library = read("components/library-hub.tsx");
const feed = read("components/library-feed.tsx");

test("execute the original source-page-to-PsiMaster-media join without empty Russian channels", () => {
  // The canonical archive description is PsiTrends, while its video embeds
  // were verified in PsiMaster. This executable test would fail if a future
  // refactor incorrectly required record.sourceProvider === "psimaster".
  const catalog = {
    academyDisplayTitle: record => record.title,
    findAcademyRecord: (key, locale) => sourceRecords.find(row => row.routeKey === key && row.sourceLocale === locale),
    mediaForRecord: record => {
      const exact = manifest.filter(row => row.logicalId === record.logicalId && row.sourceUrl === record.sourceUrl);
      return exact.length ? exact : manifest.filter(row => row.logicalId === record.logicalId);
    },
    youtubeIdFromUrl: url => /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/.exec(url)?.[1],
  };
  const compiled = ts.transpileModule(pointer, {
    fileName: "greek-video-series.ts",
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports, require: specifier => {
      assert.equal(specifier, "@/data/academy/catalog");
      return catalog;
    },
  }, { timeout: 2000 });
  const ru = JSON.parse(JSON.stringify(module.exports.greekVideoSeries("ru")));
  assert.deepEqual(ru.map(series => [series.id, series.lessons.length]), [
    ["greek-dionysus", 7], ["greek-demeter", 5],
  ]);
  for (const series of ru) {
    assert.equal(series.href, "/ru/academy/" + series.logicalId);
    assert.deepEqual(series.lessons.map(video => video.order),
      Array.from({ length: series.lessons.length }, (_, index) => index + 1));
  }
  assert.deepEqual(JSON.parse(JSON.stringify(module.exports.greekVideoSeries("en"))), []);
  assert.deepEqual(JSON.parse(JSON.stringify(module.exports.greekVideoSeries("es"))), []);
});

test("Dionysus and Demeter retain their own original, complete numbered episode sequences", () => {
  const expected = [
    ["greek-dionysus", "videos/greek-mysteries-dionysus", 7, "qipPFBpRNF8", "_9y1lR0lpPA"],
    ["greek-demeter", "videos/greek-mysteries-demeter", 5, "7ROoZxXysWY", "blzlYK9YeC0"],
  ];
  const all = new Set();
  for (const [seriesId, logicalId, total, first, last] of expected) {
    assert.ok(pointer.includes('id: "' + seriesId + '"'), "single source pointer for " + seriesId);
    assert.ok(pointer.includes('logicalId: "' + logicalId + '"'));
    const lessons = manifest.filter(row => row.logicalId === logicalId).sort((a, b) => a.order - b.order);
    assert.equal(lessons.length, total);
    assert.deepEqual(lessons.map(row => row.order), Array.from({ length: total }, (_, i) => i + 1));
    assert.equal(lessons[0].videoId, first);
    assert.equal(lessons.at(-1).videoId, last);
    for (const row of lessons) {
      assert.equal(row.status, "verified_legacy_public_embed");
      assert.match(row.mediaUrl, /^https:\/\/www\.youtube\.com\/embed\/[A-Za-z0-9_-]{11}$/);
      assert.ok(!all.has(row.videoId), "one episode cannot occur in both channels");
      all.add(row.videoId);
    }
  }
  assert.equal(all.size, 12);
  assert.match(pointer, /findAcademyRecord\(series\.logicalId, "ru"\)/);
  assert.match(pointer, /mediaForRecord\(record\)/);
  assert.match(pointer, /\.sort\(\(a, b\) => \(a\.order/);
  assert.match(pointer, /seen\.has\(id\)/);
  assert.match(pointer, /if \(locale !== "ru"\) return \[\]/);
  assert.equal(manifest.length, 45, "historical source manifest is unchanged");
});

test("mobile Courses selects one Greek channel, not the combined 12-video Greece filter", () => {
  assert.match(supportPage, /\.\.\.GREEK_VIDEO_SERIES\.map\(series => \(\{/);
  assert.match(supportPage, /videoIds: \[series\.logicalId\]/);
  assert.match(supportPage, /lessonOrder: media\.order/);
  assert.match(supportPage, /seriesHref: entry\.id\.startsWith\("greek-"\)/);
  assert.match(support, /"greek-dionysus": "Канал Диониса"/);
  assert.match(support, /"greek-demeter": "Канал Деметры"/);
  assert.match(support, /const relevantVideos = choice === "pump" && program !== "all" \? catalogVideos : catalogVideos\.slice\(0, 4\)/);
  assert.match(support, /data-source-order=\{video\.lessonOrder\}/);
  assert.match(support, /data-support-lesson-navigation/);
  assert.match(support, /relevantVideos\[selectedLessonIndex \+ 1\]\.id/);
  assert.match(support, /relevantVideos\[selectedLessonIndex - 1\]\.id/);
  assert.match(support, /setPlaying\(false\)/);
  assert.doesNotMatch(supportPage, /videoIds: \["videos\/greek-mysteries-demeter", "videos\/greek-mysteries-dionysus"\]/);
});

test("Video Blogs have two standalone, filterable original channels, episodes before other videos", () => {
  assert.match(library, /greekVideoSeries\(locale\)/);
  assert.match(library, /seriesId: series\.id/);
  assert.match(library, /seriesOrder: lesson\.order/);
  assert.match(library, /const seriesVideoIds = new Set/);
  assert.match(feed, /data-library-series-filter=\{series\.id\}/);
  assert.match(feed, /data-library-video-series=\{item\.seriesId\}/);
  assert.match(feed, /a\.seriesOrder \?\? Number\.MAX_SAFE_INTEGER/);
  assert.match(feed, /selectedSeries === "all" \|\| item\.seriesId === selectedSeries/);
  assert.match(feed, /seriesTitle: "Видеоблоги по каналам"/);
  assert.match(feed, /className=\{styles\.seriesHeading\}/);
  assert.match(feed, /className=\{styles\.seriesFilters\}/);
  assert.match(feed, /item\.seriesHref/);
  assert.match(feed, /https:\/\/www\.youtube-nocookie\.com\/embed/);
  assert.match(read("components/library-feed.module.css"), /@media\(max-width:375px\).*\.seriesFilters/);
});

test("new and changed TSX/TS source parse without diagnostics", () => {
  for (const path of [
    "data/academy/greek-video-series.ts",
    "app/[locale]/holistic-support/mobile/page.tsx",
    "components/holistic-support-mobile.tsx",
    "components/holistic-support-course-profiles.tsx",
    "components/library-hub.tsx",
    "components/library-feed.tsx",
  ]) {
    const source = read(path);
    const result = ts.transpileModule(source, {
      fileName: path, reportDiagnostics: true,
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    });
    assert.deepEqual((result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error)
      .map(d => ts.flattenDiagnosticMessageText(d.messageText, " ")), [], path);
  }
});
