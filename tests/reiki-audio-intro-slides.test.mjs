import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { energyworkSequence, energyworkLessonRanges, ENERGYWORK_LESSON_ANSWER_IDS } from "../data/academy/energywork-ai-schema.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Four optional audio welcome screens sit immediately before original guided videos", () => {
  const sequence = energyworkSequence();
  assert.equal(sequence.length, 68);
  const pairs = [
    ["flight-audio","flight-02","flight"],
    ["tan-audio","tan-02","tantra"],
    ["kun-audio","kun-02","kundalini"],
    ["ygg-audio","ygg-02","yggdrasil"],
  ];
  for (const [audio, video, lesson] of pairs) {
    assert.equal(sequence.filter(id => id === audio).length, 1);
    assert.equal(sequence.indexOf(audio) + 1, sequence.indexOf(video));
    const curriculum = read("data/academy/energywork-ai-curriculum.ts");
    assert.ok(curriculum.includes('id: "' + audio + '", phase: "' + lesson + '", kind: "audio-intro"'));
    assert.ok(curriculum.includes('videoKey: "' + ({flight:"flight-to-sun",tantra:"tantra-reiki",kundalini:"kundalini-reiki",yggdrasil:"reiki-yggdrasil"})[lesson] + '"'));
  }
  assert.deepEqual(energyworkLessonRanges(sequence).map(row => row.count),[8,16,18,16,7]);
  assert.equal(ENERGYWORK_LESSON_ANSWER_IDS.length, 22,"the four audio screens require no extra private answers");
});

test("Audio welcome is an independent one-screen step, with optional playback and no fake audio", () => {
  const learner=read("components/energywork-ai-learner.tsx");
  const player=read("components/reiki-lesson-intro-audio.tsx");
  assert.ok(learner.includes('slide.kind === "audio-intro" && slide.introAudioKey'));
  assert.ok(learner.includes("data-reiki-audio-welcome"));
  assert.ok(learner.includes('slide.kind === "audio-intro" ? (locale === "ru" ? "Перейти к видео" : "Continue to video")'));
  assert.equal(learner.split("<ReikiLessonIntroAudio").length-1,1,"no duplicate audio player on lesson intro");
  assert.ok(player.includes('showEmpty = false'));
  assert.ok(player.includes("data-reiki-audio-unpublished"));
  assert.ok(player.includes('preload="none"'));
  assert.doesNotMatch(player,/autoPlay|autoplay|speechSynthesis/);
  assert.ok(player.includes('credentials: "omit", cache: "no-store"'));
});
