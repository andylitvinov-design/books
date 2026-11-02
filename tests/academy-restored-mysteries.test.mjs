import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");
const json = async (path) => JSON.parse(await read(path));

const restored = [
  {
    programId: "mysteries/maya-aztec/feathered-serpent",
    videos: { "videos/maya-archetypes": 6 },
  },
  {
    programId: "mysteries/egypt/high-wisdom",
    videos: { "videos/egypt-osiris": 7 },
  },
  {
    programId: "mysteries/greece-rome/beauty-and-power",
    videos: {
      "videos/greek-mysteries-demeter": 5,
      "videos/greek-mysteries-dionysus": 7,
    },
  },
];

test("all three source-backed PsiMaster mystery programs and original videos are preserved", async () => {
  const [programs, originalVideos, legacy] = await Promise.all([
    json("data/academy/psimaster-sources.generated.json"),
    json("data/academy/psimaster-media.generated.json"),
    json("data/academy/sources.generated.json"),
  ]);
  assert.equal(programs.length, 22, "never replace or duplicate the original source manifest");
  assert.equal(originalVideos.length, 45, "never replace or duplicate the original media manifest");
  for (const { programId, videos } of restored) {
    const found = programs.filter((entry) => entry.logicalId === programId);
    assert.equal(found.length, 1, programId + " must have one authoritative PsiMaster record");
    const [program] = found;
    assert.equal(program.sourceLocale, "ru");
    assert.equal(program.sourceProvider, "psimaster");
    assert.equal(program.direction, "mysteries");
    assert.ok(program.content.length >= 4);
    for (const [videoId, count] of Object.entries(videos)) {
      const entries = originalVideos.filter((video) => video.logicalId === videoId);
      assert.equal(entries.length, count, videoId + " original chapter count");
      assert.deepEqual(entries.map((video) => video.order), Array.from({ length: count }, (_, i) => i + 1));
      assert.equal(new Set(entries.map((video) => video.videoId)).size, count, "no repeated YouTube IDs");
      assert.ok(entries.every((video) => video.status === "verified_legacy_public_embed"));
      assert.ok(legacy.some((entry) => entry.logicalId === videoId && entry.sourceLocale === "ru"));
    }
  }
});

test("three Russian mystery curricula appear directly in the Academy main study list, not twice in archive", async () => {
  const [hub, discovery, cards] = await Promise.all([
    read("components/academy-hub.tsx"),
    read("components/academy-discovery.tsx"),
    read("components/academy-course-card-list.tsx"),
  ]);
  const position = hub.indexOf("...restoredMysteryCards");
  assert.ok(position >= 0 && position < hub.indexOf('id: "academy-featured-yggdrasil"'));
  assert.ok(hub.includes('locale === "ru"\n    ? restoredMysteryLinks.flatMap('), "RU-only feature cards");
  assert.match(hub, /!restoredMysteryLinks\.some\(\(entry\) => entry\.programId === record\.logicalId\)/);
  assert.match(hub, /record\.sourceProvider === "psimaster" && record\.sourceLocale === "ru"/);
  assert.match(hub, /mediaForRecord\(video\)\.some\(\(media\) => Boolean\(youtubeIdFromUrl\(media\.mediaUrl\)\)\)/);
  assert.match(discovery, /const studyItems = matchedItems\.filter\(\(item\) => !item\.free\)/);
  assert.match(discovery, /<AcademyCourseCardList locale=\{locale\} items=\{studyItems\}/);
  assert.match(cards, /takeLabel\?: string/);
  assert.match(cards, /item\.takeLabel \?\? \(item\.courseHref \? t\.start : t\.open\)/);
  for (const { programId } of restored) {
    assert.ok(hub.includes('programId: "' + programId + '"'), programId + " in main catalog");
  }
  assert.ok(hub.includes("Смотреть видео Майя"));
  assert.ok(hub.includes("Смотреть видео Осириса"));
  assert.ok(hub.includes("Смотреть цикл Деметры"));
});

test("original course pages cross-link every source-backed video family with a mobile-friendly index", async () => {
  const [page, css] = await Promise.all([
    read("components/academy-record-page.tsx"),
    read("app/academy.css"),
  ]);
  for (const { programId, videos } of restored) {
    assert.ok(page.includes('"' + programId + '": ['), programId);
    for (const id of Object.keys(videos)) assert.ok(page.includes('"' + id + '"'), id);
  }
  assert.match(page, /locale === "ru"\s*\? \(originalMysteryVideoIds/);
  assert.match(page, /const originalVideo = findAcademyRecord\(logicalId, locale\)/);
  assert.match(page, /href=\{video\.href\}/);
  assert.match(page, /relatedMysteryVideos\.map/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /\.academy-mystery-video-bridge \.academy-resource-links \{ grid-template-columns: minmax\(0, 1fr\)/);
});
