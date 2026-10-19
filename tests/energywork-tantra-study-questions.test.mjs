import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import {
  ENERGYWORK_VERSION, ENERGYWORK_QUESTIONS, ENERGYWORK_LESSON_ANSWER_IDS,
  ENERGYWORK_TANTRA_STUDY_QUESTION_IDS, energyworkTantraStudyAnswerComplete,
  energyworkSequence, energyworkLessonRanges, energyworkPreviousResumeId,
  energyworkP2ResumeId, energyworkP3ResumeId, energyworkP4ResumeId,
} from "../data/academy/energywork-ai-schema.js"

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8")
const curriculum = read("data/academy/energywork-ai-curriculum.ts")
const learner = read("components/energywork-ai-learner.tsx")
const cabinet = read("components/app/cabinet-free-course-banners.jsx")
const repo = read("lib/academy/energywork-course-repository.js")
const browserQa = read("scripts/verify-reiki-all-slides-browser.mjs")
const styles = read("components/energywork-ai-learner.module.css")
const migration = read("supabase/migrations/20261019160000_hh_academy_reiki_questions_p5_20261019.sql")

const questions = [
  ["tan-06", "Who created the Tantra Reiki system, and what is the source of its energy?"],
  ["tan-study-02", "What is the main purpose of the Tantra Reiki flow? Why is it needed, and what does it offer a person?"],
  ["tan-study-03", "For what purposes can Tantra Reiki be used?"],
  ["tan-study-04", "Which culture and tradition form the foundation of Tantra Reiki?"],
  ["tan-study-05", "How are Levels 1–3, 4–6 and 7–9 connected?"],
  ["tan-study-06", "At which levels do students learn to create mandalas and work with artifacts?"],
  ["tan-study-07", "After which level can someone become a Tantra Reiki Master and teach and initiate others?"],
]
const quizOrder = ["tan-study-04", "tan-06", "tan-study-05",
  "tan-study-06", "tan-study-07", "tan-study-02"]

test("The five-lesson course keeps its flight practice and has 70 total slides", () => {
  const sequence = energyworkSequence()
  assert.equal(ENERGYWORK_VERSION, "2026-10-19.p7")
  assert.deepEqual(sequence.slice(2, 9), [
    "flight-01", "flight-02", "flight-03", "flight-voices",
    "flight-05", "flight-04", "flight-done",
  ])
  assert.equal(sequence.length, 70)
})

test("Tantra study slides are 4, 1, 5, 6, 7 and finally 2+3 on one screen", () => {
  const sequence = energyworkSequence()
  const ranges = energyworkLessonRanges()
  assert.deepEqual(ranges.map((range) => range.count), [7, 15, 14, 22, 8])
  assert.deepEqual(sequence.slice(ranges[1].start, ranges[1].end), [
    "tan-01", "tan-02", "tan-03", "tan-voices", "tan-04", "tan-05",
    ...quizOrder, "presence-01", "presence-04", "tan-done",
  ])
  assert.equal(sequence.includes("tan-study-03"), false)
  assert.equal(sequence.includes("presence-02"), false)
  assert.equal(sequence.includes("presence-03"), false)
  assert.match(curriculum, /secondaryQuestion: \{ id: "tan-study-03"/)
  assert.match(curriculum, /Questions 2 & 3 of 7 · Purpose and use/)
  assert.match(curriculum, /Вопросы 2 и 3 из 7/)
})

test("All seven questions retain their original EN/RU prompts and separate private answer IDs", () => {
  assert.deepEqual([...ENERGYWORK_TANTRA_STUDY_QUESTION_IDS], [...quizOrder,"tan-study-03"])
  for (const [id, prompt] of questions) {
    assert.equal(ENERGYWORK_QUESTIONS[id], "text", id)
    assert.ok(curriculum.includes(prompt), prompt)
    assert.ok(ENERGYWORK_LESSON_ANSWER_IDS.includes(id), id)
    if (id === "tan-study-03") {
      assert.ok(curriculum.includes('secondaryQuestion: { id: "' + id + '"'))
    } else {
      assert.ok(curriculum.includes('id: "' + id + '"'))
    }
  }
  assert.equal(questions.length, 7)
  assert.match(curriculum, /questionIds: \["tan-study-04", "tan-06"/)
  assert.match(learner, /item\.questionIds\.every/)
  assert.match(learner, /readyTargetCount/)
  assert.match(learner, /item\.nextQuestionId/)
  assert.match(repo, /answers\[body\.slideId\]=body\.answer/)
  assert.match(repo, /answers\[secondaryId\] = body\.secondaryAnswer/)
})

test("The reading precedes the reordered quiz, and both final answers are mandatory", () => {
  const intro = curriculum.indexOf('id: "tan-05"')
  const first = curriculum.indexOf('id: "tan-study-04"')
  assert.ok(intro > 0 && first > intro)
  assert.match(curriculum.slice(intro, first), /Seven short study questions follow/)
  assert.equal(energyworkTantraStudyAnswerComplete(""), false)
  assert.equal(energyworkTantraStudyAnswerComplete("   "), false)
  assert.equal(energyworkTantraStudyAnswerComplete(undefined), false)
  assert.equal(energyworkTantraStudyAnswerComplete("My answer"), true)
  assert.match(learner, /secondaryQuestion && !energyworkTantraStudyAnswerComplete/)
  assert.match(learner, /data-tantra-study-combined/)
  assert.match(learner, /secondaryAnswer: secondary/)
  assert.match(learner, /required=\{isReikiStudyQuestion\}/)
  assert.match(learner, /t\.tantraAnswerRequired/)
  assert.match(learner, /data-tantra-study-hint/)
  assert.match(learner, /data-tantra-study-link/)
  assert.match(repo, /body\.slideId === 'tan-study-02' && !energyworkTantraStudyAnswerComplete/)
  assert.match(repo, /TANTRA_STUDY_ANSWER_REQUIRED/)
  assert.match(styles, /\.tantraSecondQuestion/)
  assert.match(styles, /\.tantraStudyLink:focus-visible/)
  assert.match(browserQa, /id === "tan-06" \|\| id\.startsWith\("tan-study-"\)/)
})

test("Old saves return to the new quiz without removing encrypted answers", () => {
  assert.match(cabinet, /data-energywork-resume-last/)
  assert.match(cabinet, /encodeURIComponent\(academyProgress\.slideId\)/)
  assert.match(learner, /requestedIndex >= 0 && requestedIndex <= savedIndex/)
  assert.match(learner, /setIndex\(requestedIndex >= 0 && requestedIndex <= savedIndex \? requestedIndex : savedIndex\)/)
  assert.match(repo, /resumeSlideId\(row, answers\)/)
  assert.match(repo, /row\.course_version === ENERGYWORK_P3_VERSION/)
  assert.equal(energyworkP4ResumeId("tan-study-03"), "tan-study-04")
  assert.equal(energyworkP4ResumeId("tan-study-03", {"tan-study-04":"yes"}), "tan-06")
  assert.equal(energyworkP4ResumeId("tan-study-03", {
    "tan-study-04":"yes", "tan-06":"yes", "tan-study-05":"yes",
    "tan-study-06":"yes", "tan-study-07":"yes",
  }), "tan-study-02")
  assert.equal(energyworkP3ResumeId("flight-04"), "flight-05")
  assert.equal(energyworkP3ResumeId("flight-05"), "flight-04")
  assert.equal(energyworkPreviousResumeId("presence-02"), "tan-study-04")
  assert.equal(energyworkPreviousResumeId("presence-03"), "tan-study-04")
  assert.equal(energyworkPreviousResumeId("kun-04"), "kun-04")
  assert.equal(energyworkP2ResumeId("flight-05"), "flight-03")
  assert.equal(energyworkP2ResumeId("flight-03"), "flight-04")
  assert.equal(energyworkP2ResumeId("presence-01"), "tan-03")
  assert.equal(energyworkP2ResumeId("tan-03"), "presence-01")
  assert.match(migration, /2026-10-19\.p5/)
  assert.doesNotMatch(migration, /delete from|drop table|drop column/i)
})
