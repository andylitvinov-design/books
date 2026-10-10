import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Genuine Tantra festival photos remain and duplicated review screenshots are absent", async () => {
  const [journey, reviews, page, festival] = await Promise.all([
    readFile("components/tantra-reiki-journey.tsx", "utf8"),
    readFile("components/tantra-reiki-testimonials.tsx", "utf8"),
    readFile("components/academy-record-page.tsx", "utf8"),
    readFile("components/tantra-reiki-story.tsx", "utf8"),
  ]);
  const photos = journey.slice(journey.indexOf("const levelPhotos = ["), journey.indexOf("] as const;", journey.indexOf("const levelPhotos = [")));
  for (const index of [17, 18, 19, 20, 21, 22]) {
    assert.match(photos, new RegExp("images\\.ru\\[" + index + "\\]"));
  }
  assert.match(festival, /TantraReikiFestivalMoments/);
  assert.match(page, /<TantraReikiFestivalMoments locale=\{locale\} \/>/);
  assert.doesNotMatch(reviews, /reviewImages|tantra-review-gallery|tantra-review-archive|images\.ru\[2\]|images\.ru\[3\]/);
  assert.match(reviews, /sourceReviewGroups\.map/);
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
  assert.ok(player.includes("https://www.youtube-nocookie.com/embed/"));
  assert.ok(player.includes("onClick={() => setPlaying(true)}"));
});
