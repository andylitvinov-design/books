import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const route = read("app/[locale]/holistic-support/mobile/page.tsx");
const client = read("components/holistic-support-mobile.tsx");
const css = read("components/holistic-support-mobile.module.css");
const chooser = read("components/holistic-support-choices.tsx");
const nav = read("components/mobile-bottom-navigation.tsx");

test("alternate support screen is separate, linked and localized without replacing the original", () => {
  const standard = read("app/[locale]/holistic-support/page.tsx");
  assert.match(standard, /<HolisticSupportChoices locale=\{locale\}/);
  assert.match(standard, /<HolisticMeditationGallery locale=\{locale\}/);
  assert.match(chooser, /data-support-alternative-link/);
  assert.match(chooser, /\/holistic-support\/mobile/);
  for (const locale of ["en", "ru", "es"]) {
    assert.match(route, new RegExp(locale + ': "/' + locale + '/holistic-support/mobile"'));
  }
  assert.match(route, /robots: \{ index: false, follow: true \}/);
  assert.match(nav, /holistic-support\\\/mobile/);
  assert.match(client, /data-support-mobile-bottom-nav/);
});

test("personal scores and photos are local-only and accessible; no fake completion or payment", () => {
  assert.match(client, /type="range" min="1" max="10"/);
  assert.match(client, /aria-valuetext=\{scores\[id\]/);
  assert.match(client, /type="file" accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(client, /URL\.createObjectURL\(file\)/);
  assert.match(client, /URL\.revokeObjectURL\(photoUrl\)/);
  assert.match(client, /8 \* 1024 \* 1024/);
  assert.match(client, /data-support-recommendations/);
  assert.match(client, /focusTopics\[focus\]/);
  assert.match(client, /Videos opened here|Видео открыто здесь|Vídeos abiertos aquí/);
  assert.doesNotMatch(client, /localStorage|sessionStorage|fetch\(|navigator\.sendBeacon|URLSearchParams|paid:\s*true/);
  assert.match(client, /<HolisticInlineSupportOrder/);
  assert.match(client, /<TaoistTalismanCatalog/);
});

test("four real recording cards from published sources, not arbitrary stock samples", () => {
  assert.match(route, /freeMeditationVideos\("ru"\)/);
  assert.match(route, /englishGuidedMeditations/);
  assert.match(route, /youtubeId!/);
  assert.match(read("data/academy/english-guided-meditations.ts"), /key: "kundalini-reiki"/);
  assert.match(client, /\.slice\(0, 4\)/);
  assert.match(client, /data-support-video=\{video\.id\}/);
  assert.match(client, /youtube-nocookie\.com\/embed/);
  assert.match(client, /onClick=\{startVideo\}/);
  assert.match(client, /setPlaying\(false\)/);
  assert.match(client, /allowFullScreen loading="eager"/);
  assert.match(client, /noopener noreferrer/);
  assert.doesNotMatch(client, /<audio|autoplay=\{true\}|hardcodedYoutubeId|youtubeId: "[a-zA-Z0-9_-]{11}"/);
});

test("playback keeps visible selectors and explicit meditation topics filter honestly", () => {
  assert.ok(client.includes('data-playing={playing ? "true" : "false"}'));
  assert.ok(client.includes('theme !== "all"'));
  assert.ok(client.includes('return themed;'));
  assert.match(client, /matchingVideos\.slice\(safePage \* 4, safePage \* 4 \+ 4\)/);
  assert.match(client, /data-support-video-pager/);
  assert.ok(css.includes('.hero[data-playing="true"] .heroFilters'));
  assert.ok(css.includes('.iframeWrap { position: relative'));
  assert.ok(css.includes('aspect-ratio: 16 / 9'));
});

test("mobile mock structure and large-text 320–430 layout with no duplicate global nav", () => {
  for (const key of ["energy", "money", "relationships", "goals"]) {
    assert.ok(client.includes(key), key);
  }
  for (const label of [
    "Мастер", "Программа", "Тема", "Тест или консультация", "Талисман",
    "Подобрать рекомендации", "Начать медитацию", "Мой прогресс",
  ]) assert.ok(client.includes(label), label);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /@media \(max-width: 350px\)/);
  assert.match(css, /grid-template-columns: repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css, /font-size: 17px/);
  assert.match(css, /min-height: 104px/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /prefers-reduced-motion/);
});

test("new TSX and route transpile without TypeScript parser diagnostics", () => {
  for (const [name, input] of [["page", route], ["workspace", client]]) {
    const result = ts.transpileModule(input, {
      fileName: name + ".tsx",
      reportDiagnostics: true,
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    });
    const errors = (result.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error);
    assert.deepEqual(errors.map(e => ts.flattenDiagnosticMessageText(e.messageText, " ")), []);
  }
});

test("personal recommendations rank verified recordings and existing talismans, with direct detailed-profile entry", () => {
  const model = read("lib/holistic-support/recommendation-engine.js");
  const talismans = read("components/taoist-talisman-catalog.tsx");
  assert.match(client, /recommendSupportContent\(/);
  assert.match(client, /scores: \{ \.\.\.scores \}/);
  assert.match(client, /recommended\.videos\.map\(/);
  assert.match(client, /data-support-personal-recommendations/);
  assert.match(client, /data-support-recommended-video/);
  assert.match(client, /data-support-recommended-talisman/);
  assert.match(client, /data-support-detailed-analysis/);
  assert.match(client, /data-support-recommended-detailed-analysis/);
  assert.match(client, /\/personality-profiles/);
  assert.match(talismans, /featuredId/);
  assert.match(talismans, /data-recommended=/);
  assert.match(model, /TALISMAN_BY_FOCUS/);
  assert.match(model, /YOUTUBE_ID/);
  assert.match(model, /matchingPrimary \? 100 : 0/);
  assert.doesNotMatch(model, /fetch\(|localStorage|sessionStorage|navigator\.sendBeacon|\bdiagnose\(/);
  assert.match(css, /\.recommendationPanel/);
  assert.match(css, /\.detailedAnalysisLink/);
});

test("wellbeing is replaced by Goals / Meaning in all three languages and ancient video programmes are source-backed", () => {
  for (const label of ["Goals / Meaning", "Цели / Смысл", "Metas / Sentido"]) {
    assert.ok(client.includes(label), "topic label: " + label);
  }
  for (const retired of ['health: "Wellbeing"', 'health: "Самочувствие"', 'health: "Bienestar"']) {
    assert.ok(!client.includes(retired), "retired mobile theme: " + retired);
  }
  assert.match(client, /goals: "goals"/);
  assert.match(client, /courseByProgram/);
  assert.match(client, /academy\/mysteries/);
  assert.match(route, /psimaster-media\.generated\.json/);
  assert.match(route, /verified_legacy_public_embed/);
  assert.match(route, /magicCourseVideos\(locale\)/);
  const published = JSON.parse(read("data/academy/psimaster-media.generated.json"));
  const required = [
    ["videos/egypt-osiris", 7],
    ["videos/greek-mysteries-demeter", 5],
    ["videos/greek-mysteries-dionysus", 7],
    ["videos/maya-archetypes", 6],
  ];
  for (const [logicalId, count] of required) {
    const matches = published.filter(item => item.logicalId === logicalId
      && item.status === "verified_legacy_public_embed" && /^[A-Za-z0-9_-]{11}$/.test(item.videoId));
    assert.equal(matches.length, count, "expected verified original video collection: " + logicalId);
    assert.equal(new Set(matches.map(item => item.videoId)).size, count);
  }
});
