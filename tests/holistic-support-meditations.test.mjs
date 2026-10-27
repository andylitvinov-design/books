import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const media = JSON.parse(read("data/academy/psimaster-media.generated.json"));

test("Holistic Support displays a video-only themed gallery in EN/RU/ES", () => {
  const page = read("app/[locale]/holistic-support/page.tsx");
  const css = read("app/[locale]/holistic-support/holistic-support.module.css");
  const gallery = read("components/holistic-meditation-gallery.tsx");
  const galleryCss = read("components/holistic-meditation-gallery.module.css");
  for (const label of [
    "Meditations · Videos", "Медитации · Видео", "Meditaciones · Vídeos",
    "Business", "Love", "Energy", "Health", "Бизнес", "Любовь", "Энергия", "Здоровье",
    "Negocios", "Amor", "Energía", "Salud",
  ]) assert.ok((page + gallery).includes(label), "missing localized meditation label " + label);

  const filter = read("components/holistic-support-topic-filter.tsx");
  assert.match(filter, /id === "meditation" \? \(\s*<Link href="#meditation-practices" prefetch=\{false\}/);
  assert.match(page, /id="meditation-practices"/);
  assert.match(page, /<HolisticMeditationGallery locale=\{locale\} videos=\{freeMeditationVideos\(locale\)\} \/>/);
  assert.doesNotMatch(page, /id="meditation-audio"|data-holistic-audio-player|<audio|holistic-house-soft-melody-gentle-waves-96s/);
  assert.doesNotMatch(page, /meditationAudioTitle|meditationAudioMissing|meditationSourceToggle|meditationToAudio/);
  assert.match(page, /data-holistic-russian-archive/);
  assert.match(page, /\/ru\/holistic-support#meditation-practices/);
  assert.ok(page.indexOf("data-holistic-meditations") > page.indexOf("<HolisticSupportTopicFilter"));
  assert.ok(page.indexOf("data-holistic-meditations") < page.indexOf("data-holistic-coaching-followup"));

  const meditationCss = css.slice(css.indexOf("/* Video-only meditation library:"), css.indexOf("/* Holistic Support: a complete first-screen"));
  assert.ok(meditationCss.includes(".section[data-holistic-meditations]"));
  assert.doesNotMatch(meditationCss, /meditationAudioCard|meditationRecordingNote|meditationAudioControls/);
  assert.ok(meditationCss.includes("@media(max-width:650px)"));
  assert.ok(meditationCss.includes("@media(max-width:350px)"));
  assert.doesNotMatch(meditationCss, /height:calc\(100svh/);
  assert.doesNotMatch(page, /<AcademyCourseVideoPlaylist|data-holistic-meditation-screen/);

  assert.match(gallery, /role="group" aria-label=\{t\.filter\}/);
  assert.match(gallery, /aria-pressed=\{activeTopic === topic\}/);
  assert.match(gallery, /data-meditation-topic=\{topic\}/);
  assert.match(gallery, /video\.topics\.includes\(activeTopic\)/);
  assert.match(gallery, /setSelectedId\(null\)/);
  assert.match(gallery, /<AcademyVideoPlayer/);
  assert.match(gallery, /key=\{activeTopic \+ ":" \+ activeVideo\.id\}/);
  assert.match(gallery, /data-meditation-video-id=\{video\.id\}/);
  assert.match(galleryCss, /aspect-ratio:16\/9/);
  assert.match(galleryCss, /object-fit:cover/);
  assert.match(galleryCss, /@media\(max-width:430px\)/);
  assert.doesNotMatch(gallery, /autoplay=\{true\}|video\.mp3/);
});

test("free Sun and original PsiMaster pump-up playlist uses source-linked IDs without fake extracted audio", () => {
  const model = read("data/academy/holistic-support-meditations.ts");
  const player = read("components/academy-video-player.tsx");
  const playlist = read("components/academy-course-video-playlist.tsx");
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
  const compiledModule = { exports: {} };
  vm.runInNewContext(compiled, {
    module: compiledModule,
    exports: compiledModule.exports,
    require: id => {
      if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id];
      throw new Error("Unexpected source dependency: " + id);
    },
  }, { filename: path, timeout: 1000 });
  return compiledModule.exports;
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
  const allTopics = ["business", "love", "energy", "health"];
  for (const topic of allTopics) {
    assert.ok(ru.some(video => video.topics.includes(topic)), "RU missing " + topic);
    assert.ok(en[0].topics.includes(topic), "EN original must remain reachable for " + topic);
    assert.ok(es[0].topics.includes(topic), "ES links to the same English original for " + topic);
  }
  assert.ok(ru.filter(video => video.topics.includes("energy")).length >= 4);
  assert.ok(ru.filter(video => video.topics.includes("health")).length >= 2);
  assert.ok(ru.filter(video => video.topics.includes("love")).length >= 2);
  assert.equal(new Set(ru.flatMap(video => video.topics)).size, 4);
});
