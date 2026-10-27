import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const media = JSON.parse(read("data/academy/psimaster-media.generated.json"));

test("Holistic Support has an accessible audio and video meditation destination in all three locales", () => {
  const page = read("app/[locale]/holistic-support/page.tsx");
  const css = read("app/[locale]/holistic-support/holistic-support.module.css");
  for (const label of [
    "Meditation · Flight to the Sun", "Бесплатные подкачки", "Meditación · Flight to the Sun",
  ]) assert.ok(page.includes(label), "missing locale text " + label);
  assert.match(read("components/holistic-support-topic-filter.tsx"), /<Link href="#meditation-practices" prefetch=\{false\}/);
  assert.match(page, /href="#meditation-practices"/);
  assert.match(page, /id="meditation-practices"/);
  assert.match(page, /data-holistic-audio-player/);
  assert.match(page, /<audio controls preload="none"/);
  assert.match(page, /holistic-house-soft-melody-gentle-waves-96s\.wav/);
  assert.match(page, /<AcademyCourseVideoPlaylist/);
  assert.match(page, /compact\s*\/>/);
  assert.match(page, /data-holistic-meditation-screen="video"/);
  assert.match(page, /data-holistic-meditation-screen="audio"/);
  assert.match(page, /id="meditation-audio"/);
  assert.match(page, /href="#meditation-audio"/);
  assert.match(css, /height:calc\(100svh - 112px\)/);
  assert.match(css, /height:calc\(100svh - 142px\)/);
  assert.match(css, /overflow-y:auto/);
  const playlistCss = read("components/academy-course-video-playlist.module.css");
  const playlistUi = read("components/academy-course-video-playlist.tsx");
  assert.match(playlistCss, /\.compact \.sequence\{display:none\}/);
  assert.match(playlistCss, /\.compact \.controls button\{[^}]*min-height:44px/);
  assert.match(playlistUi, /key=\{active\.id\}/);
  assert.match(playlistUi, /aria-label=\{compact \? lesson\.title : undefined\}/);

  assert.match(page, /introText=\{t\.meditationVideoIntro\}/);
  assert.match(page, /data-holistic-russian-archive/);
  assert.match(page, /\/ru\/holistic-support#meditation-practices/);
  assert.ok(page.includes("Flight to the Sun · Original English video"));
  assert.ok(page.includes("Flight to the Sun · Vídeo original en inglés"));
  assert.ok(page.includes("Русскоязычные медитации · архив PsiMaster"));
  assert.doesNotMatch(page, /Первое видео — «Полёт к солнцу»/);
  assert.ok(page.indexOf("<AcademyCourseVideoPlaylist") < page.indexOf("data-holistic-audio-player"),
    "video should be encountered before the ambient audio on narrow screens");
  assert.match(css, /\.section\[data-holistic-meditations\]\{scroll-margin-top/);
  assert.match(css, /@media\(max-width:350px\)/);
  assert.ok(page.indexOf("data-holistic-meditations") > page.indexOf("<HolisticSupportTopicFilter"));
  assert.ok(page.indexOf("data-holistic-meditations") < page.indexOf("data-holistic-coaching-followup"));
});

test("free Sun and original PsiMaster pump-up playlist uses source-linked IDs without fake extracted audio", () => {
  const model = read("data/academy/holistic-support-meditations.ts");
  const player = read("components/academy-video-player.tsx");
  const playlist = read("components/academy-course-video-playlist.tsx");
  const sound = read("scripts/generate-soft-ocean-melody.mjs");
  assert.match(model, /psimaster-media\.generated\.json/);
  assert.match(model, /verified_legacy_public_embed/);
  assert.match(model, /english-guided-meditations/);
  assert.match(model, /if \(locale !== "ru"\)/);
  assert.match(model, /item\.key === "flight-to-sun"/);
  // The English video must never be injected into the RU PsiMaster selector.
  assert.doesNotMatch(model, /"Полёт к солнцу · авторская видеомедитация/);
  assert.doesNotMatch(model, /return \[\{\s*id: englishSun\.youtubeId[\s\S]*\.\.\.archive/);
  assert.match(read("data/academy/english-guided-meditations.ts"), /youtubeId: "HqfixazXqRY"/);
  assert.match(model, /seen\.has\(recording\.videoId\)/);
  assert.match(playlist, /introText \?\? t\.intro/);
  assert.match(playlist, /key=\{active\.id\}/);
  assert.match(player, /setPlaying\(true\)/);
  assert.match(player, /youtube-nocookie\.com\/embed/);
  assert.match(sound, /holistic-house-soft-melody-gentle-waves-96s\.wav/);
  // A checked-in media manifest is named *.generated.json; that does NOT create audio.
  // Reject only real standalone audio paths, synthesis calls, or hard-coded YouTube IDs.
  assert.doesNotMatch(model, /\.mp3\b|\.m4a\b|storage\.from\s*\(|(?:generateAudio|generateVoice|synthesizeSpeech)\s*\(|youtubeId:\s*["']/);
  for (const [family, positions] of [
    ["videos/strength-protection", [1, 3, 5, 6, 7]],
    ["videos/energy-pump-ups", [1, 2]],
  ]) for (const order of positions) {
    const rows = media.filter(x => x.logicalId === family && x.order === order && x.status === "verified_legacy_public_embed");
    assert.equal(rows.length, 1, family + " position " + order);
    assert.match(rows[0].videoId, /^[A-Za-z0-9_-]{11}$/);
  }
});


// Execute the actual TypeScript playlist model without reaching an external
// video provider; this catches a cross-language regression that text tests miss.
function evalTypeScript(path, mocks = {}) {
  const compiled = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    require: id => {
      if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id];
      throw new Error("Unexpected source dependency: " + id);
    },
  }, { filename: path, timeout: 1000 });
  return module.exports;
}

test("language-aware meditation selector: EN Flight to the Sun, RU only seven original PsiMaster videos", () => {
  const english = evalTypeScript("data/academy/english-guided-meditations.ts");
  const originalSun = english.englishGuidedMeditations.find(item => item.key === "flight-to-sun");
  assert.equal(originalSun?.youtubeId, "HqfixazXqRY");

  const { freeMeditationVideos } = evalTypeScript("data/academy/holistic-support-meditations.ts", {
    "./english-guided-meditations": english,
    "./psimaster-media.generated.json": media,
  });
  const en = freeMeditationVideos("en");
  const es = freeMeditationVideos("es");
  const ru = freeMeditationVideos("ru");

  assert.deepEqual(Array.from(en, video => video.id), [originalSun.youtubeId]);
  assert.deepEqual(Array.from(es, video => video.id), [originalSun.youtubeId]);
  assert.match(en[0].title, /original English audio/);
  assert.match(es[0].title, /audio original en inglés/);

  const expectedRu = [
    ["videos/strength-protection", 5],
    ["videos/strength-protection", 6],
    ["videos/strength-protection", 7],
    ["videos/strength-protection", 3],
    ["videos/strength-protection", 1],
    ["videos/energy-pump-ups", 1],
    ["videos/energy-pump-ups", 2],
  ].map(([logicalId, order]) => {
    const item = media.find(row => row.logicalId === logicalId && row.order === order && row.status === "verified_legacy_public_embed");
    assert.ok(item, "missing original PsiMaster source " + logicalId + " #" + order);
    return item.videoId;
  });
  assert.deepEqual(Array.from(ru, video => video.id), expectedRu);
  assert.equal(ru.length, 7);
  assert.equal(new Set(ru.map(video => video.id)).size, 7);
  assert.ok(ru.every(video => video.id !== originalSun.youtubeId));
  assert.ok(ru.every(video => !video.title.includes("original English")));
});
