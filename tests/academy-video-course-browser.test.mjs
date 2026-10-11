import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const file = (name) => readFile(name, "utf8");
const json = async (name) => JSON.parse(await file(name));

test("Academy videos use program → module/category → lesson, not giant showcase cards", async () => {
  const [hub, server, client, css] = await Promise.all([
    file("components/academy-hub.tsx"),
    file("components/academy-video-courses.tsx"),
    file("components/academy-video-library-client.tsx"),
    file("components/academy-video-library.module.css"),
  ]);
  assert.match(hub, /view === "videos" \? <AcademyVideoCourses locale=\{locale\} \/>/);
  assert.doesNotMatch(hub, /<EnglishGuidedMeditations\s*\/>/);
  assert.match(server, /yggdrasilCurriculum/);
  assert.match(server, /module\.steps\.flatMap/);
  assert.match(server, /mediaForRecord\(record\)/);
  assert.match(server, /videos\/greek-mysteries-demeter/);
  assert.match(server, /videos\/greek-mysteries-dionysus/);
  assert.match(server, /videos\/egypt-osiris/);
  assert.match(server, /videos\/maya-archetypes/);
  assert.match(server, /videos\/planetary-power/);
  assert.match(server, /videos\/strength-protection/);
  assert.match(server, /videos\/energy-pump-ups/);
  assert.match(client, /program\.courses\.map/);
  assert.match(client, /course\.chapters\.map/);
  assert.match(client, /chapter\.videos\.map/);
  assert.match(client, /setPlayingVideo\(null\)/);
  assert.match(client, /youtube-nocookie\.com\/embed/);
  assert.match(css, /@media \(max-width: 600px\)/);
  assert.match(css, /grid-template-columns: 72px minmax\(0,1fr\)/);
});

test("Academy catalog differentiates original audio, and pending videos stay unplayable", async () => {
  const [server, client, englishSource, curriculum, archive] = await Promise.all([
    file("components/academy-video-courses.tsx"),
    file("components/academy-video-library-client.tsx"),
    json("data/academy/english-guided-meditations.ts").catch(() => null),
    json("data/academy/yggdrasil-curriculum.json"),
    json("data/academy/psimaster-media.generated.json"),
  ]);
  const english = await file("data/academy/english-guided-meditations.ts");
  assert.equal(englishSource, null);
  assert.match(server, /language: "en"/);
  assert.match(server, /language: "ru"/);
  assert.match(server, /validVideoId/);
  assert.match(client, /academy-video-ru/);
  assert.match(client, /t\.ruBoundary/);
  assert.match(client, /Flight to the Sun/);
  assert.match(english, /youtubeId: null/);
  assert.ok(curriculum.levels.length >= 7);
  assert.equal(archive.length, 45);
  assert.ok(curriculum.levels[0].steps.every((step) => step.video?.videos?.length > 0));
  assert.match(client, /playingVideo === key/);
  assert.match(client, /openVideoById\(key\)/);
});
