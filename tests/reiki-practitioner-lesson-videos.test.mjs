import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { energyworkSequence, energyworkLessonRanges } from "../data/academy/energywork-ai-schema.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const registry = read("data/academy/reiki-practitioner-lesson-videos.ts");
const curriculum = read("data/academy/energywork-ai-curriculum.ts");
const original = read("data/academy/english-guided-meditations.ts");
const learner = read("components/energywork-ai-learner.tsx");
const player = read("components/academy-video-player.tsx");
const css = read("components/energywork-ai-learner.module.css");

const teacherVideos = [
  ["welcome-video", 1, "lOo93GuzeJ0"],
  ["tan-intro-video", 2, "yH_M6If8VLk"],
  ["kun-intro-video", 3, "KK1IgvDTrhU"],
  ["ygg-intro-video", 4, "y3MDcqwlC-w"],
  ["paths-01", 5, "FKa-wHl8aQI"],
];
const originalMeditations = [
  ["flight-02", "flight-to-sun", "HqfixazXqRY"],
  ["tan-02", "tantra-reiki", "w2BN-HYmHUk"],
  ["kun-02", "kundalini-reiki", "_IOX0E8N-To"],
  ["ygg-02", "reiki-yggdrasil", "80xZ7jN6o2Y"],
];

test("Each teacher recording has its own slide BEFORE the original guided meditation", () => {
  const mapping = [...registry.matchAll(/\{\s*slideId: "([^"]+)", lesson: (\d+), youtubeId: "([^"]+)"/g)]
    .map(m => [m[1], Number(m[2]), m[3]]);
  assert.deepEqual(mapping, teacherVideos);
  assert.ok(mapping.every(([, , id]) => /^[\w-]{11}$/.test(id)));
  const sequence = energyworkSequence();
  assert.equal(sequence.length, 63);
  assert.equal(sequence[0], "welcome-01", "The title page opens the course");
  assert.equal(sequence[1], "welcome-video", "Andrey speaks just after the title page");
  assert.deepEqual(energyworkLessonRanges().map(r => r.count), [7,15,17,15,6]);

  const meditations = ["flight-02", "tan-02", "kun-02", "ygg-02"];
  for (const [index, [slideId, lesson]] of mapping.entries()) {
    assert.equal(sequence.filter(id => id === slideId).length, 1,
      "Teacher recording " + lesson + " has exactly one slide");
    if (lesson < 5) {
      assert.ok(sequence.indexOf(slideId) < sequence.indexOf(meditations[index]),
        "Teacher recording " + lesson + " must precede the meditation");
      assert.match(curriculum, new RegExp('id: "' + slideId + '", phase: "[^"]+", kind: "video"'));
    } else {
      assert.equal(slideId, "paths-01", "Existing lesson five introduction remains unchanged");
      assert.match(curriculum, /This recording is not an initiation/);
    }
  }
  for (const [intro, meditation] of [
    ["tan-intro-video", "tan-02"],
    ["kun-intro-video", "kun-02"],
    ["ygg-intro-video", "ygg-02"],
  ]) assert.equal(sequence.indexOf(meditation), sequence.indexOf(intro) + 1);
});

test("All four original EN guided meditations are visible on their established, stable IDs", () => {
  const sequence = energyworkSequence();
  const introIds = teacherVideos.map(v => v[0]);
  for (const [meditationId, key, youtubeId] of originalMeditations) {
    assert.ok(sequence.includes(meditationId));
    assert.ok(original.includes(youtubeId), "Original meditation missing: " + meditationId);
    assert.ok(curriculum.includes('videoKey: "' + key + '"'));
    assert.match(curriculum, new RegExp('id: "' + meditationId + '"[^\\n]+kind: "video"'));
    assert.ok(!introIds.includes(meditationId), "Meditation may not be replaced by an intro");
    assert.ok(!registry.includes(youtubeId), "Do not overwrite original IDs in teacher registry");
  }
  assert.match(curriculum, /Flight to the Sun · guided meditation/);
  assert.match(curriculum, /Полёт к Солнцу · медитация/);
  assert.match(curriculum, /Tantra Reiki · guided meditation/);
  assert.match(curriculum, /Kundalini Reiki · guided meditation/);
  assert.match(curriculum, /Reiki Yggdrasil · guided meditation/);
});

test("One source per slide; no selector hides the meditation behind the teacher video", () => {
  assert.match(learner, /reikiPractitionerLessonVideos\.find/);
  assert.match(learner, /data-reiki-lesson-video=\{slide\.id\}/);
  assert.match(learner, /data-reiki-media-role=\{lessonVideo \? "introduction" : "meditation"\}/);
  assert.match(learner, /lessonVideo\?\.youtubeId \?\? original\?\.youtubeId/);
  assert.match(learner, /<ReikiLessonVideo key=\{slide\.id\}/);
  assert.doesNotMatch(learner, /setChoice\("original"\)|setChoice\("lesson"\)/);
  assert.doesNotMatch(learner, /aria-pressed=\{useOriginal\}/);
  assert.match(learner, /Watching is not a personal initiation/);
  assert.match(learner, /Просмотр не является личной инициацией/);
  assert.match(learner, /<AcademyVideoPlayer key=\{slide\.id\}/);
  assert.doesNotMatch(css, /max-width:\s*216px/);
  assert.match(css, /max-width: none/);
  assert.doesNotMatch(css, /\.lessonVideoChoices/);
});

test("The existing player remains poster-first, click-to-play, and links directly to YouTube", () => {
  assert.match(player, /useState\(false\)/);
  assert.match(player, /playing \? \(/);
  assert.match(player, /youtube-nocookie\.com\/embed/);
  assert.match(player, /www\.youtube\.com\/watch\?v=/);
});
