import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { energyworkLessonRanges, energyworkSequence } from "../data/academy/energywork-ai-schema.js"

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8")
const learner = read("components/energywork-ai-learner.tsx")
const cabinet = read("components/app/cabinet-free-course-banners.jsx")
const repo = read("lib/academy/energywork-course-repository.js")

test("The visible slide counter uses five real lesson lengths and a separate introduction", () => {
  const sequence = energyworkSequence()
  const ranges = energyworkLessonRanges(sequence)
  assert.equal(sequence.length, 67)
  assert.deepEqual(sequence.slice(2,10), ["flight-01","flight-audio","flight-02","flight-voices","flight-05","flight-04","flight-03","flight-done"], "Lesson 1 ends after the timed practice")
  assert.equal(ranges[0].start, 2, "Two introductory slides are outside lesson 1")
  assert.deepEqual(ranges.map(range => range.count), [9, 15, 17, 15, 9])
  assert.deepEqual(ranges.map(range => range.firstSlideId),
    ["flight-01", "tan-01", "kun-01", "ygg-01", "paths-01"])
  for (let i = 0; i < ranges.length; i++) {
    assert.equal(ranges[i].end, ranges[i + 1]?.start ?? sequence.length, "Lesson boundaries are adjacent")
    assert.equal(sequence[ranges[i].start], ranges[i].firstSlideId)
  }
  assert.match(learner, /currentLessonRange\.lesson/)
  assert.match(learner, /lessonProgressLabel/)
  assert.match(learner, /progressPercent/)
  assert.doesNotMatch(learner, /\{t\.lesson\} \{index \+ 1\} \{t\.of\} \{total\}/)
})

test("A single checkpoint action saves before advancing and does not promise guest saving", () => {
  assert.doesNotMatch(learner, /data-energywork-save-progress|saveAndLeave/);
  assert.match(learner, /saveAndContinue: "Save progress & continue"/);
  assert.match(learner, /saveAndContinue: "Сохранить прогресс и продолжить"/);
  assert.match(learner, /returnAnytime: "Pick up here anytime from My Courses\."/);
  assert.match(learner, /returnAnytime: "Вернуться к уроку можно через «Мои курсы»\."/);
  assert.match(learner, /async function next\(\) \{[\s\S]*?if \(sync === "ready"\) \{[\s\S]*?await store\(nextId\);[\s\S]*?setIndex\(\(current\) => Math\.min\(current \+ 1, slides\.length - 1\)\)/);
  assert.match(learner, /data-reiki-milestone-choices/);
  assert.match(learner, /data-reiki-tomorrow-choice/);
  assert.match(learner, /data-energywork-next/);
  assert.match(repo, /MEDITATION_FEEDBACK_REQUIRED/);
  assert.match(repo, /nextIndex < slideIndex \|\| nextIndex > slideIndex\+1/);
});

test("Cabinet chapter picker uses saved owner progress and forbids deep-link skipping", () => {
  assert.match(cabinet, /appFetch\('academy-energywork'\)/)
  assert.match(cabinet, /data-energywork-cabinet-lessons/)
  assert.match(cabinet, /const unlocked = savedIndex >= range\.start/)
  assert.match(cabinet, /href=\{courseHref \+ '\?slide=' \+ encodeURIComponent\(range\.firstSlideId\)\}/)
  assert.match(cabinet, /aria-disabled="true"/)
  assert.match(learner, /requestedIndex >= 0 && requestedIndex <= savedIndex \? requestedIndex : savedIndex/)
  assert.match(repo, /COURSE_STEP_NOT_READY/)
  assert.match(learner, /onClick=\{\(\) => jumpToSlide\(lesson\.firstSlideId\)\}/)
})


test("The actual first lesson renders its final practice and congratulations before the consented save gate", () => {
  const curriculum = read("data/academy/energywork-ai-curriculum.ts");
  const expected = energyworkSequence();
  const reportIndex = expected.indexOf("flight-04");
  const practiceIndex = expected.indexOf("flight-03");
  const doneIndex = expected.indexOf("flight-done");
  const saveIndex = expected.indexOf("flight-save");
  assert.ok(reportIndex < practiceIndex && practiceIndex < doneIndex && doneIndex < saveIndex);
  assert.match(curriculum, /slide\.phase === "flight" && slide\.id !== "flight-save"/);
  assert.match(curriculum, /commonSlides\.find\(\(slide\) => slide\.id === "flight-save"\)!/);
});
