import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { energyworkSequence } from "../data/academy/energywork-ai-schema.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const registry = read("data/academy/reiki-practitioner-lesson-videos.ts");
const curriculum = read("data/academy/energywork-ai-curriculum.ts");
const original = read("data/academy/english-guided-meditations.ts");
const learner = read("components/energywork-ai-learner.tsx");
const player = read("components/academy-video-player.tsx");
const css = read("components/energywork-ai-learner.module.css");

test("Five owner-supplied videos map to lessons 1–5 and preserve existing slide IDs", () => {
  const matches = [...registry.matchAll(/\{\s*slideId: "([^"]+)", lesson: (\d+), youtubeId: "([^"]+)"/g)];
  const mapping = matches.map(m => [m[1], Number(m[2]), m[3]]);
  assert.deepEqual(mapping, [
    ["flight-02", 1, "lOo93GuzeJ0"],
    ["tan-02", 2, "yH_M6If8VLk"],
    ["kun-02", 3, "KK1IgvDTrhU"],
    ["ygg-02", 4, "y3MDcqwlC-w"],
    ["paths-01", 5, "FKa-wHl8aQI"],
  ]);
  assert.ok(mapping.every(([, , id]) => /^[\w-]{11}$/.test(id)));
  const sequence = energyworkSequence();
  assert.equal(sequence.length, 63);
  const positions = mapping.map(([id]) => sequence.indexOf(id));
  assert.ok(positions.every(pos => pos > 0));
  assert.deepEqual(positions, [...positions].sort((a,b) => a-b));
  for (const [slideId, lesson] of mapping) {
    assert.ok(sequence.includes(slideId), "Missing lesson " + lesson + " media slot");
    if (lesson < 5)
      assert.match(curriculum, new RegExp('id: "' + slideId + '"[^\\n]+kind: "video"'));
    else {
      assert.match(curriculum, /id: "paths-01", phase: "initiation", kind: "lesson"/);
      assert.match(curriculum, /This recording is not an initiation/);
    }
  }
});

test("Old original videos remain accessible through a selectable EN/RU one-screen player", () => {
  for (const id of ["HqfixazXqRY", "w2BN-HYmHUk", "_IOX0E8N-To", "80xZ7jN6o2Y"]) {
    assert.ok(original.includes(id));
    assert.ok(!registry.includes(id));
  }
  assert.match(learner, /reikiPractitionerLessonVideos\.find/);
  assert.match(learner, /data-reiki-lesson-video=\{slide\.id\}/);
  assert.match(learner, /aria-pressed=\{!useOriginal\}/);
  assert.match(learner, /aria-pressed=\{useOriginal\}/);
  assert.match(learner, /setChoice\("lesson"\)/);
  assert.match(learner, /setChoice\("original"\)/);
  assert.match(learner, /<ReikiLessonVideo key=\{slide\.id\}/);
  assert.match(learner, /slide\.id === "paths-01"/);
  assert.match(learner, /Watching is not a personal initiation/);
  assert.match(learner, /Просмотр не является личной инициацией/);
  assert.match(learner, /<AcademyVideoPlayer key=\{slide\.id/);
  assert.match(css, /\.lessonVideoChoices/);
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});

test("The existing player remains poster-first, click-to-play, and has a direct link", () => {
  assert.match(player, /useState\(false\)/);
  assert.match(player, /playing \? \(/);
  assert.match(player, /youtube-nocookie\.com\/embed/);
  assert.match(player, /www\.youtube\.com\/watch\?v=/);
});
