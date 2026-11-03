import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");
const json = async (path) => JSON.parse(await read(path));
const titleCounts = {
  "videos/planetary-power": 11,
  "videos/egypt-osiris": 7,
  "videos/greek-mysteries-dionysus": 7,
  "videos/strength-protection": 7,
  "videos/maya-archetypes": 6,
  "videos/greek-mysteries-demeter": 5,
  "videos/energy-pump-ups": 2,
};

test("all 45 PsiMaster video lessons retain original per-course order without duplicate source lessons", async () => {
  const [media, inventory, sources] = await Promise.all([
    json("data/academy/psimaster-media.generated.json"),
    json("data/academy/psimaster-inventory.generated.json"),
    json("data/academy/sources.generated.json"),
  ]);
  assert.equal(media.length, 45);
  assert.equal(inventory.classificationCounts.AcademyVideo, 7);
  assert.deepEqual([...new Set(media.map((row) => row.logicalId))].sort(), Object.keys(titleCounts).sort());
  for (const [logicalId, count] of Object.entries(titleCounts)) {
    const lessons = media.filter((row) => row.logicalId === logicalId).sort((a, b) => a.order - b.order);
    assert.equal(lessons.length, count, logicalId);
    assert.deepEqual(lessons.map((row) => row.order), Array.from({ length: count }, (_, n) => n + 1));
    assert.equal(new Set(lessons.map((row) => row.videoId)).size, count, "Duplicated video in " + logicalId);
    assert.ok(lessons.every((row) =>
      row.sourceProvider === "psimaster"
      && row.sourceUrl.startsWith("https://psimaster.net/service?")
      && row.mediaUrl === "https://www.youtube.com/embed/" + row.videoId
      && row.lessonTitle && row.lessonTitleEn), "Missing provenance, YouTube ID or title in " + logicalId);
    assert.ok(sources.some((record) =>
      record.logicalId === logicalId && record.routeKey === logicalId && record.direction === "videos" && record.sourceLocale === "ru"),
      "Missing the original Russian native route for " + logicalId);
  }
});

test("seven video course pages use the complete sorted manifest in a single selectable video player", async () => {
  const [page, playlist, css, player] = await Promise.all([
    read("components/academy-record-page.tsx"),
    read("components/academy-course-video-playlist.tsx"),
    read("components/academy-course-video-playlist.module.css"),
    read("components/academy-video-player.tsx"),
  ]);
  assert.match(page, /record\.direction === "videos" \? allVideos : allVideos\.slice\(0, 48\)/);
  assert.match(page, /\.sort\(\(a, b\) => \(a\.order \?\? 999\) - \(b\.order \?\? 999\)\)/);
  assert.match(page, /record\.direction === "videos" && videos\.length > 0/);
  assert.match(page, /<AcademyCourseVideoPlaylist/);
  assert.match(page, /lessons=\{videos\.map\(\(video, index\) => \(\{/);
  assert.match(page, /record\.direction !== "videos" && \(sourceVideos\.length \|\| videos\.length\)/);
  assert.ok(page.indexOf("<AcademyCourseVideoPlaylist") < page.indexOf("hasBody ? <div className=\"academy-source-content\""),
    "Video course player must be before long historical text");
  assert.match(playlist, /data-video-lesson-count=\{lessons\.length\}/);
  assert.match(playlist, /lessons\.map\(\(lesson, lessonIndex\) =>/);
  assert.match(playlist, /data-academy-video-id=\{lesson\.id\}/);
  assert.match(playlist, /data-source-order=\{lesson\.order\}/);
  assert.match(playlist, /aria-current=\{lessonIndex === index \? "step" : undefined\}/);
  assert.match(playlist, /setSelectedIndex\(indexToOpen\)/);
  assert.match(playlist, /key=\{active\.id\}/);
  assert.match(playlist, /onClick=\{\(\) => choose\(index - 1\)\}/);
  assert.match(playlist, /onClick=\{\(\) => choose\(index \+ 1\)\}/);
  assert.match(playlist, /posterLoading="eager"/);
  assert.doesNotMatch(playlist, /\.slice\(/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(player, /youtube-nocookie\.com\/embed/);
  assert.match(player, /\{playing \? \(/);
  assert.match(player, /loading=\{posterLoading\}/);
  assert.match(player, /className="academy-video-direct-link"/);
});

test("poster-first playlist requires Play; lesson switches reset the previous iframe", async () => {
  const [playlist, player] = await Promise.all([
    read("components/academy-course-video-playlist.tsx"),
    read("components/academy-video-player.tsx"),
  ]);
  assert.match(playlist, /<AcademyVideoPlayer[\s\S]*?key=\{active\.id\}/);
  assert.match(player, /const \[playing, setPlaying\] = useState\(false\)/);
  assert.match(player, /onClick=\{\(\) => setPlaying\(true\)\}/);
  assert.match(player, /autoplay=1&playsinline=1&rel=0/);
  assert.match(player, /https:\/\/www\.youtube\.com\/watch\?v=/);
  assert.match(player, /locale === "ru" \? "Смотреть"/);
});
