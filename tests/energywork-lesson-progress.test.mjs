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
  assert.equal(sequence.length, 53)
  assert.equal(ranges[0].start, 2, "Two introductory slides are outside lesson 1")
  assert.deepEqual(ranges.map(range => range.count), [7, 12, 8, 16, 8])
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

test("Only explicit private save advances and leaves at a congratulations checkpoint", () => {
  assert.match(learner, /data-energywork-save-progress/)
  assert.match(learner, /saveProgress: "Сохранить прогресс"/)
  assert.match(learner, /saveAndContinue: "Сохранить и продолжить"/)
  assert.match(learner, /returnAnytime: "Ваш прогресс сохраняется\./)
  assert.match(learner, /await store\(nextId\);\s*window\.location\.assign\("\/" \+ locale \+ "\/app\/course\?view=courses"\)/)
  assert.match(learner, /sync === "guest"\) \{ await signIn\(\)/)
  assert.match(learner, /sync === "consent"/)
  assert.match(learner, /sync === "unavailable"/)
  assert.match(learner, /sync === "ready" \? t\.saveAndContinue : t\.continue/)
  assert.match(repo, /MEDITATION_FEEDBACK_REQUIRED/)
  assert.match(repo, /nextIndex < slideIndex \|\| nextIndex > slideIndex\+1/)
})

test("Cabinet chapter picker uses saved owner progress and forbids deep-link skipping", () => {
  assert.match(cabinet, /appFetch\('academy-energywork'\)/)
  assert.match(cabinet, /data-energywork-cabinet-lessons/)
  assert.match(cabinet, /const unlocked = savedIndex >= range\.start/)
  assert.match(cabinet, /href=\{courseHref \+ '\?slide=' \+ encodeURIComponent\(range\.firstSlideId\)\}/)
  assert.match(cabinet, /aria-disabled="true"/)
  assert.match(learner, /requestedIndex >= 0 && requestedIndex <= savedIndex \? requestedIndex : savedIndex/)
  assert.match(repo, /COURSE_STEP_NOT_READY/)
  assert.match(learner, /onClick=\{\(\) => void jumpToSlide\(lesson\.firstSlideId\)\}/)
})
