import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [page, catalog, registry, player, css] = await Promise.all([
  readFile("components/academy-record-page.tsx", "utf8"),
  readFile("data/academy/catalog.ts", "utf8"),
  readFile("data/service-video-library.ts", "utf8"),
  readFile("components/academy-video-player.tsx", "utf8"),
  readFile("components/academy-love-mysteries-intro.module.css", "utf8"),
]);

test("Love Mysteries opens with approved locale-specific constellation-related video before its contents", () => {
  assert.ok(page.includes('record.logicalId === "mysteries/archetypes-of-love"'));
  assert.ok(page.includes('getServiceVideoMedia(locale === "ru" ? "overview" : "constellation-case", locale)'));
  assert.ok(page.indexOf("data-academy-love-intro") < page.indexOf('className="academy-outline"'));
  assert.ok(page.includes('<AcademyVideoPlayer youtubeId={loveVideo.video.youtubeId} title={loveVideo.video.title} locale={locale}'));
  assert.ok(registry.includes('youtubeId: "Cz6SxXJNZbw", language: "ru"'));
  assert.ok(registry.includes('youtubeId: "sfVFOQNr2qk", language: "en"'));
  assert.ok(page.includes("На русском: Андрей объясняет, как выбирает метод, в том числе системные расстановки"));
  assert.ok(page.includes("In English: an example of systemic constellations"));
  assert.ok(page.includes("Audio en inglés"));
  assert.ok(player.includes("youtube-nocookie.com/embed"));
  assert.ok(player.includes("useState(false)"));
});

test("Love Mysteries are described as a themed series of personal transformative constellations", () => {
  assert.ok(page.includes("серия личных расстановок-мистерий по отдельным темам для внутренней трансформации"));
  assert.ok(page.includes("a series of personal constellation-mysteries"));
  assert.ok(catalog.includes("This course is a series of personal constellation-mysteries"));
  assert.ok(catalog.includes("Этот курс — серия личных расстановок-мистерий"));
  assert.ok(page.includes("Опыт и результаты индивидуальны"));
});

test("The localized video intro stays responsive for phone layouts", () => {
  assert.ok(css.includes("aspect-ratio: 16 / 9"));
  assert.ok(css.includes("@media (max-width: 720px)"));
  assert.ok(css.includes("@media (max-width: 360px)"));
  assert.ok(css.includes("min-width: 0"));
});
