import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Tantra Reiki review photos are relocated below curriculum only in Russian", async () => {
  const [journey, reviews, page] = await Promise.all([
    readFile("components/tantra-reiki-journey.tsx", "utf8"),
    readFile("components/tantra-reiki-testimonials.tsx", "utf8"),
    readFile("components/academy-record-page.tsx", "utf8"),
  ]);
  const photos = journey.slice(journey.indexOf("const levelPhotos = ["), journey.indexOf("] as const;", journey.indexOf("const levelPhotos = [")));
  const gallery = reviews.slice(reviews.indexOf("const reviewImages = "), reviews.indexOf("] as const;", reviews.indexOf("const reviewImages = ")));
  for (const index of [17, 18, 11, 20, 10, 15, 21, 22]) {
    assert.doesNotMatch(photos, new RegExp("images\\.ru\\[" + index + "\\]"), "review image returned to level " + index);
    assert.match(gallery, new RegExp("\\b" + index + "\\b"), "review image missing from gallery " + index);
  }
  assert.match(reviews, /reviewImages\.map/);
  assert.match(reviews, /locale === "ru" \? \(/);
  assert.match(page, /<TantraReikiTestimonials locale=\{locale\} \/>/);
});

test("Testimonials restore original 2 MP4 videos and the correctly identified Alena YouTube review", async () => {
  const [reviews, archived] = await Promise.all([
    readFile("components/tantra-reiki-testimonials.tsx", "utf8"),
    readFile("data/academy/tantra-reiki-full.generated.json", "utf8"),
  ]);
  const archive = JSON.parse(archived);
  assert.equal(archive.html5Videos.ru.length, 2);
  assert.deepEqual(archive.youtubeIds, ["qM_nFUkYJ1k"]);
  assert.match(reviews, /html5Videos\.ru\.map/);
  assert.match(reviews, /<AcademyVideoPlayer youtubeId="qM_nFUkYJ1k"/);
  assert.match(reviews, /controls playsInline preload="none"/);
});

test("English reviews use authored English copy and display no untranslated Russian screenshot gallery", async () => {
  const [reviews, translated] = await Promise.all([
    readFile("components/tantra-reiki-testimonials.tsx", "utf8"),
    readFile("data/academy/tantra-reiki-ru-en.generated.json", "utf8"),
  ]);
  const archive = JSON.parse(translated);
  for (const index of [56, 57, 61, 62, 63, 64]) assert.ok(archive.blocks[index].text.length > 15);
  assert.match(reviews, /englishSource\.blocks\[sourceIndex\]\.text/);
  assert.match(reviews, /tantraReikiArchive\.blocks\.ru\[sourceIndex\]\.text/);
  assert.match(reviews, /locale === "en"/);
});

test("Nine course levels emphasize their number and omit technical translation commentary", async () => {
  const [journey, css, page] = await Promise.all([
    readFile("components/tantra-reiki-journey.tsx", "utf8"),
    readFile("app/academy.css", "utf8"),
    readFile("components/academy-record-page.tsx", "utf8"),
  ]);
  assert.match(journey, /tantra-journey__level-number/);
  assert.match(css, /\.tantra-journey__level-number/);
  assert.doesNotMatch(journey, /translated from Russian/);
  assert.doesNotMatch(journey, /The historical English text places/);
  assert.doesNotMatch(page, /Full English translation of Andrey/);
});

test("English Tantra Reiki meditation has an accessible source-verified video player or honest unavailable state", async () => {
  const [visual, source] = await Promise.all([
    readFile("components/english-guided-meditations.tsx", "utf8"),
    readFile("data/academy/english-guided-meditations.ts", "utf8"),
  ]);
  assert.match(visual, /isTantraVideo/);
  assert.match(visual, /<AcademyVideoPlayer youtubeId=\{item.youtubeId\}/);
  assert.match(visual, /english-meditation-unavailable/);
  assert.match(source, /key: "tantra-reiki"/);
  assert.match(source, /youtubeId: "w2BN-HYmHUk"/);
  assert.match(source, /title: "Tantra Reiki Practice"/);
  assert.match(visual, /Watch on YouTube/);
  assert.doesNotMatch(source, /youtubeId: "qM_nFUkYJ1k"/);
  const player = await readFile("components/academy-video-player.tsx", "utf8");
  assert.match(player, /youtube-nocookie\\.com\\/embed/);
  assert.match(player, /onClick=\\{\\(\\) => setPlaying\\(true\\)\\}/);
});
