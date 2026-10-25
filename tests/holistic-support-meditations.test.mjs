import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const media = JSON.parse(read("data/academy/psimaster-media.generated.json"));

test("Holistic Support has an accessible audio and video meditation destination in all three locales", () => {
  const page = read("app/[locale]/holistic-support/page.tsx");
  const css = read("app/[locale]/holistic-support/holistic-support.module.css");
  for (const label of [
    "Meditation · Audio & Video", "Медитации · аудио и видео", "Meditación · Audio y vídeo",
    "Free Energy Pump-Ups", "Бесплатные подкачки", "Prácticas energéticas gratuitas",
  ]) assert.ok(page.includes(label), "missing locale text " + label);
  assert.match(page, /data-holistic-offer="meditations"/);
  assert.match(page, /data-holistic-meditation-cta/);
  assert.match(page, /href="#meditation-practices"/);
  assert.match(page, /id="meditation-practices"/);
  assert.match(page, /data-holistic-audio-player/);
  assert.match(page, /<audio controls preload="none"/);
  assert.match(page, /holistic-house-soft-melody-gentle-waves-96s\.wav/);
  assert.match(page, /<AcademyCourseVideoPlaylist/);
  assert.match(page, /introText=\{t\.meditationVideoIntro\}/);
  assert.match(css, /\[data-holistic-meditations\]\{scroll-margin-top/);
  assert.match(css, /@media\(max-width:350px\)/);
  assert.ok(page.indexOf("data-holistic-meditations") > page.indexOf("data-holistic-healing"));
  assert.ok(page.indexOf("data-holistic-meditations") < page.indexOf("data-holistic-coaching-followup"));
});

test("free Sun and original PsiMaster pump-up playlist uses source-linked IDs without fake extracted audio", () => {
  const model = read("data/academy/holistic-support-meditations.ts");
  const player = read("components/academy-video-player.tsx");
  const playlist = read("components/academy-course-video-playlist.tsx");
  const sound = read("scripts/generate-soft-ocean-melody.mjs");
  assert.match(model, /psimaster-media\.generated\.json/);
  assert.match(model, /verified_legacy_public_embed/);
  assert.match(model, /seen\.has\(recording\.videoId\)/);
  assert.match(playlist, /introText \?\? t\.intro/);
  assert.match(playlist, /key=\{active\.id\}/);
  assert.match(player, /setPlaying\(true\)/);
  assert.match(player, /youtube-nocookie\.com\/embed/);
  assert.match(sound, /holistic-house-soft-melody-gentle-waves-96s\.wav/);
  assert.doesNotMatch(model, /\.mp3|storage\.from|generate|youtubeId:\s*["']/);
  for (const [family, positions] of [
    ["videos/strength-protection", [1, 3, 5, 6, 7]],
    ["videos/energy-pump-ups", [1, 2]],
  ]) for (const order of positions) {
    const rows = media.filter(x => x.logicalId === family && x.order === order && x.status === "verified_legacy_public_embed");
    assert.equal(rows.length, 1, family + " position " + order);
    assert.match(rows[0].videoId, /^[A-Za-z0-9_-]{11}$/);
  }
});
