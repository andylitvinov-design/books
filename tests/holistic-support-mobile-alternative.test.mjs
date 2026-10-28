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
  assert.ok(client.includes('return themed.slice(0, 4)'));
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
  assert.match(css, /min-height: 43px/);
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

test("same-window talisman viewer reuses real images, local basket, and protected quote form in all locales", () => {
  const viewer = read("components/holistic-support-talisman-viewer.tsx");
  const viewerCss = read("components/holistic-support-talisman-viewer.module.css");
  const cart = read("components/taoist-talisman-cart.tsx");
  const cartCss = read("components/taoist-talisman-cart.module.css");
  const source = read("lib/practitioners/taoist-talismans.js");
  const storage = read("lib/practitioners/taoist-talisman-cart.js");
  assert.match(client, /<HolisticSupportTalismanViewer key=\{focus\}/);
  assert.match(client, /<TaoistTalismanCatalog/);
  assert.match(client, /hidden=\{!talismanCatalogOpen\}/);
  assert.match(viewer, /data-support-talisman-viewer/);
  assert.match(viewer, /src=\{selected\.image\}/);
  assert.match(viewer, /onTouchStart=\{touchStart\}/);
  assert.match(viewer, /onTouchEnd=\{touchEnd\}/);
  assert.match(viewer, /Math\.abs\(dx\) > 45/);
  assert.match(viewer, /data-support-talisman-next/);
  assert.match(viewer, /data-support-talisman-thumb=\{item\.id\}/);
  assert.match(viewer, /data-support-talisman-filter="goal"/);
  assert.match(viewer, /saveBrowserTalismanCart/);
  assert.match(viewer, /<dialog ref=\{dialogRef\}/);
  assert.match(viewer, /<TaoistTalismanCart locale=\{locale\} inline/);
  assert.match(cart, /sourcePath: "\/" \+ locale \+ "\/holistic-support"/);
  assert.match(cart, /data-inline=\{inline \? "true"/);
  assert.match(cart, /data\?\.saved !== true \|\| data\?\.contactPending !== false/);
  assert.match(cartCss, /\.shell\[data-inline="true"\]/);
  assert.match(storage, /sessionStorage/);
  assert.match(source, /fu-balance/);
  assert.match(source, /fu-prosperity/);
  assert.match(source, /fu-harmony/);
  assert.match(viewerCss, /scroll-snap-type: x mandatory/);
  assert.match(viewerCss, /@media\(max-width:350px\)/);
  for (const text of ["Request talisman", "Заказать талисман", "Solicitar talismán"]) {
    assert.ok(viewer.includes(text), "localized call to request: " + text);
  }
  assert.doesNotMatch(viewer, /fetch\(|localStorage|sessionStorage|navigator\.sendBeacon|autoplay=1/);
  const parsed = ts.transpileModule(viewer, {
    fileName: "holistic-support-talisman-viewer.tsx", reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  assert.deepEqual((parsed.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error)
    .map(d => ts.flattenDiagnosticMessageText(d.messageText, " ")), []);
});
