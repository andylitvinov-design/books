import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import {
  ENERGYWORK_VERSION, ENERGYWORK_QUESTIONS, ENERGYWORK_LESSON_ANSWER_IDS,
  ENERGYWORK_TANTRA_STUDY_QUESTION_IDS, energyworkTantraStudyAnswerComplete,
  energyworkSequence, energyworkLessonRanges, energyworkPreviousResumeId, energyworkP2ResumeId, energyworkP3ResumeId,
} from "../data/academy/energywork-ai-schema.js"

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8")
const curriculum = read("data/academy/energywork-ai-curriculum.ts")
const learner = read("components/energywork-ai-learner.tsx")
const cabinet = read("components/app/cabinet-free-course-banners.jsx")
const repo = read("lib/academy/energywork-course-repository.js")
const browserQa = read("scripts/verify-reiki-all-slides-browser.mjs")
const styles = read("components/energywork-ai-learner.module.css")

const questions = [
  ["tan-06", "Who created the Tantra Reiki system, and what is the source of its energy?"],
  ["tan-study-02", "What is the main purpose of the Tantra Reiki flow? Why is it needed, and what does it offer a person?"],
  ["tan-study-03", "For what purposes can Tantra Reiki be used?"],
  ["tan-study-04", "Which culture and tradition form the foundation of Tantra Reiki?"],
  ["tan-study-05", "How are Levels 1–3, 4–6 and 7–9 connected?"],
  ["tan-study-06", "At which levels do students learn to create mandalas and work with artifacts?"],
  ["tan-study-07", "After which level can someone become a Tantra Reiki Master and teach and initiate others?"],
]

test("Flight lesson places the practice on slide 3 without dropping IDs", () => {
  const sequence = energyworkSequence()
  assert.equal(ENERGYWORK_VERSION, "2026-10-19.p4")
  assert.deepEqual(sequence.slice(2, 9), [
    "flight-01", "flight-02", "flight-03", "flight-voices",
    "flight-05", "flight-04", "flight-done",
  ])
})

test("Tantra lesson places connection practice on slide 3 and presence on slide 14", () => {
  const sequence = energyworkSequence()
  const ranges = energyworkLessonRanges()
  assert.deepEqual(ranges.map((range) => range.count), [7, 16, 8, 16, 8])
  assert.deepEqual(sequence.slice(ranges[1].start, ranges[1].end), [
    "tan-01", "tan-02", "tan-03", "tan-voices", "tan-04",
    "tan-05", ...questions.map(([id]) => id),
    "presence-01", "presence-04", "tan-done",
  ])
  assert.equal(sequence.includes("presence-02"), false)
  assert.equal(sequence.includes("presence-03"), false)
  assert.equal(sequence.length, 57)
})

test("One standalone EN/RU text field per original free-initiation question; preserved privately", () => {
  for (const [id, prompt] of questions) {
    assert.equal(ENERGYWORK_QUESTIONS[id], "text", id)
    assert.ok(curriculum.includes('id: "' + id + '"'), id)
    assert.ok(curriculum.includes(prompt), prompt)
    assert.ok(ENERGYWORK_LESSON_ANSWER_IDS.includes(id))
  }
  assert.equal(questions.length, 7)
  assert.match(curriculum, /questionIds: \["tan-06", "tan-study-02"/)
  assert.match(learner, /item\.questionIds\.every/)
  assert.match(learner, /readyTargetCount/)
  assert.match(learner, /item\.nextQuestionId/)
  assert.match(repo, /answers\[body\.slideId\]=body\.answer/)
})

test("Tantra lesson 6 offers the original reading before the question sequence", () => {
  const i = curriculum.indexOf('id: "tan-05"')
  const j = curriculum.indexOf('id: "tan-06"')
  assert.ok(i > 0 && j > i)
  assert.match(curriculum.slice(i, j), /Seven short study questions follow/)
  assert.match(learner, /data-tantra-study-link/)
  assert.match(learner, /academy\/reiki\/tantra-reiki/)
  assert.match(learner, /target="_blank" rel="noopener noreferrer"/)
})

test("My Courses opens the exact last saved slide and the private API maps older removed slides", () => {
  assert.match(cabinet, /data-energywork-resume-last/)
  assert.match(cabinet, /encodeURIComponent\(academyProgress\.slideId\)/)
  assert.match(learner, /requestedIndex >= 0 && requestedIndex <= savedIndex/)
  assert.match(learner, /setIndex\(requestedIndex >= 0 && requestedIndex <= savedIndex \? requestedIndex : savedIndex\)/)
  assert.match(repo, /resumeSlideId\(row\)/)
  assert.match(repo, /row\.course_version === ENERGYWORK_PREVIOUS_VERSION/)
  assert.equal(energyworkPreviousResumeId("presence-02"), "tan-study-03")
  assert.equal(energyworkPreviousResumeId("presence-03"), "tan-study-04")
  assert.equal(energyworkPreviousResumeId("kun-04"), "kun-04")
  assert.equal(energyworkPreviousResumeId("flight-05"), "flight-04")
  assert.equal(energyworkP2ResumeId("flight-05"), "flight-03")
  assert.equal(energyworkP2ResumeId("flight-03"), "flight-04")
  assert.equal(energyworkP2ResumeId("presence-01"), "tan-03")
  assert.equal(energyworkP3ResumeId("flight-04"), "flight-05")
  assert.equal(energyworkP3ResumeId("flight-05"), "flight-04")
  assert.equal(energyworkP2ResumeId("tan-03"), "presence-01")
})

test("All seven study questions require an answer for Next, with contextual source links in EN/RU", () => {
  assert.deepEqual([...ENERGYWORK_TANTRA_STUDY_QUESTION_IDS], questions.map(([id]) => id))
  for (const [id] of questions) {
    assert.equal(ENERGYWORK_QUESTIONS[id], "text")
    assert.match(learner, new RegExp('"' + id + '": "#tantra-'))
  }
  assert.equal(energyworkTantraStudyAnswerComplete(""), false)
  assert.equal(energyworkTantraStudyAnswerComplete("   "), false)
  assert.equal(energyworkTantraStudyAnswerComplete(undefined), false)
  assert.equal(energyworkTantraStudyAnswerComplete("My answer"), true)
  assert.equal(energyworkTantraStudyAnswerComplete("  Ответ  "), true)
  assert.match(curriculum, /questions in Tantra Reiki require a brief written answer before advancing/)
  assert.match(learner, /tantraStudyMissing = isTantraStudyQuestion && !energyworkTantraStudyAnswerComplete/)
  assert.match(learner, /experienceMissing \|\| feedbackMissing \|\| tantraStudyMissing/)
  assert.match(learner, /required=\{isTantraStudyQuestion\}/)
  assert.match(learner, /data-tantra-study-hint/)
  assert.match(learner, /target="_blank" rel="noopener noreferrer" data-tantra-study-hint/)
  assert.ok(learner.includes('href={"/" + locale + "/academy/reiki/tantra-reiki" + TANTRA_STUDY_HINT_ANCHORS[slide.id]}'))
  assert.match(learner, /t\.tantraAnswerRequired/)
  assert.match(learner, /t\.tantraAnswerPlaceholder/)
  assert.match(repo, /ENERGYWORK_TANTRA_STUDY_QUESTION_IDS\.includes\(body\.slideId\)/)
  assert.match(repo, /TANTRA_STUDY_ANSWER_REQUIRED/)
  assert.match(styles, /\.tantraStudyHelp/)
  assert.match(styles, /\.tantraStudyLink:focus-visible/)
  assert.match(browserQa, /id === "tan-06" \|\| id\.startsWith\("tan-study-"\)/)
  assert.match(browserQa, /await expect\(nextButton\)\.toBeDisabled\(\)/)
  assert.match(browserQa, /await answer\.fill\("   "\)/)
})
