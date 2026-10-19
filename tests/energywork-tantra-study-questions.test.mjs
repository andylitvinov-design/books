import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import {
  ENERGYWORK_VERSION, ENERGYWORK_QUESTIONS, ENERGYWORK_LESSON_ANSWER_IDS,
  ENERGYWORK_TANTRA_STUDY_QUESTION_IDS, energyworkTantraStudyAnswerComplete,
  energyworkSequence, energyworkLessonRanges, energyworkPreviousResumeId,
  energyworkP2ResumeId, energyworkP3ResumeId, energyworkP4ResumeId, energyworkP6ResumeId, energyworkP7ResumeId,
} from "../data/academy/energywork-ai-schema.js"

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8")
const curriculum = read("data/academy/energywork-ai-curriculum.ts")
const learner = read("components/energywork-ai-learner.tsx")
const cabinet = read("components/app/cabinet-free-course-banners.jsx")
const repository = read("lib/academy/energywork-course-repository.js")
const browserQa = read("scripts/verify-reiki-all-slides-browser.mjs")
const migration = read("supabase/migrations/20261019190500_hh_academy_reiki_tantra_five_questions_p8_20261019.sql")

// The owner-approved screen order was old Q4, Q1, Q5, Q6, Q7, Q2+Q3.
// Remove old Q5 entirely and combine Q2+Q3 in one answer without reordering.
const quizOrder = ["tan-study-04", "tan-06", "tan-study-06", "tan-study-07", "tan-study-02"]
const questions = [
  ["tan-study-04", "Which culture and tradition form the foundation of Tantra Reiki?"],
  ["tan-06", "Who created the Tantra Reiki system, and what is the source of its energy?"],
  ["tan-study-06", "At which levels do students learn to create mandalas and work with artifacts?"],
  ["tan-study-07", "After which level can someone become a Tantra Reiki Master and teach and initiate others?"],
  ["tan-study-02", "What is the main purpose of the Tantra Reiki flow, what does it offer a person, and for what purposes can it be used?"],
]
const titles = [
  "Question 1 of 5 · Tradition and foundations",
  "Question 2 of 5 · Origins of Tantra Reiki",
  "Question 3 of 5 · Mandalas and artifacts",
  "Question 4 of 5 · The master level",
  "Question 5 of 5 · Purpose and use",
]
const ruTitles = [
  "Вопрос 1 из 5 · Традиция и основы",
  "Вопрос 2 из 5 · Происхождение Тантра Рейки",
  "Вопрос 3 из 5 · Мандалы и артефакты",
  "Вопрос 4 из 5 · Ступень мастера",
  "Вопрос 5 из 5 · Цель и применение",
]

test("Five lesson course retains Sun meditation and has 69 slides", () => {
  const sequence = energyworkSequence()
  assert.equal(ENERGYWORK_VERSION, "2026-10-19.p8")
  assert.deepEqual(sequence.slice(2, 9), [
    "flight-01", "flight-02", "flight-03", "flight-voices",
    "flight-05", "flight-04", "flight-done",
  ])
  assert.equal(sequence.length, 69)
  assert.deepEqual(energyworkLessonRanges().map(({count}) => count), [7, 14, 16, 22, 8])
})

test("Tantra has exactly five required screens in the established order", () => {
  const sequence = energyworkSequence()
  const ranges = energyworkLessonRanges()
  assert.deepEqual(sequence.slice(ranges[1].start, ranges[1].end), [
    "tan-01", "tan-02", "tan-03", "tan-voices", "tan-04", "tan-05",
    ...quizOrder, "presence-01", "presence-04", "tan-done",
  ])
  assert.deepEqual([...ENERGYWORK_TANTRA_STUDY_QUESTION_IDS], quizOrder)
  assert.equal(sequence.includes("tan-study-05"), false, "Nine-levels question removed")
  assert.equal(sequence.includes("tan-study-03"), false, "Two old answers now one prompt")
  assert.equal(curriculum.includes('secondaryQuestion: { id: "tan-study-03"'), false)
  assert.equal(curriculum.includes("How are Levels 1–3, 4–6 and 7–9 connected?"), false)
})

test("Questions are numbered 1–5 in EN/RU and match owner-approved topics", () => {
  for (let i = 0; i < quizOrder.length; i++) {
    const [id, prompt] = questions[i]
    assert.equal(ENERGYWORK_QUESTIONS[id], "text", id)
    assert.ok(curriculum.includes('id: "' + id + '"'), id)
    assert.ok(curriculum.includes(prompt), prompt)
    assert.ok(curriculum.includes(titles[i]), titles[i])
    assert.ok(curriculum.includes(ruTitles[i]), ruTitles[i])
    assert.ok(ENERGYWORK_LESSON_ANSWER_IDS.includes(id), id)
  }
  const section = curriculum.slice(
    curriculum.indexOf('id: "tan-study-04", phase: "tantra"'),
    curriculum.indexOf('id: "tan-03", phase: "tantra"'),
  )
  let prior = -1
  for (const title of titles) {
    const idx = section.indexOf(title)
    assert.ok(idx > prior, title)
    prior = idx
  }
  assert.match(curriculum, /Five short study questions follow/)
  assert.match(curriculum, /Затем ответьте на пять коротких вопросов/)
  assert.match(curriculum, /questionId: "tan-study-04", questionIds: \["tan-study-04", "tan-06", "tan-study-06", "tan-study-07", "tan-study-02"\]/)
  assert.match(learner, /item\.questionIds\.length > 1/)
  assert.match(learner, /readyTargetCount/)
  assert.match(learner, /item\.nextQuestionId/)
  assert.match(repository, /answers\[body\.slideId\]=body\.answer/)
})

test("Each active Tantra answer is required to proceed, fifth uses one field", () => {
  const intro = curriculum.indexOf('id: "tan-05"')
  const first = curriculum.indexOf('id: "tan-study-04"')
  assert.ok(intro > 0 && first > intro)
  assert.equal(energyworkTantraStudyAnswerComplete(""), false)
  assert.equal(energyworkTantraStudyAnswerComplete("   "), false)
  assert.equal(energyworkTantraStudyAnswerComplete(undefined), false)
  assert.equal(energyworkTantraStudyAnswerComplete("My answer"), true)
  assert.match(learner, /required=\{isReikiStudyQuestion\}/)
  assert.match(learner, /t\.tantraAnswerRequired/)
  assert.match(learner, /data-tantra-study-hint/)
  assert.match(learner, /data-tantra-study-link/)
  assert.match(repository, /TANTRA_STUDY_ANSWER_REQUIRED/)
  assert.doesNotMatch(repository, /body\.slideId === 'tan-study-02' && !energyworkTantraStudyAnswerComplete/)
  assert.match(browserQa, /id === "tan-06" \|\| id\.startsWith\("tan-study-"\)/)
})

test("Deleted questions never erase old encrypted answers or reset earlier progress", () => {
  // Existing private keys remain valid for archived data, but are no longer required.
  for (const id of ["tan-study-05", "tan-study-03"]) {
    assert.equal(ENERGYWORK_QUESTIONS[id], "text")
    assert.equal(ENERGYWORK_TANTRA_STUDY_QUESTION_IDS.includes(id), false)
    assert.equal(ENERGYWORK_LESSON_ANSWER_IDS.includes(id), false)
  }
  assert.match(repository, /openSealed\(row\.answers_ciphertext/)
  assert.match(repository, /seal\(answers,encryption\(row\),config\)/)
  assert.match(repository, /row\.course_version === ENERGYWORK_P7_VERSION/)
  assert.match(cabinet, /data-energywork-resume-last/)
  assert.match(cabinet, /encodeURIComponent\(academyProgress\.slideId\)/)
  assert.equal(energyworkP6ResumeId("tan-study-05"), "tan-study-06")
  assert.equal(energyworkP7ResumeId("tan-study-05"), "tan-study-06")
  assert.equal(energyworkP7ResumeId("tan-study-07"), "tan-study-07")
  assert.equal(energyworkP7ResumeId("tan-study-02"), "tan-study-02")
  assert.equal(energyworkP4ResumeId("tan-study-03"), "tan-study-04")
  assert.equal(energyworkP4ResumeId("tan-study-03", {"tan-study-04":"yes"}), "tan-06")
  assert.equal(energyworkP4ResumeId("tan-study-03", {
    "tan-study-04":"yes", "tan-06":"yes", "tan-study-06":"yes",
    "tan-study-07":"yes",
  }), "tan-study-02")
  assert.equal(energyworkP3ResumeId("flight-04"), "flight-05")
  assert.equal(energyworkP3ResumeId("flight-05"), "flight-04")
  assert.equal(energyworkPreviousResumeId("presence-02"), "tan-study-04")
  assert.equal(energyworkPreviousResumeId("presence-03"), "tan-study-04")
  assert.equal(energyworkPreviousResumeId("kun-04"), "kun-04")
  assert.equal(energyworkP2ResumeId("flight-05"), "flight-03")
  assert.equal(energyworkP2ResumeId("flight-03"), "flight-05")
  assert.equal(energyworkP2ResumeId("presence-01"), "tan-03")
  assert.equal(energyworkP2ResumeId("tan-03"), "presence-01")
  assert.match(migration, /2026-10-19\.p8/)
  assert.doesNotMatch(migration, /delete from|drop table|drop column/i)
})

test("Archived p7 two-field replies can still be combined without data loss", async () => {
  const { energyworkCombinedTantraAnswer } = await import("../data/academy/energywork-ai-schema.js")
  assert.equal(energyworkCombinedTantraAnswer("A", "B"), ["A","B"].join(String.fromCharCode(10,10)))
  assert.equal(energyworkCombinedTantraAnswer("A", "A"), "A")
  assert.equal(energyworkCombinedTantraAnswer("", "Past use"), "Past use")
})
