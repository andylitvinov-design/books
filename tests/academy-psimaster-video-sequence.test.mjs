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

test("seven original video course pages keep all lessons but show one video and one reflection per slide", async () => {
  const [page, wrapper, journey, css, player] = await Promise.all([
    read("components/academy-record-page.tsx"),
    read("components/academy-course-video-playlist.tsx"),
    read("components/academy-video-course-journey.tsx"),
    read("components/academy-video-course-journey.module.css"),
    read("components/academy-video-player.tsx"),
  ]);
  assert.match(page, /record\.direction === "videos" \? allVideos : allVideos\.slice\(0, 48\)/);
  assert.match(page, /\.sort\(\(a, b\) => \(a\.order \?\? 999\) - \(b\.order \?\? 999\)\)/);
  assert.match(page, /record\.direction === "videos" \|\| isRussianEmbeddedCourse/);
  assert.match(page, /<AcademyCourseVideoPlaylist/);
  assert.match(page, /lessons=\{videos\.map\(\(video, index\) => \(\{/);
  assert.ok(page.indexOf("<AcademyCourseVideoPlaylist") < page.indexOf("hasBody ? <div className=\"academy-source-content\""),
    "Video course must be before long historical text");
  assert.match(wrapper, /data-video-lesson-count=\{lessons\.length\}/);
  assert.match(wrapper, /<AcademyVideoCourseJourney/);
  assert.match(wrapper, /youtubeId: lesson\.id/);
  assert.match(journey, /const total = 2 \+ lessons\.length \* 2/);
  assert.match(journey, /position % 2 === 1/);
  assert.match(journey, /data-course-video-phase=/);
  assert.match(journey, /data-academy-video-id=\{lesson\.id\}/);
  assert.match(journey, /data-source-order=\{lesson\.order\}/);
  assert.match(journey, /<textarea/);
  assert.match(journey, /maxLength=\{2000\}/);
  assert.match(journey, /sessionStorage\.setItem/);
  assert.match(journey, /<AcademyVideoPlayer key=\{lesson\.id\}/);
  assert.doesNotMatch(journey, /fetch\(|localStorage|\/api\/app\/|\/api\/crm\/|autoplay=1/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /@media \(max-width: 360px\)/);
  assert.match(player, /youtube-nocookie\.com\/embed/);
  assert.match(player, /\{playing \? \(/);
});

test("video player remains poster-first and unmounts iframe between separate reflection slides", async () => {
  const [journey, player] = await Promise.all([
    read("components/academy-video-course-journey.tsx"),
    read("components/academy-video-player.tsx"),
  ]);
  assert.match(journey, /isVideo \? \(/);
  assert.match(journey, /<AcademyVideoPlayer key=\{lesson\.id\}/);
  assert.match(journey, /isReflection/);
  assert.match(player, /const \[playing, setPlaying\] = useState\(false\)/);
  assert.match(player, /onClick=\{\(\) => setPlaying\(true\)\}/);
  assert.match(player, /autoplay=1&playsinline=1&rel=0/);
  assert.match(player, /https:\/\/www\.youtube\.com\/watch\?v=/);
  assert.match(player, /locale === "ru" \? "Смотреть"/);
});
